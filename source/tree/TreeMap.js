
 /* global $, window, Pryv */
var RootNode = require('./RootNode.js'),
 SIGNAL = require('../model/Messages').MonitorsHandler.SIGNAL,
 _ = require('underscore'),
 DetailView = require('../view/events-views/detailed/Controller.js'),
 SharingView = require('../view/sharings/Controller.js'),
 CreateSharingView = require('../view/sharings/create/Controller.js'),
 SubscribeView = require('../view/subscribe/Controller.js'),
 FusionDialog = require('../view/events-views/draganddrop/Controller.js'),
 VirtualNode = require('./VirtualNode.js');

var TreeMap = module.exports = function (model) {
  this.model = model;
  this.dialog = null;
  this.detailedView = null;
  this.sharingView = null;
  this.subscribeView = null;
  this.createSharingView = null;
  this.focusedStreams = null;
  var $tree = $('#tree');
  this.root = new RootNode(this, $tree.width() -
    parseInt($tree.css('margin-left').split('px')[0], null) -
    parseInt($tree.css('margin-right').split('px')[0], null),
    $tree.height() -
    parseInt($tree.css('margin-bottom').split('px')[0], null) -
    parseInt($tree.css('margin-top').split('px')[0], null));
  this.root.x =  parseInt($tree.css('margin-left').split('px')[0], null);
  this.root.y =  parseInt($tree.css('margin-top').split('px')[0], null);
  $('#logo-reload').click(function (e) {
    e.preventDefault();
    if (this.model.sharingsConnections &&
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
  $('#logo-add').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeDetailedView();
    }.bind(this));
    this.initDetailedView($modal);
    this.detailedView.createNewEvent();
  }.bind(this));
  $('#logo-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSharingView();
    }.bind(this));
    this.showSharingView($modal, this.model.loggedConnection);
  }.bind(this));
  $('#logo-subscribe').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeSubscribeView();
    }.bind(this));
    this.showSubscribeView($modal, this.model.loggedConnection, this.model.sharingsConnections);
  }.bind(this));
  $('#logo-create-sharing').click(function (e) {
    e.preventDefault();
    var $modal =  $('#pryv-modal').on('hidden.bs.modal', function () {
      this.closeCreateSharingView();
    }.bind(this));
    console.log(this.model);
    var streams = [],
      loggedUsername = this.model.loggedConnection.username;
    this.model.activeFilter.getStreams().forEach(function (stream) {
      if (stream.connection.username === loggedUsername) {
        streams.push({id: stream.id, name: stream.name, children: stream.children});
      }
    });
    if (streams.length === 0) {
      this.model.loggedConnection.datastore.getStreams().forEach(function (stream) {
        streams.push({id: stream.id, name: stream.name, children: stream.children});
      });
    }
    if (streams.length !== 0) {
      this.showCreateSharingView($modal, this.model.loggedConnection, streams,
      this.model.activeFilter.timeFrameST);
    }
  }.bind(this));
  var refreshTree = _.throttle(function () {
    var start = new Date().getTime();
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
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
    this.root.width = $tree.width() -
      parseInt($tree.css('margin-left').split('px')[0], null) -
      parseInt($tree.css('margin-right').split('px')[0], null);
    this.root.height = $tree.height() -
      parseInt($tree.css('margin-bottom').split('px')[0], null) -
      parseInt($tree.css('margin-top').split('px')[0], null);
    this.root.x =  parseInt($tree.css('margin-left').split('px')[0], null);
    this.root.y =  parseInt($tree.css('margin-top').split('px')[0], null);
    this.root._createView();
    this.root._generateChildrenTreemap(this.root.x,
      this.root.y,
      this.root.width,
      this.root.height,
      true);
    this.root._refreshViewModel(true);
    this.root.renderView(true);
  }.bind(this), 100));


  //----------- init the model with all events --------//
  this.eventEnterScope = function (content) {
    console.log('eventEnter', content);
    var start = new Date().getTime();
    _.each(content.events, function (event) {
      this.root.eventEnterScope(event, content.reason, function () {});
    }, this);
    this.root._createView();
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventEnter execution:', time);
    refreshTree();
  }.bind(this);

  this.eventLeaveScope = function (content) {
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
    _.each(content.events, function (event) {
      this.root.eventChange(event, content.reason, function () {});
    }, this);
    var end = new Date().getTime();
    var time = end - start;
    console.log('eventChange execution:', time);
    refreshTree();
  }.bind(this);

  this.model.activeFilter.triggerForAllCurrentEvents(this.eventEnterScope);
  //--------- register the TreeMap event Listener ----------//
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_ENTER,
    this.eventEnterScope
  );
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_SCOPE_LEAVE,
    this.eventLeaveScope);
  this.model.activeFilter.addEventListener(SIGNAL.EVENT_CHANGE,
    this.eventChange);
};
TreeMap.prototype.focusOnStreams = function (stream) {
  this.model.activeFilter.focusOnStreams(stream);
  this.setFocusedStreams(stream);
};
TreeMap.prototype.setFocusedStreams = function (stream) {
  this.focusedStreams = stream;
};
TreeMap.prototype.getFocusedStreams = function () {
  return this.focusedStreams;
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
  }.bind(this)), events);
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



   //======== Detailed View ========\\
TreeMap.prototype.initDetailedView = function ($modal, events, highlightedTime) {
  if (!this.hasDetailedView()) {
    this.detailedView = new DetailView($modal, this.model.connections);
    this.addEventsDetailedView(events);
    this.showDetailedView();
    this.highlightDateDetailedView(highlightedTime);
  }
};

TreeMap.prototype.hasDetailedView = function () {
  return typeof this.detailedView !== 'undefined' && this.detailedView !== null;
};
TreeMap.prototype.showDetailedView = function () {
  this.closeSharingView();
  this.closeCreateSharingView();
  if (this.hasDetailedView()) {
    this.detailedView.show();
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
//========== SHARING VIEW =========\\
TreeMap.prototype.hasSharingView = function () {
  return typeof this.sharingView !== 'undefined' && this.sharingView !== null;
};
TreeMap.prototype.showSharingView = function ($modal, connection) {
  this.closeSharingView();
  this.closeCreateSharingView();
  this.closeDetailedView();
  if ($modal && connection) {
    this.sharingView = new SharingView($modal, connection);
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
//========== CREATE SHARING VIEW =========\\
TreeMap.prototype.hasCreateSharingView = function () {
  return typeof this.createSharingView !== 'undefined' && this.createSharingView !== null;
};
TreeMap.prototype.showCreateSharingView = function ($modal, connection, timeFilter, streams) {
  this.closeCreateSharingView();
  this.closeDetailedView();
  this.closeSharingView();
  if ($modal && timeFilter && streams) {
    this.createSharingView = new CreateSharingView($modal, connection, timeFilter, streams);
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
 //========== SUBSCRIBE VIEW =========\\
TreeMap.prototype.hasSubscribeView = function () {
  return typeof this.subscribeView !== 'undefined' && this.subscribeView !== null;
};
TreeMap.prototype.showSubscribeView = function ($modal, loggedConnection, sharingsConnections) {
  this.closeSubscribeView();
  if ($modal && loggedConnection) {
    this.subscribeView = new SubscribeView($modal, loggedConnection, sharingsConnections);
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
/* jshint -W098 */

 /**
  * Creates a virtual node from a certain number of events.
  * @param eventsNodes is an array of events nodes you want to aggregate permanently.
  */
TreeMap.prototype.createVirtualNode = function (filters) {
  var streams = [];
  var f = [];
  for (var i = 0, n = filters.length; i < n; ++i) {
    streams.push(filters[i].stream);
    f.push({streamId: filters[i].stream.id, type: filters[i].type});
  }
  var parent = this.getFirstCommonParent(_.uniq(streams));

  var vn = new VirtualNode(parent, 'Virtual Node');
  vn.addFilters(f);
  if (parent instanceof Pryv.Connection) {
    console.log('Setting new Virtual node in connection', parent, 'with filters', f);
  } else if (parent instanceof Pryv.Stream) {
    console.log('Setting new Virtual node in stream', parent, 'with filters', f);
    // parent.clientData['browser:virtualnode'] = [{name: 'test aggr', filters: filters}];
  }



  console.log('Virtual node', vn);


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