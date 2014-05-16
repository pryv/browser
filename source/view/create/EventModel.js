/* global FormData */
var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null
  },
  save: function () {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, function () {
        //  console.log('trash event callback', arguments);
      });
    }
    event.update(function () {
      //  console.log('update event callback', arguments);
    });
  },
  create: function (callback, progressCallback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      event.connection.events.createWithAttachment(event, file, callback, progressCallback);
    }  else {
      event.connection.events.create(event, callback);
    }
  },
  addAttachment: function (file) {
    var data = new FormData();
    data.append(file.name.split('.')[0], file);
    this.get('event').file = data;
    this.get('event').previewFile = file;
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  }
});