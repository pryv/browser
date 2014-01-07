/* global $ */
var MonitorsHandler = require('./model/MonitorsHandler.js');
var _ = require('underscore');
var ConnectionsHandler = require('./model/ConnectionsHandler.js');

var SIGNAL = require('./model/Messages').MonitorsHandler.SIGNAL;
var TreeMap = require('./tree/TreeMap.js');
var Controller = require('./orchestrator/Controller.js');
var Pryv = require('pryv');
var TimeLine = require('./timeframe-selector/timeframe-selector.js');
var PUBLIC_TOKEN = 'TeVY2x0kgq';
var Model = module.exports = function (DEVMODE) {
  this.urlUsername = Pryv.utility.getUsernameFromHostname();
  this.urlSharings = Pryv.utility.getSharingsFromPath();
  this.publicConnection = null;
  this.sharingsConnections = null;
  if (this.urlSharings.length > 0) {
    this.sharingsConnections = [];
    this.urlSharings.forEach(function (token) {
      this.sharingsConnections.push(new Pryv.Connection(this.urlUsername, token, {staging: false}));
    }.bind(this));
  } else if (this.urlUsername) {
    this.publicConnection =  new Pryv.Connection(this.urlUsername, PUBLIC_TOKEN, {staging: false});
  }
  // create connection handler and filter
  this.onFiltersChanged = function () {
    console.log('onFiltersChanged', arguments);
    this.activeFilter.timeFrameLT = [arguments[0].from, arguments[0].to];
  };


  this.onDateHighlighted = _.throttle(function () {
    if (this.treemap) {
      this.treemap.onDateHighLighted(arguments[0].getTime() / 1000);
    }
  }, 100);
  // Singin
  Pryv.Auth.config.registerURL = { host: 'reg.pryv.io', 'ssl': true};
  var requestedPermissions = [
    {
      'streamId' : '*',
      'level' : 'manage'
    }
  ];
  this.initBrowser = function () {
    this.connections = new ConnectionsHandler(this);
    this.activeFilter = new MonitorsHandler(this);
    var batchCount = 0;
    this.activeFilter.addEventListener(SIGNAL.BATCH_BEGIN, function () {
      batchCount++;
      $('#logo-reload').addClass('loading');
    });
    this.activeFilter.addEventListener(SIGNAL.BATCH_DONE, function () {
      batchCount--;
      if (batchCount === 0) {
        $('#logo-reload').removeClass('loading');
      }
    });
    this.timeView = new TimeLine();
    this.timeView.render();
    initTimeAndFilter(this.timeView, this.activeFilter);
    this.timeView.on('filtersChanged', this.onFiltersChanged, this);
    this.timeView.on('dateHighlighted', this.onDateHighlighted, this);
    this.timeView.on('dateMasked', this.onDateMasked, this);

    this.onDateMasked = function () {
     // console.log('onDateMasked', arguments);
    };

    Pryv.eventTypes.loadExtras(function () {});

    // create the TreeMap
    this.controller = new Controller();
    this.treemap = new TreeMap(this);
    this.controller.setTreeMap(this.treemap);


  };
  // ----------------------- //
  var settings = {
    requestingAppId : 'browser',
    requestedPermissions : requestedPermissions,
    returnURL : 'auto#', // set this if you don't want a popup
    spanButtonID : 'pryvButton', // (optional)
    callbacks : {
      signedIn: function (connection) {
        if (this.publicConnection) {
          this.removeConnection(this.publicConnection);
        }
        this.addConnection(connection);
      }.bind(this),
      signedOut: function (connection) {
        this.removeConnection(connection);
        if (this.publicConnection) {
          this.addConnection(this.publicConnection);
        }
      }.bind(this),
      refused: function (reason) {
        console.log('** REFUSED! ' + reason);
      },
      error: function (code, message) {
        console.log('** ERROR! ' + code + ' ' + message);
      }
    }
  };
  if (!DEVMODE) {
    if (this.publicConnection) {
      this.addConnection(this.publicConnection);
    } else if (this.sharingsConnections) {
      this.sharingsConnections.forEach(function (connection) {
        this.addConnection(connection);
      }.bind(this));
    }
    Pryv.Auth.setup(settings);
  }  else {
    var defaultConnection = new Pryv.Connection('perkikiki', 'VeA1YshUgO', {staging: false});
    this.addConnection(defaultConnection);
  }


};

Model.prototype.addConnection = function (connection) {
  if (!this.treemap) {
    this.initBrowser();
  }
  var userConnection = this.connections.add(connection),
  batch = this.activeFilter.startBatch('adding connections');
  this.activeFilter.addConnection(userConnection, batch);
  batch.done();
};
Model.prototype.removeConnection = function (connection) {
  this.activeFilter.removeConnections(connection.serialId);
};
/**
 * demo utility that set the timeFrame boundaries to the events displayed.
 */
Model.prototype.updateTimeFrameLimits = function () {
  (_.debounce(function () {
    var stats = this.activeFilter.stats(),
      currentLimit = {from: this.timeView.limitFrom, to: this.timeView.limitTo};
    console.log('updateLimits', stats, currentLimit);
    this.timeView.setLimit(stats.timeFrameLT[0], stats.timeFrameLT[1]);
  }.bind(this), 100))();
};


function initTimeAndFilter(timeView, filter) {
  var spanTime = 86400000,
    fromTime = new Date(),
    start = new Date(fromTime.getFullYear(), fromTime.getMonth(), fromTime.getDate());

  fromTime = new Date(start.getTime() - (spanTime * 365));
  var toTime = new Date(start.getTime() + spanTime - 1);
  filter.timeFrameLT = [fromTime, toTime];
  filter.set({
    limit: 500
  });

  timeView.onFiltersChanged({
    from:     fromTime,
    to:       toTime
  });
}

