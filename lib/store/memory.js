var MemoryStore = (function( _, EventEmitter, Binding ) {

    /**
     * Array.forEach shortcut for a path.
     *
     * @param {String}      path
     * @param {Function}    fn
     */
    function pathForEach( path, fn ) {
        var parts = path.split( "/" ),
            key, isLeaf;
    
        while ( parts.length ) {
            key = parts.shift();
    
            if ( key === "" ) {
                continue;
            }
    
            isLeaf = parts.length === 0;
            fn.call( MemoryStore, key, isLeaf );
        }
    }
    
    /**
     * Get the keys for an object - essentially a more sophisticated
     * Object.keys, which will work for both Objects and Bindables.
     *
     * @param {Object} o
     */
    function objectKeys( o ) {
        var data = o,
            keys = [],
            key;
    
        if ( Binding.isBindable( o ) ) {
            data = o.attributes;
        }
    
        if ( Object.hasOwnProperty( "keys" ) ) {
            keys = Object.keys( data );
        } else {
            for ( key in data ) {
                keys.push( key );
            }
        }
    
        return keys;
    }
    
    /**
     * Clear properties from an object - works for both Objects and Bindables.
     *
     * @param {Object} o
     */
    function clearProperties( o ) {
        var data = o,
            i, keys, key;
    
        if ( Binding.isBindable( o ) ) {
            data = o.attributes;
        }
    
        keys = objectKeys( data );
    
        for ( i = 0; i < keys.length; i++ ) {
            key = keys[ i ];
    
            delete data[ key ];
        }
    }
    
    /**
     * Conditionally get a property based on whether an object is an Object
     * or a Bindable.
     *
     * @param {Object} o
     * @param {String} key
     */
    function getProperty( o, key ) {
        if ( Binding.isBindable( o ) ) {
            return o.get( key );
        } else {
            return o[ key ];
        }
    }
    
    /**
     * Conditionally set a property based on whether an object is an Object
     * or a Bindable.
     *
     * @param {Object} o
     * @param {String} key
     * @param {Object} value
     */
    function setProperty( o, key, value ) {
        if ( Binding.isBindable( o ) ) {
            o.set( key, value );
        } else {
            o[ key ] = value;
        }
    }
    
    var MemoryStore = {
    
        /**
         * A deserialiser can be used as "middleware" for data that is returned
         * from the server, i.e.
         *
         *      MemoryStore.deserialiser = function( data ) {
         *          // Do some stuff with, and return, data.
         *      }
         */
        deserialiser: null,
    
        /**
         * Initialise the store.
         *
         * @param {Object}      [store]
         * @param {Function}    [deserialiser]
         */
        init: function( store, deserialiser ) {
            if ( deserialiser ) {
                this.deserialiser = deserialiser;
            }
    
            if ( store ) {
                this.store = this._deserialise( store );
            }
    
            console.log( "MemoryStore.init", this.store );
        },
    
        /**
         * Initial storage of data.
         */
        store: Binding.createObject({
            test: {
                path1: {
                    items: [ 1, 2, 3, 4 ],
                    foo: {
                        thing: "wotsit",
                        bar: true
                    }
                },
                path2: {
                    items: [ 1, 2 ],
                    foo: {
                        bar: false,
                        thing: "stuff"
                    }
                }
            }
        }),
    
        /**
         * Save a path value into the data store.
         *
         * @param {String}      path
         * @param {Object}      data
         * @param {Function}    callback
         */
        save: function( path, data, callback ) {
            var o = this.store;
    
            this._patch( o, path, this._deserialise( data ) );
    
            if ( callback ) {
                return callback();
            }
        },
    
        /**
         * Read a value from the data store by path(s). If a single path is
         * passed in, it reads the single value.
         *
         * For example:
         *
         *      MemoryStore.init({
         *          path: {
         *              to: {
         *                  thing: {
         *                      foo: "bar"
         *                  }
         *              }
         *          }
         *      });
         *
         *      MemoryStore.read( "/path/to/thing", function( value ) {
         *          // value is { foo: "bar" }
         *      });
         *
         * If an array of paths is passed in, it will return an absolute
         * structure of values matching those paths.
         *
         * For example:
         *
         *      MemoryStore.init({
         *          path: {
         *              one: {
         *                  thing: {
         *                      foo: "bar"
         *                  }
         *              },
         *              two: {
         *                  items: [ 0, 1, 2 ],
         *                  things: [ 1, 2, 3 ]
         *              }
         *          }
         *      });
         *
         *      MemoryStore.read([
         *          "/path/one/thing/foo",
         *          "/path/two/items"
         *      ],
         *      function( value ) {
         *          // value is {
         *          //   path: {
         *          //     one: {
         *          //       thing: {
         *          //         foo: "bar"
         *          //       }
         *          //     },
         *          //     two: {
         *          //       items: [ 0, 1, 2 ]
         *          //     }
         *          //   }
         *          // }
         *      });
         *
         * @param {String|Array}    paths
         * @param {Function}        callback
         */
        read: function( paths, callback ) {
            var o, value, path;
    
            if ( typeof paths === "string" ) {
                o = this._readSync( path );
            } else {
                o = this._deserialise( {} );
    
                while ( paths.length ) {
                    path = paths.shift();
                    value = this._readSync( path );
                    this._patch( o, path, value );
                }
            }
    
            callback( o );
        },
    
        /**
         * Patches (merges) a data structure into another, offset by a path.
         * Returns the passed-in base object.
         *
         * @param {Object}  base
         * @param {String}  path
         * @param {Object}  value
         *
         * @return {Object}
         * @private
         */
        _patch: function( base, path, value ) {
            var o = base,
                self = this,
                i, keys;
    
            if ( path === "/" ) {
                clearProperties( o );
    
                keys = objectKeys( value );
    
                for ( i = 0; i < keys.length; i++ ) {
                    setProperty( o, keys[ i ], getProperty( value, keys[ i ] ) );
                }
            } else {
                pathForEach( path, function( key, isLeaf ) {
                    if ( isLeaf ) {
                        setProperty( o, key, value );
                    } else if ( !o.hasOwnProperty( key ) ) {
                        setProperty( o, key, this._deserialise( {} ) );
                    }
    
                    o = getProperty( o, key );
                });
            }
    
            return base;
        },
    
        /**
         * @private
         */
        _deserialise: function( data ) {
            if ( typeof this.deserialiser === "function" ) {
                data = this.deserialiser( data );
            }
    
            return data;
        },
    
        /**
         * Synchronous version of MemoryStore.read(), which simulates
         * asynchronicity.
         *
         * @param   {String}  path
         *
         * @return  {Object}
         * @private
         */
        _readSync: function( path ) {
            var o = this.store,
                value;
    
            pathForEach( path, function( key, isLeaf ) {
                if ( !o ) {
                    value = null;
                    return;
                }
    
                o = getProperty( o, key );
    
                if ( isLeaf ) {
                    value = o;
                }
            });
    
            return value;
        }
    };
    
    _.extend( MemoryStore, EventEmitter.prototype );
    
    // Enable support in both Node.js and browser environments.
    if ( typeof window === "undefined" ) {
        module.exports = MemoryStore;
    }
    
    return MemoryStore;
    
})(
    typeof window === "undefined" ? require( "underscore" ) : _,
    typeof window === "undefined" ? require( "events" ).EventEmitter : EventEmitter,
    typeof window === "undefined" ? require( "../util/binding" ) : Binding
)
