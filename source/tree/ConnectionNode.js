var _ = require('underscore');
var TreeNode = require('./TreeNode');

var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode);
    this.connection = connection;
    this.events = {};

    this.streamNodes = {};

  }, {
    className: 'ConnectionNode',

    getChildren: function () {
      return _.values(this.streamNodes);
    },


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
      this.events[event.id] = event;
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
    },

    //----------- debug ------------//
    _debugTree : function () {
      var me = {
        name : this.connection.shortId,
        eventsCount : _.keys(this.events).length
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      return me;
    }

  });
Object.defineProperty(ConnectionNode.prototype, 'id', {
  get: function () { return this.connection.id; },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});
