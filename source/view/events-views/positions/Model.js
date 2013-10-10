var _ = require('underscore'),
   PositionsView = require('./View.js'),
   Backbone = require('backbone');
var ACCEPTED_TYPE = 'position/wgs84';
var PositionsPlugin = module.exports = function (events, params) {
  this.events = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  _.extend(this, params);
  this._refreshModelView();

};
PositionsPlugin.prototype.eventEnter = function (event) {
  if (this._validEvent(event)) {
    this.events[event.id] = event;
    this._refreshModelView();
  } else {
    console.log('Position plugin: Invalid event:', event);
  }
};

PositionsPlugin.prototype.eventLeave = function (event) {
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

PositionsPlugin.prototype.eventChange = function (event) {
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

PositionsPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.highlightedTime = time;
  this._refreshModelView();
};

PositionsPlugin.prototype.getHtml = function () {
  if (this.view) {
    return this.view.render().el;
  }
};
PositionsPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  this._refreshModelView();
};
PositionsPlugin.prototype.close = function () {
  this.view.close();
  this.view = null;
};
PositionsPlugin.prototype._validEvent = function (event) {
  if (event.type === ACCEPTED_TYPE) {
    if (this.events[event.id]) {
      return false;
    } else if (event.content && event.content.latitude && event.content.longitude) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};
PositionsPlugin.prototype._refreshModelView = function () {
  if (!this.positions) {
    this.positions = [];
  }
  if (this.positions.length !== _.size(this.events)) {
    this.positions = [];
    _.each(this.events, function (event) {
      this.positions.push(event);
    }, this);
    this.positions = _.sortBy(this.positions, function (p) { return p.time; });
  }
  if (!this.modelView || this.view) {
    var BasicModel = Backbone.Model.extend({ });
    this.modelView = new BasicModel({
      positions: this.positions,
      posWidth: this.width,
      posHeight: this.height,
      id: this.id,
      eventsNbr: _.size(this.events)
    });
    if (typeof(document) !== 'undefined')  {
      this.view = new PositionsView({model: this.modelView});
    }
  }
  this.modelView.set('posWidth', this.width);
  this.modelView.set('posHeight', this.height);
  this.modelView.set('positions', this.positions);
  this.modelView.set('id', this.id);
  this.modelView.set('eventsNbr', _.size(this.events));
};


PositionsPlugin.acceptTheseEvents = function (events) {
  var result = true;
  _.each(events, function (event) {
    if (event.type !== ACCEPTED_TYPE) {
      result = false;
    }
  });
  return result;
};