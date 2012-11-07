exports.index = function(req, res) {
    // TODO: Move this to a login area.
    req.session.user = "test@test.com";
    
    res.sendfile( "views/index.html" );
};