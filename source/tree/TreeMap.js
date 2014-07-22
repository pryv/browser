/* global $, window, location */

var RootNode = require('./RootNode.js'),
  SIGNAL = require('../model/Messages').MonitorsHandler.SIGNAL,
  _ = require('underscore'),
  DetailView = require('../view/events-views/detailed/Controller.js'),
  SharingView = require('../view/sharings/Controller.js'),
  CreateEventView = require('../view/create/Controller.js'),
  CreateSharingView = require('../view/sharings/create/Controller.js'),
  SubscribeView = require('../view/subscribe/Controller.js'),
  SettingsView = require('../view/settings/Controller.js'),
  ManageStreamView = require('../view/stream/Controller.js'),
  ConnectAppsView = require('../view/connect-apps/Controller.js'),
  FusionDialog = require('../view/events-views/draganddrop/Controller.js'),
  OnboardingView = require('../view/onboarding/View.js'),
  VirtualNode = require('./VirtualNode.js'),
  Pryv = require('pryv');

var MARGIN_TOP = 50;
var MARGIN_RIGHT = 40;
var MARGIN_BOTTOM = 80;
var MARGIN_LEFT = 40;
var IGNORE_TRASHED_EVENT  = true;
var IGNORE_PARAM_CHANGED = false;

var TreeMap = module.exports = function (model) {
  this.model = model;
  this.dialog = null;
  this.detailedView = null;
  this.sharingView = null;
  this.subscribeView = null;
  this.settingsView = null;
  this.connectAppsView = null;
  this.createSharingView = null;
  this.createEventView = null;
  this.onboardingView = null;
  this.focusedStreams = null;
  this.trashedEvents = {};
  this.events = {};
  var $tree = $('#tree');
  this.root = new RootNode(this, $tree.width() - MARGIN_LEFT - MARGIN_RIGHT,
    $tree.height() - MARGIN_BOTTOM - MARGIN_TOP);
  this.root.x =  MARGIN_LEFT;
  this.root.y =  MARGIN_TOP;
  $('#back-tree').hide();
  $('#back-tree').click(function (e) {
    e.preventDefault();
    if (this.model.sharingsConnections && this.model.loggedConnection &&
      this.model.urlUsername === this.model.loggedConnection.username) {
      this.model.removeConnections(this.model.sharingsConnections);
      this.model.sharingsConnections = null;
      this.model.loggedConnection.bookmarks.get(function (error, result) {
        if (!error) {
          this.model.bookmarksConnections = result;
          this.model.addConnections(this.model.bookmarksConnections);
        }
      }.bind(this));
      this.model.addConnection(this.model.loggedConnection);
    } else {
      this.focusOnStreams(null);
    }
  }.bind(this));

  $('nav #addEvent').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeCreateEventView();
    }.bind(this));
    this.showCreateEventView($modal, this.model.connections,
      this.getFocusedStreams(), e.currentTarget);
  }.bind(this));

  $('nav #connectApps').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeConnectAppsView();
    }.bind(this));
    this.showConnectAppsView($modal, this.model.loggedConnection, e.currentTarget);
  }.bind(this));
  $('nav #manageStream').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeManageStreamView();
    }.bind(this));
    var streams = [];
    var connections = [];
    if (this.model.loggedConnection.datastore) {
      connections.push(this.model.loggedConnection);
      this.model.loggedConnection.datastore.getStreams().forEach(function (stream) {
        streams.push(stream);
      });
    }
    this.showManageStreamView($modal, connections, streams, e.currentTarget);
  }.bind(this));

  $('.logo-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSharingView();
    }.bind(this));
    this.showSharingView($modal, this.model.loggedConnection, e.currentTarget);
  }.bind(this));

  $('nav #settings').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSettingsView();
    }.bind(this));
    this.showSettingsView($modal, this.model.loggedConnection, e.currentTarget);
  }.bind(this));

  $('.logo-subscribe').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSubscribeView();
    }.bind(this));
    this.showSubscribeView($modal, this.model.loggedConnection, this.model.sharingsConnections,
      e.currentTarget);
  }.bind(this));

  $('.logo-create-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeCreateSharingView();
    }.bind(this));
    var streams = [], streamsId = [],
      loggedUsername = this.model.loggedConnection.username,
      focusedStreams = this.model.activeFilter.getStreams();
    if (focusedStreams) {
      focusedStreams.forEach(function (stream) {
        if (stream.connection.username === loggedUsername) {
          if (streamsId.indexOf((stream.parentId)) === -1) {
            streams.push(stream);
          }
          streamsId.push(stream.id);
        }
      });
    }
    if (streams.length === 0) {
      this.model.loggedConnection.datastore.getStreams().forEach(function (stream) {
        if (streamsId.indexOf((stream.parentId)) === -1) {
          streams.push(stream);
        }
        streamsId.push(stream.id);
      });
    }
    if (streams.length !== 0) {
      this.showCreateSharingView($modal, this.model.loggedConnection, streams,
        this.model.activeFilter.timeFrameST, e.currentTarget);
    }
  }.bind(this));

  this._onIgnoreParamChanged = function () {
    IGNORE_PARAM_CHANGED = false;
    if (IGNORE_TRASHED_EVENT) {
      var e = [];
      _.each(this.events, function (event) {
        if (event.trashed) {
          e.push(event);
          this.trashedEvents[event.id] = event;
        }
      }.bind(this));
      this.eventLeaveScope({events: e});
    } else {
      this.eventEnterScope({events: this.trashedEvents});
      this.trashedEvents = {};
    }
  };

  //window.PryvBrowser = _.extend({}, window.PryvBrowser);
  var refreshTree = window.PryvBrowser.refresh = _.throttle(function () {
    var start = new Date().getTime();
    if (IGNORE_PARAM_CHANGED) {
      this._onIgnoreParamChanged();
    }
    this.root._generateChildrenTreemap(0,
      0,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
    this.model.updateTimeFrameLimits();
    var end = new Date().getTime();
    var time = end - start;
    console.log('refreshTree execution:', time);
  }.bind(this), 10);

  $(window).resize(_.debounce(function () {
    var $tree = $('#tree');
    this.root.width = $tree.width() - MARGIN_LEFT - MARGIN_RIGHT -
      ($tree.position().left || 0) - ($tree.position().right || 0);
    this.root.height = $tree.height() - MARGIN_BOTTOM - MARGIN_TOP;
    this.root.x =  MARGIN_LEFT;
    this.root.y =  MARGIN_TOP;
    this.root._createView();
    this.root._generateChildrenTreemap(0,
      0,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
  }.bind(this), 100));

  //----------- init the model with all events --------//
  this.eventEnterScope = function (content) {
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      if (!event.streamId) {
        return;
      }
      if (!IGNORE_TRASHED_EVENT || !event.trashed) {
        this.events[event.id] = _.extend({}, event);
        this.root.eventEnterScope(event, content.reason, function () {});
      } else {
        this.trashedEvents[event.id] = event;
      }
    }, this);
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.streamEnterScope = function (content) {
    var start = new Date().getTime();
    _.each(content.streams, function (stream) {
      this.root.streamEnterScope(stream, content.reason, function () {});
    }, this);
    var focusedStream = this.getFocusedStreams();
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.streamLeaveScope = function (content) {
    _.each(content.streams, function (stream) {
      this.root.streamLeaveScope(stream);
    }.bind(this));
    refreshTree();
  }.bind(this);

  this.eventLeaveScope = function (content) {
    console.log('eventLeave', content);
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventLeaveScope(event, content.reason, function () {});
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventLeave execution:', time);
    refreshTree();
  }.bind(this);

  this.eventChange = function (content) {
    var start = new Date().getTime();
    var isStreamChanged = function (oldEvent, newEvent) {
      return oldEvent.streamId !== newEvent.streamId;
    };
    var isTrashedChanged = function (oldEvent, newEvent) {
      return oldEvent.trashed !== newEvent.trashed;
    };
    _.each(content.events, function (event) {
      var oldEvent = this.events[event.id];
      if (isTrashedChanged(oldEvent, event) && IGNORE_TRASHED_EVENT) {
        this.trashedEvents[event.id] = event;
      }
      if (!isStreamChanged(oldEvent, event) && !isTrashedChanged(oldEvent, event)) {
        try {
          this.root.eventChange(event, content.reason, function () {
          });
        } catch (e) {
          console.warn('EventChange error:', e);
        }
      }
      if ((isTrashedChanged(oldEvent, event) && IGNORE_TRASHED_EVENT) ||
        isStreamChanged(oldEvent, event))   {
        try {
          this.root.eventLeaveScope(oldEvent, content.reason, function () {
          });
        } catch (e) {
          console.warn('EventLeave error:', e);
        }
      }
      if (isStreamChanged(oldEvent, event) &&
        (!IGNORE_TRASHED_EVENT || !isTrashedChanged(oldEvent, event))) {
        try {
          this.root.eventEnterScope(event, content.reason, function () {
          });
        } catch (e) {
          console.warn('EventLeave error:', e);
        }
      }
      this.events[event.id] = _.extend({}, event);
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventChange execution:', time);
    refreshTree();
  }.bind(this);

  this.model.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
  //--------- register the TreeMap event Listener ----------//
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
  this.model.activeFilter.addEventListener(SIGNAL.STREAM_SCOPE_ENTER,
    this.streamEnterScope);
  this.model.activeFilter.addEventListener(SIGNAL.STREAM_SCOPE_LEAVE,
    this.streamLeaveScope);
};

TreeMap.prototype.isOnboarding = function () {
  this.model.loggedConnection.streams.get({state: 'all'}, function (error, result) {
    if (!error && result.length === 0 &&
      this.model.urlUsername === this.model.loggedConnection.username) {
      this.showOnboarding();
    }
  }.bind(this));
};

TreeMap.prototype.focusOnConnections = function (connection) {
  this.model.activeFilter.focusOnConnections(connection);
  this.setFocusedStreams(null);
  $('#back-tree').show();
};

TreeMap.prototype.focusOnStreams = function (stream) {
  this.model.activeFilter.focusOnStreams(stream);
  this.setFocusedStreams(stream);
  if (!stream) {
    $('#back-tree').hide();
  } else {
    $('#back-tree').show();
  }
};

TreeMap.prototype.setFocusedStreams = function (stream) {
  this.focusedStreams = stream;
};

TreeMap.prototype.getFocusedStreams = function () {
  return this.model.activeFilter.getStreams();
};

TreeMap.prototype.onDateHighLighted = function (time) {
  if (this.root) {
    this.root.onDateHighLighted(time);
  }
};

TreeMap.prototype.destroy = function () {
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.removeEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
};


/** The treemap's utility functions **/

/**
 * Search for the node matching the arguments and returns it.
 * @param nodeId the unique id in the DOM of the node
 * @param streamId  the unique id of the stream associated with the node
 * @param connectionId the unique id of the connection associated with the node
 * @returns {find|*} returns the uniquely identifiable by the passed arguments
 */
TreeMap.prototype.getNodeById = function (nodeId, streamId, connectionId) {
  var node = this.root;
  node = node.connectionNodes[connectionId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by connection' +
      connectionId);
  }
  node = node.streamNodes[streamId];
  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by stream' +
      connectionId + streamId);
  }
  var that = _.find(node.getChildren(), function (node) { return node.uniqueId === nodeId; });

  if (node === 'undefined') {
    throw new Error('RootNode: can\'t find path to requested event by nodeId' +
      connectionId + ' ' + streamId + ' ' + nodeId);
  }
  return that;
};

/**
 * Sets up all the controlling to aggregate two nodes.
 * @param node1 the first node
 * @param node2 the second node
 */
TreeMap.prototype.requestAggregationOfNodes = function (node1, node2) {
  var events = { };
  var attrname = null;
  for (attrname in node1.events) {
    if (node1.events.hasOwnProperty(attrname)) {
      events[attrname] = node1.events[attrname];
    }
  }
  for (attrname in node2.events) {
    if (node2.events.hasOwnProperty(attrname)) {
      events[attrname] = node2.events[attrname];
    }
  }
  this.dialog = new FusionDialog($('#pryv-modal').on('hidden.bs.modal', function () {
    if (this.dialog) {
      this.dialog.close();
      this.dialog = null;
    }
  }.bind(this)), events, this);
  this.dialog.show();
};

TreeMap.prototype.getFiltersFromNode = function (node) {
  var streams = [];
  var u = {}, s;
  for (var attribute in node.events) {
    if (node.events.hasOwnProperty(attribute)) {
      s = {stream: node.events[attribute].stream, type: node.events[attribute].type};
      if (!u.hasOwnProperty(s.streamId)) {
        u[s.streamId] = {};
        if (!u[s.streamId].hasOwnProperty(s.type)) {
          u[s.streamId][s.type] = 1;
          streams.push(s);
        }
      }
    }
  }
  return s;
};

//======== MODALS VIEW ========\\

TreeMap.prototype.closeViews = function () {
  this.closeSharingView();
  this.closeCreateSharingView();
  this.closeDetailedView();
  this.closeCreateEventView();
  this.closeSettingsView();
  this.closeSubscribeView();
  this.closeConnectAppsView();
  this.closeOnboardingView();
  this.closeManageStreamView();
};

//======== Detailed View ========\\

TreeMap.prototype.hasDetailedView = function () {
  return typeof this.detailedView !== 'undefined' && this.detailedView !== null;
};

/**
 * @param $modal
 * @param {Object} model Must have `events`, `stream` and `highlightedTime` properties
 * @param target
 */
TreeMap.prototype.showDetailedView = function ($modal, model, target) {
  this.closeViews();
  if (! this.hasDetailedView()) {
    this.detailedView = new DetailView($modal, this.model.connections, model.stream, target);
    this.addEventsDetailedView(model.events);
    this.detailedView.show();
    this.highlightDateDetailedView(model.highlightedTime);
  }
};

TreeMap.prototype.closeDetailedView = function () {
  if (this.hasDetailedView()) {
    this.detailedView.close();
    this.detailedView = null;
  }
};

TreeMap.prototype.addEventsDetailedView = function (events) {
  if (this.hasDetailedView()) {
    this.detailedView.addEvents(events);
  }
};

TreeMap.prototype.deleteEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.deleteEvent(event);
  }
};

TreeMap.prototype.updateEventDetailedView = function (event) {
  if (this.hasDetailedView()) {
    this.detailedView.updateEvent(event);
  }
};

TreeMap.prototype.highlightDateDetailedView = function (time) {
  if (this.hasDetailedView()) {
    this.detailedView.highlightDate(time);
  }
};

/*=================================*/
//======= CREATE EVENT VIEW ======\\

TreeMap.prototype.hasCreateEventView = function () {
  return typeof this.createEventView !== 'undefined' && this.createEventView !== null;
};

TreeMap.prototype.showCreateEventView = function ($modal, connection, focusedStream, target) {
  this.closeViews();
  if ($modal && connection && !this.hasCreateEventView()) {
    this.createEventView = new CreateEventView($modal, connection, focusedStream, target);
    this.createEventView.show();
  }
};

TreeMap.prototype.closeCreateEventView = function () {
  if (this.hasCreateEventView()) {
    this.createEventView.close();
    this.createEventView = null;
  }
};

/*=================================*/
//========== SHARING VIEW =========\\

TreeMap.prototype.hasSharingView = function () {
  return typeof this.sharingView !== 'undefined' && this.sharingView !== null;
};

TreeMap.prototype.showSharingView = function ($modal, connection, target) {
  this.closeViews();
  if ($modal && connection) {
    this.sharingView = new SharingView($modal, connection, target);
    this.sharingView.show();
  }
};

TreeMap.prototype.closeSharingView = function () {
  if (this.hasSharingView()) {
    this.sharingView.close();
    this.sharingView = null;
  }
};

/*=================================*/
//========== SETTINGS VIEW =========\\

TreeMap.prototype.hasSettingsView = function () {
  return typeof this.settingsView !== 'undefined' && this.settingsView !== null;
};

TreeMap.prototype.showSettingsView = function ($modal, connection, target) {
  this.closeViews();
  if ($modal && connection) {
    this.settingsView = new SettingsView($modal, connection, target);
    this.settingsView.show();
  }
};

TreeMap.prototype.closeSettingsView = function () {
  if (this.hasSettingsView()) {
    this.settingsView.close();
    this.settingsView = null;
  }
};

/*=================================*/
//========== CONNECT APPS VIEW =========\\

TreeMap.prototype.hasConnectAppsView = function () {
  return typeof this.connectApps !== 'undefined' && this.connectApps !== null;
};

TreeMap.prototype.showConnectAppsView = function ($modal, connection, target) {
  this.closeViews();
  if ($modal && connection) {
    this.connectApps = new ConnectAppsView($modal, connection, target);
    this.connectApps.show();
  }
};

TreeMap.prototype.closeConnectAppsView = function () {
  if (this.hasConnectAppsView()) {
    this.connectApps.close();
    this.connectApps = null;
  }
};

/*=================================*/
//========== CREATE SHARING VIEW =========\\

TreeMap.prototype.hasCreateSharingView = function () {
  return typeof this.createSharingView !== 'undefined' && this.createSharingView !== null;
};

TreeMap.prototype.showCreateSharingView = function ($modal, connection, timeFilter, streams,
                                                    target) {
  this.closeViews();
  if ($modal && timeFilter && streams) {
    this.createSharingView = new CreateSharingView($modal, connection, timeFilter, streams, target);
    this.createSharingView.show();
  }
};

TreeMap.prototype.closeCreateSharingView = function () {
  if (this.hasCreateSharingView()) {
    this.createSharingView.close();
    this.createSharingView = null;
  }
};

/*=================================*/
//========== MANAGE STREAM VIEW =========\\

TreeMap.prototype.hasManageStreamView = function () {
  return typeof this.manageStreamView !== 'undefined' && this.manageStreamView !== null;
};

TreeMap.prototype.showManageStreamView = function ($modal, connection, streams,
                                                    target) {
  this.closeViews();
  if ($modal && streams && connection) {
    this.manageStreamView = new ManageStreamView($modal, connection, streams, target);
    this.manageStreamView.show();
  }
};

TreeMap.prototype.closeManageStreamView = function () {
  if (this.hasManageStreamView()) {
    this.manageStreamView.close();
    this.manageStreamView = null;
  }
};

/*=================================*/
//========== SUBSCRIBE VIEW =========\\

TreeMap.prototype.hasSubscribeView = function () {
  return typeof this.subscribeView !== 'undefined' && this.subscribeView !== null;
};

TreeMap.prototype.showSubscribeView = function ($modal, loggedConnection, sharingsConnections,
                                                target) {
  this.closeViews();
  if ($modal && loggedConnection) {
    this.subscribeView = new SubscribeView($modal, loggedConnection, sharingsConnections, target);
    this.subscribeView.show();
  }
};

TreeMap.prototype.closeSubscribeView = function () {
  if (this.hasSubscribeView()) {
    this.subscribeView.close();
    this.subscribeView = null;
  }
};

/*=================================*/
//========== ONBOARDING VIEW =========\\

TreeMap.prototype.showOnboarding = function () {
  var $timeframeContainer = $('#timeframeContainer');
  this.model.hideLoggedInElement();
  $timeframeContainer.animate({'bottom': -$timeframeContainer.height() + 'px'});
  this.onboardingView = new OnboardingView();
  var view = this.onboardingView;
  view.connection = this.model.loggedConnection;
  view.render();
  view.on('clickAdd', function () {
    this.model.showLoggedInElement();
    $('nav #addEvent').click();
    this.closeOnboardingView();
  }.bind(this));
  view.on('clickConnect', function () {
    this.model.showLoggedInElement();
    $('nav #connectApps').click();
    this.closeOnboardingView();
  }.bind(this));
  view.on('clickSkip', function () {
    this.model.showLoggedInElement();
    this.closeOnboardingView();
  }.bind(this));
};
TreeMap.prototype.closeOnboardingView = function () {
  if (this.onboardingView) {
    this.onboardingView.close();
    $('#onboarding').addClass('hidden');
    $('#timeframeContainer').animate({'bottom': '0px'});
    this.onboardingView = null;
  }
};
/*=================================*/
/* jshint -W098 */

/**
 * Creates a virtual node from a certain number of events.
 * @param eventsNodes is an array of events nodes you want to aggregate permanently.
 */
TreeMap.prototype.createVirtualNode = function (filters, name) {
  var streams = [];
  var f = [];
  for (var i = 0, n = filters.length; i < n; ++i) {
    streams.push(filters[i].stream);
    f.push({streamId: filters[i].stream.id, type: filters[i].type});
  }
  var parent = this.getFirstCommonParent(_.uniq(streams));
  console.log('parent', parent);

  var vn = new VirtualNode(parent, name);
  vn.addFilters(f);
  if (parent instanceof Pryv.Connection) {
    console.log('Setting new Virtual node in connection', parent, 'with filters', f);
  } else if (parent instanceof Pryv.Stream) {
    console.log('Setting new Virtual node in stream', parent, 'with filters', f);
  }
};

TreeMap.prototype.getFirstCommonParent = function (eventsNodes) {

  /* TODO:
   * create the node, don't remove the already existing
   * make sure the update follows at both places
   */

  // Depth first search for goal, starting from parent
  var hasChild = function (parent, goal) {
    var found = false;
    if (parent.id === goal.id) {
      found = true;
    } else if (parent.children.length !== 0) {
      _.each(parent.children, function (c) {
        found = found || hasChild(c, goal);
      });
    }
    return found;
  };


  // returns common parent of start and goal
  var matchChild = function (start, goal) {
    var found = false;
    var depth = start;
    while (found === false) {
      found = hasChild(depth, goal);
      if (!found) {
        if (depth.parent) {
          depth = depth.parent;
        } else {
          return depth.connection;
        }
      }
    }
    return depth;
  };


  // start contains the common parent of all arguments in the end.
  var start = eventsNodes[0];
  console.log(start);
  for (var i = 1, n = eventsNodes.length; i < n; ++i) {
    start = matchChild(start, eventsNodes[i]);
  }
  return start;
};


/**
 * Remove a existing virtual node.
 * @param node the virtual node you want to remove
 */
TreeMap.prototype.removeVirtualNode = function (node) {
  /* TODO:
   * just remove the indicated node
   */
};

try {
  Object.defineProperty(window.PryvBrowser, 'hideTrashedEvents', {
    set: function (value) {
      value = !!value;
      if (_.isBoolean(value)) {
        this.customConfig = true;
        IGNORE_TRASHED_EVENT = value;
        IGNORE_PARAM_CHANGED = true;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return IGNORE_TRASHED_EVENT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}
