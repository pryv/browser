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

  },
  {
    className: 'StreamNode',


    // ----


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

      // Streams
      _.each(this.stream.children, function (child) {
        var childTemp =  self.connectionNode.streamNodes[child.id];
        children.push(childTemp);
      });

      // Events
      _.each(this.eventsNodes, function (eventNode) {
        children.push(eventNode);
      });

      return children;
    },

    eventEnterScope: function (event, reason, callback) {
      var eventView = null;
      // find the first matching eventView Type
      var keys = _.keys(StreamNode.registeredEventNodes);
      for (var i = 0; (i < keys.length && eventView === null); i++) {
        var key = keys[i];
        if (StreamNode.registeredEventNodes[key].acceptThisEventType(event.type)) {
          // found a handler !! can we use an already active
          if (_.has(this.eventsNodes, key)) {
            eventView =  this.eventsNodes[key]; // found one
          }  else { // create is
            eventView = new StreamNode.registeredEventNodes[key](this);
            this.eventsNodes[key] = eventView;
          }
        }
      }

      if (eventView === null) {
        throw new Error('StreamNode: did not find an eventView for event: ' + event.id);
      }

      eventView.eventEnterScope(event, reason, callback);

    },


    eventLeaveScope: function (event, reason, callback) {
      delete this.events[event.id];
      callback(null, this);
    },

    eventChange: function (event, reason, callback) {
      callback(null, this);
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


StreamNode.registeredEventNodes = {
  'Notes' : require('./eventsNode/NotesEventsNode.js'),
  'Generic' : require('./eventsNode/GenericEventsNode.js')
};