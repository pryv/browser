var Backbone = require('backbone');

module.exports = Backbone.Model.extend({
  defaults: {
    event: null,
    selected: false,
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
  }
});