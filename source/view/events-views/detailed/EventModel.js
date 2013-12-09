var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    highlighted: false,
    checked: false
  },
  getTimeDifference: function (time) {
    return Math.abs(time - this.get('event').time);
  },
  isTrashed: function () {
    return this.get('event').trashed;
  },
  setHighlighted: function (highlight) {
    this.set('highlighted', highlight);
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
  create: function () {
    console.log('CREATE', this);
    var event = this.get('event'),
      file = event.file;
    if (file) {
      event.connection.events.createWithAttachment(event, file);
    }  else {
      event.connection.events.create(event);
    }
  },
  addAttachment: function (file) {
    this.get('event').file = file;
    console.log('addAttachment', file, this);
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  },
  trash: function () {
    this.get('event').trash(function () {
    //  console.log('trash event callback', arguments);
    });
  }
});