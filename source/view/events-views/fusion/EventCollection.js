var Backbone = require('backbone'),
  Model = require('./EventModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model,
  highlightedDate: null,
  comparator: function (a, b) {
    a = a.get('time');
    b = b.get('time');
    return a > b ? -1
      : a < b ? 1
      :          0;
  },
  getEventhighlighted: function (time) {
    this.highlightedDate = time;
    return this.min(this._getTimeDifference);
  },
  getTrashed: function () {
    return this.filter(this._getTrashed);
  },
  getEventById: function (id) {
    return this.findWhere({id : id});
  },
  getActive: function () {
    return this.reject(this._getTrashed);
  },
  _getTimeDifference: function (event) {
    return event.getTimeDifference(this.highlightedDate);
  },
  _getTrashed: function (event) {
    return event.isTrashed();
  }
});