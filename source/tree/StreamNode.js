var TreeNode = require('./TreeNode');
var _ = require('underscore');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */

var StreamNode = module.exports = TreeNode.implement(
  function (connectionNode, parentNode, stream) {
    TreeNode.call(this, parentNode.treeMap, parentNode);
    this.stream = stream;
    this.connectionNode = connectionNode;
    this.oneLevelAggregation = true;
    /**
     * eventsNodes are stored by their key
     **/
    this.eventsNodes = {};
    this.eventsNodesAggregated = {};
  },
  {
    className: 'StreamNode',


    _needToAggregate: function () {
      if (this.oneLevelAggregation) {
        var focusedStreams = this.treeMap.getFocusedStreams();
        if (!focusedStreams.length && !this.stream.parent) {
          return true;
        }
        if (!focusedStreams.length && this.stream.parent) {
          return false;
        }
        var needToAggregate = false;
        _.each(focusedStreams, function (stream) {
          if (this.stream.parent && stream.serialId === this.stream.parent.serialId) {
            needToAggregate = true;
          }
        }.bind(this));
        return needToAggregate;
      } else {
        if (this.getWeight() > 0 &&
          (this.width <= this.minWidth || this.height <= this.minHeight)) {
          /* we don't need to aggregate if all the events are in the same stream
           so we need to walk all the child of this stream with 3 stop condition:
           - if a stream has more than one stream we aggregate it
           - if a stream has one stream and one or more eventsNode we aggregate it
           - if a stream has only eventsNode we don't aggregate it
           */

          var node = this, currentAggregated;
          var numberOfStreamNode, numberOfEventsNode;
          while (true) {
            numberOfEventsNode = _.size(node.eventsNodes);
            currentAggregated = node.aggregated;
            // force aggregated to false for getChildren to return nonAggregated node
            node.aggregated = false;
            numberOfStreamNode = _.size(node.getChildren()) - numberOfEventsNode;
            node.aggregated = currentAggregated;
            if (numberOfStreamNode === 0) {
              return false;
            }
            if (numberOfStreamNode > 1) {
              return true;
            }
            if (numberOfStreamNode > 0 && numberOfEventsNode > 0) {
              return true;
            }
            // at this point the node has only one stream as child
            node = node.getChildren()[0];
          }
        }  else {
          return false;
        }
      }
    },
    _aggregate: function () {
      _.each(this.getChildren(), function (child) {
        child._closeView(false);
      });
      this.aggregated = true;
      this.createEventsNodesFromAllEvents(this.getAllEvents());
      _.each(this.eventsNodesAggregated, function (node) {
        node._createView();
      });
    },
    _desaggregate: function () {
      _.each(this.eventsNodesAggregated, function (node) {
        node._closeView(false);
      });
      this.aggregated = false;
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    },
    getWeight: function () {
      var children = [];
      var weight = 0;
      // Streams
      _.each(this.stream.children, function (child) {
        var childTemp =  this.connectionNode.streamNodes[child.id];
        children.push(childTemp);
      }, this);

      // Events
      _.each(this.eventsNodes, function (eventNode) {
        children.push(eventNode);
      });

      children.forEach(function (child) {
        weight += child.getWeight();
      });

      return weight;
    },

    getChildren: function () {
      var children = [];

      if (this.aggregated) {
        var weight = this.getWeight();
        var aggregatedWeight = 0;
        _.each(this.eventsNodesAggregated, function (node) {
          if (!node.originalWeight) {
            node.originalWeight = node.getWeight;
          }
          aggregatedWeight += node.originalWeight();
        });
        _.each(this.eventsNodesAggregated, function (node) {
          node.getWeight = function () {
            return (node.originalWeight() / aggregatedWeight) * weight;
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
        var key = this._findEventNodeType(event);
        var eventView = this._findEventNode(key, this.eventsNodesAggregated);
        if (eventView === null) {
          throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
        }
        eventView.eventEnterScope(event);
      }, this);

    },
    eventEnterScope: function (event, reason, callback) {
      var key = this._findEventNodeType(event);
      var eventNode = this._findEventNode(key, this.eventsNodes);
      if (eventNode === null) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventEnterScope(event, reason, callback);
          }
        }
      }
      eventNode.eventEnterScope(event, reason, callback);
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('EventEnterScore: did not find an eventView for the aggregated stream');
        }
        eventNode.eventEnterScope(event, reason, callback);
      }
    },


    eventLeaveScope: function (event, reason, callback) {
      var key = this._findEventNodeType(event), eventNode = this.eventsNodes[key];
      if (!eventNode) {
        if (_.isFunction(callback)) {
          return callback();
        }
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventLeaveScope(event, reason, callback);
          }
        }
      }
      eventNode.eventLeaveScope(event, reason, callback);
      if (eventNode.size === 0) {
        eventNode._closeView();
        delete this.eventsNodes[key];
      }
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('EventLeaveScore: did not find an eventView for the aggregated stream');
        }
        eventNode.eventLeaveScope(event, reason, callback);
        if (eventNode.size === 0) {
          eventNode._closeView();
          delete aggregatedParent.eventsNodesAggregated[key];
        }

      }
    },

    eventChange: function (event, reason, callback) {
      var key = this._findEventNodeType(event), eventNode = this.eventsNodes[key];
      if (!eventNode) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }
      if (this.redirect) {
        for (var i = 0, n = this.redirect.length; i < n; ++i) {
          if (this.redirect[i].type === event.type &&
            this.stream.id === event.streamId) {
            this.connectionNode.streamNodes[this.redirect[i].to]
              .eventChange(event, reason, callback);
          }
        }
      }
      eventNode.eventChange(event, reason, callback);
      var aggregatedParent = this._findAggregatedParent();
      if (aggregatedParent) {
        eventNode =  aggregatedParent._findEventNode(key, aggregatedParent.eventsNodesAggregated);
        if (eventNode === null) {
          throw new Error('eventChange: did not find an eventView for the aggregated stream');
        }
        eventNode.eventChange(event, reason, callback);
      }
    },
    _findAggregatedParent: function () {
      var parent = this;
      while (parent) {
        if (parent.aggregated) {
          return parent;
        }
        parent = parent.parent;
      }
      return null;
    },
    _findEventNodeType: function (event) {
      var keys = _.keys(StreamNode.registeredEventNodeTypes);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (StreamNode.registeredEventNodeTypes[key].acceptThisEventType(event.type)) {
          return key;
        }
      }
      return;
    },
    _findEventNode: function (key, eventsNodeList) {
      var eventNode = null;
      if (key && _.has(eventsNodeList, key)) {
        eventNode =  eventsNodeList[key]; // found one
      }  else { // create is
        eventNode = new StreamNode.registeredEventNodeTypes[key](this);
        eventsNodeList[key] = eventNode;
      }
      return eventNode;
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
  'ActivitiesEventsNode' : require('./eventsNode/ActivitiesEventsNode.js'),
  'PositionsEventsNode' : require('./eventsNode/PositionsEventsNode.js'),
  'PicturesEventsNode' : require('./eventsNode/PicturesEventsNode.js'),
  'NumericalsEventsNode' : require('./eventsNode/NumericalsEventsNode.js'),
  'TweetsEventsNode' : require('./eventsNode/TweetsEventsNode.js'),
  'GenericEventsNode' : require('./eventsNode/GenericEventsNode.js')
};