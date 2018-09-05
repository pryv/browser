
var _ = require('underscore');
var Filter = require('pryv').Filter;
var Pryv = require('pryv');
var MSGs = require('./Messages').MonitorsHandler;


/**
 * Handle multiple monitors and map Pryv.Filter properties
 * @type {Function}
 */
var MonitorsHandler = module.exports = function (model, batchSetKeyValues) {
  Pryv.utility.SignalEmitter.extend(this, MSGs.SIGNAL, 'MonitorsHandler');
  this.model = model;
  this._monitors = {}; // serialIds / monitor
  this.rootFilter = new Filter();
  this.connectionToRemove = [];
  if (batchSetKeyValues) {
    this.set(batchSetKeyValues);
  }
};



// ----------------------------- Generic Event fire ------------------ //

MonitorsHandler.prototype._eventsEnterScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_ENTER, {reason: reason, events: events}, batch);
};

MonitorsHandler.prototype._eventsLeaveScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_LEAVE, {reason: reason, events: events}, batch);
};

MonitorsHandler.prototype._eventsChange = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_CHANGE, {reason: reason, events: events}, batch);
};
MonitorsHandler.prototype._streamsEnterScope = function (reason, streams, batch) {
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_SCOPE_ENTER, {reason: reason, streams: streams}, batch);
};

MonitorsHandler.prototype._streamsLeaveScope = function (reason, streams, batch) {
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_SCOPE_LEAVE, {reason: reason, streams: streams}, batch);
};

MonitorsHandler.prototype._streamsChange = function (reason, message, batch) {
  var streams = message.streams;
  if (streams.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.STREAM_CHANGE,
    {reason: reason, streams: streams,
      modifiedPreviousProperties:
        message.modifiedPreviousProperties}, batch);
};


MonitorsHandler.prototype._filteredStreamsChange = function (streams, batch) {
  this._fireEvent(MSGs.SIGNAL.FILTERED_STREAMS_CHANGE, streams, batch);
};



// ----------------------------- Events from monitors ------------------ //

MonitorsHandler.prototype._onMonitorEventChange = function (changes, batch) {
  var myBatch = this.startBatch('eventChange', batch);
  this._eventsEnterScope(MSGs.REASON.REMOTELY, changes.created, myBatch);
  this._eventsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed, myBatch);
  this._eventsChange(MSGs.REASON.REMOTELY, changes.modified, myBatch);
  myBatch.done();
};
MonitorsHandler.prototype._onMonitorStreamChange = function (changes) {
  this._streamsEnterScope(MSGs.REASON.REMOTELY, changes.created);
  this._streamsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed);
  this._streamsLeaveScope(MSGs.REASON.REMOTELY, changes.deleted);
  this._streamsChange(MSGs.REASON.REMOTELY,
    { streams: changes.modified, modifiedPreviousProperties: changes.modifiedPreviousProperties});
};

MonitorsHandler.prototype._onMonitorFilterChange = function (changes, batch) {
  var myBatch = this.startBatch('filterChange', batch);
  this._eventsEnterScope(changes.filterInfos.signal, changes.enter, myBatch);
  this._eventsLeaveScope(changes.filterInfos.signal, changes.leave, myBatch);
  myBatch.done();
};


// ----------------------------- CONNECTIONS -------------------------- //


/**
 * get all events that match this filter
 */
MonitorsHandler.prototype.addConnection = function (connectionSerialId, batch) {
  var batchWaitForMe = batch ?
    batch.waitForMeToFinish('addConnection ' + connectionSerialId) : null;
  if (_.has(this._monitors, connectionSerialId)) {
    console.log('Warning MonitorsHandler.addConnection, already activated: ' + connectionSerialId);
    return;
  }
  var connection = this.model.connections.get(connectionSerialId);
  if (! connection) { // TODO error management
    console.log('MonitorsHandler.addConnection cannot find connection: ' + connectionSerialId);
    return;
  }

  // be sure localstorage is activated
  connection.fetchStructure(function (useLocalStorageError) {
    console.log('fetchStructure', arguments);
    if (useLocalStorageError) {
      console.error('failed activating localStorage for ' + connection.id);
      if (batchWaitForMe) { batchWaitForMe.done(); }
      return;
    }
    var connectionIndex = this.connectionToRemove.indexOf(connection.serialId);
    if (connectionIndex !== -1) {
      this.connectionToRemove[connectionIndex] = null;
      if (batchWaitForMe) { batchWaitForMe.done(); }
      return;
    }
    var filterSettings = _.omit(this.rootFilter.getData(), 'streams'); //copy everything but Streams
    var specificFilter = new Filter(filterSettings);
    specificFilter._xerialId =  'F' + connection.serialId;

    var monitor = connection.monitor(specificFilter);
    this._monitors[connectionSerialId] = monitor;

    // ----- add listeners
    function onMonitorOnLoad(events) {
      this._eventsEnterScope(MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION, events, batch);
      if (batchWaitForMe) { batchWaitForMe.done(); } // called only once at load
    }
    monitor.addEventListener('started', onMonitorOnLoad.bind(this));

    monitor.addEventListener('eventsChanged', this._onMonitorEventChange.bind(this));
    monitor.addEventListener('streamsChanged', this._onMonitorStreamChange.bind(this));
    monitor.addEventListener('filterChanged', this._onMonitorFilterChange.bind(this));

    monitor.start(function (error) {
      console.log('monitor started ' + error);
    });
  }.bind(this));
};


/**
 * remove a connection from the list
 */
MonitorsHandler.prototype.removeConnections = function (connectionSerialId, batch) {
  var myBatch = this.startBatch('removeConnections', batch);
  if (! _.isArray(connectionSerialId)) { connectionSerialId = [connectionSerialId];  }
  _.each(connectionSerialId, function (connectionId) {

    var monitor = this._monitors[connectionId];
    if (! monitor) {
      if (this.connectionToRemove.indexOf(connectionId) === -1) {
        this.connectionToRemove.push(connectionId);
      }
      myBatch.done();
      return;
    }

   // this.focusOnStreams([]);
    var self = this;
    var maxCloseTry = 100;
    var closeMonitor = function () {
      if (monitor.getEvents().length > 0) {
        self._eventsLeaveScope(MSGs.REASON.EVENT_SCOPE_LEAVE_REMOVE_CONNECTION,
          monitor.getEvents(), myBatch);
        delete self._monitors[connectionId];
        monitor.destroy();
        myBatch.done();
      } else if (maxCloseTry > 0) {
        maxCloseTry--;
        _.delay(closeMonitor, 100);
      }
    };
    closeMonitor();

  }.bind(this));


};

/**
 * focus on those connections....
 * Technically we set all monitors Filters to []
 */
MonitorsHandler.prototype.focusOnConnections = function (connections) {

  // un-focus
  if (connections === null) {   // same than focusOnConnections
    return this.focusOnStreams(null, batch);
  }

  if (! _.isArray(connections)) { connections = [connections];  }
  // create an array of connectionsIds
  var connectionsIds = [];
  _.each(connections, function (connection) { connectionsIds.push(connection.id); });


  var batch = this.startBatch('focusOnConnections');
  this._eachMonitor(function (monitor) {
    if (connectionsIds.indexOf(monitor.connection.id) < 0) {
      monitor.filter.set({'streamsIds': []}, batch); // shush the connection
    } else {
      monitor.filter.set({'streamsIds': null}, batch); // show all streams
    }
  });
  batch.done();
};






/**
 * get all events actually matching this filter
 */
MonitorsHandler.prototype.triggerForAllCurrentEvents = function (trigger) {
  this._eachMonitor(function (monitor) {
    trigger(MSGs.SIGNAL.EVENT_SCOPE_ENTER,
      {reason: MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION,
        events: monitor.getEvents()});
  });
};

// --------- Utils -----

/** execute for each filter **/
MonitorsHandler.prototype._eachMonitor = function (callback) {
  _.each(this._monitors, callback.bind(this));
};

// --------- Filter manipulations -----------------//

// # Streams

/**
 * get the actual streams in the filter;
 * @returns {Array}
 */
MonitorsHandler.prototype.getStreams = function () {
  var result = [];
  this._eachMonitor(function (monitor) {
    _.each(monitor.filter.streamsIds, function (streamId) {
      result.push(monitor.connection.datastore.getStreamById(streamId));
    });
  });
  return result;
};




/**
 * focus on those streams;
 */
MonitorsHandler.prototype.focusOnStreams = function (streams) {

  // un-focus
  if (streams === null) {
    var batchU = this.startBatch('un-focusOnStream');
    this._eachMonitor(function (monitor) {  // clear all
      monitor.filter.set({'streamsIds' : null}, batchU);
    });
    this._filteredStreamsChange(streams, batchU);
    batchU.done();
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




  var batch = this.startBatch('focusOnStream');
  this._eachMonitor(function (monitor, key) {  // clear all
    if (_.has(streamsByConnection, key)) {
      monitor.filter.set({'streamsIds': streamsByConnection[key]}, batch);
    } else {
      monitor.filter.set({'streamsIds': []}, batch); // shush the connection
    }
  });
  this._filteredStreamsChange(streams, batch);
  batch.done();
};

// # Bind filter properties to rootFilter
Object.defineProperty(MonitorsHandler.prototype, 'timeFrameLT', {
  set: function (newValue) {
    var to = newValue[0] ? newValue[0].getTime() / 1000 : null;
    var from = newValue[1] ? newValue[1].getTime() / 1000 : null;
    this.timeFrameST = [to, from];
  }
});

_.each(['timeFrameST', 'limit'],  function (prop) {
  Object.defineProperty(MonitorsHandler.prototype, prop, {
    get: function () {
      return this.rootFilter[prop];
    },
    set: function (newValue) {
      this.rootFilter[prop] = newValue;
      this._eachMonitor(function (monitor) {
        monitor.filter[prop] = newValue;
      });
    }
  });
});

// -- use this to bind function of filters
_.each(['set'],  function (func) {
  MonitorsHandler.prototype[func] = function () {
    var myargs = arguments;
    this._eachMonitor(function (monitor) {
      monitor.filter[func].apply(monitor.filter, myargs);
    });
    return this.rootFilter[func].apply(this.rootFilter, myargs);
  };
});




// ............ CLEANUP OR REUSE ................................  //


// ----------------------------- EVENTS --------------------------- //

/**
 * return informations on events
 */
MonitorsHandler.prototype.stats = function (force, callback) {
  var result = {
    timeFrameLT : [null, null]
  };
  var monitorNbr = _.size(this._monitors);
  this._eachMonitor(function (monitor) {
    monitor.stats(force, function (timeLimits) {
      var tf = timeLimits.timeFrameLT;
      if (! result.timeFrameLT[0] || tf[0] < result.timeFrameLT[0]) {
        result.timeFrameLT[0] = tf[0];
      }
      if (! result.timeFrameLT[1] || tf[1] > result.timeFrameLT[1]) {
        result.timeFrameLT[1] = tf[1];
      }
      monitorNbr--;
      if (monitorNbr === 0 && _.isFunction(callback)) {
        callback(result);
      }
    });
  });
};