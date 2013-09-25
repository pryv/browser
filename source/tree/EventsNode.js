var TreeNode = require('./TreeNode');

/**
 * Holder for EventsNode
 * @type {*}
 */
var EventsNode = module.exports = TreeNode.implement(
  function (parentStreamNode) {
    TreeNode.call(this, parentStreamNode);
    this.events = {};
  },
  {
    className: 'EventsNode',



    getChildren: function () {
      return null;
    },

    eventEnterScope: function (event, reason, callback) {
      this.events[event.id] = event;
      callback(null);
    },

    eventLeaveScope: function (event, reason, callback) {
      delete this.events[event.id];
    },

    eventChange: function (event, reason, callback) {
      throw new Error('EventsNode.eventChange No yet implemented' + event.id);
    }
  });


EventsNode.acceptThisEventType = function (eventType) {
  throw new Error('EventsNode.acceptThisEventType nust be overriden');
};

