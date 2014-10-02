/* global window, $ */

var _ = require('underscore'),
  DetailView = require('../detailed/Controller.js'),
  ChartView = require('./ChartView.js'),
  ChartModel = require('./ChartModel.js'),
  TsCollection = require('./TimeSeriesCollection.js'),
  TsModel = require('./TimeSeriesModel.js'),
  Settings = require('./utils/ChartSettings.js');

var NumericalsPlugin = module.exports = function (events, params, node) {
  this.seriesCollection = null;

  /* Base event containers */
  this.eventsToAdd = [];
  this.eventsToRem = [];
  this.eventsToCha = [];

  this.debounceRefresh = _.debounce(function () {
    this.refreshCollection();
  }, 1000);

  this.debounceResize = _.debounce(function () {
    this.resize();
  }, 1500);

  this.events = {};
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.datas = {};
  this.streamIds = {};
  this.eventsNode = node;
  this.hasDetailedView = false;
  this.$modal = $('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.detailedView) {
      this.detailedView.close();
      this.detailedView = null;
    }
  }.bind(this));
  _.extend(this, params);

  for (var e in events) {
    if (events.hasOwnProperty(e)) {
      this.eventEnter(events[e]);
    }
  }
  $(window).resize(this.debounceRefresh.bind(this));
};

NumericalsPlugin.prototype.eventEnter = function (event) {
  this.streamIds[event.streamId] = event;
  this.events[event.id] = event;
  if (!this.datas[event.streamId]) {
    this.datas[event.streamId] = {};
  }
  if (!this.datas[event.streamId][event.type]) {
    this.datas[event.streamId][event.type] = {};
  }
  this.datas[event.streamId][event.type][event.id] = event;
  this.needToRender = true;
  if (this.hasDetailedView) {
    this.treeMap.addEventsDetailedView(event);
  }
  this.eventsToAdd.push(event);
  this.debounceRefresh();
};

NumericalsPlugin.prototype.eventLeave = function (event) {
  if (this.events[event.id]) {
    delete this.events[event.id];
    delete this.datas[event.streamId][event.type][event.id];
    this.needToRender = true;
    if (this.hasDetailedView) {
      this.treeMap.deleteEventDetailedView(event);
    }
    this.eventsToRem.push(event);
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.eventChange = function (event) {
  if (this.events[event.id]) {
    this.events[event.id] = event;
    this.datas[event.streamId][event.type][event.id] = event;
    this.needToRender = true;
    if (this.hasDetailedView) {
      this.treeMap.updateEventDetailedView(event);
    }
    this.eventsToCha.push(event);
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.OnDateHighlightedChange = function (time) {
  if (time) {
    this.highlightedTime = time;
  }
  if (this.view) {
    this.view.onDateHighLighted(time);
  }
  if (this.hasDetailedView) {
    this.treeMap.highlightDateDetailedView(this.highlightedTime);
  }
};

NumericalsPlugin.prototype.render = function (container) {
  this.container = container;
  this.needToRender = true;
  this.debounceRefresh();
};
NumericalsPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  this.needToRender = true;
  this.debounceRefresh();
};

NumericalsPlugin.prototype.close = function () {
  if (this.view) {
    this.view.close();
  }

  delete this.modelView;
  delete this.view;
  this.view = null;
  this.events = null;
  this.datas = null;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.eventDisplayed = null;
  this.needToRender = false;
};

NumericalsPlugin.prototype.refreshCollection = function () {
  if (this.seriesCollection === null) {
    this.seriesCollection = new TsCollection([], {type: 'any'});
  }

  var eventsToAdd = this.eventsToAdd;
  var eventsToRem = this.eventsToRem;
  var eventsToCha = this.eventsToCha;

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


      // find corresponding model
    matching = this.seriesCollection.where(filter);
    if (matching && matching.length !== 0) {
      eventsModel = matching[0];
      eventsModel.get('events').push(eventsToAdd[i]);
    } else {
      var s = new Settings(eventsToAdd[i].stream,
        eventsToAdd[i].type, this.eventsNode.parent.stream.virtual);
      eventsModel = new TsModel({
        events: [eventsToAdd[i]],
        connectionId: eventsToAdd[i].connection.id,
        streamId: eventsToAdd[i].streamId,
        streamName: eventsToAdd[i].stream.name,
        type: eventsToAdd[i].type,
        category: 'any',
        virtual: this.eventsNode.parent.stream.virtual,
        color: s.get('color'),
        style: s.get('style'),
        transform: s.get('transform'),
        interval: s.get('interval'),
        fitting: s.get('fitting')
      });
      this.seriesCollection.add(eventsModel);
    }
  }

  // Process those to remove
  for (i = 0; i < eventsToRem.length; ++i) {
      // find corresponding model
    matching = this.seriesCollection.where({
      connectionId: eventsToRem[i].connection.id,
      streamId: eventsToRem[i].streamId,
      type: eventsToRem[i].type
    });
    if (matching && matching.length !== 0) {
      eventsModel = matching[0];
      events = eventsModel.get('events');
      var events_new = [];
      for (eIter = 0; eIter < events.length; ++eIter) {
        if (events[eIter].id !== eventsToRem[i].id) {
          events_new.push(events[eIter]);
        }
      }
      if (events_new.length === 0) {
        this.seriesCollection.remove(eventsModel);
      } else {
        eventsModel.set('events', events_new);
      }
    }
  }


  // Process those to change
  for (i = 0; i < eventsToCha.length; ++i) {
    // find corresponding model
    matching = this.seriesCollection.where({
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


  if ((!this.modelView || !this.view) && this.seriesCollection.length !== 0 && this.container) {
    this.modelView = new ChartModel({
        container: '#' + this.container,
        view: null,
        requiresDim: true,
        collection: this.seriesCollection,
        highlighted: false,
        highlightedTime: null,
        allowPieChart: false,
        dimensions: this.computeDimensions(),
        legendStyle: 'table', // Legend style: 'list', 'table'
        legendButton: false,  // A button in the legend
        legendShow: 'size',     // Show legend or not
        legendExtras: true,   // use extras in the legend
        onClick: true,
        onHover: true,
        onDnD: true,
        allowPan: false,      // Allows navigation through the chart
        allowZoom: false,     // Allows zooming on the chart
        panZoomButton: false,
        xaxis: false
      });
    if (typeof(document) !== 'undefined')  {
      this.view = new ChartView({model: this.modelView});
      this.modelView.set('dimensions', this.computeDimensions());
      $('#' + this.container).resize(function () {
        this.debounceResize.bind(this);
      }.bind(this));
      this.view.render();
      this.view.onDateHighLighted(this.highlightedTime);
      this.view.on('chart:dropped', this.onDragAndDrop.bind(this));
      this.view.on('chart:resize', this.resize.bind(this));
      this.view.on('nodeClicked', function () {
        if (!this.detailedView) {
          this.detailedView = new DetailView(this.$modal, null, this.stream);
        }
        this.detailedView.addEvents(this.events);
        this.detailedView.show();
        this.detailedView.highlightDate(this.highlightedTime);
        this.detailedView.virtual = this.eventsNode.parent.stream.virtual;
      }.bind(this));
    }
  } else if (this.view) {
    this.view.render();
    this.view.onDateHighLighted(this.highlightedTime);
    this.debounceResize();
  }
};

NumericalsPlugin.prototype._findEventToDisplay = function () {
  if (this.highlightedTime === Infinity) {
    var oldestTime = 0;
    _.each(this.events, function (event) {
      if (event.time >= oldestTime) {
        oldestTime = event.time;
        this.eventDisplayed = event;
      }
    }, this);

  } else {
    var timeDiff = Infinity, debounceRefresh = 0;
    _.each(this.events, function (event) {
      debounceRefresh = Math.abs(event.time - this.highlightedTime);
      if (debounceRefresh <= timeDiff) {
        timeDiff = debounceRefresh;
        this.eventDisplayed = event;
      }
    }, this);
  }
};

/**
 * Propagates the drag and drop event further up to the TreeMap controller
 * @param nodeId
 * @param streamId
 * @param connectionId
 */
NumericalsPlugin.prototype.onDragAndDrop = function (nodeId, streamId, connectionId) {
  this.eventsNode.dragAndDrop(nodeId, streamId, connectionId);
};

NumericalsPlugin.prototype.computeDimensions = function () {
  var chartSizeWidth = null;
  var chartSizeHeight = null;

  if (this.width !== null) {
    chartSizeWidth = this.width;
  } else if ($('#' + this.container).length)  {
    chartSizeWidth = $('#' + this.container).width();
  } else if ($('#' + this.container).length)  {
    chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
  }

  if (this.height !== null) {
    chartSizeHeight = this.height;
  } else if ($('#' + this.container).length)  {
    chartSizeHeight = $('#' + this.container).height();
  } else if ($('#' + this.container).length)  {
    chartSizeHeight = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
  }

  return {width: chartSizeWidth, height: chartSizeHeight};
};

NumericalsPlugin.prototype.resize = function () {
  this.modelView.set('dimensions', this.computeDimensions());
  this.modelView.set('container', '#' + this.container);
  this.view.resize();
};
