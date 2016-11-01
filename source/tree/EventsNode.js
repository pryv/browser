var TreeNode = require('./TreeNode'),
  RootNode = require('./RootNode'),
  Backbone = require('backbone'),
  NodeView = require('../view/NodeView.js'),
  _ = require('underscore');

/*
 If you want to bypass the plugin detection system (i.e not use EventsView.js)
 just remove EventsView = require... above and add to all the Events typed node:
 var EventsView = require( {path to the plugin view} );  as a global var
 pluginView: EventsView, as an instance var
 to create the view just do: new this.pluginView(params);
 */
/**
 * Holder for EventsNode
 * @type {*}
 */
var EventsNode = module.exports = TreeNode.implement(
  function (parentStreamNode) {
    TreeNode.call(this, parentStreamNode.treeMap, parentStreamNode);
    this.events = {};
    this.trashedEvents = {};
    this.eventDisplayed = null;
    this.eventView = null;
    this.model  = null;
    this.size = 0;
  },
  {
    className: 'EventsNode',
    aggregated: false,
    getChildren: function () {
      return null;
    },

    eventEnterScope: function (event, reason, callback) {
      this.size++;
      event.streamName =
        this.parent.connectionNode.connection.datastore.getStreamById(event.streamId).name;
      this.events[event.id] = event;
      if (!this.eventView) {
        this._createEventView();
      } else {
        this.eventView.eventEnter(event);
      }

      if (callback) {
        callback(null);
      }
    },
    eventLeaveScope: function (event/**, reason, callback*/) {
      if (this.events[event.id]) {
        this.size--;
        delete this.events[event.id];
        if (this.eventView) {
          this.eventView.eventLeave(event);
        }
      }
    },
    onDateHighLighted: function (time) {
      if (this.eventView) {
        this.eventView.OnDateHighlightedChange(time);
      }
    },
    /*jshint -W098 */
    eventChange: function (event, reason, callback) {
      this.events[event.id] = event;
      //console.log('eventChange', event);
      if (this.eventView) {
        this.eventView.eventChange(event);
      }

      if (callback) {
        callback(null);
      }
    },

    _refreshViewModel: function (recursive) {
      if (!this.model) {
        var BasicModel = Backbone.Model.extend({ });
        this.model = new BasicModel({
          containerId: this.parent.uniqueId,
          id: this.uniqueId,
          className: this.className,
          width: this.width,
          height: this.height,
          x: this.x,
          y: this.y,
          depth: this.depth,
          color: this.parent.stream.color,
          weight: this.getWeight(),
          content: this.events || this.stream || this.connection,
          eventView: this.eventView,
          streamId: this.parent.stream.id,
          streamName: this.parent.stream.name,
          connectionId: this.parent.connectionNode.id
        });
      } else {
        // TODO For now empty nodes (i.e streams) are not displayed
        // but we'll need to display them to create event, drag drop ...
        /*if (this.getWeight() === 0) {
         if (this.model) {
         this.model.set('width', 0);
         this.model.set('height', 0);
         }
         return;
         } */
        this.model.set('containerId', this.parent.uniqueId);
        this.model.set('id', this.uniqueId);
        this.model.set('name', this.className);
        this.model.set('width', this.width);
        this.model.set('height', this.height);
        this.model.set('x', this.x);
        this.model.set('y', this.y);
        this.model.set('depth', this.depth);
        this.model.set('weight', this.getWeight());
        this.model.set('streamId', this.parent.stream.id);
        this.model.set('connectionId', this.parent.connectionNode.id);
        if (this.eventView) {
          this.eventView.refresh({
            width: this.width,
            height: this.height
          });
        }
      }
      if (recursive && this.getChildren()) {
        _.each(this.getChildren(), function (child) {
          child._refreshViewModel(true);
        });
      }
    },

    _createEventView: function () {
      this.eventView = new this.pluginView(this.events, {
        width: this.width,
        height: this.height,
        id: this.uniqueId,
        treeMap: this.treeMap,
        stream: this.parent.stream
      }, this);
    },
    /**
     * Called on drag and drop
     * @param nodeId
     * @param streamId
     * @param connectionId
     */
    dragAndDrop: function (nodeId, streamId, connectionId) {

      if (!nodeId || !streamId || !connectionId) {
        return this;
      }

      var otherNode =  this.treeMap.getNodeById(nodeId, streamId, connectionId);
      var thisNode = this;

      if (thisNode.isVirtual() || otherNode.isVirtual()) {
        throw new Error('Creating virtual node out of virtual nodes currently not allowed.');
      }
      if (otherNode === thisNode) {
        throw new Error('Creating virtual node with the same node not allowed.');
      }

      this.treeMap.requestAggregationOfNodes(thisNode, otherNode);
    },
    isVirtual: function () {
      return (true && this.parent.stream.virtual);
    },
    getVirtual: function () {
      console.log('getVirtual', this.parent.stream.virtual);
      return this.parent.stream.virtual;
    },

    getSettings: function () {
      console.log('getSettings');
    }


  });


EventsNode.acceptThisEventType = function () {
  throw new Error('EventsNode.acceptThisEventType nust be overriden');
};




