
module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      main: {
        src: ['./source/tree.js'],
        dest: 'dist/script/app_bundle_main.js',
        options: {
          alias: ['./source/tree.js:SampleApp']
        }
      }
    },
    watch: {
      all: {
        files: ['source/**/*.*'],
        tasks: ['browserify', 'cssmin', 'concat', 'copy']
      }
    },
    jshint: {
      files: ['gruntfile.js', 'source/**/*.js'],
      options: {
        ignores: ['source/vendor/*.js'],
        jshintrc: '.jshintrc'
      }
    },
    cssmin: {
      combine: {
        files: {
          'dist/styles/pryv.min.css': ['source/styles/bootstrap.min.css',
            'source/styles/bootstrap-responsive.min.css',
            'source/styles/styles.css',
            'source/styles/animate.css',
            'source/timeframe-selector/styles/main.css']
        }
      }
    },
    concat: {
      options: {
        stripBanners: true,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */'
      },
      dist: {
        src: ['source/vendor/jquery-1.9.1.js',
        'source/vendor/jquery-ui-1.10.3.custom.min.js',
        'source/vendor/bootstrap.min.js',
        'source/vendor/require.js',
        'source/vendor/jquery.flot.js',
        'source/vendor/jquery.flot.time.js'],
        dest: 'dist/script/vendor.js'
      }
    },
    copy: {
      media : {
        files: [
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/font/**',
            dest: 'dist/font/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/images/**',
            dest: 'dist/images/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/timeframe-selector/images/**',
            dest: 'dist/images/'
          }
        ]
      }
    },
    mochaTest: {
      test: {
        src: ['test/**/*.test.js'],
        options: {
          require: [ './test/blanket' ],
          reporter: 'spec'
        }
      },
      coverage: {
        src: ['test/**/*.test.js'],
        options: {
          quiet: true,
          reporter: 'html-cov',
          captureFile: 'test/coverage.html'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  // Default task.
  grunt.registerTask('default', ['jshint', 'browserify', 'cssmin', 'concat', 'copy']);
};
