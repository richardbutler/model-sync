(function() {
    var socket  = io.connect(),
        g       = document.getElementById( "global" );
    
    var store = MemoryStore.store;
    
    ModelSync.listen( socket );
    
    document.getElementById( "clicker" ).onclick = function() {
        function callback( err ) {
            if ( err ) {
                return console.log( "Error:", err );
            }
            
            console.log( "Save successful", ModelSync.store.store );
        }
        
        socket.emit( "save", "/test/path1/foo", { thing: "stuff" }, callback );
        //socket.emit( "save", "/test/path2/foo", { wotsit: "thingy" }, callback );
    }
    
    /*socket.on( "save", function( e ) {
        g.innerHTML += e.path + ": " + e.data[ Object.keys( e.data )[ 0 ] ] + "<br>";
    });*/
   
    ModelSync.bind( "test.path1.foo.thing", g, "innerHTML" );
    ModelSync.bind( "test.path1.foo.thing", function( value ) {
        console.log( "value updated", value );
    });
    
})();
