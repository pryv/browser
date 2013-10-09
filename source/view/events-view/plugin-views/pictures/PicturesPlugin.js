var _ = require('underscore'),
  PicturesView = require('./PicturesView.js'),
  Backbone = require('backbone');
var ACCEPTED_TYPE = 'picture/attached';
var PicturesPlugin = module.exports = function (events, width, height) {
  this.events = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);
  this.width = width;
  this.height = height;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this._refreshModelView();

};
PicturesPlugin.prototype.eventEnter = function (event) {
  if (event.type === ACCEPTED_TYPE) {
    if (this.events[event.id]) {
      console.log('eventEnter: event id ' + event.id + ' already exists');
    } else {
      this.events[event.id] = event;
      this._refreshModelView();
    }
  } else {
    console.log('eventEnter: This event type ' + event.type + ' is not accepted. ' +
      'Type accepted is ' + ACCEPTED_TYPE);
  }

};

PicturesPlugin.prototype.eventLeave = function (event) {
  if (!this.events[event.id]) {
    console.log('eventLeave: event id ' + event.id + ' dont exists');
  } else {
    delete this.events[event.id];
    if (_.size(this.events) === 0) {
      this.close();
    } else {
      this._refreshModelView();
    }
  }
};

PicturesPlugin.prototype.eventChange = function (event) {
  if (!this.events[event.id]) {
    console.log('eventChange: event id ' + event.id + ' dont exists');
  } else if (event.type !== ACCEPTED_TYPE) {
    console.log('eventChange: This event type ' + event.type + ' is not accepted. ' +
      'Type accepted is ' + ACCEPTED_TYPE);
  } else {
    this.events[event.id] = event;
    this._refreshModelView();
  }
};

PicturesPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.highlightedTime = time;
  this._refreshModelView();
};

PicturesPlugin.prototype.getHtml = function () {
  if (this.view) {
    return this.view.render().el;
  }
};
PicturesPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  this._refreshModelView();
};
PicturesPlugin.prototype.close = function () {
  this.view.close();
  this.view = null;
};
PicturesPlugin.prototype._refreshModelView = function () {
  this._findEventToDisplay();
  if (!this.modelView || !this.view) {
    // console.log('refresh create');
    var BasicModel = Backbone.Model.extend({ });
    this.modelView = new BasicModel({
      description: this.eventDisplayed.description,
      id: this.eventDisplayed.id,
      picUrl: this.eventDisplayed.attachmentsUrl,
      modified: this.eventDisplayed.modified,
      streamId: this.eventDisplayed.streamId,
      tags: this.eventDisplayed.tags,
      time: this.eventDisplayed.time,
      type: this.eventDisplayed.type,
      eventsNbr: _.size(this.events),
      width: this.width,
      height: this.height
    });
    if (typeof(document) !== 'undefined')  {
      this.view = new PicturesView({model: this.modelView});
    }
  } else {

    // console.log('refresh modif');
    this.modelView.set('id', this.eventDisplayed.id);
    this.modelView.set('picUrl', this.eventDisplayed.attachmentsUrl);
    this.modelView.set('description', this.eventDisplayed.description);
    this.modelView.set('type', this.eventDisplayed.type);
    this.modelView.set('streamId', this.eventDisplayed.streamId);
    this.modelView.set('tags', this.eventDisplayed.tags);
    this.modelView.set('time', this.eventDisplayed.time);
    this.modelView.set('modified', this.eventDisplayed.modified);
    this.modelView.set('eventsNbr', _.size(this.events));
    this.modelView.set('width', this.width);
    this.modelView.set('height', this.height);
  }
};

PicturesPlugin.prototype._findEventToDisplay = function () {

  if (this.highlightedTime === Infinity) {
    var oldestTime = 0;
    _.each(this.events, function (event) {
      if (event.time >= oldestTime) {
        oldestTime = event.time;
        this.eventDisplayed = event;
      }
    }, this);

  } else {
    var timeDiff = Infinity, temp = 0;
    _.each(this.events, function (event) {
      temp = Math.abs(event.time - this.highlightedTime);
      if (temp <= timeDiff) {
        timeDiff = temp;
        this.eventDisplayed = event;
      }
    }, this);
  }
};

PicturesPlugin.acceptTheseEvents = function (events) {
  var result = true;
  _.each(events, function (event) {
    if (event.type !== ACCEPTED_TYPE) {
      result = false;
    }
  });
  return result;
};