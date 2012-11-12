var View = (function() {
    
    var selector,
        viewIdAttr,
        attrPrefix;
        
    // TODO: Auto-add views when added to the DOM; i.e. listen for creation
    // events. JCade?
    
    var View = {
        
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
            function viewScopeFor( node ) {
                return typeof viewScope === "function" ?
                    viewScope( view, node ) : viewScope;
            }
            
            function initNode( node ) {
                var name = node.nodeName,
                    value = String( node.textContent ).trim(),
                    scope;
                
                // Data binding attribute
                if ( value.charAt( 0 ) === "{" ) {
                    
                    value = value.substring( 1, value.length - 1 ).trim();
                    scope = viewScopeFor( node );
                    
                    if ( value.substr( 0, 5 ) === "this." ) {
                        console.log( "bind", value.substr( 5 ), "to", node, "within", scope );
                        
                        ModelSync.Binding.bindString( scope, value.substr( 5 ), node, "textContent" );
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
                    scope = viewScopeFor( node.ownerElement );
                    
                    $( node.ownerElement ).bind( name, function() {
                        value.apply( scope );
                    });
                    
                }
                
                if ( node.attributes ) {
                    Array.prototype.slice.apply( node.attributes ).forEach( initNode );
                }
            }
            
            $view.children().each( function() {
                initNode( this );
            });
        }
        
    };
    
    return View;

})();
