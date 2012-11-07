function getRoomsForUser( user, callback ) {
    var roomsByUser = {
        "test@test.com": [
            "/test/path1"
        ]
    };
    
    return callback( roomsByUser[ user ] );
}

function userCanAccess( user, path, callback ) {
    getRoomsForUser( user, function( rooms ) {
        var canAccess = false;
        
        if ( rooms ) {
            rooms.forEach( function( room ) {
                if ( path.indexOf( room ) === 0 ) {
                    canAccess = true;
                }
            });
        }
        
        return callback( canAccess );
    });
}

module.exports.getRoomsForUser = getRoomsForUser;
module.exports.userCanAccess = userCanAccess;