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
    this.events = {};
  },
  {
    className: 'StreamNode',


    // --- Specific to StreamNode

    /**
     * compute changes on the event
     * @return a list of changes
     */
    update : function (streamData) {

    },

    // ----


    getWeight: function () {
      var weight = 0;
      this.getChildren().forEach(function (child) {
        weight += child.getWeight();
      });

      // count 1 per event (to be changed :)
      weight += _.keys(this.events).length;
      return weight;
    },

    getChildren: function () {
      var self = this;
      var children = [];

      _.each(this.stream.children, function (child) {
        /* TODO
        add events
         */
        var childTemp =  self.connectionNode.streamNodes[child.id];
        if (childTemp) {
          // child may be unkown
          children.push(childTemp);
        }
      });
      return children;
    },

    eventEnterScope: function (event, reason, callback) {
      this.events[event.id] = event;
      callback(null, this);
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
        events : _.keys(this.events).length,
        nullChildren : 0
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      if (this.getChildren()) {
        me.children = []; // overrride the default getChildren
        _.each(this.getChildren(), function (child) {
          if (child.getWeight() > 0) {
            me.children.push(child._debugTree());
          } else {
            me.nullChildren++;
          }
        });
      }
      return me;
    }
  });