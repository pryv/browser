/* global $ */

var _ = require('underscore'),
  ChartView = require('./ChartView.js'),
  SeriesModel = require('./SeriesModel.js'),
  DetailView = require('../detailed/Controller.js');

var NumericalsPlugin = module.exports = function (events, params, node) {
  this.debounceRefresh = _.debounce(function () {
    this._refreshModelView();
  }, 100);

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
  this.sortedData = null;

  this.detailedView = null;
  this.$modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.detailedView) {
      this.detailedView.close();
      this.detailedView = null;
    }
  }.bind(this));
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
  this.needToRender = true;
  if (this.detailedView) {
    this.detailedView.addEvents(event);
  }
  this.debounceRefresh();
};

NumericalsPlugin.prototype.eventLeave = function (event) {
  if (this.events[event.id]) {
    delete this.events[event.id];
    delete this.datas[event.streamId][event.type][event.id];
    this.needToRender = true;
    if (this.detailedView) {
      this.detailedView.deleteEvent(event);
    }
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.eventChange = function (event) {
  if (this.events[event.id]) {
    this.events[event.id] = event;
    this.datas[event.streamId][event.type][event.id] = event;
    this.needToRender = true;
    if (this.detailedView) {
      this.detailedView.updateEvent(event);
    }
    this.debounceRefresh();
  }
};

NumericalsPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.highlightedTime = time;
  if (this.view) {
    this.view.onDateHighLighted(time);
  }
  if (this.detailedView) {
    this.detailedView.highlightDate(this.highlightedTime);
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
NumericalsPlugin.prototype._refreshModelView = function () {
  var serie = null;
  var series = [];
  for (var streams in this.datas) {
    if (this.datas.hasOwnProperty(streams)) {
      for (var types in this.datas[streams]) {
        if (this.datas[streams].hasOwnProperty(types)) {
          var elements = [];
          var latest = null;
          for (var el in this.datas[streams][types]) {
            if (this.datas[streams][types].hasOwnProperty(el)) {
              var elem = this.datas[streams][types][el];
              if (elem) {
                latest = elem;
                elements.push({content: elem.content, time: elem.time});
              }
            }
          }
          if (elements.length !== 0) {
            serie = {
              connectionId: latest.stream.connection.id,
              elements: elements,
              id: latest.connection.id + '/' + latest.streamId + '/' + latest.type,
              streamId: latest.streamId,
              streamName: latest.stream.name,
              style: 0,
              tags: latest.tags,
              trashed: false,
              type: latest.type
            };
          }
          if (serie) {
            series.push(serie);
          }
          serie = null;
          elements = [];
        }
      }
    }
  }

  if ((!this.modelView || !this.view) && series.length !== 0) {
    this.modelView = new SeriesModel({
      events: series,
      dimensions: null,
      container: null,
      onClick: true,
      onHover: true,
      onDnD: true,
      allowPan: false,
      allowZoom: false,
      xaxis: false
    });
    if (typeof(document) !== 'undefined')  {
      this.view =
        new ChartView({model: this.modelView});

    }
  } else {
    if (this.modelView) {
      this.modelView.set('events', series);
    }
    if (this.view) {
      this.view.model.set('model', this.modelView);
    }
  }

  this.view.off();
  /* jshint -W083 */
  this.view.on('nodeClicked', function () {
    if (!this.detailedView) {
      this.detailedView = new DetailView(this.$modal);
    }
    this.detailedView.addEvents(this.events);
    this.detailedView.show();
    this.detailedView.highlightDate(this.highlightedTime);
  }.bind(this));
  this.view.on('chart:clicked', function () { return; });
  this.view.on('chart:dropped', this.onDragAndDrop.bind(this));
  this.view.on('chart:resize', this.resize.bind(this));

  if (this.needToRender && this.container) {
    this.resize();
    this.view.onDateHighLighted(this.highlightedTime);
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

  if (this.width !== null) {
    chartSizeWidth = this.width;
  } else if ($('#' + this.container).length)  {
    chartSizeWidth = parseInt($('#' + this.container).prop('style').width.split('px')[0], 0);
  } else if (this.model.get('width') !== null) {
    chartSizeWidth = this.model.get('width');
  }

  if (this.height !== null) {
    chartSizeHeight = this.height;
  } else if ($('#' + this.container).length)  {
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
