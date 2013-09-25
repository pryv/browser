
var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var Pryv = require('pryv');

/**
 * Always call intStructure after creating a new ConnectionNode
 * @type {*}
 */
var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode);
    this.connection = connection;
    this.streamNodes = {};

  }, {
    className: 'ConnectionNode',

    // ---------------------------------- //


    /**
     * Build Structure
     * @param callback
     * @param options
     */
    initStructure: function (options, callback) {

      options = options || {};
      var self = this;
      self.streamNodes = {};
      self.connection.streams.get(function (error, result) {
        if (error) {  return callback('Failed ConnectionNode.initStructure. - ' + error); }


        self.connection.streams.Utils.walkDataTree(result, function (streamData) {


          // walkDataTree insure that we pass by the parents before the childrens
          var parentNode = self;
          if (streamData.parentId) {   // if not parent, this connection node is the parent
            parentNode = self.streamNodes[streamData.parentId];
          }
          var stream = new Pryv.Stream(self.connection, streamData);
          self.streamNodes[streamData.id] = new StreamNode(self, parentNode, stream);
        });

        callback();
      }, options);
    },

    /**
     * Advertise a structure change event
     * @param options {state : all, default}
     * @param callback
     */
    structureChange: function (callback, options) {

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


    eventEnterScope: function (event, reason, callback) {
      var self = this;
      var node =  self.streamNodes[event.stream.id]; // do we already know self stream?
      if (typeof node === 'undefined') {
        throw new Error('Cannot find stream with id: ' + event.stream.id);
      }
      node.eventEnterScope(event, reason, callback);
    },

    eventLeaveScope: function (event, reason, callback) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to remove event' + event.id);
      }
      node.eventRemove(event, reason, callback);
    },

    eventChange: function (event, reason, callback) {
      var node = this.streamNodes[event.stream.id];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason, callback);
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
