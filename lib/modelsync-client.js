var ModelSync = {

    Binding: Binding,
    MemoryStore: MemoryStore,
    View: View,
    
    /**
     * Default view options (passed to View.setup).
     */
    viewOptions: {
        selector: ".view",
        idAttribute: "id",
        attributePrefix: "data-"
    },

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
    listen: function( options ) {
        var self = this;
        
        _.extend( this, options );

        this.socket.on( "state", function( data ) {
            self.store.save( "/", data );
        });

        this.socket.on( "save", function( path, data ) {
            self.store.save( path, data );
        });
        
        this.View.setup( this.viewOptions );
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
