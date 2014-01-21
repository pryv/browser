
var _ = require('underscore');
var TreeNode = require('./TreeNode');
var StreamNode = require('./StreamNode');
var VirtualNode = require('./VirtualNode.js');

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

          this.streamNodes[stream.id] = new StreamNode(this, parentNode, stream);


          if (VirtualNode.hasInNode(stream)) {
            var vn = VirtualNode.getFromNode(stream);
            vn.each(function (virtualNode) {
              var id = '';
              // create the virtual node's id
              virtualNode.filters.each(function (s) {
                id = id + s.filter.id;
              });

              // create its child list
              virtualNode.filters.each(function (s) {

                if (virtNodeWaiting[s.filter.id]) {
                  virtNodeWaiting[s.filter.id].push(id);
                } else {
                  virtNodeWaiting[s.filter.id] = [id];
                }
              });
              this.streamNodes[id] = new StreamNode(this, stream, stream); // hack with stream
            });
            console.log('has virtual node', vn);
          }





          // check for event redirection
          if (virtNodeWaiting[stream.id]) {
            if (this.streamNodes[stream.id].redirect) {
              this.streamNodes[stream.id].redirect.push(virtNodeWaiting[stream.id]);
            } else {
              this.streamNodes[stream.id].redirect = virtNodeWaiting[stream.id];
            }
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