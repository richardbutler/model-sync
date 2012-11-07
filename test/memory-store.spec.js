describe( "memory store", function() {
    
    var MemoryStore = require( "../lib/store/memory" );
    
    beforeEach( function() {
        MemoryStore.store = {
            path: {
                to: {
                    foo: "bar"
                },
                another: "thing",
                stuff: "wotsit"
            },
            wotsit: {
                cheesy: "thingy",
                stuff: {
                    those: "things",
                    one: 1,
                    two: 2
                }
            }
        };
    });
    
    it( "should read a value from the store", function() {
        expect( MemoryStore._readSync( "/path/to/foo" ) ).toBe( "bar" );
        expect( MemoryStore._readSync( "/path/another" ) ).toBe( "thing" );
        expect( MemoryStore._readSync( "/path/doesnt/exist" ) ).toBe( null );
    });
    
    it( "should patch values onto an existing object", function() {
        var o1 = { thing: "stuff" },
            o2 = MemoryStore._patch( o1, "/one/two", "three" );
        
        expect( o2.one ).toEqual( jasmine.any( Object ) );
        expect( o2.one.two ).toBe( "three" );
        
        o2 = MemoryStore._patch( o1, "/thing", { something: "else" } );
        
        expect( o2.thing ).toEqual( jasmine.any( Object ) );
        expect( o2.thing.something ).toBe( "else" );
    });
    
    it( "should overwrite values on an existing object", function( done ) {
        MemoryStore.save( "/path/to", "newvalue", function() {
            expect( MemoryStore._readSync( "/path/to" ) ).toBe( "newvalue" );
            done();
        });
    });
    
    it( "should read several paths into an object", function( done ) {
        
        MemoryStore.read([
            "/path/to/foo",
            "/path/stuff",
            "/wotsit/stuff"
        ],
        function( data ) {
            expect( data.path.to ).toEqual( jasmine.any( Object ) );
            expect( data.path.to.foo ).toBe( "bar" );
            expect( data.path.stuff ).toBe( "wotsit" );
            expect( data.wotsit.stuff ).toEqual( jasmine.any( Object ) );
            expect( data.wotsit.stuff.those ).toBe( "things" );
            expect( data.wotsit.stuff.one ).toBe( 1 );
            expect( data.wotsit.stuff.two ).toBe( 2 );
            
            done();
        });
    });
    
});
