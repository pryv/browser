
var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var VirtualNode = require('./VirtualNode.js');
var Pryv = require('pryv');

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
    this.virtNodeWaiting = {};
    this.waitForStream = {};
    this.waitForParentStream = {};
    this.margin = STREAM_MARGIN;
    this.offset = 25;
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


      /* Set color to root stream is none and connection is mine (i.e type=personal) */
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

      if (VirtualNode.nodeHas(this.connection)) {
        var vn = VirtualNode.getNodes(this.connection);
        console.log('Checking connection\'s virtual nodes', vn);

        // for each virtual node of stream
        _.each(vn, function (virtualNode) {
          // set the redirections to the children
          _.each(virtualNode.filters, function (s) {
            this.addRedirections(s.streamId, virtualNode.id, s.type);
          }.bind(this));

          this.createVirtualStreamNode(this, null, virtualNode.id, virtualNode.name, virtualNode);
        }.bind(this));
      }



      this.connection.streams.walkTree(options,
        function (stream) {  // eachNode
          var parentNode = this;
          if (stream.parent) {   // if not parent, this connection node is the parent
            parentNode = this.streamNodes[stream.parent.id];
          }
          stream.isVirtual = false;
          this.streamNodes[stream.id] = new StreamNode(this, parentNode, stream);
          if (VirtualNode.nodeHas(stream)) {
            var vn = VirtualNode.getNodes(stream);
            // for each virtual node of stream
            _.each(vn, function (virtualNode) {
              // set the redirections to the children
              _.each(virtualNode.filters, function (s) {
                this.addRedirections(s.streamId, virtualNode.id, s.type);
              }.bind(this));

              this.createVirtualStreamNode(this.streamNodes[stream.id],
                stream, virtualNode.id, virtualNode.name, virtualNode);
            }.bind(this));
          }
          // check for event redirection for the current stream
          this.setRedirections(stream.id);
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
      var node =  this.streamNodes[event.streamId]; // do we already know this stream?
      if (typeof node === 'undefined') {
        if (!this.waitForStream[event.streamId]) {
          this.waitForStream[event.streamId] = [];
        }
        this.waitForStream[event.streamId].push(event);
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      node.eventEnterScope(event, reason, callback);
    },
    streamEnterScope: function (stream, reason, callback) {
      if (this.streamNodes[stream.id]) {
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      if (!stream.parent) {
        this.streamNodes[stream.id] = new StreamNode(this, this, stream);
      }
      if (stream.parent && this.streamNodes[stream.parent.id]) {
        this.streamNodes[stream.id] =
          new StreamNode(this, this.streamNodes[stream.parent.id], stream);
      }
      if (stream.parent && !this.streamNodes[stream.parent.id]) {
        if (!this.waitForParentStream[stream.parent.id]) {
          this.waitForParentStream[stream.parent.id] = [];
        }
        this.waitForParentStream[stream.parent.id].push(stream);
        if (typeof(callback) === 'function') {
          return callback();
        } else {
          return null;
        }
      }
      _.each(this.waitForStream[stream.id], function (event) {
        this.eventEnterScope(event, null, function () {});
      }.bind(this));
      _.each(this.waitForParentStream[stream.id], function (stream) {
        this.streamEnterScope(stream, null, function () {});
      }.bind(this));
      if (typeof(callback) === 'function') {
        return callback();
      } else {
        return null;
      }
    },

    eventLeaveScope: function (event, reason, callback) {
      var node = this.streamNodes[event.streamId];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to remove event' + event.id);
      }
      node.eventLeaveScope(event, reason, callback);

    },

    eventChange: function (event, reason, callback) {
      var node = this.streamNodes[event.streamId];
      if (node === 'undefined') {
        throw new Error('ConnectionNode: can\'t find path to change event' + event.id);
      }
      node.eventChange(event, reason, callback);
    },

// ----------- connection attached virtual nodes ------------//
    updateConnectionVirtualNodes: function (a, b) {
      console.log('updateConnectionVirtualNodes', a, b);
      console.log('updateConnectionVirtualNodes', this);
    },

    addRedirections: function (from, to, type) {
    // if the source is already in the list:
      if (this.streamNodes[from]) {
        if (this.streamNodes[from].redirect) {
          this.streamNodes[from].redirect.push({to: to, type: type});
        } else {
          this.streamNodes[from].redirect = [{to: to, type: type}];
        }
      } else {
        if (this.virtNodeWaiting[from]) {
          this.virtNodeWaiting[from].push({to: to, type: type});
        } else {
          this.virtNodeWaiting[from] = [{to: to, type: type}];
        }
      }
    },

    setRedirections: function (streamId) {
      // check for event redirection
      if (this.virtNodeWaiting[streamId]) {
        if (this.streamNodes[streamId].redirect) {
          // for loop to add them all ?
          for (var i = 0, n = this.virtNodeWaiting[streamId].length; i < n; ++i) {
            this.streamNodes[streamId].redirect.push(this.virtNodeWaiting[streamId][i]);
          }
        } else {
          this.streamNodes[streamId].redirect = this.virtNodeWaiting[streamId];
        }
        delete this.virtNodeWaiting[streamId];
      }
    },

    /**
     * Creates a new Virtual node
     * @param parent the parent object
     * @param id the virtual node's id
     * @param name the virtual node's name
     */
    createVirtualStreamNode: function (parentNode, parent, id, name, vn) {
      var connectionNode =  this;
      var virtualStream = new Pryv.Stream(this.connection, {_parent: parent,
        parentId: parent ? parent.id : null, childrenIds: [], id: id, name: name,
        virtual: vn});

      this.streamNodes[id] = new StreamNode(connectionNode,
        parentNode, virtualStream);
      this.connection.datastore.streamsIndex[virtualStream.id] = virtualStream;
      if (parent) {
        parent.childrenIds.push(virtualStream.id);
      }
      console.log('Set up new virtual node as VirtualStream:', virtualStream);

      return {virtStream: virtualStream, virtStreamNode: this.streamNodes[id]};
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