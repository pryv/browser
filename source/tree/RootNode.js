var TreeNode = require('./TreeNode');
var ConnectionNode = require('./ConnectionNode');
var _ = require('underscore');
var Backbone = require('backbone');

/**
 * Holder for Connection Nodes.
 * @type {*}
 */
var RootNode = module.exports = TreeNode.implement(
  function () {
    TreeNode.call(this, null);
    this.connectionNodes = {}; // Connections indexed by their token .. other index solution welcome
  },
  {
    className: 'RootNode',
    eventLeaveCount: 0,

    getChildren: function () {
      return _.values(this.connectionNodes);
    },

    eventEnterScope: function (event, reason, callback) {
      var connectionNode = this.connectionNodes[event.connection.id];

      if (typeof connectionNode !== 'undefined') {
        return connectionNode.eventEnterScope(event, reason, callback);
      }

      // we create a new connection Node
      connectionNode = new ConnectionNode(this, event.connection);

      this.connectionNodes[event.connection.id] = connectionNode;
      connectionNode.initStructure(null, function (error) {
        if (error) {
          return callback('RootNode.eventEnterScope Failed to init ConnectionNode - ' + error);
        }
        connectionNode.eventEnterScope(event, reason, callback);
      });

    },

    eventLeaveScope: function (events, reason, callback) {
      console.log(events);
      if (!events) {
        return;
      }
      console.log(events.length);
      for (var i = 0; i < events.length ; ++i) {
        var event = events[i];
        var node = this.connectionNodes[event.connection.id];
        if (node === 'undefined') {
          throw new Error('RootNode: can\'t find path to remove event' + event.id);
        }
        node.eventLeaveScope(event, reason, callback);
      }
      this._generateChildrenTreemap(this.x, this.y, this.width, this.height, true);
      this._refreshViewModel(true);
    },

    eventChange: function (event, reason, callback) {
      var node = this.connectionNodes[event.connection.id];
      if (node === 'undefined') {
        throw new Error('RootNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason, callback);
    }
  });

