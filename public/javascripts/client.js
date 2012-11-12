(function() {
    var socket  = io.connect();
    
    ModelSync.listen({
        socket: socket,
        viewSelector: ".view",
        viewScopes: {
            "main-view": function( view ) {
                console.log( "**** VIEWSCOPE CREATE", view );

                var scope = {
                    emit: function() {
                        console.log( "---- emit" );

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

    ModelSync.on( "state", function() {
        //var mainView = ModelSync.getView( "main-view" );
        //mainView.emit();
    });

    /*socket.on( "save", function( e ) {
        g.innerHTML += e.path + ": " + e.data[ Object.keys( e.data )[ 0 ] ] + "<br>";
    });*/
   
    /*ModelSync.bind( "test.path1.foo.thing", g, "innerHTML" );
    ModelSync.bind( "test.path1.foo.thing", function( value ) {
        console.log( "value updated", value );
    });*/
    
})();
