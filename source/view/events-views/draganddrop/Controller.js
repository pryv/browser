/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./../numericals/SeriesModel.js'),
  ListView = require('./ListView.js'),
  ChartView = require('./../numericals/ChartView.js');

var Controller = module.exports = function ($modal, events) {
  this.$modal = $modal;

  this.events = {};
  this.datas = {};


};

_.extend(Controller.prototype, {

  eventEnter: function (event) {
    this.events[event.id] = event;
    if (!this.datas[event.streamId]) {
      this.datas[event.streamId] = {};
    }
    if (!this.datas[event.streamId][event.type]) {
      this.datas[event.streamId][event.type] = {};
    }
    this.datas[event.streamId][event.type][event.id] = event;
  },

  eventLeave: function (event) {
    if (this.events[event.id]) {
      delete this.events[event.id];
    }
    if (this.datas[event.streamId] &&
      this.datas[event.streamId][event.type] &&
      this.datas[event.streamId][event.type][event.id]) {
      delete this.datas[event.streamId][event.type][event.id];
    }
  },

  eventChange: function (event) {
    if (this.events[event.id]) {
      this.events[event.id] = event;
      this.datas[event.streamId][event.type][event.id] = event;
      this.needToRender = true;
      if (this.detailedView) {
        this.detailedView.updateEvent(event);
      }
      this.debounceRefresh();
    }
  }

});