
var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var STREAM_MARGIN = 20;
var SERIAL = 0;
var STREAM_COLORS = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6',
  '#34495e', '#f1c40f', '#e74c3c', '#e67e22', '#95a5a6'];
/**
 * Always call intStructure after creating a new ConnectionNode
 * @type {*}
 */
var ConnectionNode = module.exports = TreeNode.implement(
  function (parentnode, connection) {
    TreeNode.call(this, parentnode.treeMap, parentnode);
    this.connection = connection;
    this.streamNodes = {};
    this.margin = STREAM_MARGIN;
    this.uniqueId = 'node_connection_' + SERIAL;
    SERIAL++;
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
      this.streamNodes = {};
      var usedColor = [];
      if (this.connection.accessInfo().type && this.connection.accessInfo().type === 'personal') {


        this.connection.streams.walkTree(options, function (stream) {
          if (!stream.parentId && stream.clientData && stream.clientData['pryv-browser:bgColor']) {
            usedColor.push(stream.clientData['pryv-browser:bgColor']);
          }
        });
        var freeColors = _.difference(STREAM_COLORS, usedColor);
        if (freeColors.length === 0) {
          freeColors = STREAM_COLORS;
        }
        this.connection.streams.walkTree(options, function (stream) {
          if (!stream.parentId &&
            (!stream.clientData || !stream.clientData['pryv-browser:bgColor'])) {
            if (!stream.clientData) {
              stream.clientData = {};
            }
            stream.clientData['pryv-browser:bgColor'] = freeColors.shift();
            this.connection.streams._updateWithData({id: stream.id, clientData: stream.clientData},
              console.log);
            if (freeColors.length === 0) {
              freeColors = _.difference(STREAM_COLORS, usedColor);
              if (freeColors.length === 0) {
                freeColors = STREAM_COLORS;
              }
            }
          }
        }.bind(this));
      }
      this.connection.streams.walkTree(options,
        function (stream) {  // eachNode
          var parentNode = this;
          if (stream.parent) {   // if not parent, this connection node is the parent
            parentNode = this.streamNodes[stream.parent.id];
          }
          this.streamNodes[stream.id] = new StreamNode(this, parentNode, stream);
        }.bind(this),
        function (error) {   // done
          if (error) { error = 'ConnectionNode failed to init structure - ' + error; }
          callback(error);
        });

    },

    /**
     * Advertise a structure change event
     * @param options {state : all, default}
     * @param callback
     */

    /*jshint -W098 */
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
      var children = [];
      _.each(this.streamNodes, function (node) {
        if (node.getParent() === this) { children.push(node); }
      }, this);
      return children;
    },


    eventEnterScope: function (event, reason, callback) {
      var node =  this.streamNodes[event.stream.id]; // do we already know this stream?
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
      node.eventLeaveScope(event, reason, callback);

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
        name : this.connection.displayId
      };

      _.extend(me, TreeNode.prototype._debugTree.call(this));

      return me;
    }

  });
Object.defineProperty(ConnectionNode.prototype, 'id', {
  get: function () { return this.connection.id; },
  set: function () { throw new Error('ConnectionNode.id property is read only'); }
});