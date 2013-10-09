
var _ = require('underscore');
var Filter = require('pryv').Filter;
var Pryv = require('pryv');
var MSGs = require('./Messages').BrowserFilter;


var BrowserFilter = module.exports = function (browser) {
  Pryv.Utility.SignalEmitter.extend(this, MSGs.SIGNAL);

  this.browser = browser;
  this._showOnlyStreams = null; // object that contains streams to display (from multiple conns)
  this.hiddenStreams = {};
  this._connections = {}; // serialIds / connection

  this.currentEvents = {};

  this.tags = null;
  this._fromST = null;
  this._toST = null;

};

/**
 * Create ah-hoc filter for this connection
 * @private
 */
BrowserFilter.prototype._getFilterFor = function (/*connectionSerialId*/) {

  return nullFilter;
};
var nullFilter = new Filter({limit : 2000});




// ----------------------------- EVENTS --------------------------- //

/**
 * Return true if this event matches the filter
 * @param stream object
 * @returns Boolean
 */
BrowserFilter.prototype.matchesEvent = function (event) {
  return (
    this.matchesStream(event.stream)
    // TODO && TIME
    );
};

// ----------------------------- STREAMS -------------------------- //

/**
 * Return true if this stream matches the filter
 * @param stream object
 * @returns Boolean
 */
BrowserFilter.prototype.matchesStream = function (stream) {
  if (! this.matchesConnection(stream.connection)) { return false; }

  if (_.has(this.hiddenStreams, stream.serialId)) { return false; }
  if (! this._showOnlyStreams) { return true; }
  return _.has(this._showOnlyStreams, stream.serialId);
};

/**
 * The the streams to display
 * @param stream object or array of Streams (null) to show all
 * @returns Boolean
 */
BrowserFilter.prototype.showOnlyStreams = function (streams, batch) {
  if (streams === null) {
    if (this._showOnlyStreams === null) { return; } // nothing to do
  }

  var streamsToLoad = []; // for streams that was not in before

  if (! streams) {
    this._showOnlyStreams = null;
  } else {
    if (!_.isArray(streams)) { streams = [streams]; }

    _.each(streams, function (stream) {

      if (! this.matchesStream(stream)) {
        streamsToLoad.push(stream);
      }

      if (_.has(this.hiddenStreams, stream.serialId)) {
        delete this.hiddenStreams[stream.serialId];
      }
      if (this._showOnlyStreams === null) {
        this._showOnlyStreams = {};
      }
      if (! _.has(this._showOnlyStreams, stream.serialId)) {
        this._showOnlyStreams[stream.serialId] = stream;
      }

    }, this);
  }

  this.refreshContent(MSGs.REASON.EVENT_SCOPE_LEAVE_FOCUS_ON_STREAM,
    {noEnter : true}, batch);

};

BrowserFilter.prototype._refreshContentACTUAL = 0;
/**
 *
 * @param reason  one of BrowserFilter.REASON.*
 * @param focusOn  .. info for further optimization
 */
BrowserFilter.prototype.refreshContent = function (reason, focusOn, batch) {
  batch = batch || this.startBatch();
  focusOn = focusOn || {};

  var that = this;

  if (BrowserFilter.prototype._refreshContentACTUAL > 0) {
    BrowserFilter.prototype._refreshContentACTUAL = 2; // will trigger a refresh an the end
    console.log('Skiping refresh request because already one on course ' + reason);
  }
  BrowserFilter.prototype._refreshContentACTUAL = 1;


  // done function can be called any time to exit

  function finishedRefresh() {
    batch.done();
    // --- ################   ending
    // should we go for another loop?


    if (BrowserFilter.prototype._refreshContentACTUAL > 1) {
      console.log('Refreshing with force reason');
      BrowserFilter.prototype._refreshContentACTUAL = 0;
      that.refreshContent(BrowserFilter.REASON.FORCE);
    } else {
      BrowserFilter.prototype._refreshContentACTUAL = 0;
    }
  }




  // we can process leaving events locally

  var eventsLeavingScope = [];
  // pass through all current events and remove the one not matching current Streams
  _.each(_.values(this.currentEvents), function (event) {
    if (! this.matchesEvent(event)) {
      eventsLeavingScope.push(event);
      delete this.currentEvents[event.serialId];
    }
  }.bind(this));


  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_LEAVE,
    {reason: reason, events: eventsLeavingScope}, batch);



  // ------- can some event enter scope?

  if (_.has(focusOn, 'noEnter')) {  // done
    return finishedRefresh();
  }


  // ------- connections refresh


  var connectionsTodo = [];
  _.each(_.values(this._connections), function (connection) { // for each connection
    if (this.matchesConnection(connection)) {
      connectionsTodo.push(connection.serialId);
    }
  }.bind(this));


  var connectionsTodoCounter = connectionsTodo.length;
  // if no connection then EXIT
  if (connectionsTodoCounter === 0) {
    batch.done();
    return;
  }



  function doneOneConnection(events) {  //  find events entering and leavings
    var eventsMatchedFromModel = []; // used to check if events left form model
    var eventsEnteringScope = []; // events that enter

    _.each(events, function (event) { // for each event

      if (! that.matchesEvent(event)) {
        console.error('!! Error !! BrowserFilter.refreshContent, ' +
          ' got an event not matching the filter): ' + event.serialId);
      } else {

        if (_.has(that.currentEvents, event)) {
          eventsMatchedFromModel.push(event);
        } else {
          eventsEnteringScope.push(event);
          that.currentEvents[event.serialId] = event; // add to currently displayed events
        }

      }

    });


    // ---------- OK DONE
    connectionsTodoCounter--;
    if (connectionsTodoCounter <= 0) {  // finished processing all connections
      return finishedRefresh();
    }
  }

  // do we have new events ?
  _.each(connectionsTodo, function (connectionSerialId) { // for each connection
    this._getEventsForConnectionSerialId(connectionSerialId, function (error, events) { //get events
      doneOneConnection(events);
    }.bind(this));
  }.bind(this));

};

// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
BrowserFilter.prototype.addConnection = function (connectionSerialId, batch) {
  var batchWaitForMe = batch ?
    batch.waitForMeToFinish('addConnection ' + connectionSerialId) : null;
  if (_.has(this._connections, connectionSerialId)) {
    console.log('Warning BrowserFilter.addConnection, already activated: ' + connectionSerialId);
    return;
  }
  var connection = this.browser.connections.get(connectionSerialId);
  if (! connection) { // TODO error management
    console.log('BrowserFilter.addConnection cannot find connection: ' + connectionSerialId);
    return;
  }
  this._connections[connectionSerialId] = connection;




  var self = this;
  this._getEventsForConnectionSerialId(connectionSerialId,
    function (error, result) {
      if (error) { console.log(error); } // TODO handle

      var eventThatEnter = [];
      _.each(result, function (event) {
        if (! _.has(self.currentEvents, event.serialId)) {
          eventThatEnter.push(event);
          self.currentEvents[event.serialId] = event;
        }
      });

      self._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_ENTER,
        {reason: MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION,
          events: result}, batch);
      if (batchWaitForMe) { batchWaitForMe.done(); }
    }
  );
};

/**
 * return true if connection matches filter
 * @param eventListener
 */
BrowserFilter.prototype.matchesConnection = function (connection) {
  // if _showOnly is defined, only consider matching connection
  if (this._showOnlyStreams !== null) {
    var inStreams = false;
    for (var i = 0, streams = _.values(this._showOnlyStreams);
         i < streams.length && ! inStreams; i++) {
      inStreams = streams[i].connection.serialId === connection.serialId;
    }
    if (! inStreams) { return false; }
  }
  return _.has(this._connections, connection.serialId);
};


/**
 * get all events actually matching this filter
 */
BrowserFilter.prototype.triggerForAllCurrentEvents = function (eventListener) {
  eventListener(MSGs.SIGNAL.EVENT_SCOPE_ENTER,
    {reason: MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION,
      events: _.values(this.currentEvents)});
};

BrowserFilter.prototype._getEventsForConnectionSerialId = function (connectionSerialId, callback) {
  var self = this;
  self.browser.connections.get(connectionSerialId, function (error, connection) { // when ready
    if (error) { console.log(error); } // TODO handle
    connection.events.get(self._getFilterFor(connectionSerialId), null,   callback); // get events
  });
};
