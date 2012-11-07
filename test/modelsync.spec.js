/* TODO: Mock socket.io events.

var express         = require('express'),
    http            = require('http'),
    app             = express(),
    server          = http.createServer(app),
    MemoryStore     = require('connect/lib/middleware/session').MemoryStore,
    sessionStore    = new MemoryStore,
    sync            = require( "../lib/modelsync" ),
    request         = require( "supertest" ),
    io              = require( 'socket.io-client' );

app.use(express.cookieParser());
app.use(express.session({
    key: "connect.sid",
    secret: 'SUPER_SECRET_KEY',
    store: sessionStore
}));
app.listen( 9898 );

var socket = io.connect( "http://localhost:9898" );

describe( "model sync", function() {

    it( "should connect and subscribe", function( done ) {
        sync.listen( server, sessionStore );
    });

});
*/