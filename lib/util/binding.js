var Binding = (function( EventEmitter, _ ) {

    /**
     * Create a callback from a destination and a property key.
     *
     * @param {Object|Function} destination
     * @param {String}          [destinationProperty]
     */
    function callbackFor( destination, destinationProperty ) {
        if ( destination ) {
            if ( typeof destinationProperty === "function" ) {
                return function( value ) {
                    destinationProperty.call( destination, value );
                }
            }
            else if ( destinationProperty ) {
                return function( value ) {
                    destination[ destinationProperty ] = value;
                }
            } else if ( typeof destination === "function" ) {
                return destination;
            }
        }
    
        return null;
    }
    
    /**
     * Builds an array of objects in a binding chain.
     *
     *      var o1 = { foo: "bar" }, o2 = { prop: o1 };
     *      buildChain( o2, "prop.foo" ); // [ o2, o1 ]
     *
     * @param {Object} source
     * @param {String} chain
     */
    function buildChain( source, chain ) {
        var o = source,
            oChain = [ source ],
            oProp;
    
        chain = chain.concat();
    
        while( o ) {
            oProp = chain.shift();
    
            if ( oProp && chain.length > 0 ) {
                o = getPropertyValue( o, oProp );
                oChain.push( o );
            } else {
                break;
            }
        }
    
        return oChain;
    }
    
    function isBindable( o ) {
        return o &&
            ( o.__proto__ === Bindable      || o.prototype === Bindable ||
              o.__proto__ === BindableArray || o.prototype === BindableArray );
    }
    
    function getPropertyValue( o, key ) {
        var value;
        
        if ( !o ) {
            return null;
        }
        
        if ( isBindable( o ) ) {
            value = o.get( key );
        } else {
            value = o[ key ];
        }
        
        return typeof value === "function" ? value() : value;
    }
    
    function serialise( data ) {
        var key, serialised;
    
        if ( isBindable( data ) ) {
            serialised = {};
    
            for ( key in data.attributes ) {
                serialised[ key ] = serialise( data.get( key ) );
            }
    
            return serialised;
        }
    
        return data;
    }
    
    function warn() {
        if ( Binding.warn ) {
            console.log( Array.prototype.join.call( arguments, " " ) );
        }
    }
    
    /**
     * Bindable is an object wrapper that fires events when properties change.
     */
    var Bindable = Object.create( EventEmitter.prototype, {
        get: {
            enumerable: false,
            value: function( prop ) {
                if ( !this.attributes ) {
                    this.attributes = {};
                }
    
                return this.attributes[ prop ];
            }
        },
        set: {
            enumerable: false,
            value: function( prop, value ) {
                if ( !this.attributes ) {
                    this.attributes = {};
                }
    
                this.attributes[ prop ] = value;
                this.emit( "change:" + prop, value );
                this.emit( "change", prop, value );
            }
        },
        toJSON: {
            enumerable: false,
            value: function() {
                return serialise( this );
            }
        },
        hasOwnProperty: {
            enumerable: false,
            value: function( key ) {
                return this.attributes && this.attributes.hasOwnProperty( key );
            }
        }
    });
    
    /**
     * BindableArray is a proxy for Array that fires events when elements are
     * added or removed.
     */
    var BindableArray = Object.create( Array.prototype, {
        emitChange: {
            enumerable: false,
            value: function() {
                this.emit.apply( this, arguments );
                this.emit.apply( this, [ "change" ].concat( arguments ) );
            }
        },
        callArrayMethod: {
            enumerable: false,
            value: function( method, args ) {
                return Array.prototype[ method ].apply( this, args );
            }
        },
        push: {
            value: function() {
                var index = this.length,
                    value = this.callArrayMethod( "push", arguments );
                
                this.emitChange( "add", _.toArray( arguments ), index );
                
                return value;
            }
        },
        pop: {
            value: function() {
                var value = this.callArrayMethod( "pop", arguments );
                
                this.emitChange( "remove", value, this.length );
                
                return value;
            }
        },
        shift: {
            value: function() {
                console.log( "shift", this, arguments );
                
                var value = this.callArrayMethod( "shift", arguments );
                
                this.emitChange( "remove", value, 0 );
                
                return value;
            }
        },
        unshift: {
            value: function() {
                var value = this.callArrayMethod( "unshift", arguments );
                
                this.emitChange( "add", _.toArray( arguments ), 0 );
                
                return value;
            }
        },
        splice: {
            value: function( index, deleteCount ) {
                var value = this.callArrayMethod( "splice", arguments );
                
                this.emitChange( "remove", value, index );
                
                if ( arguments.length > 2 ) {
                    this.emitChange( "add", _.rest( arguments, 2 ), index );
                }
                
                return value;
            }
        },
        sort: {
            value: function() {
                var value = this.callArrayMethod( "sort", arguments );
                
                this.emitChange( "reset", value );
                
                return value;
            }
        },
    });
    
    _.extend( BindableArray, EventEmitter.prototype );
    
    var Binding = {
    
        Bindable: Bindable,
        BindableArray: BindableArray,
        
        isBindable: isBindable,
        warn: true,
    
        /**
         * Binds a source property to a destination property.
         *
         * @param {Object}          source
         * @param {String}          sourceProperty
         * @param {Object|Function} destination
         * @param {String}          [destinationProperty]
         */
        bind: function( source, sourceProperty ) {
            var destination, destinationProperty,
                event = "change:" + sourceProperty,
                callback;
    
            if ( arguments.length >= 3 ) {
                destination = arguments[ 2 ];
    
                if ( arguments.length >= 4 ) {
                    destinationProperty = arguments[ 3 ];
                }
            }
    
            callback = callbackFor( destination, destinationProperty );
    
            if ( callback !== undefined ) {
                if ( typeof source.on !== "undefined" ) {
                    source.on( event, callback );
                } else {
                    warn( "WARN: One-time binding only for '" + sourceProperty + "' as source is not a bindable object (EventEmitter)." );
                }
                
                callback( source[ sourceProperty ] );
            }
        },
    
        /**
         * Creates a complex binding based on a string representation of a
         * binding chain.
         *
         * @param {Object} source
         * @param {Object} chainString
         */
        bindString: function( source, chainString ) {
            var destination, destinationProperty,
                chain, event, callback, o, oProp, i,
                chainArr = chainString.split( "." );
    
            if ( arguments.length >= 3 ) {
                destination = arguments[ 2 ];
    
                if ( arguments.length >= 4 ) {
                    destinationProperty = arguments[ 3 ];
                }
            }
    
            callback = callbackFor( destination, destinationProperty );
    
            function evaluate() {
                var value;
    
                chain = buildChain( source, chainArr );
    
                if ( callback !== undefined ) {
                    try {
                        for ( i = 0; i < chain.length; i++ ) {
                            o = chain[ i ];
                            oProp = chainArr[ i ];

                            if ( o && typeof o.on !== "undefined" ) {
                                // Useful for debugging.
                                //(function( chain ) {
                                    o.on( "change:" + oProp, changed );
                                //})( chainArr.slice( 0, i ).join( "." ) );
                            }
                        }
    
                        value = getPropertyValue( o, oProp );
                    } catch( e ) {
                        warn( "WARN: Swallowed exception for", chainString + ":", String( e ) );
                        value = null;
                    }
    
                    callback( value );
                }
            }
    
            function changed( value ) {
                for ( i = 0; i < chain.length; i++ ) {
                    o = chain[ i ];
                    oProp = chainArr[ i ];
    
                    if ( o && typeof o.removeListener !== "undefined" ) {
                        o.removeListener( "change:" + oProp, changed );
                    }
                }
    
                evaluate();
            }
    
            evaluate();
        },
    
        /**
         * Proxy method for Object.create(), which creates getters and setters
         * for all properties to enable bindability.
         *
         * @param {Object} proto
         * @param {Object} attributes
         */
        createObject: function( attributes ) {
            var o, key, value, i,
                isArray = attributes instanceof Array;
    
            if ( isBindable( attributes ) ) {
                return attributes;
            }
    
            if ( isArray ) {
                o = Object.create( BindableArray );
                
                for ( i = 0; i < attributes.length; i++ ) {
                    o.push( attributes[ i ] );
                }
            } else {
                o = Object.create( Bindable );
        
                for ( key in attributes ) {
                    value = attributes[ key ];
        
                    if ( typeof value === "object" &&
                      !( value instanceof Array ) &&
                         value.hasOwnProperty !== undefined ) {
                        value = this.createObject( value );
                    }
        
                    o.set( key, value );
                }
            }
    
            return o;
        }
    }
    
    if ( typeof window === "undefined" ) {
        module.exports = Binding;
    }
    
    return Binding;
    
})(
    typeof window === "undefined" ? require( "events" ).EventEmitter : EventEmitter,
    typeof window === "undefined" ? require( "underscore" ) : _
);
