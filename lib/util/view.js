var View = (function() {

    var selector,
        viewIdAttr,
        attrPrefix;

    // TODO: Auto-add views when added to the DOM; i.e. listen for creation
    // events. JCade?

    var View = {

        idTable: {},

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
                id, viewScope;

            if ( !$view.length ) {
                return;
            }

            id = $view.attr( viewIdAttr );
            viewScope = ModelSync.viewScopes[ id ];

            // Allow a closure or vanilla object for view scopes. If it's a
            // function, pass the view and the node into it.
            viewScope = typeof viewScope === "function" ? viewScope( $view ) : viewScope;

            this.idTable[ id ] = viewScope;

            function initNode( node ) {
                var name = node.nodeName,
                    value = String( node.textContent ).trim();

                // Data binding attribute
                if ( value.charAt( 0 ) === "{" ) {

                    value = value.substring( 1, value.length - 1 ).trim();

                    if ( value.substr( 0, 5 ) === "this." ) {
                        ModelSync.Binding.bindString( viewScope, value.substr( 5 ), node, "textContent" );
                    } else {
                        ModelSync.bind( value, node, "textContent" );
                    }

                    // Attribute with UI event(s).
                } else if ( name.indexOf( attrPrefix ) === 0 ) {

                    if ( !viewScope ) {
                        console.log( "WARN: Could not bind " + name + " as there is no " + id + " view scope." );
                        return;
                    }

                    name = name.replace( attrPrefix, "" );
                    value = new Function( value );

                    $( node.ownerElement ).bind( name, function() {
                        value.apply( viewScope );
                    });

                }

                if ( node.attributes ) {
                    Array.prototype.slice.apply( node.attributes ).forEach( initNode );
                }
            }

            $view.children().each( function() {
                initNode( this );
            });
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