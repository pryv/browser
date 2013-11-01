var _ = require('underscore'),
  GenericsView = require('./View.js'),
  Backbone = require('backbone');

var GenericsPlugin = module.exports = function (events, params) {
  this.debounceRefresh = _.debounce(function () {
    this._refreshModelView();
  }, 100);
  this.events = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  _.extend(this, params);
  this.debounceRefresh();

};
GenericsPlugin.prototype.eventEnter = function (event) {

  /* if (this.events[event.id]) {
   console.log('eventEnter: event id ' + event.id + ' already exists');
   } else {  */
  this.events[event.id] = event;
  this.debounceRefresh();
  //}
};

GenericsPlugin.prototype.eventLeave = function (event) {
  if (!this.events[event.id]) {
    console.log('eventLeave: event id ' + event.id + ' dont exists');
  } else {
    delete this.events[event.id];
  }
};

GenericsPlugin.prototype.eventChange = function (event) {
  if (!this.events[event.id]) {
    console.log('eventChange: event id ' + event.id + ' dont exists');
  }  else {
    this.events[event.id] = event;
    this.debounceRefresh();
  }
};

GenericsPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.highlightedTime = time;
  this.debounceRefresh();
};

GenericsPlugin.prototype.render = function (container) {
  this.container = container;
  if (this.view) {
    this.view.renderView(this.container);
  } else {
    this.needToRender = true;
  }
};
GenericsPlugin.prototype.refresh = function () {
  this.debounceRefresh();
};

GenericsPlugin.prototype.close = function () {
  if (this.view) {
    this.view.close();
  }
  this.view = null;
  this.events = null;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.eventDisplayed = null;

};
GenericsPlugin.prototype._refreshModelView = function () {
  this._findEventToDisplay();
  if (!this.modelView || !this.view) {
    var BasicModel = Backbone.Model.extend({ });
    this.modelView = new BasicModel({
      content: this.eventDisplayed.content,
      description: this.eventDisplayed.description,
      id: this.eventDisplayed.id,
      modified: this.eventDisplayed.modified,
      streamId: this.eventDisplayed.streamId,
      tags: this.eventDisplayed.tags,
      time: this.eventDisplayed.time,
      type: this.eventDisplayed.type,
      eventsNbr: _.size(this.events)
    });
    if (typeof(document) !== 'undefined')  {
      this.view = new GenericsView({model: this.modelView});
    }
  }
  this.modelView.set('content', this.eventDisplayed.content);
  this.modelView.set('id', this.eventDisplayed.id);
  this.modelView.set('description', this.eventDisplayed.description);
  this.modelView.set('type', this.eventDisplayed.type);
  this.modelView.set('streamId', this.eventDisplayed.streamId);
  this.modelView.set('tags', this.eventDisplayed.tags);
  this.modelView.set('time', this.eventDisplayed.time);
  this.modelView.set('modified', this.eventDisplayed.modified);
  this.modelView.set('eventsNbr', _.size(this.events));
  if (this.needToRender) {
    this.view.renderView(this.container);
    this.needToRender = false;
  }
};

GenericsPlugin.prototype._findEventToDisplay = function () {
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
