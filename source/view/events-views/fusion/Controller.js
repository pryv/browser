/* global $ */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  ListView = require('./ListView.js');
var Controller = module.exports = function (events) {
  this.events = events;
  this.collection = new Collection();
  _.each(this.events, function (e) {
    this.addEvent(e);
  }, this);
};

_.extend(Controller.prototype, {
  show: function () {
    var listView = new ListView({
      collection: this.collection
    });
    listView.render();
    var $modal = $('#detailViewModal');
    $modal.modal();
    $modal.on('hidden.bs.modal', function () {
      listView.remove();
      this.collection.reset();
    }.bind(this));
  },
  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },
  addEvent: function (event) {
    this.collection.create({
      content: event.content,
      description: event.description,
      id: event.id,
      streamId: event.streamId,
      tags: event.tags,
      time: event.time,
      type: event.type,
      trashed: event.trashed
    });
    this.collection.sort();
  },
  deleteEvent: function (event) {
    var toDelete = this.getEventById(event);
    if (toDelete) {
      toDelete.destroy();
    }
  },
  updateEvent: function (event) {
    var toUpdate = this.getEventById(event.id);
    if (toUpdate) {
      toUpdate.set('content', event.content);
      toUpdate.set('description', event.description);
      toUpdate.set('id', event.id);
      toUpdate.set('streamId', event.streamId);
      toUpdate.set('tags', event.tags);
      toUpdate.set('time', event.time);
      toUpdate.set('type', event.type);
      toUpdate.set('trashed', event.trashed);
      this.collection.sort();
    }
  }
});