
module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      main: {
        /* TODO browserify configuration */
      }
    },
    watch: {
      all: {
        files: ['source/**/*.*'],
        tasks: ['default']
      }
    },
    jshint: {
      files: ['gruntfile.js', 'source/**/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task.
  grunt.registerTask('default', ['jshint', 'browserify']);
};
