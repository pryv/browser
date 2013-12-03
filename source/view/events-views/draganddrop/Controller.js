/* global $, window */
var _ = require('underscore'),
  ListView = require('./ListView.js'),
  TimeSeriesCollection = require('./TimeSeriesCollection.js'),
  TimeSeriesModel = require('./TimeSeriesModel.js');

var Controller = module.exports = function ($modal, events) {
  this.$modal = $modal;
  this.events = events;
  this.datas = {};

  /* Base event containers */
  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  this.eventCollections = {
    note: new TimeSeriesCollection(),
    picture: new TimeSeriesCollection(),
    position: new TimeSeriesCollection(),
    numerical: new TimeSeriesCollection()
  };

  this.eventCollectionsViews = {
    note: null,
    picture: null,
    position: null,
    numerical: null
  };

  for (var e in events) {
    if (events.hasOwnProperty(e)) {
      this.eventEnter(events[e]);
    }
  }

  this.$content = $modal.find('.modal-content');

  // Create the div we will use
  this.$content.html($('#template-draganddrop').html());

};

_.extend(Controller.prototype, {

  show: function () {
    this.$modal.modal();
    this.eventCollectionsViews.note =
      new ListView({collection: this.eventCollections.note });
    this.eventCollectionsViews.picture =
      new ListView({collection: this.eventCollections.picture });
    this.eventCollectionsViews.position =
      new ListView({collection: this.eventCollections.position });
    this.eventCollectionsViews.numerical =
      new ListView({collection: this.eventCollections.numerical });

    this.eventCollectionsViews.note.render();
    this.eventCollectionsViews.picture.render();
    this.eventCollectionsViews.position.render();
    this.eventCollectionsViews.numerical.render();
  },

  /* Base event functions */
  eventEnter: function (event) {
    this.events[event.id] = event;
    if (!this.datas[event.streamId]) {
      this.datas[event.streamId] = {};
    }
    if (!this.datas[event.streamId][event.type]) {
      this.datas[event.streamId][event.type] = {};
    }
    this.datas[event.streamId][event.type][event.id] = event;
    this.eventsToAdd.push(event);
    this.debounceUpdateCollections();
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
    this.eventsToRem.push(event);
    this.debounceUpdateCollections();
  },

  eventChange: function (event) {
    if (this.events[event.id]) {
      this.events[event.id] = event;
    }
    if (this.datas[event.streamId] &&
      this.datas[event.streamId][event.type] &&
      this.datas[event.streamId][event.type][event.id]) {
      this.datas[event.streamId][event.type][event.id] = event;
    }
    this.eventsToCha.push(event);
    this.debounceUpdateCollections();
  },

  debounceUpdateCollections: _.debounce(function () {
    var eventsToAdd = this.eventsToAdd;
    var eventsToRem = this.eventsToRem;
    var eventsToCha = this.eventsToCha;

    var eventsCategory;
    var eventsCollection;
    var eventsModel;
    var events;
    var matching;

    this.eventsToAdd = [];
    this.eventsToRem = [];
    this.eventsToCha = [];

    var i;
    var eIter;

    // Process those to add
    for (i = 0; i < eventsToAdd.length; ++i) {
      var filter = {
        connectionId: eventsToAdd[i].connection.id,
        streamId: eventsToAdd[i].streamId,
        type: eventsToAdd[i].type
      };
      eventsCategory = this.getEventsCategory(eventsToAdd[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToAdd[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where(filter);
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          eventsModel.get('events').push(eventsToAdd[i]);
        } else {
          eventsModel = new TimeSeriesModel({
            events: [eventsToAdd[i]],
            connectionId: eventsToAdd[i].connection.id,
            streamId: eventsToAdd[i].streamId,
            type: eventsToAdd[i].type,
            category: this.getEventsCategory(eventsToAdd[i])
          });
          eventsCollection.add(eventsModel);
        }
      }
    }

    // Process those to remove
    for (i = 0; i < eventsToRem.length; ++i) {
      eventsCategory = this.getEventsCategory(eventsToAdd[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToAdd[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToAdd[i].connection.id,
          streamId: eventsToAdd[i].streamId,
          type: eventsToAdd[i].type
        });
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          events = eventsModel.get('events');
          for (eIter = 0; eIter < events.length; ++eIter) {
            if (events[eIter].id === eventsToRem[i].id) {
              delete events[eIter];
            }
          }
        }
      }
    }

    // Process those to change
    for (i = 0; i < eventsToCha.length; ++i) {
      eventsCategory = this.getEventsCategory(eventsToAdd[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToAdd[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToAdd[i].connection.id,
          streamId: eventsToAdd[i].streamId,
          type: eventsToAdd[i].type
        });
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          events = eventsModel.get('events');
          for (eIter = 0; eIter < events.length; ++eIter) {
            if (events[eIter].id === eventsToRem[i].id) {
              events[eIter] = eventsToRem[i];
            }
          }
        }
      }
    }
    console.log('all collection after', this.eventCollections);
  }, 100),

  getEventsCategory: function (event) {
    if (this.eventIsNote(event)) {
      return 'note';
    } else if (this.eventIsNumerical(event)) {
      return 'numerical';
    } else if (this.eventIsPicture(event)) {
      return 'picture';
    } else if (this.eventIsPosition(event)) {
      return 'position';
    } else {
      return null;
    }
  },

  getTimeSeriesCollectionByEvent: function (event) {
    if (this.eventIsNote(event)) {
      return this.eventCollections.note;
    } else if (this.eventIsNumerical(event)) {
      return this.eventCollections.numerical;
    } else if (this.eventIsPicture(event)) {
      return this.eventCollections.picture;
    } else if (this.eventIsPosition(event)) {
      return this.eventCollections.position;
    } else {
      return null;
    }
  },

  /* Functions to the event category */
  eventIsNote: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  },

  eventIsNumerical: function (e) {
    var eventTypeClass = e.type.split('/')[0];
    return (
      eventTypeClass === 'money' ||
        eventTypeClass === 'absorbed-dose' ||
        eventTypeClass === 'absorbed-dose-equivalent' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'absorbed-dose-rate' ||
        eventTypeClass === 'area' ||
        eventTypeClass === 'capacitance' ||
        eventTypeClass === 'catalytic-activity' ||
        eventTypeClass === 'count' ||
        eventTypeClass === 'data-quantity' ||
        eventTypeClass === 'density' ||
        eventTypeClass === 'dynamic-viscosity' ||
        eventTypeClass === 'electric-charge' ||
        eventTypeClass === 'electric-charge-line-density' ||
        eventTypeClass === 'electric-current' ||
        eventTypeClass === 'electrical-conductivity' ||
        eventTypeClass === 'electromotive-force' ||
        eventTypeClass === 'energy' ||
        eventTypeClass === 'force' ||
        eventTypeClass === 'length' ||
        eventTypeClass === 'luminous-intensity' ||
        eventTypeClass === 'mass' ||
        eventTypeClass === 'mol' ||
        eventTypeClass === 'power' ||
        eventTypeClass === 'pressure' ||
        eventTypeClass === 'speed' ||
        eventTypeClass === 'temperature' ||
        eventTypeClass === 'volume'
      );
  },

  eventIsPicture: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  },

  eventIsPosition: function (e) {
    var eventType = e.type;
    return (eventType === 'note/txt' || eventType === 'note/text');
  }
});