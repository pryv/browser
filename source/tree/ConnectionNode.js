var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');

var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode);
    this.connection = connection;

    this.streamNodes = {};

  }, {
    className: 'ConnectionNode',

    getChildren: function () {
      var self = this;
      var children = [];
      _.each(this.streamNodes, function (node) {
        if (node.getParent() === self) { children.push(node); }
      });
      return children;
    },


    eventEnterScope: function (event, reason) {
      var self = this;
      var node =  self.streamNodes[event.stream.id]; // do we already know self stream?
      if (typeof node === 'undefined') {
        var parentNode = self;


        _.each(event.stream.parents, function (parent)  {  // find the parent of self stream
          // eventually add parents to the tree
          var testParentNode = self.streamNodes[parent.id];
          if (typeof testParentNode  === 'undefined') {  // eventually create them ad hoc
            testParentNode = new StreamNode(self, parentNode, parent);
            self.streamNodes[parent.id] = testParentNode;
          }
          parentNode = testParentNode;
        });

        node = new StreamNode(self, parentNode, event.stream);
        self.streamNodes[event.stream.id] = node;
      }
      node.eventEnterScope(event, reason);
    },

    eventLeaveScope: function (event, reason) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to remove event' + event.id);
      }
      node.eventRemove(event, reason);
    },

    eventChange: function (event, reason) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason);
    },

    //----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.connection.shortId
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      return me;
    }

  });
Object.defineProperty(ConnectionNode.prototype, 'id', {
  get: function () { return this.connection.id; },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});
