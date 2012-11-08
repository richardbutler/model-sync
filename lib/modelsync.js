var EventEmitter    = require( "events" ).EventEmitter,
    async           = require( "async" ),
    _               = require( "underscore" ),
    socket          = require( "./net/socket" ),
    store           = require( "./store/memory" ),
    auth            = require( "./auth/memory" ),
    Binding         = require( "./util/binding" );

socket.processor = function( data ) {
    if ( data.__proto__ === Binding.Bindable ) {
        return data.serialise();
    }
    
    return data;
}

var ModelSync = Object.create( EventEmitter.prototype );

/**
 * Listen to an HTTP server instance for connections.
 *
 * @param {HTTP}    server
 * @param {Store}   sessionStore
 *
 * @return {*}
 */
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
                            state = socket.process( state );
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

/**
 * Save changes from socket into the store.
 *
 * @param {String}      path
 * @param {Object}      data
 * @param {Function}    callback
 */
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
