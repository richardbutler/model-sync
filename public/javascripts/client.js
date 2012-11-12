(function() {
    var socket  = io.connect(),
        g       = document.getElementById( "global" );
    
    ModelSync.listen({
        socket: socket,
        viewSelector: ".view",
        viewScopes: {
            "main-view": function( view, node ) {
                var scope = {
                    emit: function() {
                        console.log( "emit", node );
                        
                        function callback( err ) {
                            if ( err ) {
                                return console.log( "Error:", err );
                            }
                            
                            console.log( "Save successful", ModelSync.store.store );
                        }
                        
                        socket.emit( "save", "/test/path1/foo", { thing: "stuff" }, callback );
                        //socket.emit( "save", "/test/path2/foo", { wotsit: "thingy" }, callback );
                        
                        scope.vars.get( "testData" ).set( "test", "test-data-2" );
                        scope.vars.set( "funcVal", "test-func-2" );
                        scope.vars.emit( "change:testFunc", "test-func-2" );
                        
                        console.log( "testData", scope.vars.get( "testData" ) );
                    },
                    vars: ModelSync.Binding.createObject({
                        testData: {
                            test: "test-data"
                        },
                        funcVal: "test-func",
                        testFunc: function() {
                            return scope.vars.get( "funcVal" );
                        }
                    })
                };
                
                return scope;
            }
        }
    });
    
    /*socket.on( "save", function( e ) {
        g.innerHTML += e.path + ": " + e.data[ Object.keys( e.data )[ 0 ] ] + "<br>";
    });*/
   
    /*ModelSync.bind( "test.path1.foo.thing", g, "innerHTML" );
    ModelSync.bind( "test.path1.foo.thing", function( value ) {
        console.log( "value updated", value );
    });*/
    
})();
