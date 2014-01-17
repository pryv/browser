
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
        tasks: ['env:dev', 'browserify', 'cssmin', 'concat', 'copy', 'preprocess:dev']
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
          'dist/styles/vendor.min.css': ['source/styles/bootstrap.min.css',
            'source/styles/bootstrap-responsive.min.css',
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
          'source/vendor/jquery.flot.time.js',
          'source/vendor/jquery.flot.navigate.js'],
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
            src: 'source/fonts/**',
            dest: 'dist/fonts/'
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
            src: 'source/styles/styles.css',
            dest: 'dist/styles/'
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
    },
    env : {
      options : {
        /* Shared Options Hash */
        //globalOption : 'foo'
      },
      dev: {
        NODE_ENV : 'DEVELOPMENT'
      },
      staging : {
        NODE_ENV : 'STAGING'
      },
      localStaging: {
        NODE_ENV : 'LOCAL_STAGING'
      }
    },
    preprocess : {
      dev : {
        src : 'source/index.html',
        dest : 'dist/index.html'
      },
      staging : {
        src : 'source/index.html',
        dest : 'dist/index.html',
        options : {
          /* Environement variable, access with:
           <!-- @echo name -->
          context : {
           name : 'foo'
           }   */
        }
      }
    },
    gitclone: {
      initrepo: {
        options: {
          repository: 'git@github.com:pryv/browser.git',
          branch: 'dev',
          directory: 'dist'
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
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-preprocess');
  grunt.loadNpmTasks('grunt-git');
  grunt.registerTask('setup',
    ['gitclone:initrepo']);




  // Default task.
  grunt.registerTask('default',
    ['jshint', 'env:dev', 'browserify',
      'cssmin', 'concat', 'copy', 'preprocess:dev']);
  grunt.registerTask('staging',
    ['jshint', 'env:staging', 'browserify',
      'cssmin', 'concat', 'copy', 'preprocess:staging']);
  grunt.registerTask('local',
    ['jshint', 'env:localStaging', 'browserify',
      'cssmin', 'concat', 'copy', 'preprocess:staging']);
};
