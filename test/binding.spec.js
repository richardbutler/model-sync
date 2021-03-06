var EventEmitter = require( "events" ).EventEmitter,
    Binding = require( "../lib/util/binding" );

describe( "binding", function() {
    
    var source;
    
    beforeEach( function() {
        source = Object.create( EventEmitter.prototype, {
            prop: {
                get: function() {
                    return this._prop;
                },
                set: function( value ) {
                    this._prop = value;
                    this.emit( "change:prop", value );
                }
            }
        });
    });
    
    describe( "bind", function() {
        it( "should bind a simple property", function() {
            var o1 = {};
            
            Binding.bind( source, "prop", o1, "dest" );
            
            source.prop = "one";
            
            expect( source.prop ).toBe( "one" );
            expect( o1.dest ).toBe( "one" );
            
            source.prop = "two";
            
            expect( o1.dest ).toBe( "two" );
        });
        
        it( "should bind a function", function() {
            var called,
                callback = function( value ) {
                    called = value;
                };
            
            Binding.bind( source, "prop", callback );
            
            source.prop = "one";
            
            expect( called ).toBe( "one" );
        });
        
        it( "should bind a method", function() {
            var called,
                o1 = {
                    callback: function( value ) {
                        called = value;
                    }
                };
            
            Binding.bind( source, "prop", o1, o1.callback );
            
            source.prop = "one";
            
            expect( called ).toBe( "one" );
        });
        
        it( "should one-time bind a non-bindable property", function() {
            var o = {
                    thing: "test",
                    thing2: {
                        one: "two"
                    }
                },
                o1 = {};
            
            Binding.bind( o, "thing", o1, "thing_" );
            expect( o1.thing_ ).toBe( "test" );
            
            Binding.bindString( o, "thing2.one", o1, "two_" );
            expect( o1.two_ ).toBe( "two" );
            
            o.thing2 = Binding.createObject( o.thing2 );
            Binding.bindString( o, "thing2.one", o1, "three_" );
            expect( o1.three_ ).toBe( "two" );
            o.thing2.set( "one", "four" );
            expect( o1.three_ ).toBe( "four" );
        });
    });
    
    describe( "bindString", function() {
        it( "should bind to a complex structure", function() {
            var o  = Object.create( source ),
                o1 = Object.create( source ),
                o2 = Object.create( source ),
                o3 = Object.create( source ),
                dest = {};
            
            o._id = "o";
            o1._id = "o1";
            o2._id = "o2";
            o3._id = "o3";
            
            o.prop = o1;
            o1.prop = o2;
            o2.prop = "abcd";
            
            Binding.bindString( o, "prop.prop.prop", dest, "dest" );
            expect( dest.dest ).toBe( "abcd" );
            
            o2.prop = "bcde";
            expect( dest.dest ).toBe( "bcde" );
            
            o.prop = o3;
            o3.prop = o2;
            o2.prop = "cdef";
            expect( dest.dest ).toBe( "cdef" );
            expect( o1._events ).toEqual( {} );
            // o, o3, o2, "cdef"
            
            o3.prop = o1;
            o1.prop = o2;
            expect( dest.dest ).toBe( o2 );
            
            o1.prop = "ghij";
            expect( dest.dest ).toBe( "ghij" );
            // o, o3, o1, "ghij"
        });
    });
    
    describe( "createObject", function() {
        it( "should create a bindable object", function() {
            var called,
                o = Binding.createObject({
                    foo: "bar",
                    zzz: {
                        aaa: "bbb"
                    }
                });
            
            expect( o.get( "foo" ) ).toBe( "bar" );
            
            Binding.bind( o, "foo", function( value ) {
                called = value;
            });
            
            o.set( "foo", "baz" );
            expect( called ).toBe( "baz" );
            called = null;
            
            Binding.bindString( o, "zzz.aaa", function( value ) {
                called = value;
            });
            
            o.get( "zzz" ).set( "aaa", "ccc" );
            expect( called ).toBe( "ccc" );
            
            o.set( "zzz", "ddd" );
            expect( o.get( "zzz" ) ).toBe( "ddd" );
        });
    });
    
    describe( "BindableArray", function() {
        var arr;
        
        beforeEach( function() {
            arr = Binding.createObject( [ 1, 2, 3, 4 ] );
        });
        
        it( "should push", function() {
            var called = false;
            
            arr.on( "add", function( items, index ) {
                called = true;
                
                expect( items ).toEqual( [ 5, 6 ] );
                expect( index ).toBe( 4 );
            });
            
            arr.push( 5, 6 );
            
            expect( called ).toBe( true );
        });
        
        it( "should pop", function() {
            var called = false;
            
            arr.on( "remove", function( item ) {
                called = true;
            });
            
            arr.pop();
            
            expect( called ).toBe( true );
        });
        
        it( "should shift", function() {
            var called = false;
            
            arr.on( "remove", function( item, index ) {
                called = true;
                
                expect( item ).toBe( 1 );
                expect( index ).toBe( 0 );
            });
            
            arr.shift();
            
            expect( called ).toBe( true );
        });
    });
    
});
