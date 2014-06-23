var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    collection: null,
    highlighted: false,
    checked: false
  },
  isEditPermission: function () {
    var event = this.get('event');
    if (!event.connection._accessInfo) {
      return false;
    }

    if (event.connection._accessInfo.type === 'personal') {
      return true;
    }
    if (event.connection._accessInfo.permissions &&
      event.connection._accessInfo.permissions[0].level !== 'read') {
      return true;
    } else {
      return false;
    }

    return false;
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
  save: function (callback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      this.get('event').addAttachment(file, callback);
    }
    event.update(callback);
  },
  create: function (callback) {
    var event = this.get('event'),
      file = event.file;
    if (file) {
      event.connection.events.createWithAttachment(event, file, callback);
    }  else {
      event.connection.events.create(event, callback);
    }
  },
  addAttachment: function (file) {
    this.get('event').file = file;
    console.log('addAttachment', file, this);
  },
  removeAttachment: function (fileName, callback) {
    this.get('event').removeAttachment(fileName, callback);
  },
  trash: function (callback) {
    this.get('event').trash(callback);
  }
});