
var _ = require('underscore');
var Filter = require('pryv').Filter;
var Pryv = require('pryv');
var MSGs = require('./Messages').ModelFilter;


var ModelFilter = module.exports = function (model) {
  Pryv.Utility.SignalEmitter.extend(this, MSGs.SIGNAL);
  this.model = model;

  this._monitors = {}; // serialIds / monitor

  this.rootFilter = new Filter({limit: 2000});
};



// ----------------------------- Generic Event fire ------------------ //

ModelFilter.prototype._eventsEnterScope = function (reason, events, batch) {
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_ENTER, {reason: reason, events: events}, batch);

};

ModelFilter.prototype._eventsLeaveScope = function (reason, events, batch) {
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_LEAVE, {reason: reason, events: events}, batch);

};

ModelFilter.prototype._eventsChange = function (reason, events, batch) {
  this._fireEvent(MSGs.SIGNAL.EVENT_CHANGE, {reason: reason, events: events}, batch);

};

// ----------------------------- Events from monitors ------------------ //

ModelFilter.prototype._onMonitorEventChange = function (changes) {
  var batch = this.startBatch();
  this._eventsEnterScope(MSGs.REASON.REMOTELY, changes.created, batch);
  this._eventsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed, batch);
  this._eventsChange(MSGs.REASON.REMOTELY, changes.modified, batch);
  batch.done();
};

ModelFilter.prototype._onMonitorFilterChange = function (changes) {
  var batch = this.startBatch();
  this._eventsEnterScope(changes.filterInfos.signal, changes.enter, batch);
  this._eventsLeaveScope(changes.filterInfos.signal, changes.leave, batch);
  batch.done();
};


// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
ModelFilter.prototype.addConnection = function (connectionSerialId, batch) {
  var batchWaitForMe = batch ?
    batch.waitForMeToFinish('addConnection ' + connectionSerialId) : null;
  if (_.has(this._monitors, connectionSerialId)) {
    console.log('Warning ModelFilter.addConnection, already activated: ' + connectionSerialId);
    return;
  }
  var connection = this.model.connections.get(connectionSerialId);
  if (! connection) { // TODO error management
    console.log('ModelFilter.addConnection cannot find connection: ' + connectionSerialId);
    return;
  }

  // be sure localstorage is activated
  connection.useLocalStorage(function (useLocalStorageError) {
    if (useLocalStorageError) {
      throw new Error('failed activating localStorage for ' + connection.id);
    }

    var filterSettings = _.omit(this.rootFilter.getData(), 'streams'); //copy everything but Streams
    var specificFilter = new Filter(filterSettings);

    var monitor = connection.monitor(specificFilter);
    this._monitors[connectionSerialId] = monitor;

    // ----- add listeners
    function onMonitorOnLoad(events) {
      if (batchWaitForMe) { batchWaitForMe.done(); } // called only once at load
      this._eventsEnterScope(MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION, events, batch);
    }
    monitor.addEventListener(
      Pryv.Messages.Monitor.ON_LOAD, onMonitorOnLoad.bind(this));

    monitor.addEventListener(
      Pryv.Messages.Monitor.ON_EVENT_CHANGE, this._onMonitorEventChange.bind(this));
    monitor.addEventListener(
      Pryv.Messages.Monitor.ON_FILTER_CHANGE, this._onMonitorFilterChange.bind(this));

    monitor.start(function (error) {
      console.log('monitor started ' + error);
    });
  }.bind(this));
};



/**
 * get all events actually matching this filter
 */
ModelFilter.prototype.triggerForAllCurrentEvents = function (trigger) {
  this._eachMonitor(function (monitor) {
    trigger(MSGs.SIGNAL.EVENT_SCOPE_ENTER,
      {reason: MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION,
        events: monitor.getEvents()});
  });
};

// --------- Utils -----

/** execute for each filter **/
ModelFilter.prototype._eachMonitor = function (callback) {
  _.each(this._monitors, callback.bind(this));
};

// --------- Filter manipulations -----------------//

/**
 * get the actual streams in the filter;
 * @returns {Array}
 */
ModelFilter.prototype.getStreams = function () {
  var result = [];
  this._eachMonitor(function (monitor) {
    _.each(monitor.filter.streamsIds, function (streamId) {
      result.push(monitor.connection.getStreamById(streamId));
    });
  });
  return result;
};

/**
 * focus on those streams;
 */
ModelFilter.prototype.focusOnStreams = function (streams) {
  if (streams === null) {
    this._eachMonitor(function (monitor) {  // clear all
      monitor.filter.streamsIds = null;
    });
    return 1;
  }

  if (! _.isArray(streams)) { streams = [streams];  }

  // --- order the streams by connection
  // (note that streams not in current connection pool will be ignored without warning)
  var streamsByConnection = {};
  _.each(streams, function (stream) {
    if (! _.has(streamsByConnection, stream.connection.serialId)) {
      streamsByConnection[stream.connection.serialId] = [];
    }
    streamsByConnection[stream.connection.serialId].push(stream.id);
  });

  this._eachMonitor(function (monitor, key) {  // clear all
    if (_.has(streamsByConnection, key)) {
      monitor.filter.streamsIds = streamsByConnection[key]; // shush the connection
    } else {
      monitor.filter.streamsIds = []; // shush the connection
    }
  });
};




// ............ CLEANUP OR REUSE ................................  //


// ----------------------------- EVENTS --------------------------- //

/**
 * Return true if this event matches the filter
 * @param stream object
 * @returns Boolean
 */
ModelFilter.prototype.matchesEvent = function (event) {
  return (
    this.matchesStream(event.stream)
    //TODO && TIME
    );
};

// ----------------------------- STREAMS -------------------------- //

/**
 * Return true if this stream matches the filter
 * @param stream object
 * @returns Boolean
 */
ModelFilter.prototype.matchesStream = function (stream) {
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
ModelFilter.prototype.showOnlyStreams = function (streams, batch) {
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

ModelFilter.prototype._refreshContentACTUAL = 0;
/**
 *
 * @param reason  one of ModelFilter.REASON.*
 * @param focusOn  .. info for further optimization
 */
ModelFilter.prototype.refreshContent = function (reason, focusOn, batch) {
  batch = batch || this.startBatch();
  focusOn = focusOn || {};

  var that = this;

  if (ModelFilter.prototype._refreshContentACTUAL > 0) {
    ModelFilter.prototype._refreshContentACTUAL = 2; // will trigger a refresh an the end
    console.log('Skiping refresh request because already one on course ' + reason);
  }
  ModelFilter.prototype._refreshContentACTUAL = 1;


  // done function can be called any time to exit

  function finishedRefresh() {
    batch.done();
    // --- ################   ending
    // should we go for another loop?


    if (ModelFilter.prototype._refreshContentACTUAL > 1) {
      console.log('Refreshing with force reason');
      ModelFilter.prototype._refreshContentACTUAL = 0;
      that.refreshContent(ModelFilter.REASON.FORCE);
    } else {
      ModelFilter.prototype._refreshContentACTUAL = 0;
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
  _.each(_.values(this._monitors), function (connection) { // for each connection
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
        console.error('!! Error !! ModelFilter.refreshContent, ' +
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

/**
 * return true if connection matches filter
 * @param eventListener
 */
ModelFilter.prototype.matchesConnection = function (connection) {
  // if _showOnly is defined, only consider matching connection
  if (this._showOnlyStreams !== null) {
    var inStreams = false;
    for (var i = 0, streams = _.values(this._showOnlyStreams);
         i < streams.length && ! inStreams; i++) {
      inStreams = streams[i].connection.serialId === connection.serialId;
    }
    if (! inStreams) { return false; }
  }
  return _.has(this._monitors, connection.serialId);
};




ModelFilter.prototype._getEventsForConnectionSerialId = function (connectionSerialId, callback) {
  var self = this;
  self.model.connections.get(connectionSerialId, function (error, connection) { // when ready
    if (error) { console.log(error); } // TODO handle
    connection.events.get(self._getFilterFor(connectionSerialId), null,   callback); // get events
  });
};
