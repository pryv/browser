/* global $, window */
var _ = require('underscore'),
  Collection = require('./EventCollection.js'),
  Model = require('./../numericals/SeriesModel.js'),
  ListView = require('./ListView.js'),
  ChartView = require('./../numericals/ChartView.js');

var Controller = module.exports = function ($modal, events) {
  this.events = events;
  this.eventsToAdd = [];
  this.collection = new Collection();
  this.highlightedDate = null;
  this.listView = null;
  this.singleView = null;
  this.finalView = null;
  this.$modal = $modal;
  this.$content = $modal.find('.modal-content');

  // Create the div we will use
  this.$content.html($('#template-DnD').html());

  this.debounceAdd = _.debounce(this.addEventsLater.bind(this), 100);

  this.testf = _.debounce(function () {
    this.updateSingleView(this.collection.next().getCurrentElement());
  }.bind(this), 1000);

  this.debounceAdd();

  $(window).resize(this.resizeModal.bind(this));
};

_.extend(Controller.prototype, {

  show: function () {
    this.$modal.modal();
    if (!this.listView) {
      this.singleView = new ChartView({model:
        new Model({
          container: '#DnD-left-content-single',
          events: [],
          highlightedTime: null,
          allowPieChart: false,
          view: null,
          highlighted: false,
          dimensions: null,
          onClick: true,
          onHover: false,
          onDnD: false,
          xaxis: true
        })});
      this.finalView = new ChartView({model:
        new Model({
          container: '#DnD-left-content-final',
          events: [],
          highlightedTime: null,
          allowPieChart: false,
          view: null,
          highlighted: false,
          dimensions: null,
          onClick: false,
          onHover: false,
          onDnD: false,
          xaxis: true
        })});
      this.listView = new ListView({
        collection: this.collection
      });

      /**
       * Listeners
       */
      this.listView.on('itemview:chart:clicked', function (evt) {
        this.collection.setCurrentElement(evt.model);
        //console.log('itemview:chart:clicked', evt.model);
        this.updateSingleView(evt.model);
      }.bind(this));

      this.listView.on('itemview:chart:select', function (evt) {
        //console.log('itemview:chart:select', evt);
        this.addSeriesToFinalView(evt.model);
      }.bind(this));

      this.listView.on('itemview:chart:unselect', function (evt) {
        //console.log('itemview:chart:unselect', evt);
        this.removeSeriesFromFinalView(evt.model);
      }.bind(this));

      this.singleView.on('chart:clicked', function (evt) {
        //console.log('chart:clicked - evt', evt);
        var model = this.changeStyleOnSingleView(evt);
        this.updateSeriesOnFinalView(model);
      }.bind(this));
    }

    this.testf();
    this.listView.render();
    this.singleView.render();
    this.finalView.render();
    this.resizeModal();

    $(this.$modal).keydown(function (e) {
      var LEFT_KEY = 37;
      var UP_KEY = 38;
      var RIGHT_KEY = 39;
      var DOWN_KEY = 40;
      var SPACE_KEY = 32;
      if (e.which === LEFT_KEY || e.which === UP_KEY) {
        this.updateSingleView(this.collection.prev().getCurrentElement());
        return false;
      }
      if (e.which === RIGHT_KEY || e.which === DOWN_KEY) {
        this.updateSingleView(this.collection.next().getCurrentElement());
        return false;
      }
      if (e.which === SPACE_KEY) {
        /* Implement space to act as un/select on the checkbox */
        //this.updateSingleView(this.collection.next().getCurrentElement());
        return false;
      }
    }.bind(this));
  },

  close: function () {
    this.singleView.close();
    this.finalView.close();
    delete this.finalView.model;
    delete this.singleView.model;
    this.singleView.model = null;
    this.finalView.model = null;
    delete this.finalView;
    delete this.singleView;
    $(this.$modal).unbind('keydown');
    $('#DnD-body').remove();
    //$('#detail-div').empty();

    this.events = {};
    this.eventsToAdd = [];
    this.collection.reset();
    this.collection = null;
    this.highlightedDate = null;
    this.listView = null;
    this.singleView = null;
    this.finalView = null;
    this.$modal = null;
  },

  getEventById: function (event) {
    return this.collection.getEventById(event.id);
  },

  addEvents: function (event) {
    if (!event) {
      return;
    }
    if (event.id) {
      //we have only one event so we put it on a each for the next each
      event = [event];
    }
    if (!this.collection) {
      this.collection = new Collection();
    }

    for (var i = 0; i < event.length; ++i) {
      if (event[i]) {
        this.events[event[i].id] = event[i];
      }
    }
    this.debounceAdd();
  },

  addEventsLater: function () {
    if (this.events.length === 0) {
      return;
    }

    var event = [];

    for (var attr in this.events) {
      if (this.events.hasOwnProperty(attr)) {
        event.push(this.events[attr]);
      }
    }

    var mapped = _.map(event, function (e) {
      return {
        id: e.connection.id + '/' + e.streamId + '/' + e.type,
        streamId: e.streamId,
        streamName: e.stream.name,
        connectionId: e.connection.id,
        type: e.type,
        elements: {content: e.content, time: e.time},
        trashed: false,
        tags: e.tags,
        style: 0
      };
    });

    var grouped = _.groupBy(mapped, 'id');

    var resulting = [];
    _.each(grouped, function (m) {
      var copy = m[0];
      var reduced = _.reduce(m, function (memo, el) { return memo.concat(el.elements); }, [ ]);
      copy.elements = reduced;
      resulting.push(copy);
    });

    this.collection.reset();
    this.collection.add(resulting, {sort: false});
    this.collection.sort();
  },


  deleteEvent: function (event) {
    if (!event) {
      return;
    }
    delete this.events[event.id];
    this.debounceAdd();
  },
  updateEvent: function (event) {
    if (!event) {
      return;
    }
    if (this.events[event.id]) {
      this.events[event.id] = event;
      this.debounceAdd();
    }
  },
  highlightDate: function (time) {
    this.singleView.onDateHighLighted(time);
    this.finalView.onDateHighLighted(time);
  },


  updateSingleView: function (model) {
    if (model) {
      this.singleView.model.set('events', [{
        id: model.get('id'),
        streamId: model.get('streamId'),
        streamName: model.get('streamName'),
        connectionId: model.get('connectionId'),
        type: model.get('type'),
        elements: model.get('elements'),
        trashed: model.get('v'),
        tags: model.get('tags'),
        style: model.get('style')
      }]);
    }
  },

  /**
   * Adds a series from the final view
   * @param model the model of the series to add
   */
  addSeriesToFinalView: function (model) {
    // events of the finalView model is an array
    // of the real events (containing the points)
    if (model) {
      //var eventToAdd = model.get('events')[0];
      var eventsFinalView = this.finalView.model.get('events'); // should be an array
      eventsFinalView.push({
        id: model.get('id'),
        streamId: model.get('streamId'),
        streamName: model.get('streamName'),
        connectionId: model.get('connectionId'),
        type: model.get('type'),
        elements: model.get('elements'),
        trashed: model.get('v'),
        tags: model.get('tags'),
        style: model.get('style')
      });
      this.finalView.model.set('events', eventsFinalView);
      this.finalView.render();
    }
  },

  /**
   * Removes a series from the final view
   * @param model the model of the series to remove
   */
  removeSeriesFromFinalView: function (model) {

    if (model) {
      var eventToRemove = model.get('id');
      var eventsFinalView = this.finalView.model.get('events');
      var events = [];
      if (eventsFinalView) {
        for (var i = 0; i < eventsFinalView.length; ++i) {
          //console.log(eventsFinalView[i].id, eventToRemove);
          if (eventsFinalView[i].id !== eventToRemove) {
            events.push(eventsFinalView[i]);
          }
        }
      }
      this.finalView.model.set('events', events);
      this.finalView.render();
    }
  },

  /**
   * Update a series on the Finalview if it exists
   * @param model you want to update
   */
  updateSeriesOnFinalView: function (model) {
    if (model) {
      var eventToUpdate = model.get('events')[0];
      var eventsFinalView = this.finalView.model.get('events');
      var events = [];
      if (eventsFinalView) {
        for (var i = 0; i < eventsFinalView.length; ++i) {
          if (eventsFinalView[i].id !== eventToUpdate.id) {
            events.push(eventsFinalView[i]);
          } else {
            events.push(eventToUpdate);
          }
        }
      }
      this.finalView.model.set('events', events);
      this.finalView.render();
    }
  },

  changeStyleOnSingleView: function (model) {
    if (model) {
      var event = model.get('events');
      var style = event[0].style;
      style++;
      style %= 2;
      event[0].style = style;
      this.singleView.model.set('events', event);
      this.singleView.render();
      return this.singleView.model;
    }
  },

  resizeModal: _.debounce(function () {

    $('#DnD-panel-left').css({
      width: $('.modal-content').width() - $('#DnD-panel-right').width(),
      height: $('.modal-content').height()
    });

    $('#DnD-left-content').css({
      width: '100%',
      height: $('.DnD-panel-left').height()
    });

    var chartSizeWidth = $('#DnD-panel-left').width() - 20;
    var chartSizeHeight = ($('#DnD-panel-left').height() - 30) / 2;

    $('#DnD-left-content-single').css({
      width: chartSizeWidth,
      height: chartSizeHeight,
      'margin-top': '10px',
      'margin-left': '10px',
      'background-color': 'Khaki'
    });

    $('#DnD-left-content-final').css({
      width: chartSizeWidth,
      height: chartSizeHeight,
      'margin-top': '10px',
      'margin-left': '10px',
      'background-color': 'LightSeaGreen'
    });

    if (this.finalView) {
      this.finalView.model.set('dimensions', {width: chartSizeWidth, height: chartSizeHeight});
    }
    if (this.singleView) {
      this.singleView.model.set('dimensions', {width: chartSizeWidth, height: chartSizeHeight});
    }
  }, 250)
});