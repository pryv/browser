var TreeNode = require('./TreeNode');
var _ = require('underscore');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */

var StreamNode = module.exports = TreeNode.implement(
  function (connectionNode, parentNode, stream) {
    TreeNode.call(this, parentNode);
    this.stream = stream;
    this.connectionNode = connectionNode;

    /**
     * eventsNodes are stored by their key
     **/
    this.eventsNodes = {};
    this.eventsNodesAggregated = {};
  },
  {
    className: 'StreamNode',


    // ----
    _needToAggregate: function () {
      if (this.getWeight() > 0  && (this.width <= this.minWidth || this.height <= this.minHeight)) {
        return true;
      }  else {
        return false;
      }
    },
    _aggregate: function () {
      _.each(this.getChildren(), function (child) {

        if (child.view) {
          child.view.close();
          child.view = null;
        }
      });
      this.aggregated = true;
      this.createEventsNodesFromAllEvents(this.getAllEvents());
      _.each(this.eventsNodesAggregated, function (node) {
        node._createView();
      });
    },
    _desaggregate: function () {
      _.each(this.eventsNodesAggregated, function (node) {

        if (node.view) {
          node.view.close();
          node.view = null;
        }
      });
      this.aggregated = false;
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    },
    needToAggregate: function () {
      if (this.getWeight() > 0  && (this.width <= this.minWidth || this.height <= this.minHeight)) {
        // Close all the non aggregated view
        if (!this.aggregated) {
          _.each(this.getChildren(), function (child) {
            if (child.view) {
              child.view.close();
              child.view = null;
            }
          });
          this.aggregated = true;

          /* var parent = this.parent;
           parent.needToSquarify = true;
           // reset the event count
           // that will be correctly re-incremented by createEventsNodesFrommAlEvents method
           while (parent) {
           parent.eventsNbr -= this.eventsNbr;
           parent = parent.parent;
           }
           this.eventsNbr = 0;    */
          this.createEventsNodesFromAllEvents(this.getAllEvents());
          // create the new aggregated views
          _.each(this.eventsNodesAggregated, function (node) {
            node._createView();
          });
        }
      } else {
        // we don't need to aggregate the view
        // close the aggregated views if there were some
        _.each(this.eventsNodesAggregated, function (node) {
          if (node.view) {
            node.view.close();
            node.view = null;
          }
        });
        this.aggregated = false;
        // create the new non aggregated view
        _.each(this.getChildren(), function (child) {
          child._createView();
        });
      }
      return this.aggregated;
    },
    getWeight: function () {
      var children = [];
      // Streams
      _.each(this.stream.children, function (child) {
        var childTemp =  this.connectionNode.streamNodes[child.id];
        children.push(childTemp);
      }, this);

      // Events
      _.each(this.eventsNodes, function (eventNode) {
        children.push(eventNode);
      });

      var weight = 0;
      children.forEach(function (child) {
        weight += child.getWeight();
      });

      return weight;
    },

    getChildren: function () {
      var children = [];

      if (this.aggregated) {
        var weight = this.getWeight();
        var size = _.size(this.eventsNodesAggregated);
        _.each(this.eventsNodesAggregated, function (node) {
          node.getWeight = function () {
            return weight / size;
          };
          children.push(node);
        });
      } else {
        // Streams
        _.each(this.stream.children, function (child) {
          var childTemp =  this.connectionNode.streamNodes[child.id];
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
      this.eventsNodesAggregated = {};
      _.each(events, function (event) {
        var eventView = null;
        var key = this.findEventNodeType(event);
        if (key && _.has(this.eventsNodesAggregated, key)) {
          eventView =  this.eventsNodesAggregated[key]; // found one
        }  else { // create is
          eventView = new StreamNode.registeredEventNodeTypes[key](this);
          this.eventsNodesAggregated[key] = eventView;
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
      this.eventsNodes[key].eventLeaveScope(event, reason, callback);


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
  'NotesEventsNode' : require('./eventsNode/NotesEventsNode.js'),
  'PositionsEventsNode' : require('./eventsNode/PositionsEventsNode.js'),
  'PicturesEventsNode' : require('./eventsNode/PicturesEventsNode.js'),
  'NumericalsEventsNode' : require('./eventsNode/NumericalsEventsNode.js'),
  'GenericEventsNode' : require('./eventsNode/GenericEventsNode.js')
};