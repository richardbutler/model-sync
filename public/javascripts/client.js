(function() {
    var store   = MemoryStore,
        socket  = io.connect(),
        g       = document.getElementById( "global" );
    
    store.store = {};
    store.processor = function( data ) {
        return Binding.createObject( data );
    };
    store.listen( socket );
    
    console.log( "Store", store.store );
    
    document.getElementById( "clicker" ).onclick = function() {
        function callback( err ) {
            if ( err ) {
                return console.log( "Error:", err );
            }
            
            console.log( "Save successful", store.store );
        }
        
        socket.emit( "save", "/test/path1/foo", { thing: "stuff" }, callback );
        //socket.emit( "save", "/test/path2/foo", { wotsit: "thingy" }, callback );
    }
    
    /*socket.on( "save", function( e ) {
        g.innerHTML += e.path + ": " + e.data[ Object.keys( e.data )[ 0 ] ] + "<br>";
    });*/
   
   Binding.bindString( store.store, "test.path1.foo.thing", g, "innerHTML" );
    
})();
