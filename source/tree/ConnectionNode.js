
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

    // ---------------------------------- //

    /**
     * Advertise a structure change event
     * @param callback
     */
    structureChange: function (callback) {
      // - load streamTree from connection
      // - create nodes
      // - redistribute events (if needed)
      // when implemented review "eventEnterScope" which creates the actual structure

      // warnings
      // - there is no list of events directly accessible.
      // Maybe this could be asked to the rootNode

      // possible optimization
      // - calculate the changes and rebuild only what's needed :)
      // - this would need cleverer StreamNodes

      console.log('Warning: Implement ConnectionNode.structureChange');
      callback();
    },

    // ---------- Node -------------  //

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

        // TODO reimplement
        // this is in fact a bad implementation..
        // It's optimized, (it just create the needed nodes)
        // but does not follow the discussion we had
        // normally the struture should be created will all the StreamNode.. at start!!
        // this will be done by structureChange
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
