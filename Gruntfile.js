
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
            'source/styles/font-awesome.min.css',
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
          'source/vendor/jquery.details.min.js',
          'source/vendor/bootstrap.min.js',
          'source/vendor/require.js',
          'source/vendor/i18next-1.7.2.min.js',
          'source/vendor/jquery.flot.js',
          'source/vendor/jquery.flot.time.js',
          'source/vendor/jquery.flot.curvedLines.js',
          'source/vendor/jquery.flot.navigate.js',
          'source/vendor/jquery.flot.pie.js',
          'source/vendor/md5.js'],
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
            cwd: 'source/locales/',
            src: '**',
            dest: 'dist/locales/'
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
            src: 'source/vendor/airbrake-shim.js',
            dest: 'dist/script/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/favicon.ico',
            dest: 'dist/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/robots.txt',
            dest: 'dist/'
          },
          {
            expand: true,
            flatten: true,
            filter: 'isFile',
            src: 'source/apple-touch-icon.png',
            dest: 'dist/'
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
      prod: {
        NODE_ENV : 'PRODUCTION'
      },
      staging : {
        NODE_ENV : 'STAGING'
      }
    },
    preprocess : {
      dev : {
        src : 'source/index.html',
        dest : 'dist/index.html',
        options : {
          context: {
            version: 'v<%= pkg.version %>'
          }
        }
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
          context: {
            version: 'v<%= pkg.version %>'
          }
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
  grunt.registerTask('production',
    ['jshint', 'env:prod', 'browserify',
      'cssmin', 'concat', 'copy', 'preprocess:staging']);

  // Deprecated
  grunt.registerTask('local',
    ['jshint', 'env:dev', 'browserify',
      'cssmin', 'concat', 'copy', 'preprocess:dev']);
};
