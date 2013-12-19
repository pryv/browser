/* global window, $ */

var _ = require('underscore'),
  DetailView = require('../detailed/Controller.js'),
  ChartView = require('../draganddrop/ChartView.js'),
  TsCollection = require('../draganddrop/TimeSeriesCollection.js'),
  TsModel = require('../draganddrop/TimeSeriesModel.js'),
  ChartModel = require('../draganddrop/ChartModel.js');


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
  this.highlightedTime = time;
  if (this.view) {
    this.view.onDateHighLighted(time);
  }
  if (this.hasDetailedView) {
    this.treeMap.highlightDateDetailedView(this.highlightedTime);
  }
};

NumericalsPlugin.prototype.render = function (container) {
  console.log(this.eventsNode.uniqueId, 'render called');
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
      eventsModel = new TsModel({
        events: [eventsToAdd[i]],
        connectionId: eventsToAdd[i].connection.id,
        streamId: eventsToAdd[i].streamId,
        streamName: eventsToAdd[i].stream.name,
        type: eventsToAdd[i].type,
        category: 'any'
      });
      this.seriesCollection.add(eventsModel);
    }

  }
/*
  // Process those to remove
  for (i = 0; i < eventsToRem.length; ++i) {
      // find corresponding model
    matching = this.seriesCollection.where({
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
  */

  // Process those to change
  for (i = 0; i < eventsToCha.length; ++i) {
    // find corresponding model
    matching = this.seriesCollection.where({
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
        allowPan: true,      // Allows navigation through the chart
        allowZoom: true,     // Allows zooming on the chart
        xaxis: false
      });
    if (typeof(document) !== 'undefined')  {
      this.view = new ChartView({model: this.modelView});
      this.modelView.set('dimensions', this.computeDimensions());
      //console.log($('#' + this.container));
      $('#' + this.container).resize(function () {
        console.log('container resize event');
        this.debounceResize.bind(this);
      }.bind(this));
      this.view.render();
      this.view.on('chart:dropped', this.onDragAndDrop.bind(this));
      this.view.on('chart:resize', this.resize.bind(this));
      this.view.on('nodeClicked', function () {
        if (!this.detailedView) {
          this.detailedView = new DetailView(this.$modal);
        }
        this.detailedView.addEvents(this.events);
        this.detailedView.show();
        this.detailedView.highlightDate(this.highlightedTime);
      }.bind(this));
    }
  } else {
    this.view.render();
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

  //console.log(this.eventsNode);

  if (this.width !== null) {
    chartSizeWidth = this.width;
    //console.log(this.container, 'width 1', chartSizeWidth);
  }
  if ($('#' + this.container).length)  {
    chartSizeWidth = $('#' + this.container).width();
    //console.log(this.container, 'width 2', chartSizeWidth);
  }
  if ($('#' + this.container).length)  {
    chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
    //console.log(this.container, 'width 3', chartSizeWidth);
  }

  if (this.height !== null) {
    chartSizeHeight = this.height;
    //console.log(this.container, 'height 1', chartSizeHeight);
  }
  if ($('#' + this.container).length)  {
    chartSizeHeight = $('#' + this.container).height();
    //console.log(this.container, 'height 2', chartSizeHeight);
  }
  if ($('#' + this.container).length)  {
    chartSizeHeight = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
    //console.log(this.container, 'height 3', chartSizeHeight);
  }

  //console.log(this.container, {width: chartSizeWidth, height: chartSizeHeight});

  return {width: chartSizeWidth, height: chartSizeHeight};
};

NumericalsPlugin.prototype.resize = function () {
  this.modelView.set('dimensions', this.computeDimensions());
  this.modelView.set('container', '#' + this.container);
  this.view.resize();
};
