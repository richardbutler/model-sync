var io = require( "socket.io" ),
    cookie = require( "cookie" ),
    Session = require('connect').middleware.session.Session,
    socket;

exports.listen = function listen( server, sessionStore ) {
    socket = io.listen( server );
    socket.configure( function() {
        socket.set( "authorization", function( data, callback ) {
            if ( data.headers.cookie ) {
                data.cookie = cookie.parse( data.headers.cookie );
                data.sessionID = data.cookie[ "connect.sid" ].split( "." )[ 0 ].split( ":" )[ 1 ];
                data.sessionStore = sessionStore;
                
                sessionStore.get( data.sessionID, function( err, session ) {
                    if ( err || !session ) {
                        callback( "User not logged in", false );
                    } else {
                        data.session = new Session( data, session );
                        callback( null, true );
                    }
                });
            } else {
                callback( "No cookie", false );
            }
        });
    });
    
    return socket;
}

exports.emit = function( event, path, data ) {
    var room, rooms = path.split( "/" );
    
    while ( rooms.length ) {
        room = rooms.join( "/" );
        
        if ( room !== "" ) {
            socket.sockets.in( room ).emit( event, path, data );
        }
        
        rooms.pop();
    }
}
