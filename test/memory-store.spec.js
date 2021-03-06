describe( "memory store", function() {
    
    var MemoryStore = require( "../lib/store/memory" ),
        Binding = require( "../lib/util/binding" );
    
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
        
        MemoryStore.store = Binding.createObject( MemoryStore.store );
        
        expect( MemoryStore._readSync( "/path/to/foo" ) ).toBe( "bar" );
        expect( MemoryStore._readSync( "/path/another" ) ).toBe( "thing" );
        expect( MemoryStore._readSync( "/path/doesnt/exist" ) ).toBe( null );
    });
    
    it( "should patch values onto an existing object", function() {
        var o1 = { thing: "stuff", thing2: "thing2" },
            o2 = MemoryStore._patch( o1, "/one/two", "three" );
        
        expect( o2.one ).toEqual( jasmine.any( Object ) );
        expect( o2.one.two ).toBe( "three" );
        expect( o1.thing2 ).toBe( "thing2" );
        
        o2 = MemoryStore._patch( o1, "/thing", { something: "else" } );
        
        expect( o2.thing ).toEqual( jasmine.any( Object ) );
        expect( o2.thing.something ).toBe( "else" );
        expect( o2.thing2 ).toBe( "thing2" );
    });
    
    it( "should patch values onto an existing object 2", function() {
        var o1 = {
                one: {
                    two: "two",
                    three: {
                        five: "five"
                    },
                    four: "four"
                }
            },
            o2 = { six: "six" };
        
        MemoryStore._patch( o1, "/one/four", o2 );
        
        expect( o1.one.two ).toBe( "two" );
        expect( o1.one.three.five ).toBe( "five" );
        expect( o1.one.four.six ).toBe( "six" );
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
    
    it( "should never overwrite the store with a new object", function() {
        var s = MemoryStore.store = Binding.createObject( MemoryStore.store );
        
        MemoryStore.save( "/", Binding.createObject( { foo: "bar" } ) );
        
        expect( MemoryStore.store ).toBe( s );
        expect( MemoryStore.store.get( "foo" ) ).toBe( "bar" );
    });
    
});
