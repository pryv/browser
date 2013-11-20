/* global $ */

var _ = require('underscore'),
  ChartView = require('../fusion/ChartView.js'),
  SeriesModel = require('../fusion/SeriesModel.js');
var NumericalsPlugin = module.exports = function (events, params, node) {
  this.debounceRefresh = _.debounce(function () {
    this._refreshModelView();
  }, 100);

  this.events = {};
  this.superCondensed = false;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.datas = {};
  this.streamIds = {};
  this.eventsNode = node;
  this.sortedData = null;

  _.extend(this, params);
  _.each(events, function (event) {
    this.eventEnter(event);
  }, this);

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
  this.debounceRefresh();

};

NumericalsPlugin.prototype.eventLeave = function (event) {
  if (!this.events[event.id]) {
    console.log('eventLeave: event id ' + event.id + ' dont exists');
  } else {
    delete this.events[event.id];
    delete this.datas[event.streamId][event.type][event.id];
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.eventChange = function (event) {
  if (!this.events[event.id]) {
    console.log('eventChange: event id ' + event.id + ' dont exists');
  }  else {
    this.events[event.id] = event;
    this.datas[event.streamId][event.type][event.id] = event;
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.highlightedTime = time;
  if (this.view) {
    this.view.onDateHighLighted(time);
  }
};

NumericalsPlugin.prototype.render = function (container) {
  this.container = container;
  if (this.view) {
    this.resize();
  } else {
    this.needToRender = true;
  }
};
NumericalsPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  this.debounceRefresh();
};

NumericalsPlugin.prototype.close = function () {
  if (this.view) {
    this.view.close();
  }
  this.view = null;
  this.events = null;
  this.datas = null;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.eventDisplayed = null;
  this.needToRender = false;

};
NumericalsPlugin.prototype._refreshModelView = function () {
  // this._findEventToDisplay();

  var asdf = [];
  _.each(this.datas, function (stream) {
    _.each(stream, function (item) {
      asdf.push(_.sortBy(item, function (e) {
        return e.time;
      }));
    });
  });

  this.sortedData = [];
  for (var i = 0; i < asdf.length; ++i) {
    var el = asdf[i][0];
    this.sortedData.push({
      connectionId: el.stream.connection.id,
      elements: [],
      id: el.connection.id + '/' + el.streamId + '/' + el.type,
      streamId: el.streamId,
      streamName: el.stream.name,
      style: 0,
      tags: el.tags,
      trashed: false,
      type: el.type
    });
    for (var j = 0; j < asdf[i].length; ++j) {
      this.sortedData[i].elements.push({content: asdf[i][j].content, time: asdf[i][j].time});
    }
  }

  if (!this.modelView || !this.view) {
    //var BasicModel = Backbone.Model.extend({ });
    this.modelView = new SeriesModel({
      events: this.sortedData,
      dimensions: null,
      container: null,
      onClick: true,
      onHover: false,
      onDnD: true
    });
    if (typeof(document) !== 'undefined')  {
      this.view =
        new ChartView({model: this.modelView});
    }
  }


  this.view.off();
  this.view.on('chart:clicked', function () { return; });
  this.view.on('chart:dropped', this.onDragAndDrop.bind(this));
  this.view.on('chart:resize', this.resize.bind(this));


  if (this.needToRender) {
    this.resize();
    this.needToRender = false;
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

  if ($('#' + this.container).length)  {
    chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
  } else if (this.model.get('width') !== null) {
    chartSizeWidth = this.model.get('width');
  }

  if ($('#' + this.container).length)  {
    chartSizeHeight = parseInt($('#' + this.container).prop('style').height.split('px')[0], 0);
  } else if (this.model.get('height') !== null) {
    chartSizeHeight = this.model.get('height');
  }

  return {width: chartSizeWidth, height: chartSizeHeight};
};

NumericalsPlugin.prototype.resize = function () {
  this.modelView.set('dimensions', this.computeDimensions());
  this.modelView.set('container', '#' + this.container);
  this.view.render();
};
