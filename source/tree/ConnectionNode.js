
var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var VirtualNode = require('./VirtualNode.js');
var Pryv = require('pryv');

var STREAM_MARGIN = 20;
var SERIAL = 0;
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
      var virtNodeWaiting = {};


      this.connection.streams.walkTree(options,
        function (stream) {  // eachNode
          var parentNode = this;
          if (stream.parent) {   // if not parent, this connection node is the parent
            parentNode = this.streamNodes[stream.parent.id];
          }
          stream.isVirtual = false;
          this.streamNodes[stream.id] = new StreamNode(this, parentNode, stream);

          // AND HERE we get the wrongly constructed virtual stream.


          if (VirtualNode.nodeHas(stream)) {
            var vn = VirtualNode.getNodes(stream);

            // for each virtual node of stream
            _.each(vn, function (virtualNode) {

              var id = '';
              // create the virtual node's id
              _.each(virtualNode.filters, function (s) {
                id = id + s.streamId;
              });

              // set the redirections to the children
              _.each(virtualNode.filters, function (s) {

                // if the source is already in the list:
                if (this.streamNodes[s.streamId]) {
                  if (this.streamNodes[s.streamId].redirect) {
                    this.streamNodes[s.streamId].redirect.push({to: id, type: s.type});
                  } else {
                    this.streamNodes[s.streamId].redirect = [{to: id, type: s.type}];
                  }
                } else {
                  if (virtNodeWaiting[s.streamId]) {
                    virtNodeWaiting[s.streamId].push({to: id, type: s.type});
                  } else {
                    virtNodeWaiting[s.streamId] = [{to: id, type: s.type}];
                  }
                }
              }.bind(this));
              var connectionNode =  this;
              var virtualStreamNode = this.streamNodes[stream.id];
              var virtualStream = new Pryv.Stream(this.connection, {_parent: stream,
                parentId: stream.id, childrenIds: [], id: id, name: virtualNode.name,
                isVirtual: true});
              this.streamNodes[id] = new StreamNode(connectionNode,
                virtualStreamNode, virtualStream);
              this.connection.datastore.streamsIndex[virtualStream.id] = virtualStream;
              stream.childrenIds.push(virtualStream.id);

              console.log('Set up new virtual node as VirtualStream:', virtualStream);
            }.bind(this));
          }
          // check for event redirection
          if (virtNodeWaiting[stream.id]) {
            if (this.streamNodes[stream.id].redirect) {
              // for loop to add them all ?
              for (var i = 0, n = virtNodeWaiting[stream.id].length; i < n; ++i) {
                this.streamNodes[stream.id].redirect.push(virtNodeWaiting[stream.id][i]);
              }
            } else {
              this.streamNodes[stream.id].redirect = virtNodeWaiting[stream.id];
            }
            delete virtNodeWaiting[stream.id];
          }

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