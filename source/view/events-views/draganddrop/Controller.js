/* global window, $ */
var _ = require('underscore'),
  ListView = require('./ListView.js'),
  ChartView = require('./../numericals/ChartView.js'),
  Model = require('./../numericals/ChartModel.js'),
  TimeSeriesCollection = require('./../numericals/TimeSeriesCollection.js'),
  TimeSeriesModel = require('./../numericals/TimeSeriesModel.js');

var Controller = module.exports = function ($modal, events, treemap) {
  this.$modal = $modal;
  this.events = events;
  this.treemap = treemap;
  this.datas = {};
  this.chartView = null;

  // Very important hack flag.
  this.initial = true;
  this.called = false;

  /* Base event containers */
  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  this.chartCollection = new TimeSeriesCollection([], {type: 'All'});
  this.eventCollections = {
    note: new TimeSeriesCollection([], {type: 'Note'}),
    picture: new TimeSeriesCollection([], {type: 'Pictures'}),
    position: new TimeSeriesCollection([], {type: 'Positions'}),
    numerical: new TimeSeriesCollection([], {type: 'Numericals'})
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
  this.resizeModal();

  $('#dnd-panel-list').append('<ul></ul>');
  $(window).resize(this.resizeModal.bind(this));
};

_.extend(Controller.prototype, {

  show: function () {
    if (this.initial) {
      this.called = true;
      return;
    }
    this.$modal.modal();
    this.eventCollectionsViews.note =
      new ListView({collection: this.eventCollections.note });
    this.eventCollectionsViews.picture =
      new ListView({collection: this.eventCollections.picture });
    this.eventCollectionsViews.position =
      new ListView({collection: this.eventCollections.position });
    this.eventCollectionsViews.numerical =
      new ListView({collection: this.eventCollections.numerical });

    this.chartView = new ChartView({model:
      new Model({
        container: '#dnd-panel-chart',
        view: null,
        requiresDim: false,
        collection: this.chartCollection,
        highlighted: false,
        highlightedTime: null,
        allowPieChart: false,
        dimensions: null,
        legendStyle: 'list', // Legend style: 'list', 'table'
        legendButton: true,  // A button in the legend
        legendButtonContent: ['remove'],
        legendShow: true,     // Show legend or not
        legendExtras: true,   // use extras in the legend
        onClick: false,
        onHover: true,
        onDnD: false,
        allowPan: true,      // Allows navigation through the chart
        allowZoom: true,     // Allows zooming on the chart
        xaxis: true
      })});

    this.chartView.render();

    this.chartView.on('remove', function (m) {
      this.chartCollection.remove(m);
    }.bind(this));

    var $ul = $('#dnd-panel-list ul');
    var el;

    if (this.eventCollections.note.length !== 0) {
      $ul.append('<li>');
      $('li:last', $ul).text('Notes');
      this.eventCollectionsViews.note.render();
      el = this.eventCollectionsViews.note.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.picture.length !== 0) {
      $ul.append('<li>');
      $('li:last', $ul).text('Pictures');
      this.eventCollectionsViews.picture.render();
      el = this.eventCollectionsViews.picture.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.position.length !== 0) {
      $ul.append('<li>');
      $('li:last', $ul).text('Positions');
      this.eventCollectionsViews.position.render();
      el = this.eventCollectionsViews.position.el;
      $('li:last', $ul).append(el);
    }

    if (this.eventCollections.numerical.length !== 0) {
      $ul.append('<li>');
      $('li:last', $ul).text('Numericals');
      this.eventCollectionsViews.numerical.render();
      el = this.eventCollectionsViews.numerical.el;
      $('li:last', $ul).append(el);
    }

    this.eventCollectionsViews.note.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
    }.bind(this));

    this.eventCollectionsViews.picture.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
    }.bind(this));

    this.eventCollectionsViews.position.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
    }.bind(this));

    this.eventCollectionsViews.numerical.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
    }.bind(this));

    $('#submit-dnd').on('click', function () {
      var errors = 0;
      var vn_filters = [];
      var vn_name = $('#name-dnd').val();

      this.chartCollection.each(function (e) {
        vn_filters.push({stream: e.get('events')[0].stream, type: e.get('type')});
      });

      if (!vn_name) {
        $('#name-dnd').attr('style', 'border:1px solid #ff0000');
        errors++;
      }

      if (vn_filters.length === 0) {
        errors++;
      }

      if (errors > 0) {
        return;
      } else {
        this.treemap.createVirtualNode(vn_filters, vn_name);
        this.close();
        this.$modal.modal('hide');
      }
    }.bind(this));
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
            streamName: eventsToAdd[i].stream.name,
            type: eventsToAdd[i].type,
            category: this.getEventsCategory(eventsToAdd[i])
          });
          eventsCollection.add(eventsModel);
        }
      }
    }

    // Process those to remove
    for (i = 0; i < eventsToRem.length; ++i) {
      eventsCategory = this.getEventsCategory(eventsToRem[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToRem[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToRem[i].connection.id,
          streamId: eventsToRem[i].streamId,
          type: eventsToRem[i].type
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
      eventsCategory = this.getEventsCategory(eventsToCha[i]);
      eventsCollection = this.getTimeSeriesCollectionByEvent(eventsToCha[i]);
      if (eventsCollection) {
        // find corresponding model
        matching = eventsCollection.where({
          connectionId: eventsToCha[i].connection.id,
          streamId: eventsToCha[i].streamId,
          type: eventsToCha[i].type
        });
        if (matching && matching.length !== 0) {
          eventsModel = matching[0];
          events = eventsModel.get('events');
          for (eIter = 0; eIter < events.length; ++eIter) {
            if (events[eIter].id === eventsToCha[i].id) {
              events[eIter] = eventsToCha[i];
            }
          }
        }
      }
    }

    if (this.initial) {
      this.initial = false;
      this.eventCollections.note.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.numerical.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.picture.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));
      this.eventCollections.position.each(function (m) {
        this.addSerieToChart(m);
      }.bind(this));

      if (this.called) {

        this.show();
      }
    }
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
  },

  close: function () {
    this.chartView.close();
    this.$modal.find('#dnd-body').remove();
  },


  /**
   * Adder functions
   */

  addSerieToChart: function (m) {
    this.chartCollection.add(m);
  },

  resizeModal: _.debounce(function () {
    this.chartView.render();
  }, 250)
});
