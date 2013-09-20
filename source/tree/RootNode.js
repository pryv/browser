var TreeNode = require('./TreeNode');
var ConnectionNode = require('./ConnectionNode');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */
var RootNode = TreeNode.implement(
  function () {
    TreeNode.call(this, null);
    this.connectionNodes = {}; // Connections indexed by their token .. other index solution welcom
  },
  {
    className: 'RootNode',

    eventEnterScope: function (event, reason) {
      var node = this.connectionNodes[event.connection.id];
      if (typeof node === 'undefined') {
        node = new ConnectionNode(this, event.connection);
        this.connectionNodes[node.id] = node;
      }
      node.eventEnterScope(event, reason);
    },

    eventLeaveScope: function (event, reason) {
      var node = this.connectionNodes[event.connection.id];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to remove event' + event.id);
      }
      node.eventRemove(event, reason);
    },

    eventChange: function (event, reason) {
      var node = this.connectionNodes[event.connection.id];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason);
    }
  });

module.exports = RootNode;