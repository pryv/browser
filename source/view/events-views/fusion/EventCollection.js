var Backbone = require('backbone'),
  Model = require('./SeriesModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model,
  highlightedDate: null,
  currentElement: null,
  comparator: function (a, b) {
    a = a.get('events').time;
    b = b.get('events').time;
    return a > b ? -1
      : a < b ? 1
      : 0;
  },

  /* jshint -W098 */

  highlightEvent: function (time) {
    console.log('EventCollection', 'highlightEvent');
    /*
    var next =  this.getEventhighlighted(time);
    if (!next || next === Infinity) {
      return;
    }
    this.setCurrentElement(next);
    return next;
    */
  },
  getEventhighlighted: function (time) {
    console.log('EventCollection', 'highlightEvent');
    /*
    this.highlightedDate = time === Infinity ? 99999999999 : time;
    return this.min(this._getTimeDifference.bind(this));*/
  },
  getTrashed: function () {
    console.log('EventCollection', 'highlightEvent');
    /*
    return this.filter(this._getTrashed);*/
  },
  getEventById: function (id) {
    return this.find(function (e) {
      return e.get('events')[0].id === id;
    });
  },
  getActive: function () {
    return this.reject(this._getTrashed);
  },
  _getTimeDifference: function (event) {
    return event.getTimeDifference(this.highlightedDate);
  },
  _getTrashed: function (event) {
    return event.isTrashed();
  },
  getCurrentElement: function () {
    return this.currentElement;
  },
  setCurrentElement: function (model) {
    if (!model) {
      return;
    }
    if (!this.currentElement ||
      this.currentElement.get('events')[0].id !== model.get('events')[0].id) {
      if (this.currentElement) {
        this.currentElement.setHighlighted(false);
      }
      if (model) {
        model.setHighlighted(true);
      }
    }
    this.currentElement = model;
  },
  next: function () {
    this.setCurrentElement(this.at(this.indexOf(this.getCurrentElement()) + 1));
    return this;
  },
  prev: function () {
    this.setCurrentElement(this.at(this.indexOf(this.getCurrentElement()) - 1));
    return this;
  }
});