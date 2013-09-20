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


    getChildren: function () {
      var self = this;
      var children = [];
      _.each(this.stream.children, function (child) {
        var childTemp =  self.connectionNode.streamNodes[child.id];
        if (childTemp) {
          // child may be unkown
          children.push(childTemp);
        }
      });
      return children;
    },

    eventEnterScope: function (event, reason) {
      this.events[event.id] = event;
    },

    eventLeaveScope: function (event, reason) {
      delete this.events[event.id];
    },

    eventChange: function (event, reason) {

    },


    //----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.stream.name,
        events : _.keys(this.events).length
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      return me;
    }
  });