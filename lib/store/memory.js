(function() {
    
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
        
        store: {
            test: {
                path1: {
                    items: [ 1, 2, 3, 4 ],
                    foo: {
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
        },
        
        save: function( path, data, callback ) {
            var o = this.store;
        
            this._patch( o, path, data );
            
            if ( callback ) {
                return callback();
            }
        },
        
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
        
        listen: function( socket ) {
            var self = this;
            
            socket.on( "state", function( data ) {
                self.store = data;
            });
            socket.on( "save", function( path, data ) {
                self.save( path, data );
            });
        },
        
        _patch: function( base, path, value ) {
            var o = base;
            
            pathForEach( path, function( key, isLeaf ) {
                if ( !o[ key ] ) {
                    if ( isLeaf ) {
                        o[ key ] = value;
                    } else {
                        o[ key ] = {};
                    }
                } else if ( isLeaf ) {
                    o[ key ] = value;
                }
                
                o = o[ key ];
            });
            
            return base;
        },
        
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
    }
    
    if ( typeof window === "undefined" ) {
        module.exports = MemoryStore;
    } else {
        window.MemoryStore = MemoryStore;
    }
    
})();