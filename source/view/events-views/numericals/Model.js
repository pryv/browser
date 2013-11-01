var _ = require('underscore'),
  NumericalsView = require('./View.js'),
  SuperCondensedView = require('../super-condensed/View.js'),
  Backbone = require('backbone');
var NumericalsPlugin = module.exports = function (events, params) {
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
  _.extend(this, params);
  _.each(events, function (event) {
    this.eventEnter(event);
  }, this);

};
NumericalsPlugin.prototype.eventEnter = function (event) {
  this.streamIds[event.streamId] = event;
  this.events[event.id] = event;
  if (!this.datas[event.type]) {
    this.datas[event.type] = {};
  }
  this.datas[event.type][event.id] = event;
  if (_.size(this.datas) === 1 && _.size(this.streamIds) === 1) {
    this.view = this.superCondensed ? null : this.view;
    this.superCondensed = false;
  } else {
    this.view = this.superCondensed ? this.view : null;
    this.superCondensed = true;
  }
  this.debounceRefresh();

};

NumericalsPlugin.prototype.eventLeave = function (event) {
  if (!this.events[event.id]) {
    console.log('eventLeave: event id ' + event.id + ' dont exists');
  } else {
    delete this.events[event.id];
    delete this.datas[event.type][event.id];

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
    this.view.renderView(this.container);
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
  if (!this.modelView || !this.view) {
    var BasicModel = Backbone.Model.extend({ });
    this.modelView = new BasicModel({
      datas: this.datas,
      width: this.width,
      height: this.height,
      eventsNbr: _.size(this.events)
    });
    if (typeof(document) !== 'undefined')  {
      this.view = this.superCondensed ?
        new SuperCondensedView({model: this.modelView}) :
        new NumericalsView({model: this.modelView});
    }
  }
  this.modelView.set('datas', this.datas);
  this.modelView.set('width', this.width);
  this.modelView.set('height', this.height);
  this.modelView.set('eventsNbr', _.size(this.events));
  if (this.needToRender) {
    this.view.renderView(this.container);
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

