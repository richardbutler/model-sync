if ( typeof process !== "undefined" ) {
    EventEmitter = require( "events" ).EventEmitter;
}

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
    return o.__proto__ === Bindable || o.prototype === Bindable;
}

function getPropertyValue( o, key ) {
    if ( isBindable( o ) ) {
        return o.get( key );
    }

    return o[ key ];
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

var Binding = {

    Bindable: Bindable,
    isBindable: isBindable,

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
            source.on( event, callback );
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
                        o.on( "change:" + oProp, changed );
                    }

                    value = getPropertyValue( o, oProp );
                } catch( e ) {
                    value = null;
                }

                callback( value );
            }
        }

        function changed( value ) {
            for ( i = 0; i < chain.length; i++ ) {
                o = chain[ i ];
                oProp = chainArr[ i ];

                if ( o ) {
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
        var o, key, value;

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

        return o;
    }
}

if ( typeof window === "undefined" ) {
    module.exports = Binding;
} else {
    window.Binding = Binding;
}