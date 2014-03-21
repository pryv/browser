var Backbone = require('backbone'),
  Model = require('./EventModel.js');

module.exports = Backbone.Collection.extend({
  url: '#',
  model: Model,
  highlightedDate: null,
  currentElement: null,
  comparator: function (a, b) {
    var aTime = a.get('event').time;
    var bTime = b.get('event').time;
    return aTime > bTime ? -1
      : aTime < bTime ? 1
      : 0;
  },
  highlightEvent: function (time) {
    var next =  this.getEventhighlighted(time);
    if (!next || next === Infinity) {
      return;
    }
    this.setCurrentElement(next);
    return next;
  },
  getEventhighlighted: function (time) {
    this.highlightedDate = time === Infinity ? 99999999999 : time;
    return this.min(this._getTimeDifference.bind(this));
  },
  getTrashed: function () {
    return this.filter(this._getTrashed);
  },
  getEventById: function (id) {
    return this.find(function (e) {
      return e.get('event').id === id;
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
    if (!this.currentElement || this.currentElement.get('event').id !== model.get('event').id) {
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