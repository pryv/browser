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
    var event = this.get('event');
    event.update(function () {
      console.log('update event callback', arguments);
    });
  },
  addAttachment: function (file) {
    this.get('event').addAttachment(file, function () {
      console.log('trash event callback', arguments);
    });
  },
  trash: function () {
    this.get('event').trash(function () {
      console.log('trash event callback', arguments);
    });
  }
});