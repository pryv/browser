/* global $ */
var _ = require('underscore'),
  NotesView = require('./View.js'),
  Backbone = require('backbone');
var NotesPlugin = module.exports = function (events, params) {
  this.debounceRefresh = _.debounce(function () {
    this._refreshModelView();
  }, 100);
  this.events = {};
  _.each(events, function (event) {
    this.events[event.id] = event;
  }, this);

  /** Addon multiple note per view        */
  this.nbrDisplayW = -1;
  this.nbrDisplayH = -1;
  this.nbrDisplayCurrentW = -1;
  this.nbrDisplayCurrentH = -1;
  this.minWidth = 100;
  this.minHeight = 100;
  this.maxWidth = 500;
  this.maxHeight = 500;
  this.eventsDisplayed = [];
  this.animationIn = null;
  this.animationOut = null;
  this.hasDetailedView = false;
  this.highlightedTime = Infinity;
  this.modelView = null;
  this.view = null;
  this.eventDisplayed = null;
  this.container = null;
  this.needToRender = null;
  this.rendered = null;
  _.extend(this, params);
  this.debounceRefresh();

};
NotesPlugin.prototype.eventEnter = function (event) {
  this.events[event.id] = event;
  if (this.hasDetailedView) {
    this.treeMap.addEventsDetailedView(event);
  }
  this.debounceRefresh();
};

NotesPlugin.prototype.eventLeave = function (event) {
  if (!this.events[event.id]) {
    console.log('eventLeave: event id ' + event.id + ' dont exists');
  } else {
    if (this.hasDetailedView) {
      this.treeMap.deleteEventDetailedView(event);
    }
    delete this.events[event.id];
    this.debounceRefresh();
  }
};

NotesPlugin.prototype.eventChange = function (event) {
  if (!this.events[event.id]) {
    console.log('eventChange: event id ' + event.id + ' dont exists');
  }  else {
    this.events[event.id] = event;
    if (this.hasDetailedView) {
      this.treeMap.updateEventDetailedView(event);
    }
    this.debounceRefresh();
  }
};

NotesPlugin.prototype.OnDateHighlightedChange = function (time) {
  this.animationIn = time < this.highlightedTime ? 'fadeInLeftBig' : 'fadeInRightBig';
  this.animationOut = time < this.highlightedTime ? 'fadeOutRightBig' : 'fadeOutLeftBig';
  this.highlightedTime = time;
  if (this.hasDetailedView) {
    this.treeMap.highlightDateDetailedView(this.highlightedTime);
  }
  this.debounceRefresh();
};

NotesPlugin.prototype.render = function (container) {
  this.container = container;
  if (this.eventsDisplayed.length === 0) {
    this.needToRender = true;
  }
  for (var j = 0; j < this.eventsDisplayed.length; ++j) {
    if (this.eventsDisplayed[j].view) {
      this.eventsDisplayed[j].view.renderView(this.container, this.animationIn);
      this.rendered = true;
    } else {
      this.needToRender = true;
    }
  }

};
NotesPlugin.prototype.refresh = function (object) {
  _.extend(this, object);
  /** Addon */
  if (this.width < this.minWidth || this.height < this.minHeight) {
    this.nbrDisplayW = 1;
    this.nbrDisplayH = 1;
  }
  if (Math.floor(this.width / this.maxWidth) !== this.nbrDisplayW ||
    Math.floor(this.height / this.maxHeight) !== this.nbrDisplayH) {
    this.nbrDisplayW = Math.floor(this.width / this.maxWidth);
    this.nbrDisplayH = Math.floor(this.height / this.maxHeight);
    this.nbrDisplayW = this.nbrDisplayW === 0 ? 1 : this.nbrDisplayW;
    this.nbrDisplayH = this.nbrDisplayH === 0 ? 1 : this.nbrDisplayH;
    this.debounceRefresh();
  }
  /** */

};

NotesPlugin.prototype.close = function () {
  this.rendered = false;
  this.events = null;
  this.highlightedTime = Infinity;
  for (var j = 0; j < this.eventsDisplayed.length; ++j) {
    this.eventsDisplayed[j].view.close(this.animationOut);
    this.eventsDisplayed[j].view = null;
    this.eventsDisplayed[j].modelView = null;
  }
  this.eventsDisplayed = [];
};

NotesPlugin.prototype._refreshModelView = function () {
  this._findEventToDisplay();
  var BasicModel = Backbone.Model.extend({ });
  for (var i = 0; i < this.eventsDisplayed.length; ++i) {
    var denomW = i >= (this.nbrDisplayCurrentH - 1) * this.nbrDisplayCurrentW &&
      this.eventsDisplayed.length % this.nbrDisplayCurrentW !== 0 ?
      this.eventsDisplayed.length % this.nbrDisplayCurrentW:
      this.nbrDisplayCurrentW;

    var border = 0.5;
    var width = (100 - (border * (denomW - 1))) / denomW;
    var left = (Math.floor(i % this.nbrDisplayCurrentW)) * (width + border);
    var height = (100 - (border * (this.nbrDisplayCurrentH - 1))) / this.nbrDisplayCurrentH;
    var top = (Math.floor(i / this.nbrDisplayCurrentW)) * (height + border);
    if (!this.eventsDisplayed[i].modelView || !this.eventsDisplayed[i].view) {
      this.eventsDisplayed[i].modelView = new BasicModel({
        content: this.eventsDisplayed[i].content,
        description: this.eventsDisplayed[i].description,
        id: this.eventsDisplayed[i].id,
        modified: this.eventsDisplayed[i].modified,
        streamId: this.eventsDisplayed[i].streamId,
        tags: this.eventsDisplayed[i].tags,
        time: this.eventsDisplayed[i].time,
        type: this.eventsDisplayed[i].type,
        top: top,
        left: left,
        height: height,
        width: width,
        eventsNbr: _.size(this.events)
      });
      if (typeof(document) !== 'undefined')  {
        this.eventsDisplayed[i].view = new NotesView({model: this.eventsDisplayed[i].modelView});
        /* jshint -W083 */
        this.eventsDisplayed[i].view.on('nodeClicked', function () {
          if (!this.hasDetailedView) {
            this.hasDetailedView = true;
            var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
              this.treeMap.closeDetailedView();
              this.hasDetailedView = false;
            }.bind(this));
            this.treeMap.showDetailedView($modal, {
              events: this.events,
              stream: this.stream,
              highlightedTime: this.highlightedTime
            });
          }
        }.bind(this));
      }
    }

    this.eventsDisplayed[i].modelView.set('content', this.eventsDisplayed[i].content);
    this.eventsDisplayed[i].modelView.set('id', this.eventsDisplayed[i].id);
    this.eventsDisplayed[i].modelView.set('description', this.eventsDisplayed[i].description);
    this.eventsDisplayed[i].modelView.set('type', this.eventsDisplayed[i].type);
    this.eventsDisplayed[i].modelView.set('streamId', this.eventsDisplayed[i].streamId);
    this.eventsDisplayed[i].modelView.set('tags', this.eventsDisplayed[i].tags);
    this.eventsDisplayed[i].modelView.set('time', this.eventsDisplayed[i].time);
    this.eventsDisplayed[i].modelView.set('modified', this.eventsDisplayed[i].modified);
    this.eventsDisplayed[i].modelView.set('top', top);
    this.eventsDisplayed[i].modelView.set('left',  left);
    this.eventsDisplayed[i].modelView.set('height', height);
    this.eventsDisplayed[i].modelView.set('width',  width);
    this.eventsDisplayed[i].modelView.set('eventsNbr', _.size(this.events));
  }
  if (this.needToRender || this.rendered) {
    for (var j = 0; j < this.eventsDisplayed.length; ++j) {
      if ($('#' + this.eventsDisplayed[j].id).length === 0) {
        this.eventsDisplayed[j].view.renderView(this.container, this.animationIn);
        this.rendered = true;
      }
    }
    this.needToRender = false;
  }
};

NotesPlugin.prototype._findEventToDisplay = function () {
  var nearestEvents = [];
  var sortedEvents = _.sortBy(this.events, function (e) { return e.time; });
  _.each(this.eventsDisplayed, function (event) {
    event.toRemove = true;
  });
  if (this.highlightedTime === Infinity) {
    var oldestTime = 0;
    _.each(sortedEvents, function (event) {
      if (event.time >= oldestTime) {
        oldestTime = event.time;
        this.eventDisplayed = event;
        nearestEvents.unshift(event);
      }
    }, this);

  } else {
    var timeDiff = Infinity, debounceRefresh = 0;
    _.each(sortedEvents, function (event) {
      debounceRefresh = Math.abs(event.time - this.highlightedTime);
      if (debounceRefresh <= timeDiff) {
        timeDiff = debounceRefresh;
        this.eventDisplayed = event;
        nearestEvents.unshift(event);
      }
    }, this);
  }
  this.nbrDisplayCurrentH = this.nbrDisplayH;
  this.nbrDisplayCurrentW = this.nbrDisplayW;
  var notEnoughtEvent = false;
  if (nearestEvents.length < this.nbrDisplayH * this.nbrDisplayW) {
    notEnoughtEvent = true;
    this.nbrDisplayCurrentH = Math.floor(Math.sqrt(nearestEvents.length));
    this.nbrDisplayCurrentW = Math.ceil(nearestEvents.length / this.nbrDisplayCurrentH);
  }
  for (var i = 0; i < this.nbrDisplayCurrentH * this.nbrDisplayCurrentW &&
    i < nearestEvents.length; ++i) {
    nearestEvents[i].toRemove = false;
  }
  _.each(this.eventsDisplayed, function (event) {
    if (event.toRemove && event.view) {
      event.view.close(this.animationOut);
      event.view = null;
    }
  }, this);
  // console.log(this.events, nearestEvents);
  this.eventsDisplayed = nearestEvents.splice(0, this.nbrDisplayCurrentH * this.nbrDisplayCurrentW)
    .reverse();

  /* console.log('note', notEnoughtEvent,
   'current', this.nbrDisplayCurrentW, this.nbrDisplayCurrentH,
   'calculated', this.nbrDisplayW, this.nbrDisplayH,
   this.eventsDisplayed, this.width, this.height);  */
};
