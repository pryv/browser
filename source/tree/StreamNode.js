var TreeNode = require('./TreeNode');
var _ = require('underscore');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */
var MIN_WIDTH = 600;
var MIN_HEIGHT = 600;
var StreamNode = module.exports = TreeNode.implement(
  function (connectionNode, parentNode, stream) {
    TreeNode.call(this, parentNode);
    this.stream = stream;
    this.connectionNode = connectionNode;

    /**
     * eventsNodes are stored by their key
     **/
    this.eventsNodes = {};
    this.displayedEventsNodes = {};

  },
  {
    className: 'StreamNode',


    // ----



    needToAggregate: function () {
      if (this.getWeight() > 0  && (this.width <= MIN_WIDTH || this.height <= MIN_HEIGHT)) {
        // Close all the view we need to aggregate
        _.each(this.getChildren(), function (child) {
          if (child.view) {
            child.view.close();
          }
        });
        this.aggregated = true;
        this.createEventsNodesFromAllEvents(this.getAllEvents());
        // create the new aggregated views
        _.each(this.displayedEventsNodes, function (node) {
          node._createView();
        });
      } else {
        this.aggregated = false;
      }
      return this.aggregated;
    },
    getWeight: function () {
      var weight = 0;
      this.getChildren().forEach(function (child) {
        weight += child.getWeight();
      });

      return weight;
    },

    getChildren: function () {
      var self = this;
      var children = [];

      if (this.aggregated) {

        _.each(this.displayedEventsNodes, function (node) {
          children.push(node);
        });
      } else {
        // Streams
        _.each(this.stream.children, function (child) {
          var childTemp =  self.connectionNode.streamNodes[child.id];
          children.push(childTemp);
        }, this);

        // Events
        _.each(this.eventsNodes, function (eventNode) {
          children.push(eventNode);
        });
      }
      return children;
    },
    getAllEvents: function () {
      var allEvents = [];
      _.each(this.stream.children, function (streamChild) {
        var streamChildNode = this.connectionNode.streamNodes[streamChild.id];
        allEvents = _.union(allEvents, streamChildNode.getAllEvents());
      }, this);

      _.each(this.eventsNodes, function (eventNodeChild) {
        _.each(eventNodeChild.events, function (event) {
          allEvents.push(event);
        });
      });
      return allEvents;
    },
    createEventsNodesFromAllEvents: function (events) {
      this.displayedEventsNodes = {};
      _.each(events, function (event) {
        var eventView = null;
        var key = this.findEventNodeType(event);
        if (key && _.has(this.displayedEventsNodes, key)) {
          eventView =  this.displayedEventsNodes[key]; // found one
        }  else { // create is
          eventView = new StreamNode.registeredEventNodeTypes[key](this);
          this.displayedEventsNodes[key] = eventView;
        }
        if (eventView === null) {
          throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
        }
        eventView.eventEnterScope(event);
      }, this);

    },
    eventEnterScope: function (event, reason, callback) {
      var eventView = null;
      var key = this.findEventNodeType(event);
      if (key && _.has(this.eventsNodes, key)) {
        eventView =  this.eventsNodes[key]; // found one
      }  else { // create is
        eventView = new StreamNode.registeredEventNodeTypes[key](this);
        this.eventsNodes[key] = eventView;
      }
      if (eventView === null) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }

      eventView.eventEnterScope(event, reason, callback);

    },


    eventLeaveScope: function (event, reason, callback) {
      var key = this.findEventNodeType(event);
      if (!this.eventsNodes[key]) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }
      var self = this;
      this.eventsNodes[key].eventLeaveScope(event, reason, function () {
        if (_.size(self.eventsNodes[key].events) === 0) {
          delete self.eventsNodes[key];
        }
        if (callback) {
          callback(null, self);
        }
      }.bind(this));
    },

    eventChange: function (event, reason, callback) {
      if (callback) {
        callback(null, this);
      }
    },

    findEventNodeType: function (event) {
      var keys = _.keys(StreamNode.registeredEventNodeTypes);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (StreamNode.registeredEventNodeTypes[key].acceptThisEventType(event.type)) {
          return key;
        }
      }
      return;
    },

    //----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.stream.name,
        nullChildren : 0
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));


      return me;
    }
  });


StreamNode.registeredEventNodeTypes = {
  'Notes' : require('./eventsNode/NotesEventsNode.js'),
  'Positions' : require('./eventsNode/PositionsEventsNode.js'),
  'Pictures' : require('./eventsNode/PicturesEventsNode.js'),
  'Generic' : require('./eventsNode/GenericEventsNode.js')
};