var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    highlighted: false
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
    event.connection.events.update(event, function () {
      console.log(arguments);
    });
  }
});