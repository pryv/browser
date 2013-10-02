
var _ = require('underscore');
var Filter = require('pryv').Filter;

var Pryv = require('pryv');

Object.defineProperty(Pryv.Stream.prototype, 'serialID', {
  get: function () { return this.connection.serialId + '>>' + this.id; }
});
Object.defineProperty(Pryv.Event.prototype, 'serialID', {
  get: function () { return this.stream.serialId + '>>' + this.id; }
});


var BrowserFilter = module.exports = function (browser) {
  this.browser = browser;
  this._showOnlyStreams = null; // object that contains streams to display (from multiple connections)
  this.hiddenStreams = {};
  this.eventListeners = {};
  this._initEventListeners();
  this.showConnections = {}; // serialIDs / connection

  this.currentEvents = {};
};

/**
 * Create ah-hoc filter for this connection
 * @private
 */
BrowserFilter.prototype._getFilterFor = function (connectionKey) {

  return nullFilter;
};
var nullFilter = new Filter({limit : 200});





//----------------------- event management ----------------------//

BrowserFilter.SIGNAL = {
  STREAM : {},
  EVENT : {},
  BATCH : {}
};


BrowserFilter.UNREGISTER_LISTENER = 'unregisterMePlease';

/** called when a batch of changes is expected, content: <batchId> unique**/
BrowserFilter.SIGNAL.BATCH.BEGIN = 'beginBatch';
/** called when a batch of changes is done, content: <batchId> unique**/
BrowserFilter.SIGNAL.BATCH.DONE = 'doneBatch';

/** called when some streams are hidden, content: Array of Stream**/
BrowserFilter.SIGNAL.STREAM.HIDE = 'hideStream';
BrowserFilter.SIGNAL.STREAM.SHOW = 'hideShow';
/** called when some eventsEnterScope, content: {reason: one of .., content: array of Event }**/
BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER = 'eventEnterScope';
BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE = 'eventLeaveScope';
BrowserFilter.SIGNAL.EVENT.CHANGE = 'eventChange';

BrowserFilter.REASON = { EVENT : {
  SCOPE_ENTER : {},
  SCOPE_LEAVE : {}
} };

BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION = 'connectionAdded';
BrowserFilter.REASON.EVENT.SCOPE_LEAVE.FOCUS_ON_STREAM = 'focusOnStream';

/**
 * Init all event listeners array
 * @private
 */
BrowserFilter.prototype._initEventListeners = function () {
  _.each(_.keys(BrowserFilter.SIGNAL), function (namespace) {
    _.each(_.keys(BrowserFilter.SIGNAL[namespace]), function (key) {
      this.eventListeners[BrowserFilter.SIGNAL[namespace][key]] = [];
    }, this);
  }, this);
};



/**
 * Add an event listener
 * @param signal one of  BrowserFilter.SIGNAL.*.*
 * @param callback function(content) .. content vary on each signal.
 * If the callback returns BrowserFilter.UNREGISTER_LISTENER it will be removed from the listner
 * @return the callback function for further reference
 */
BrowserFilter.prototype.addEventListener = function (signal, callback) {
  this.eventListeners[signal].push(callback);
  return callback;
};


/**
 * remove the callback matching this signal
 */
BrowserFilter.prototype.removeEventListener = function (signal, callback, thisArg) {
  for (var i = 0; i < this.eventListeners[signal].length; i++) {
    if (this.eventListeners[signal][i] === callback) {
      this.eventListeners[signal][i] = null;
    }
  }
};


/**
 * A changes occurred on the filter
 */
BrowserFilter.prototype.fireEvent = function (signal, content, thisArg) {
  _.each(this.eventListeners[signal], function (callback) {
    if (callback !== null &&
      BrowserFilter.UNREGISTER_LISTENER === callback.call(thisArg, content)) {
      this.removeEventListener(signal, callback);
    }
  }, this);
};


/**
 * start a batch process
 * @return an object where you have to call stop when done
 */
BrowserFilter.prototype.startBatch = function () {
  var batch = {
    id : (new Date()).getTime() + 'M',
    filter : this,
    done : function () {
      this.filter.fireEvent(BrowserFilter.SIGNAL.BATCH.DONE, this.id);
    }
  };
  this.fireEvent(BrowserFilter.SIGNAL.BATCH.BEGIN, batch.id);
  return batch;
};

// ----------------------------- STREAMS -------------------------- //




/**
 * Return true if this stream matches the filter
 * @param stream object
 * @returns Boolean
 */
BrowserFilter.prototype.streamIsShown = function (stream) {
  if (_.has(this.hiddenStreams, stream.serialId)) { return false; }
  if (! this._showOnlyStreams) { return true; }
  return _.has(this._showOnlyStreams, stream.serialId);
};

/**
 * The the streams to display
 * @param stream object or array of Streams (null) to show all
 * @returns Boolean
 */
BrowserFilter.prototype.showOnlyStreams = function (streams) {
  if (! streams) {
    this._showOnlyStreams = null;
  } else {
    if (!_.isArray(streams)) { streams = [streams]; }

    _.each(streams, function (stream) {
      if (_.has(this.hiddenStreams, stream.serialId)) {delete this.hiddenStreams[stream.serialId]; }
      if (this._showOnlyStreams === null) {  this._showOnlyStreams = {}; }
      if (! _.has(this._showOnlyStreams, stream.serialId)) {
        this._showOnlyStreams[stream.serialId] = stream;
      }
    }, this);
  }

  var eventsLeavingScope = [];
  // pass thru all current events and remove the one not matching current Streams
  _.each(_.values(this.currentEvents), function (event) {
    if (! this.isShown(event.stream)) {
      eventsLeavingScope.push(event);
    }
  }.bind(this));

  this.fireEvent(BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE,
    {reason: BrowserFilter.REASON.EVENT.SCOPE_LEAVE.FOCUS_ON_STREAM,
      events: eventsLeavingScope});

};


// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
BrowserFilter.prototype.showConnection = function (connectionKey) {
  if (_.has(this.showConnection, connectionKey)) {
    console.log('Warning BrowserFilter.showConnection, already activated: ' + connectionKey);
    return;
  }
  if (! this.browser.connections.get(connectionKey)) { // TODO error management
    console.log('BrowserFilter.showConnection cannot find connection: ' + connectionKey)
    return;
  }
  this.showConnection[connectionKey] = true;

  var self = this;
  this._getEventsForConnection(connectionKey,
    function (error, result) {
      if (error) { console.log(error); } // TODO handle

      var eventThatEnter = [];
      _.each(result, function (event) {
        if (! _.has(self.currentEvents, event.serialID)) {
          eventThatEnter.push(event);
          self.currentEvents[event.serialID] = event;
        }
      });

      self.fireEvent(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
        {reason: BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION,
          events: result});
    }
  );

};



/**
 * get all events actually matching this filter
 */
BrowserFilter.prototype.triggerForAllCurrentEvents = function (eventListener) {
  eventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
    {reason: BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION,
      events: _.values(this.currentEvents)});
};

BrowserFilter.prototype._getEventsForConnection = function (connectionKey, callback) {
  var self = this;
  self.browser.connections.get(connectionKey, function (error, connection) { // when ready
    if (error) { console.log(error); } // TODO handle
    connection.events.get(self._getFilterFor(connectionKey), null,   callback); // get events
  });
};
