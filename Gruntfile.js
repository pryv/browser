
module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      main: {
        src: ['./source/tree.js'],
        dest: 'dist/app_bundle_main.js',
        options: {
          alias: ['./source/tree.js:SampleApp']
        }
      }
    },
    watch: {
      all: {
        files: ['source/**/*.*'],
        tasks: ['browserify']
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
