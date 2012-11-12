/*global module:false*/
module.exports = function ( grunt ) {

    // Project configuration.
    grunt.initConfig( {
        pkg: '<json:package.json>',
        meta: {
            banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
        },
        opt: {
            prefix: 'var ModelSync = (function( _, EventEmitter ) {',
            suffix: 'return ModelSync; })( window._, window.EventEmitter )'
        },
        concat: {
            dist: {
                src: [
                    '<banner:meta.banner>',
                    '<banner:opt.prefix>',
                    'lib/util/binding.js',
                    'lib/store/memory.js',
                    'lib/modelsync-client.js',
                    '<banner:opt.suffix>'
                ],
                dest: 'public/javascripts/modelsync-client.js'
            }
        },
        min: {
            dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'public/javascripts/modelsync-client.min.js'
            }
        }
    } );

    // Default task.
    grunt.registerTask( 'default', 'concat min' );

};
