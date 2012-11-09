(function( exports ){
    
    var ModelSync = {
        
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
    
    ModelSync._store = MemoryStore;
    
    ModelSync.store.init( {}, function( data ) {
        return Binding.createObject( data );
    });
    
    window.ModelSync = ModelSync;
    
})();
// TODO: AMD compatibility
//})( typeof module === "undefined" ? ( window.ModelSync = {} ) : module.exports );