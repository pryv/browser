
var TreeNode = require('./TreeNode');

var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode);
    this.connection = connection;
  }, {
    className: 'ConnectionNode',

    /**
     * Add an Event to the Tree
     * @param event Event
     * @return TreeNode the node in charge of this event. To be handled directly,
     * next event addition or renderView() call can modify structure, and change
     * the owner of this Event. This is designed for animation. .. add event then
     * call returnedNode.currentWarpingDOMObject()
     */
    eventEnterScope: function (event, reason) {
      console.log('Connection: ' + this.connection.shortId + ' got event: ' + event.id);
    },

    /**
     * the Event changed from the Tree
     * @param event Event or eventId .. to be discussed
     */
    eventChange: function (event, reason) {
      throw new Error('eventChange must be implemented');
    },

    /**
     * Event removed
     * @parma eventChange
     */
    eventLeaveScope: function (removed, reason) {
      throw new Error('eventLeaveScope must be implemented');
    }

  });
Object.defineProperty(ConnectionNode.prototype, 'id', {
  get: function () { return this.connection.id; },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});
