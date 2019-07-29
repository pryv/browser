/* global $, window, document, location, i18n, moment, localStorage, Blob*/
var MonitorsHandler = require('./model/MonitorsHandler.js'),
    _ = require('underscore'),
    ConnectionsHandler = require('./model/ConnectionsHandler.js'),
    SIGNAL = require('./model/Messages').MonitorsHandler.SIGNAL,
    TreeMap = require('./tree/TreeMap.js'),
    Controller = require('./orchestrator/Controller.js'),
    PanelMenu = require('./view/left-panel/Controller.js'),
    Pryv = require('pryv'),
    TimeLine = require('./timeframe-selector/timeframe-selector.js'),
    UnknownUserView = require('./view/error/unknown-user.js'),
    PUBLIC_TOKEN = 'public',
    CALLERID_SEPARATOR_CLIENT = '+',
    CALLERID_SEPARATOR_API = ' ',
    themes = require('./themes/index'),
    toShowWhenLoggedIn = ['.logo-sharing', 'nav #addEvent', '.logo-create-sharing',
      'nav #togglePanel', 'nav #settings', 'nav #connectApps'],
    toShowSubscribe = ['nav #toMyPryv', 'nav #togglePanel'];

// temp fix for jQuery not being setup properly in Backbone/Marionette with Browserify
// probable references:
// - https://github.com/jashkenas/backbone/issues/2997
// - https://github.com/jashkenas/backbone/pull/3038
require('backbone').$ = $;
require('backbone.marionette').$ = $;

var Model = module.exports = function () {  //setup env with grunt
  window.Pryv = Pryv;

  Pryv.eventTypes.loadFlat(function (err) {
    if (err) {
      console.warn('Could not load event types from network: ' + err);
    }
  });

  var urlInfo = Pryv.utility.urls.parseClientURL();

  this.urlSharings = urlInfo.parseSharingTokens();
  this.queryString = urlInfo.parseQuery();
  if (this.queryString.sharing) {
    this.urlSharings = [this.queryString.sharing];
  }
  this.urlUsername = this.queryString.username || urlInfo.username;
  this.personalToken = this.queryString.personalToken;

  // --- domain customisation space ----- //
  this._applyThemeIfAny(this.queryString.theme);


  localStorage.setItem('skipOnboarding', true);
  if (urlInfo.domain === 'pryv.li') {
    localStorage.setItem('skipOnboarding', false);
  }
  if (urlInfo.domain === 'pryv.me') {
    localStorage.setItem('skipOnboarding', false);
  }

  this.urlDomain = this.queryString.domain || urlInfo.domain;

  Pryv.utility.urls.defaultDomain = this.urlDomain;

  testUsername(this.urlUsername, this.urlDomain);

  if (this.urlUsername && urlInfo.hash.toLowerCase().split('/').indexOf('signin') !== -1) {
    $('#login-username').val(this.urlUsername);
    this.openLogin();
  }

  this.publicConnection = null;
  this.loggedConnection = null;
  this.sharingsConnections = null;
  this.bookmakrsConnections = null;
  this.hideLoggedInElement();


  if (this.urlSharings.length > 0) {
    this.sharingsConnections = [];
    this.urlSharings.forEach(function (token) {
      var sharingToken = formatSharingURI(token);
      this.sharingsConnections.push(new Pryv.Connection(
        this.urlUsername, sharingToken, {}));
    }.bind(this));
    this.setTimeframeScale(this.sharingsConnections[0]);
    $('.logo-subscribe').show();
  } else if (this.urlUsername) {
    this.publicConnection =  new Pryv.Connection(
      this.urlUsername, PUBLIC_TOKEN, {});
  }

  // create connection handler and filter
  this.onFiltersChanged = function (from, to) {
    this.activeFilter.timeFrameLT = [new Date(from * 1000), new Date(to * 1000)];
  };

  this.onDateHighlighted = _.throttle(function () {
    if (this.treemap) {
      this.treemap.onDateHighLighted(arguments[0]);
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
    this.timeView = TimeLine;
    this.timeView.init();
    initTimeAndFilter(this.timeView, this.activeFilter);
    this.timeView.on('timeBoundsChanged', this.onFiltersChanged.bind(this));
    this.timeView.on('highlightChanged', this.onDateHighlighted.bind(this));
    this.timeView.on('dateMasked', this.onDateMasked, this);

    this.onDateMasked = function () {
      // console.log('onDateMasked', arguments);
    };

    Pryv.eventTypes.loadExtras(function (err) {
      if (err) {
        console.warn('Could not load event extras from network: ' + err);
      }
    });

    // create the TreeMap
    this.controller = new Controller();
    this.treemap = new TreeMap(this);
    this.controller.setTreeMap(this.treemap);
  };
  // ----------------------- //

  // Sign in

  var settings = {
    appId : 'pryv-browser',
    username: this.urlUsername,
    callbacks : {
      signedIn: this.signedIn.bind(this),
      signedOut: function (connection) {
        this.hideLoggedInElement();
        this.treemap.closeViews();
        this.removeConnection(connection);
        this.removeConnections(this.bookmakrsConnections);
        if (this.publicConnection) {
          this.addConnection(this.publicConnection);
        }
        $('#login-button').html('<i class="ss-login"></i> ' + i18n.t('nav.actions.signIn'));
        this.loggedConnection = null;

        if (localStorage) {
          localStorage.removeItem('username');
          localStorage.removeItem('auth');
          localStorage.removeItem('domain');
          localStorage.removeItem('returnUrl');
          localStorage.removeItem('welcome');
        }
      }.bind(this),
      refused: function (reason) {
        console.log('** REFUSED! ' + reason);
      },
      error: function (data) {
        data.error = data.error || data;
        if (data.error && data.error.message && data.error.message !== 'Not signed-on') {
          $('#login form button[type=submit]').prop('disabled', false)
            /*.addClass('btn-pryv-alizarin')*/;
          $('#login form button[type=submit] .fa-spinner').hide();
          window.PryvBrowser.showAlert('#login', i18n.t('error.login.' + data.error.id));
        } else if (!data.error) {
          $('#login form button[type=submit]').prop('disabled', false)
            /*.addClass('btn-pryv-alizarin')*/;
          $('#login form button[type=submit] .fa-spinner').hide();
          window.PryvBrowser.showAlert('#login', i18n.t('error.login.unknown-username'));

        }
      }
    }
  };
  if (this.publicConnection) {
    this.addConnection(this.publicConnection);
  } else if (this.sharingsConnections) {
    this.sharingsConnections.forEach(function (connection) {
      this.addConnection(connection);
    }.bind(this));
  }
  if (this.personalToken) {
     //skip login and force home connection
    settings.callbacks.signedIn(new Pryv.Connection(this.urlUsername, this.personalToken, {
      ssl: true,
      domain: this.urlDomain
    }));
  } else {
    whoAmIReplace(function(connection) {
      if (connection) {
        settings.callbacks.signedIn(connection, true);
      }
    }.bind(this));
  }

  $('nav #togglePanel').click(function () {
    this.togglePanel(function () {
      $(window).trigger('resize');
    });
  }.bind(this));
  $('#sign-out').click(function () {
    if (this.loggedConnection) {
      this.loggedConnection.request({
        method: 'POST',
        path: '/auth/logout',
        callback: function (error) {
          if (error && typeof(settings.callbacks.error) === 'function') {
            return settings.callbacks.error(error);
          } else if (!error && typeof(settings.callbacks.signedOut) === 'function') {
            return settings.callbacks.signedOut(this);
          }
        }.bind(this)
      });
      setPersonalTokenAsDomainCookie(null);
    }
  }.bind(this));
  $('#login-button').click(function (e) {
    if (this.loggedConnection) {
      $('#login-dropdown .dropdown-menu').css('opacity', 1);
    } else {
      e.stopPropagation();
      $('#login-dropdown .dropdown-menu').css('opacity', 0);
      this.openLogin();
    }
  }.bind(this));
  $('#login-caret').click(this.closeLogin);
  $('#login form').submit(function (e) {
    e.preventDefault();
    if (this.loggedConnection) {
      console.warn('You are already logged in, please log out');
      return;
    }
    $('#login form button[type=submit]').prop('disabled', true);
    $('#login form button[type=submit] .fa-spinner').css('display', 'inherit');
    settings.username = $('#login-username').val().trim().toLowerCase();
    settings.password = $('#login-password').val();
    Pryv.Auth.login(settings);
  }.bind(this));
};

Model.prototype._applyThemeIfAny = function (themeId) {
  if (! themeId) { return; }

  var theme = this.theme = themes[themeId.toLowerCase()];
  if (! theme) { return; }

  $('<link rel="stylesheet" type="text/css" href="themes/' + theme.id + '/style.css">')
      .appendTo('head');
  if (theme.appName) {
    document.title = theme.appName;
  }
  if (theme.favicon) {
    $('<link rel="shortcut icon" href="themes/' + theme.id + '/' + theme.favicon + '">')
        .appendTo('head');
  }
};

Model.prototype.setTimeframeScale = function (connection) {
  if (!this.timeView) {
    return setTimeout(function () {
      this.setTimeframeScale(connection);
    }.bind(this), 500);
  }
  var urlInfo = Pryv.utility.urls.parseClientURL(location.href);
  var  params = urlInfo.parseQuery();
  if (params.scale) {
    var scale = params.scale;
    if (scale === 'day' || scale === 'week' || scale === 'month' || scale === 'year') {
      var from;
      if (params.from) {
        from = parseInt(params.from);
      }
      this.timeView.setScale(scale, from);

    }
  } else {
    connection.events.get({state: 'default', limit: 1},
      function (error, events) {
        if (events && events[0]) {
          var eventTime = events[0].time;
          if (moment().startOf('week').unix() <= eventTime) {
            this.timeView.setScale('week');
          } else if (moment().startOf('month').unix() <= eventTime) {
            this.timeView.setScale('month');
          } else if (moment().startOf('year').unix() <= eventTime) {
            this.timeView.setScale('year');
          }
        }
      }.bind(this));
  }
};

Model.prototype.signedIn = function (connection, withCookie) {
  $('#login form button[type=submit]').prop('disabled', false);
  $('#login form button[type=submit] .fa-spinner').hide();
  console.log('Successfully signed in', connection);
  this.loggedConnection = connection;


  $('#login-button').html(connection.username + ' <i class="ss-navigatedown"></i>');
  this.loggedConnection.account.getInfo(function (error, result) {
    if (!error && result && result.email) {
      $('#login-button').prepend('<img  class="gravatar" src="https://www.gravatar.com/avatar/' +
         result.email.md5() +
        '" />');
    }
  });
  if (! withCookie) {
    setPersonalTokenAsDomainCookie(
      this.loggedConnection.username,
      this.loggedConnection.auth,
      this.loggedConnection.settings.domain,
      'pryv-browser'
    );
  }
  if (localStorage) {
    localStorage.setItem('username', this.loggedConnection.username);
    localStorage.setItem('auth', this.loggedConnection.auth);
    localStorage.setItem('domain', this.loggedConnection.settings.domain);
    localStorage.setItem('returnUrl', location.href);
  }
  if (!this.urlUsername || this.urlUsername === connection.username) {// logged into your page
    this.showLoggedInElement();
    $('.logo-subscribe').hide();
    if (this.sharingsConnections && this.sharingsConnections.length === 1 &&
      this.sharingsConnections[0] === this.publicConnection) {
      this.sharingsConnections = null;
    }
    if (!this.sharingsConnections) {
      this.addConnection(connection);
      this.setTimeframeScale(connection);
      if (this.publicConnection) {
        this.removeConnection(this.publicConnection);
      }
      connection.bookmarks.get(function (error, result) {
        if (!error) {
          this.bookmakrsConnections = result;
          this.addConnections(this.bookmakrsConnections);
        }
      }.bind(this));
    }
    this.treemap.isOnboarding();
  } else {
    if (!this.sharingsConnections && this.publicConnection) {
      this.sharingsConnections = [];
      this.sharingsConnections.push(this.publicConnection);
    }

    this.showSubscribeElement();
    $('.logo-subscribe').show();
  }
  this.closeLogin();
};

Model.prototype.addConnection = function (connection) {
  if (!this.treemap) {
    this.initBrowser();
  }
  if (!connection._accessInfo) {
    connection.accessInfo();
  }
  if (!connection._privateProfile) {
    connection.privateProfile();
  }
  var userConnection = this.connections.add(connection),
    batch = this.activeFilter.startBatch('adding connections');
  this.activeFilter.addConnection(userConnection, batch);
  batch.done();
};

Model.prototype.addConnections = function (connections) {
  _.each(connections, function (conn) {
    this.addConnection(conn);
  }.bind(this));
};

Model.prototype.removeConnection = function (connection) {
  this.activeFilter.removeConnections(connection.serialId);
};

Model.prototype.removeConnections = function (connections) {
  _.each(connections, function (conn) {
    this.removeConnection(conn);
  }.bind(this));
};

/**
 * demo utility that set the timeFrame boundaries to the events displayed.
 */
Model.prototype.updateTimeFrameLimits = function () {
  (_.debounce(function () {
    this.activeFilter.stats(false, function () {
     // this.timeView.setLimit(stats.timeFrameLT[0] - 3600, stats.timeFrameLT[1] + 3600);
    }.bind(this));
  }.bind(this), 100))();
};

Model.prototype.showLoggedInElement = function () {
  this.renderPanel(this);
  $(toShowWhenLoggedIn.join(',')).show();
};

Model.prototype.showSubscribeElement = function () {
  this.renderPanel(this);
  var home = location.origin.replace(this.urlUsername, this.loggedConnection.username);
  $('nav #toMyPryv a').attr('href', home);
  $(toShowSubscribe.join(',')).show();
};

Model.prototype.hideLoggedInElement = function () {
  this.renderPanel(this);
  $(toShowWhenLoggedIn.join(',')).hide();
  $(toShowSubscribe.join(',')).hide();
  $('.logo-subscribe').hide();
};

Model.prototype.togglePanel = function (callback) {
  var opened = $('#main-container').data('panel-opened');
  if (opened) {
    this.closePanel(callback);
  } else {
    this.openPanel(callback);
  }
};

Model.prototype.openPanel = function (callback) {
  var callbackCalled = false;
  var $container = $('#main-container');
  this.renderPanel(this);
  $container.addClass('slideRight').data('panel-opened', true);
  if (_.isFunction(callback)) {
    $container.one(
      'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
      function () {
        if (!callbackCalled && typeof(callback) === 'function') {
          callbackCalled = true;
          callback();
        }
      });
  }
};

Model.prototype.closePanel = function (callback) {
  var callbackCalled = false;
  var $container = $('#main-container');
  $container.removeClass('slideRight').data('panel-opened', false);
  if (_.isFunction(callback)) {
    $container.one(
      'transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd',
      function () {
        if (!callbackCalled && typeof(callback) === 'function') {
          callbackCalled = true;
          callback();
        }
      });
  }
};

Model.prototype.renderPanel = function () {
  PanelMenu.render(this);
};

function initTimeAndFilter(timeView, filter) {
  var fromTime = new Date(timeView.getTimeBounds().from * 1000),
      toTime = new Date(timeView.getTimeBounds().to * 1000);
  filter.timeFrameLT = [fromTime, toTime];
  filter.set({
    limit: 50000
  });
}

function testUsername(username, domain) {
  $.post('https://reg.' + domain + '/' + username + '/server')
    .fail(function () {
    $('body').html(UnknownUserView);
    $('body').i18n();
  });
}

// Make sure that the caller id is sent to the API alongside the sharing token
// by replacing the client separator with the one expected by the API
function formatSharingURI(sharingURI) {
  var sharing = sharingURI.replace(CALLERID_SEPARATOR_CLIENT, CALLERID_SEPARATOR_API);
  return decodeURIComponent(sharing);
}

Model.prototype.closeLogin = function () {
  var $login = $('#login');
  var $tree = $('#tree');
  var $timeframeContainer = $('#timeframeContainer');
  var $nav = $('nav');
  $nav.animate({'top': '0px'});
  $timeframeContainer.animate({'bottom': '0px'});
  $login.removeClass('animated slideInRight');
  $tree.removeClass('animated slideOutLeft');
  $login.addClass('animated slideOutRight');
  $tree.addClass('animated slideInLeft');
  if (detectIE()) {
    $login.fadeOut('slow', function () {
      $tree.fadeIn('slow');
    });
  }
  $login.data('opened', false);
};

Model.prototype.openLogin = function () {
  var $login = $('#login');
  var $tree = $('#tree');
  var $timeframeContainer = $('#timeframeContainer');
  var $nav = $('nav');

  $login.css('display', 'block');
  $('#login form button[type=submit] .fa-spinner').hide();
  $login.removeClass('animated slideOutRight');
  $tree.removeClass('animated slideInLeft');
  $login.addClass('animated slideInRight');
  $tree.addClass('animated slideOutLeft');
  $nav.animate({'top': -$nav.height() + 'px'});
  $timeframeContainer.animate({'bottom': -$timeframeContainer.height() + 'px'});
  if (detectIE()) {
    $tree.fadeOut('slow', function () {
      $login.fadeIn('slow');
    });
  }
  $login.data('opened', true);
};

function detectIE() {
  var ua = window.navigator.userAgent;
  var msie = ua.indexOf('MSIE ');
  var trident = ua.indexOf('Trident/');

  if (msie > 0) {
    // IE 10 or older => return version number
    return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
  }

  if (trident > 0) {
    // IE 11 (or newer) => return version number
    var rv = ua.indexOf('rv:');
    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
  }

  // other browser
  return false;
}

// TODO: cleanup this mess of having both window.pryvBrowser (ie. Model.js) and window.PryvBrowser
//       (a big bag of utility and miscellaneous properties every component seems to freely extend)

/**
 * Notifies the error reporting service of the given error.
 *
 * @param {Error} error
 * @param {Object} context
 */
window.PryvBrowser.reportError = function (error, context) {
  if (! window.Airbrake) {
    console.error('Airbrake not loaded; cannot report error: ' + error.message);
    return;
  }
  window.Airbrake.push({
    error: error,
    // TODO: extend context with username, access name etc.
    context: context,
    environment: {
      'navigator.vendor': window.navigator.vendor
    }
  });
};

window.PryvBrowser.showAlert = function (containerSelector, html) {
  alertMsg('alert-danger', containerSelector, html);
};

window.PryvBrowser.showSuccess = function (containerSelector, html) {
  alertMsg('alert-success', containerSelector, html);
};

function alertMsg(severity, containerSelector, html) {
  $('.alert').alert('close');
  var $container = $(containerSelector);
  $container.append('<div class="alert '+severity+' ">' +
    '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
    html + '</div>');
}

// HACK: make utilities globally available for access from templates

window.PryvBrowser.dateTime = require('./utility/dateTime');

window.PryvBrowser.streamUtils = require('./utility/streamUtils');

/* jshint -W101 */
/**
 * Event type utilities
 * TODO: this should be abstracted and split into type-specific plugins
 * follow-up: https://trello.com/c/0P6lmhsS/299-as-a-dev-i-need-event-type-specific-components-to-be-properly-abstracted
 */
window.PryvBrowser.eventTypes = {
  isNote: function (event) {
    if (! event) { return false; }
    var t = event.type;
    return (t === 'note/txt' || t === 'note/text');
  },

  isNumerical: function (event) {
    return Pryv.eventTypes.isNumerical(event);
  },

  isPicture: function (event) {
    if (! event) { return false; }
    var t = event.type;
    return (t === 'note/txt' || t === 'note/text');
  },

  isPosition: function (event) {
    if (! event) { return false; }
    var t = event.type;
    return (t === 'note/txt' || t === 'note/text');
  }
};

window.PryvBrowser.renderNote = function (content, options) {
  var marked = require('marked');
  options = _.extend({sanitize: true}, options);
  marked.setOptions(options);
  return marked(content);
};




// download selected data as csv
function selectionToCSV() {
  //var events = window.pryvBrowser.treemap.events;

  var events = [];
  window.pryvBrowser.activeFilter.triggerForAllCurrentEvents(function (x, y) { 
    y.events.forEach(function (e) { events.push(e); });
  });


  var props = ['username', 'connectionInfo', 'streamName', 'streamId', 'time', 'duration', 'type', 'content', 'tags', 'description',
    'clientData', 'state', 'trashed', 'tags',
    'created', 'createdBy', 'modified', 'modifiedBy', 'attachments'];


  var rows = [];
  rows.push(props);


  for (var eventId in events ) {
    if (!events.hasOwnProperty(eventId)) { continue; }
    var event =   events[eventId];



    var row = [
      '"' + event.connection.username + '"',
      '"' + event.connection._accessInfo.name + '"',
      '"' + event.connection.datastore.getStreamById(event.streamId).name  + '"'
    ];

    for (var i = 3; i < props.length; i++) {
      var l =  JSON.stringify(event[props[i]]) || '';
      row.push('"' +  l.replace(/"/g, '""') + '"');
    }

    rows.push(row);

  }

  var csv = '';
  rows.forEach(function(row) {
    //var l = JSON.stringify(row);
    //csv += l.substring(1,l.length - 1) + '\r\n';
    csv += row.join(',') +  '\r\n';
  });

  console.log('Created a CSV file with: ' + rows.length + 'rows');
  return csv;

}



function download_csv2(csv) {
  var blob = new Blob([csv]);
  if (window.navigator.msSaveOrOpenBlob) { // IE hack; see http://msdn.microsoft.com/en-us/library/ie/hh779016.aspx
    window.navigator.msSaveBlob(blob, 'Pryv_export.csv');
  }
  else
  {
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(blob, {type: 'text/csv;charset=utf-8'});
    a.download = 'Pryv_export.csv';
    document.body.appendChild(a);
    a.click();  // IE: "Access is denied"; see: https://connect.microsoft.com/IE/feedback/details/797361/ie-10-treats-blob-url-as-cross-origin-and-denies-access
    document.body.removeChild(a);
  }
}

// shortcut command


function showOnlyOwner() {
  window.pryvBrowser.treemap.focusOnConnections(window.pryvBrowser.loggedConnection);
}


function showOnlyShared() {
  var followed = [];
  window.pryvBrowser.activeFilter._eachMonitor(function (monitor) { 
    if (monitor.connection !== window.pryvBrowser.loggedConnection) {
      followed.push(monitor.connection);
    }
  });
  window.pryvBrowser.treemap.focusOnConnections(followed);
}


window.onmessage = function (e) {
  var b = $('#pryv-modal');
  if (b) { b.hide(); }
  window.pryvBrowser.treemap.closeViews();
  $('.modal-backdrop').remove();

  if (e.data === 'settings') {
    $('nav #settings').click();
  }

  if (e.data === 'sharings') {
    $('.logo-sharing').click();
  }

  if (e.data === 'sharedata') {
    showOnlyShared();
  }

  if (e.data === 'owner') {
    showOnlyOwner();
  }

  if (e.data === 'toCSV') {
    download_csv2(selectionToCSV());
  }

  console.log('#####>> ' + e.data);
};


// ------------------------------------------------
// who-am-i replacement with client side cookies
// ------------------------------------------------


function whoAmIReplace(callbackOnSuccessOnly) {
  var pryvSSO = getPersonalTokenFromDomainCookie();

  if (pryvSSO) { // test if valid
    window.Pryv.utility.request({
      method: 'GET',
      host: pryvSSO.username + '.' + pryvSSO.domain,
      path: '/access-info',
      ssl: true,
      headers: {'Authorization': pryvSSO.auth},
      success: function (data) {
        console.log(data);
        if (data && data.type && data.type === 'personal') {
          callbackOnSuccessOnly(new window.Pryv.Connection({
            username: pryvSSO.username,
            domain: pryvSSO.domain,
            ssl: true,
            auth: pryvSSO.auth,
          }));
        }
      }
    });
  }
}


function getPersonalTokenFromDomainCookie() {
  return getDomainCookie('pryvsso');
}

function setPersonalTokenAsDomainCookie(username, auth, domain, appId) {
  var value = username ?  {username: username, auth: auth, domain: domain, appId: appId} : null;
  setDomainCookie('pryvsso',value);
}

function setDomainCookie(cname, value) {
  console.log(value);
  var myDate = new Date();
  var hostName = window.location.hostname;
  var domain = hostName.substring(
    hostName.lastIndexOf('.', hostName.lastIndexOf('.') - 1) + 1);
  myDate.setMonth(myDate.getMonth() + 12);
  document.cookie = cname + '=' + encodeURIComponent(JSON.stringify(value)) +
    ';expires=' + myDate +
    ';domain=.' + domain + ';path=/';
}


function getDomainCookie(cname) {
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      try {
        return JSON.parse(c.substring(name.length, c.length));
      } catch (e) {
        console.log('Error while parsing cookie: ' + cname);
      }
    }
  }
  return null;
}