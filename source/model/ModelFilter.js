
var _ = require('underscore');
var Filter = require('pryv').Filter;
var Pryv = require('pryv');
var MSGs = require('./Messages').ModelFilter;


var ModelFilter = module.exports = function (model, batchSetKeyValues) {
  Pryv.Utility.SignalEmitter.extend(this, MSGs.SIGNAL, 'ModelFilter');
  this.model = model;
  this._monitors = {}; // serialIds / monitor
  this.rootFilter = new Filter();
  if (batchSetKeyValues) {
    this.set(batchSetKeyValues);
  }
};



// ----------------------------- Generic Event fire ------------------ //

ModelFilter.prototype._eventsEnterScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_ENTER, {reason: reason, events: events}, batch);
};

ModelFilter.prototype._eventsLeaveScope = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_SCOPE_LEAVE, {reason: reason, events: events}, batch);
};

ModelFilter.prototype._eventsChange = function (reason, events, batch) {
  if (events.length === 0) { return; }
  this._fireEvent(MSGs.SIGNAL.EVENT_CHANGE, {reason: reason, events: events}, batch);
};

// ----------------------------- Events from monitors ------------------ //

ModelFilter.prototype._onMonitorEventChange = function (changes, batchId, batch) {
  var myBatch = this.startBatch('eventChange', batch);
  this._eventsEnterScope(MSGs.REASON.REMOTELY, changes.created, myBatch);
  this._eventsLeaveScope(MSGs.REASON.REMOTELY, changes.trashed, myBatch);
  this._eventsChange(MSGs.REASON.REMOTELY, changes.modified, myBatch);
  myBatch.done();
};

ModelFilter.prototype._onMonitorFilterChange = function (changes, batchId, batch) {
  var myBatch = this.startBatch('filterChange', batch);
  this._eventsEnterScope(changes.filterInfos.signal, changes.enter, myBatch);
  this._eventsLeaveScope(changes.filterInfos.signal, changes.leave, myBatch);
  myBatch.done();
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
    specificFilter._xerialId =  'F' + connection.serialId;

    var monitor = connection.monitor(specificFilter);
    this._monitors[connectionSerialId] = monitor;

    // ----- add listeners
    function onMonitorOnLoad(events) {
      this._eventsEnterScope(MSGs.REASON.EVENT_SCOPE_ENTER_ADD_CONNECTION, events, batch);
      if (batchWaitForMe) { batchWaitForMe.done(); } // called only once at load
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
 * remove a connection from the list
 */
ModelFilter.prototype.removeConnections = function (connectionSerialId, batch) {
  var myBatch = this.startBatch('removeConnections', batch);

  if (! _.isArray(connectionSerialId)) { connectionSerialId = [connectionSerialId];  }
  _.each(connectionSerialId, function (connectionId) {

    var monitor = this._monitors[connectionId];
    if (! monitor) {
      throw new Error('cannot find monitor for connection: ' + connectionId);
    }

    monitor.focusOnStreams([]);
    this._eventsLeaveScope(MSGs.REASON.EVENT_SCOPE_LEAVE_REMOVE_CONNECTION,
      monitor.getEvents(), myBatch);
    delete this._monitors[connectionSerialId];
    monitor.destroy();
  }.bind(this));

  myBatch.done();
};

/**
 * focus on this connection
 */
ModelFilter.prototype.focusOnConnections = function (connections, batch) {


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

// # Streams

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


  var batch = this.startBatch('focusOnStream');

  this._eachMonitor(function (monitor, key) {  // clear all
    if (_.has(streamsByConnection, key)) {

      monitor.filter.set({'streamsIds': streamsByConnection[key]}, batch);
    } else {
      monitor.filter.set({'streamsIds': []}, batch); // shush the connection
    }
  });
  batch.done();
};

// # Bind filter properties to rootFilter
Object.defineProperty(ModelFilter.prototype, 'timeFrameLT', {
  set: function (newValue) {
    var to = newValue[0] ? newValue[0].getTime() / 1000 : null;
    var from = newValue[1] ? newValue[1].getTime() / 1000 : null;
    this.timeFrameST = [to, from];
  }
});

_.each(['timeFrameST', 'limit'],  function (prop) {
  Object.defineProperty(ModelFilter.prototype, prop, {
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
  ModelFilter.prototype[func] = function () {
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
ModelFilter.prototype.stats = function () {
  var result = {
    timeFrameLT : [null, null]
  };
  this._eachMonitor(function (monitor) {
    var tf = monitor.stats().timeFrameLT;
    if (! result.timeFrameLT[0] || tf[0] < result.timeFrameLT[0]) {
      result.timeFrameLT[0] = tf[0];
    }
    if (! result.timeFrameLT[1] || tf[1] > result.timeFrameLT[1]) {
      result.timeFrameLT[1] = tf[1];
    }
  });
  return result;
};