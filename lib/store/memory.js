(function() {

    var Binding = typeof window === "undefined" ?
        require( "../util/binding" ) : window.Binding;

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
    
    var MemoryStore = {

        /**
         * A processor can be used as "middleware" for data that is returned
         * from the server, i.e.
         * 
         *      MemoryStore.processor = function( data ) {
         *          // Do some stuff with, and return, data.
         *      }
         */
        processor: null,

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
        
            this._patch( o, path, data );
            
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
         *      MemoryStore.store = {
         *          path: {
         *              to: {
         *                  thing: {
         *                      foo: "bar"
         *                  }
         *              }
         *          }
         *      };
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
         *      MemoryStore.store = {
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
         *      };
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
                o = {};
                
                while ( paths.length ) {
                    path = paths.shift();
                    value = this._readSync( path );
                    this._patch( o, path, value );
                }
            }
            
            callback( o );
        },

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
                var d = data;
                
                if ( typeof self.processor === "function" ) {
                    data = self.processor( data );
                }
                
                console.log( "got state", data, d );
                
                self.store = data;
            });
            socket.on( "save", function( path, data ) {
                if ( typeof self.processor === "function" ) {
                    data = self.processor( data );
                }
                
                console.log( "saving", data, "into", self.store, "at", path );
                
                self.save( path, data );
            });
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
                self = this;
            
            pathForEach( path, function( key, isLeaf ) {
                if ( isLeaf ) {
                    self._setProperty( o, key, value );
                } else if ( !o.hasOwnProperty( key ) ) {
                    self._setProperty( o, key, {} );
                }
                
                o = o[ key ];
            });
            
            return base;
        },
        
        _setProperty: function( o, key, value ) {
            // TODO: Better test for EventEmitter
            if ( typeof o.on === "function" ) {
                Binding.createBindableProperty( o, key, value );
                console.log( "created [bindable]", key, "on", o );
            } else {
                o[ key ] = value;
                console.log( "created", key, "on", o );
            }
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
                
                o = o[ key ];
                
                if ( isLeaf ) {
                    value = o;
                }
            });
            
            return value;
        }
    };

    // Enable support in both Node.js and browser environments.
    if ( typeof window === "undefined" ) {
        module.exports = MemoryStore;
    } else {
        window.MemoryStore = MemoryStore;
    }
    
})();