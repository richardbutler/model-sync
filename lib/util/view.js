var View = (function() {

    var selector,
        viewIdAttr,
        attrPrefix;

    // TODO: Auto-add views when added to the DOM; i.e. listen for creation
    // events. JCade?

    function binding( viewScope ) {
        return function bind( value, node ) {
            var args = [ node ];

            if ( typeof node !== "function" ) {
                args.push( "textContent" );
            }

            if ( value.substr( 0, 5 ) === "this." ) {
                ModelSync.Binding.bindString.apply(
                    ModelSync.Binding,
                    [ viewScope, value.substr( 5 ) ].concat( args ) );
            } else {
                ModelSync.bind.apply(
                    ModelSync,
                    [ value ].concat( args ) );
            }
        };
    }

    function initScope( viewScope ) {

        return function initNode( node ) {

            var name = node.nodeName,
                bind = binding( viewScope ),
                value = String( node.textContent ).trim(),
                isNode = node.nodeType === 1,
                $node = $( node ),
                $children = isNode ? $node.children() : null,
                hasPrefix = name.indexOf( attrPrefix ) === 0,
                handler;

            if ( hasPrefix ) {
                name = name.replace( attrPrefix, "" );
            }

            // Data binding attribute
            if ( value.charAt( 0 ) === "{" && ( !node.children || node.children.length === 0 ) ) {

                // Strip braces.
                value = value.substring( 1, value.length - 1 ).trim();

                if ( hasPrefix && name && View.handlers.hasOwnProperty( name ) ) {
                    handler = View.handlers[ name ];
                    handler.call( this, {
                        name: name,
                        node: node,
                        value: value,
                        viewScope: viewScope,
                        initNode: initNode,
                        bind: bind
                    });
                } else {
                    bind( value, node );
                }

                // Attribute with UI event(s).
            } else if ( !isNode && hasPrefix ) {

                if ( !viewScope ) {
                    console.log( "WARN: Could not bind " + name + " as there is no view scope supplied." );
                    return;
                }

                value = new Function( value );

                $( node.ownerElement ).bind( name, function() {
                    value.apply( viewScope );
                });

            }

            if ( isNode ) {
                if ( node.attributes ) {
                    Array.prototype.slice.apply( node.attributes ).forEach( initNode );
                }

                if ( $children ) {
                    $children.each( function() {
                        initNode( this );
                    });
                }
            }
        };
    }

    var View = {

        idTable: {},

        handlers: {
            each: function( options ) {
                var owner = options.node.ownerElement,
                    parent = owner.parentNode,
                    tmpl = $( owner ).html();

                options.bind( options.value, function( value ) {
                    $( parent ).empty();

                    if ( value ) {
                        value.forEach( function( item ) {
                            var el = $( tmpl ).get( 0 );

                            options.initNode( el, options.viewScope );

                            $( parent ).append( el );
                        });
                    }
                });
            }
        },

        /**
         * Perform a blanket setup based on view options.
         *
         * Expects:
         *
         *      View.setup({
         *          selector: ".view",          // Blanket selector for DOM views
         *          idAttribute: "id",          // For view IDs
         *          attributePrefix: "data-"    // For events
         *      });
         *
         * @param {Object} options
         */
        setup: function( options ) {
            selector    = options.selector          || ".view";
            viewIdAttr  = options.idAttribute       || "id";
            attrPrefix  = options.attributePrefix   || "data-";

            $( selector ).each( function() {
                View.setupView( this );
            });
        },

        /**
         * Sets up a single view. Expects a DOM element or jQuery object.
         *
         * @param {Object} view
         */
        setupView: function( view ) {
            var $view = $( view ),
                id, viewScope, initNode;

            if ( !$view.length ) {
                return;
            }

            id = $view.attr( viewIdAttr );
            viewScope = ModelSync.viewScopes[ id ];

            // Allow a closure or vanilla object for view scopes. If it's a
            // function, pass the view and the node into it.
            viewScope = typeof viewScope === "function" ? viewScope( $view ) : viewScope;

            this.idTable[ id ] = viewScope;

            initNode = initScope( viewScope );
            initNode( view );
        },

        /**
         * Gets a view's scope by ID.
         *
         * @param  {String} id
         * @return {Object}
         */
        get: function( id ) {
            return this.idTable[ id ];
        }

    };

    return View;

})();