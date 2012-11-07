var EventEmitter    = require( "events" ).EventEmitter,
    async           = require( "async" ),
    _               = require( "underscore" ),
    socket          = require( "./net/socket" ),
    store           = require( "./store/memory" ),
    auth            = require( "./auth/memory" );

var ModelSync = Object.create( EventEmitter.prototype );

ModelSync.listen = function( server, sessionStore ) {
    var s = socket.listen( server, sessionStore ),
        self = this;
    
    s.on( "connection", function( sock, callback ) {
        var session = sock.handshake.session,
            user = session.user;
        
        session.touch().save();
        
        auth.getRoomsForUser( user, function( rooms ) {
            if ( rooms ) {
                async.series([
                    function( done ) {
                        async.forEach( rooms, function( room, callback ) {
                            sock.join( room, callback );
                        },
                        done );
                    },
                    function( done ) {
                        store.read( rooms, function( state ) {
                            sock.emit( "state", state );
                            done();
                        });
                    }
                ],
                callback );
            }
            
            sock.on( "save", function( path, data, done ) {
                auth.userCanAccess( user, path, function( canAccess ) {
                    if ( canAccess ) {
                        return self.save( path, data, done );
                    } else {
                        return done( "Save rejected: user has no access to this room." );
                    }
                });
            });
        });
    });
    
    return this;
}

ModelSync.save = function( path, data, callback ) {
    store.save( path, data, function( err ) {
        if ( err ) {
            return callback( err );
        }
        socket.emit( "save", path, data );
        callback();
    });
}

module.exports = ModelSync;
