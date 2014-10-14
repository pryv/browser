/* global window, $ */
var _ = require('underscore'),
  ListView = require('./ListView.js'),
  ChartView = require('./../numericals/ChartView.js'),
  Model = require('./../numericals/ChartModel.js'),
  TimeSeriesCollection = require('./../numericals/TimeSeriesCollection.js'),
  TimeSeriesModel = require('./../numericals/TimeSeriesModel.js'),
  Settings = require('./../numericals/utils/ChartSettings.js');

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
        container: '.modal-dnd-chart',
        view: null,
        requiresDim: false,
        collection: this.chartCollection,
        highlighted: false,
        highlightedTime: null,
        allowPieChart: false,
        dimensions: null,
        showLegend: true,
        legendContainer: '.modal-dnd-legend',
        legendActions: ['remove'],
        onClick: false,
        onHover: true,
        onDnD: false,
        enableNavigation: false,
        xaxis: true,
        showNodeCount: false
      })});

    this.chartView.render();

    this.chartView.on('remove', function (m) {
      this.chartCollection.remove(m);
      var e = {type: m.get('type')};
      var c = this.getTimeSeriesCollectionByEvent(e);
      c.add(m);

      this.eventCollectionsViews.note.render();
      this.eventCollectionsViews.position.render();
      this.eventCollectionsViews.picture.render();
      this.eventCollectionsViews.numerical.render();

    }.bind(this));

    var $list = $('.modal-dnd-list'),
        $curContainer,
        elt;

    if (this.eventCollections.note.notNull) {
      $list.append('<h5>Notes</h5>');
      $curContainer = $('<div>');
      $list.append($curContainer);
      this.eventCollectionsViews.note.ul = $curContainer;
      this.eventCollectionsViews.note.render();
      elt = this.eventCollectionsViews.note.el;
      $curContainer.append(elt);
    }

    if (this.eventCollections.picture.notNull) {
      $list.append('<h5>Pictures</h5>');
      $curContainer = $('<div>');
      $list.append($curContainer);
      this.eventCollectionsViews.picture.ul = $curContainer;
      this.eventCollectionsViews.picture.render();
      elt = this.eventCollectionsViews.picture.el;
      $curContainer.append(elt);
    }

    if (this.eventCollections.position.notNull) {
      $list.append('<h5>Positions</h5>');
      $curContainer = $('<div>');
      $list.append($curContainer);
      this.eventCollectionsViews.position.ul = $curContainer;
      this.eventCollectionsViews.position.render();
      elt = this.eventCollectionsViews.position.el;
      $curContainer.append(elt);
    }

    if (this.eventCollections.numerical.notNull) {
      $list.append('<h5>Values</h5>');
      $curContainer = $('<div>');
      $list.append($curContainer);
      this.eventCollectionsViews.numerical.ul = $curContainer;
      this.eventCollectionsViews.numerical.render();
      elt = this.eventCollectionsViews.numerical.el;
      $curContainer.append(elt);
    }

    this.eventCollectionsViews.note.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.note.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.picture.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.picture.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.position.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.position.remove(evt.model);
    }.bind(this));

    this.eventCollectionsViews.numerical.on('itemview:series:click', function (evt) {
      this.addSerieToChart(evt.model);
      this.eventCollections.numerical.remove(evt.model);
    }.bind(this));

    $('#dnd-btn-cancel').bind('click', function () {
      this.close();
      this.$modal.modal('hide');
    }.bind(this));

    $('#dnd-field-name').bind('input', function () {
      var val = $('#dnd-field-name').val();
      if (val.length > 0) {
        $('.modal-dnd-footer').removeClass('has-error');
        $('.modal-dnd-footer').addClass('has-success');
      } else {
        $('.modal-dnd-footer').removeClass('has-success');
        $('.modal-dnd-footer').addClass('has-error');
      }
    });

    $('#dnd-btn-create').bind('click', function () {
      var errors = 0;
      var vn_filters = [];
      var vn_name = $('#dnd-field-name').val();

      this.chartCollection.each(function (e) {
        vn_filters.push({stream: e.get('events')[0].stream, type: e.get('type')});
      });

      if (!vn_name) {
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
        $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
        $('.modal-backdrop').remove();
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
          var s = new Settings(eventsToAdd[i].stream,
            eventsToAdd[i].type, null);
          eventsModel = new TimeSeriesModel({
            events: [eventsToAdd[i]],
            connectionId: eventsToAdd[i].connection.id,
            streamId: eventsToAdd[i].streamId,
            streamName: eventsToAdd[i].stream.name,
            type: eventsToAdd[i].type,
            category: this.getEventsCategory(eventsToAdd[i]),
            color: s.get('color'),
            style: s.get('style'),
            transform: s.get('transform'),
            interval: s.get('interval')
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

      var m = null;
      while (this.eventCollections.note.length !== 0) {
        this.eventCollections.note.notNull = true;
        m = this.eventCollections.note.at(0);
        this.eventCollections.note.remove(m);
      }
      while (this.eventCollections.numerical.length !== 0) {
        this.eventCollections.numerical.notNull = true;
        m = this.eventCollections.numerical.at(0);
        this.eventCollections.numerical.remove(m);
      }
      while (this.eventCollections.picture.length !== 0) {
        this.eventCollections.picture.notNull = true;
        m = this.eventCollections.picture.at(0);
        this.eventCollections.picture.remove(m);
      }
      while (this.eventCollections.position.length !== 0) {
        this.eventCollections.position.notNull = true;
        m = this.eventCollections.position.at(0);
        this.eventCollections.position.remove(m);
      }
      if (this.called) {

        this.show();
      }
    }
  }, 100),

  getEventsCategory: function (event) {
    if (window.PryvBrowser.eventTypes.isNote(event)) {
      return 'note';
    } else if (window.PryvBrowser.eventTypes.isNumerical(event)) {
      return 'numerical';
    } else if (window.PryvBrowser.eventTypes.isPicture(event)) {
      return 'picture';
    } else if (window.PryvBrowser.eventTypes.isPosition(event)) {
      return 'position';
    } else {
      return null;
    }
  },

  getTimeSeriesCollectionByEvent: function (event) {
    if (window.PryvBrowser.eventTypes.isNote(event)) {
      return this.eventCollections.note;
    } else if (window.PryvBrowser.eventTypes.isNumerical(event)) {
      return this.eventCollections.numerical;
    } else if (window.PryvBrowser.eventTypes.isPicture(event)) {
      return this.eventCollections.picture;
    } else if (window.PryvBrowser.eventTypes.isPosition(event)) {
      return this.eventCollections.position;
    } else {
      return null;
    }
  },

  close: function () {
    this.chartView.close();
    $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
    $('.modal-backdrop').remove();
    this.$modal.find('.modal-content').empty();
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
