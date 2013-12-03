/* global $*/
var _ = require('underscore'),
  Backbone = require('backbone');
var Model = module.exports = function (events, params) {
  this.verbose = true;
  this.events = {};
  this.modelContent = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.typeView = null;
  this.animationIn = null;
  this.animationOut = null;
  this.hasDetailedView = false;
  _.extend(this, params);
  this.debounceRefresh = _.debounce(function () {
    this._refreshModelView();
  }, 100);
  this.debounceRefresh();
};

Model.implement = function (constructor, members) {
  var newImplementation = constructor;
  if (typeof Object.create === 'undefined') {
    Object.create = function (prototype) {
      function C() { }
      C.prototype = prototype;
      return new C();
    };
  }
  newImplementation.prototype = Object.create(this.prototype);
  _.extend(newImplementation.prototype, members);
  newImplementation.implement = this.implement;
  return newImplementation;
};

_.extend(Model.prototype, {
  eventEnter: function (event) {
    if (this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventEnter: this eventId already exist:', event.id,
        'current:', this.events[event.id], 'new:', event);
    }
    this.events[event.id] = event;
    if (this.hasDetailedView) {
      this.treeMap.addEventsDetailedView(event);
    }

    this.debounceRefresh();
  },
  eventLeave: function (event) {
    if (!this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventLeave: this eventId dont exist:', event.id,
        'event:', event);
    }
    delete this.events[event.id];
    if (this.hasDetailedView) {
      this.treeMap.deleteEventDetailedView(event);
    }
    if (_.size(this.events) !== 0) {
      this.debounceRefresh();
    }
  },
  eventChange: function (event) {
    if (!this.events[event.id] && this.verbose) {
      console.log(this.container, 'eventChange: this eventId dont exist:', event.id,
        'event:', event);
    }
    this.events[event.id] = event;
    if (this.hasDetailedView) {
      this.treeMap.updateEventDetailedView(event);
    }
    this.debounceRefresh();
  },
  OnDateHighlightedChange: function (time) {
    this.animationIn = time < this.highlightedTime ? 'fadeInLeftBig' : 'fadeInRightBig';
    this.animationOut = time < this.highlightedTime ? 'fadeOutRightBig' : 'fadeOutLeftBig';
    this.highlightedTime = time;
    if (this.hasDetailedView) {
      this.treeMap.highlightDateDetailedView(this.highlightedTime);
    }
    this.debounceRefresh();
  },
  render: function (container) {
    this.container = container;
    if (this.view) {
      this.view.renderView(this.container, this.animationIn);
    } else {
      this.needToRender = true;
    }
  },
  refresh: function (newParams) {
    _.extend(this, newParams);
    this.debounceRefresh();
  },
  close: function () {
    if (this.view) {
      this.view.close(this.animationOut);
    }
    this.view = null;
    this.events = null;
    this.highlightedTime = Infinity;
    this.modelView = null;
    this.eventDisplayed = null;
  },
  beforeRefreshModelView: function () {},
  afterRefreshModelView: function () {},
  _refreshModelView: function () {
    this._findEventToDisplay();
    this.beforeRefreshModelView();
    if (!this.modelView) {
      var BasicModel = Backbone.Model.extend({});
      this.modelView = new BasicModel({});
    }

    // Update the model
    _.each(_.keys(this.modelContent), function (key) {
      this.modelView.set(key, this.modelContent[key]);
    }, this);

    if (!this.view) {
      if (typeof(document) !== 'undefined')  {
        this.view = new this.typeView({model: this.modelView});
        this.view.on('nodeClicked', function () {
          if (!this.hasDetailedView) {
            this.hasDetailedView = true;
            var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
              this.treeMap.closeDetailedView();
              this.hasDetailedView = false;
            }.bind(this));
            this.treeMap.initDetailedView($modal, this.events, this.highlightedTime);
          }
        }.bind(this));
      }
    }

    if (this.needToRender) {
      this.view.renderView(this.container, this.animationIn);
      this.needToRender = false;
    }
    this.afterRefreshModelView();
  },

  _findEventToDisplay: function () {
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
  }

});