/*! modelsync - v0.0.1 - 2012-11-12
* Copyright (c) 2012 Richard Butler; Licensed  */

var ModelSync = (function( _, EventEmitter ) {

var Binding = (function( EventEmitter ) {

    /**
     * Create a callback from a destination and a property key.
     *
     * @param {Object|Function} destination
     * @param {String}          [destinationProperty]
     */
    function callbackFor( destination, destinationProperty ) {
        if ( destination ) {
            if ( typeof destinationProperty === "function" ) {
                return function( value ) {
                    destinationProperty.call( destination, value );
                }
            }
            else if ( destinationProperty ) {
                return function( value ) {
                    destination[ destinationProperty ] = value;
                }
            } else if ( typeof destination === "function" ) {
                return destination;
            }
        }
    
        return null;
    }
    
    /**
     * Builds an array of objects in a binding chain.
     *
     *      var o1 = { foo: "bar" }, o2 = { prop: o1 };
     *      buildChain( o2, "prop.foo" ); // [ o2, o1 ]
     *
     * @param {Object} source
     * @param {String} chain
     */
    function buildChain( source, chain ) {
        var o = source,
            oChain = [ source ],
            oProp;
    
        chain = chain.concat();
    
        while( o ) {
            oProp = chain.shift();
    
            if ( oProp && chain.length > 0 ) {
                o = getPropertyValue( o, oProp );
                oChain.push( o );
            } else {
                break;
            }
        }
    
        return oChain;
    }
    
    function isBindable( o ) {
        return o.__proto__ === Bindable || o.prototype === Bindable;
    }
    
    function getPropertyValue( o, key ) {
        if ( isBindable( o ) ) {
            return o.get( key );
        }
    
        return o[ key ];
    }
    
    function serialise( data ) {
        var key, serialised;
    
        if ( isBindable( data ) ) {
            serialised = {};
    
            for ( key in data.attributes ) {
                serialised[ key ] = serialise( data.get( key ) );
            }
    
            return serialised;
        }
    
        return data;
    }
    
    /**
     * Bindable is an object wrapper that fires events when properties change.
     */
    var Bindable = Object.create( EventEmitter.prototype, {
        get: {
            enumerable: false,
            value: function( prop ) {
                if ( !this.attributes ) {
                    this.attributes = {};
                }
    
                return this.attributes[ prop ];
            }
        },
        set: {
            enumerable: false,
            value: function( prop, value ) {
                if ( !this.attributes ) {
                    this.attributes = {};
                }
    
                this.attributes[ prop ] = value;
                this.emit( "change:" + prop, value );
            }
        },
        toJSON: {
            enumerable: false,
            value: function() {
                return serialise( this );
            }
        },
        hasOwnProperty: {
            enumerable: false,
            value: function( key ) {
                return this.attributes && this.attributes.hasOwnProperty( key );
            }
        }
    });
    
    var Binding = {
    
        Bindable: Bindable,
        isBindable: isBindable,
    
        /**
         * Binds a source property to a destination property.
         *
         * @param {Object}          source
         * @param {String}          sourceProperty
         * @param {Object|Function} destination
         * @param {String}          [destinationProperty]
         */
        bind: function( source, sourceProperty ) {
            var destination, destinationProperty,
                event = "change:" + sourceProperty,
                callback;
    
            if ( arguments.length >= 3 ) {
                destination = arguments[ 2 ];
    
                if ( arguments.length >= 4 ) {
                    destinationProperty = arguments[ 3 ];
                }
            }
    
            callback = callbackFor( destination, destinationProperty );
    
            if ( callback !== undefined ) {
                source.on( event, callback );
                callback( source[ sourceProperty ] );
            }
        },
    
        /**
         * Creates a complex binding based on a string representation of a
         * binding chain.
         *
         * @param {Object} source
         * @param {Object} chainString
         */
        bindString: function( source, chainString ) {
            var destination, destinationProperty,
                chain, event, callback, o, oProp, i,
                chainArr = chainString.split( "." );
    
            if ( arguments.length >= 3 ) {
                destination = arguments[ 2 ];
    
                if ( arguments.length >= 4 ) {
                    destinationProperty = arguments[ 3 ];
                }
            }
    
            callback = callbackFor( destination, destinationProperty );
    
            function evaluate() {
                var value;
    
                chain = buildChain( source, chainArr );
    
                if ( callback !== undefined ) {
                    try {
                        for ( i = 0; i < chain.length; i++ ) {
                            o = chain[ i ];
                            oProp = chainArr[ i ];
                            o.on( "change:" + oProp, changed );
                        }
    
                        value = getPropertyValue( o, oProp );
                    } catch( e ) {
                        value = null;
                    }
    
                    callback( value );
                }
            }
    
            function changed( value ) {
                for ( i = 0; i < chain.length; i++ ) {
                    o = chain[ i ];
                    oProp = chainArr[ i ];
    
                    if ( o ) {
                        o.removeListener( "change:" + oProp, changed );
                    }
                }
    
                evaluate();
            }
    
            evaluate();
        },
    
        /**
         * Proxy method for Object.create(), which creates getters and setters
         * for all properties to enable bindability.
         *
         * @param {Object} proto
         * @param {Object} attributes
         */
        createObject: function( attributes ) {
            var o, key, value;
    
            o = Object.create( Bindable );
    
            for ( key in attributes ) {
                value = attributes[ key ];
    
                if ( typeof value === "object" &&
                  !( value instanceof Array ) &&
                     value.hasOwnProperty !== undefined ) {
                    value = this.createObject( value );
                }
    
                o.set( key, value );
            }
    
            return o;
        }
    }
    
    if ( typeof window === "undefined" ) {
        module.exports = Binding;
    }
    
    return Binding;
    
})(
    typeof window === "undefined" ? require( "events" ).EventEmitter : EventEmitter
);
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

var ModelSync = {

    Binding: Binding,
    MemoryStore: MemoryStore,

    /**
     * Initial storage for the store.
     */
    store: MemoryStore,

    /**
     * Synchronise with a client socket's events.
     *
     * Accepts "state" event, which takes a state-of-the-world
     * initialisation; and "save", which simply patches a save to the data
     * store.
     *
     * @param {Socket}  socket
     */
    listen: function( socket ) {
        var self = this;

        socket.on( "state", function( data ) {
            self.store.save( "/", data );
        });

        socket.on( "save", function( path, data ) {
            self.store.save( path, data );
        });
    },

    /**
     * Binds to a path on the store.
     *
     * @see Binding.bindString
     *
     * @param {Object}          path
     * @param {Object|Function} destination
     * @param {String}          [destinationProperty]
     */
    bind: function( path, destination, destinationProperty ) {
        var args = Array.prototype.slice.call( arguments );
        args.unshift( this.store.store );

        Binding.bindString.apply( Binding, args );
    }

};

ModelSync.store.init( {}, function( data ) {
    return Binding.createObject( data );
});

return ModelSync; })( window._, window.EventEmitter )
