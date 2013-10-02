
var _ = require('underscore');
var Filter = require('pryv').Filter;


var BrowserFilter = module.exports = function (browser) {
  this.browser = browser;
  this.showOnlyStreams = null; // object that contains streams to display (from multiple connections)
  this.hiddenStreams = {};
  this.eventListeners = {};
  this._initEventListeners();

  this.showConnections = {}; // serialIDs / connection
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
/** called when some eventsEnterScope, content: {reason: one of .., content: array of Event }**/
BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER = 'eventEnterScope';
BrowserFilter.SIGNAL.EVENT.SCOPE_LEAVE = 'eventLeaveScope';
BrowserFilter.SIGNAL.EVENT.CHANGE = 'eventChange';

BrowserFilter.REASON = { EVENT : {
  SCOPE_ENTER : {},
  SCOPE_LEAVE : {}
} };

BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION = 'connectionAdded';

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
BrowserFilter.prototype.showStream = function (stream) {
  if (_.has(this.hiddenStreams, stream.id)) { return false; }
  if (! this.showOnlyStreams) { return true; }
  return _.has(this.showOnlyStreams, stream.id);
};


/**
 * Add this stream to the hidden (ignored ones) and eventually remove
 * the streams from the showOnlyList
 * @param stream object or array of Streams
 * @returns Boolean
 */
BrowserFilter.prototype.hideStreams = function (streams) {
  if (!_.isArray(streams)) { streams = [streams]; }

  var changes = [];

  _.each(streams, function (stream) {
    if (this.showStream(stream)) { changes.push(stream); }
    if (! _.has(this.hiddenStreams)) { this.hiddenStreams[stream.id] = stream; }
    if (! _.has(this.showOnlyStreams)) { delete this.showOnlyStreams[stream.id]; }
  }, this);

  if (changes.length > 0) { this.dispatchChanges(BrowserFilter.SIGNAL.STREAM.HIDE, changes); }
  return changes;
};


// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
BrowserFilter.prototype.showConnection = function (connectionKey) {
  if (_.has(this.showConnection, connectionKey)) {
    console.log('Warning BrowserFilter.showConnection, already activated: ' + connectionKey);
    return ;
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
  var self = this;
  _.each(_.keys(self.showConnection), function (connectionKey) {
    self._getEventsForConnection(connectionKey,
      function (error, result) {
        if (error) { console.log(error); } // TODO handle
        eventListener(BrowserFilter.SIGNAL.EVENT.SCOPE_ENTER,
          {reason: BrowserFilter.REASON.EVENT.SCOPE_ENTER.ADD_CONNECTION,
            events: result});
      }
    );
  });
};

BrowserFilter.prototype._getEventsForConnection = function (connectionKey, callback) {
  var self = this;
  self.browser.connections.get(connectionKey, function (error, connection) { // when ready
    if (error) { console.log(error); } // TODO handle
    connection.events.get(self._getFilterFor(connectionKey), null,   callback); // get events
  });
};
