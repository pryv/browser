/* global $, window */
var MonitorsHandler = require('./model/MonitorsHandler.js'),
_ = require('underscore'),
ConnectionsHandler = require('./model/ConnectionsHandler.js'),
SIGNAL = require('./model/Messages').MonitorsHandler.SIGNAL,
TreeMap = require('./tree/TreeMap.js'),
Controller = require('./orchestrator/Controller.js'),
Pryv = require('pryv'),
TimeLine = require('./timeframe-selector/timeframe-selector.js'),
PUBLIC_TOKEN = 'TeVY2x0kgq',
toShowWhenLoggedIn = ['#logo-sharing', '#logo-add'];
var Model = module.exports = function (DEVMODE) {
  window.Pryv = Pryv;
  this.urlUsername = Pryv.utility.getUsernameFromHostname();
  this.urlSharings = Pryv.utility.getSharingsFromPath();
  this.publicConnection = null;
  this.loggedConnection = null;
  this.sharingsConnections = null;
  this.hideLoggedInElement();
  if (this.urlSharings.length > 0) {
    this.sharingsConnections = [];
    this.urlSharings.forEach(function (token) {
      this.sharingsConnections.push(new Pryv.Connection(this.urlUsername, token, {staging: true}));
    }.bind(this));
  } else if (this.urlUsername) {
    this.publicConnection =  new Pryv.Connection(this.urlUsername, PUBLIC_TOKEN, {staging: true});
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

  // Singin
  Pryv.Auth.config.registerURL = { host: 'reg.pryv.in', 'ssl': true};

  var settings = {
    appId : 'pryv-browser',
    callbacks : {
      signedIn: function (connection) {
        console.log('Successfully signed in', connection);
        this.loggedConnection = connection;
        $('#login-button-username').text(connection.username);
        //$('#login .dropdown-toggle').dropdown('toggle'); // close the login form
        $('#login .toggle').toggle(); // display the username on the button
        this.showLoggedInElement();
        if (this.publicConnection) {
          this.removeConnection(this.publicConnection);
        }
        this.addConnection(connection);
      }.bind(this),
      signedOut: function (connection) {
        this.loggedConnection = null;
        this.hideLoggedInElement();
        this.removeConnection(connection);
        if (this.publicConnection) {
          this.addConnection(this.publicConnection);
        }
        $('#login .toggle').toggle(); // display "sign in" on the button
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
    Pryv.Auth.loginWithCookie(settings);
    $('#login .dropdown-menu input, #login .dropdown-menu label').click(function (e) {
      e.stopPropagation();
    });
    $('#login button').click(function (e) {
      if (this.loggedConnection) {
        e.stopPropagation();
        Pryv.Auth.logout();
      }
    }.bind(this));
    $('#login-submit').click(function (e) {
      e.preventDefault();
      settings.username = $('#login-username').val();
      settings.password = $('#login-password').val();
      settings.rememberMe = $('#login-remember-me').prop('checked');
      Pryv.Auth.login(settings);
    });
  }  else {
    // for dev env only
    // add connections here, you mut set the loggedConnection with a staging connection
    var defaultConnection = new Pryv.Connection('liveat', 'VPMy6VFfU9', {staging: true});
    this.loggedConnection = defaultConnection;
    this.addConnection(defaultConnection);
    this.addConnection(new Pryv.Connection('fredos71',
      'chq6k6jfk000b52w4bf86thgv', {staging: true}));
    this.addConnection();
    this.showLoggedInElement();
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



Model.prototype.showLoggedInElement = function () {
  $(toShowWhenLoggedIn.join(',')).show();
};

Model.prototype.hideLoggedInElement = function () {
  $(toShowWhenLoggedIn.join(',')).hide();
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

