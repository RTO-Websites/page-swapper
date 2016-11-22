module.exports = (grunt) ->
  require('load-grunt-tasks')(grunt)
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    appConfig:
      src: '/'
      dest: '/'
    uglify:
      dist:
        options:
          sourceMap: grunt.option 'devMode'
        files:
          'page-swapper.min.js': [
            'page-swapper.js'
            'psw.owl.js'
          ]

  # Register tasks
  grunt.registerTask 'default', ->
    taskList = [
      'uglify'
    ]

    grunt.task.run taskList