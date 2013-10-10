/* global $ */
var _ = require('underscore'),
  NodeView = require('../view/NodeView.js'),
  Backbone = require('backbone'),
  TreemapUtil = require('../utility/treemap.js');

/**
 * The model for all Nodes
 * @param parent
 * @constructor
 */
var DEFAULT_OFFSET = 30;
// TODO see css right border
// need to set color background only on .nodeHeader
var DEFAULT_MARGIN = 2;
var DEFAULT_MIN_WIDTH = 550;
var DEFAULT_MIN_HEIGHT = 500;
var MAIN_CONTAINER_ID = 'tree';
var TreeNode = module.exports = function (parent) {
  this.parent = parent;
  this.uniqueId = _.uniqueId('node_');
  this.width = null;
  this.height = null;
  this.x = 0;
  this.y = 0;
  this.aggregated = false;
  this.view = null;
  this.model = null;
  this.eventsNbr = 0;
  this.offset = this.parent ? this.parent.offset : DEFAULT_OFFSET;
  this.margin = this.parent ? this.parent.margin : DEFAULT_MARGIN;
  this.minWidth = this.parent ? this.parent.minWidth : DEFAULT_MIN_WIDTH;
  this.minHeight = this.parent ? this.parent.minHeight : DEFAULT_MIN_HEIGHT;
};


TreeNode.implement = function (constructor, members) {
  var newImplementation = constructor;

  if (typeof Object.create === 'undefined') {
    Object.create = function (prototype) {
      function C() { }
      C.prototype = prototype;
      return new C();
    };
  }
  newImplementation.prototype = Object.create(this.prototype);
  _.extend(newImplementation.prototype, members);
  newImplementation.implement = this.implement;
  return newImplementation;
};

_.extend(TreeNode.prototype, {
  className: 'TreeNode',
  /** TreeNode parent or null if rootNode **/

  //---------- view management ------------//

  _createView: function () {
    if (this.getWeight() === 0) {
      return;
    }
    if (!this.view && typeof(document) !== 'undefined') {
      if (this.className === 'RootNode' && (this.width === null || this.height === null)) {
        throw new Error('You must set width and height of the root node');
      }
      this._refreshViewModel();
      this.view = new NodeView({model: this.model});
    }
    if (this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    }
  },

  _generateChildrenTreemap: function (x, y, width, height, recursive) {
    if (this.getWeight() === 0) {
      return;
    }
    this.needToAggregate();
    var children = this.getChildren();
    if (children) {
      // we need to normalize child weights by the parent weight
      var weight = this.getWeight();
      _.each(children, function (child) {
        child.normalizedWeight = (child.getWeight() / weight);
      }, this);
      var offset = this.offset;
      if (this.className === 'RootNode') {
        offset = 0;
      }
      // we squarify all the children passing a container dimension and position
      // no recursion needed
      var squarified =  TreemapUtil.squarify({
        x: x,
        y: y + offset,
        width: width,
        height: height - offset
      }, children);
      _.each(children, function (child) {
        child.x = squarified[child.uniqueId].x;
        child.y = squarified[child.uniqueId].y;
        child.width = squarified[child.uniqueId].width;
        //no right margin for rightest child
        child.width -= child.width + child.x === this.width ? 0 : this.margin;
        child.height = squarified[child.uniqueId].height - this.margin;
      }, this);

      _.each(children, function (child) {
        if (recursive) {
          child._generateChildrenTreemap(0, 0, child.width, child.height, true);
        }
      }, this);
    }
  },
  needToAggregate: function () {
    this.aggregated = false;
    return this.aggregated;
  },
  /**
   * render the View version A
   * @param height height of the Node
   * @param width width of the Node
   * @return A DOM Object, EventView..
   */
  renderView: function (recurcive) {
    if (this.needToSquarify) {
      this.needToSquarify = false;
      this._createView(true);
      this._generateChildrenTreemap(0,
       0,
        this.width,
        this.height,
        true);
      this._refreshViewModel(true);
    }
    if ($('#' + this.uniqueId).length === 0 && this.view) {
      this.view.renderView();
      this.view.on('click', function () {
        // TODO implement on click
      }, this);
    }
    if (recurcive) {
      _.each(this.getChildren(), function (child) {
        child.renderView(true);
      });
    }
  },

  _refreshViewModel: function (recursive) {

    if (!this.model) {

      var BasicModel = Backbone.Model.extend({ });
      this.model = new BasicModel({
        containerId: this.parent ? this.parent.uniqueId : MAIN_CONTAINER_ID,
        id: this.uniqueId,
        className: this.className,
        width: this.width,
        height: this.height,
        x: this.x,
        y: this.y,
        depth: this.depth,
        weight: this.getWeight(),
        content: this.events || this.stream || this.connection,
        eventView: this.eventView
      });
    }
    // TODO For now empty nodes (i.e streams) are not displayed
    // but we'll need to display them to create event, drag drop ...
    if (this.getWeight() === 0) {
      if (this.model) {
        this.model.set('width', 0);
        this.model.set('height', 0);
      }
      return;
    }
    this.model.set('containerId', this.parent ? this.parent.uniqueId : MAIN_CONTAINER_ID);
    this.model.set('id', this.uniqueId);
    this.model.set('name', this.className);
    this.model.set('width', this.width);
    this.model.set('height', this.height);
    this.model.set('x', this.x);
    this.model.set('y', this.y);
    this.model.set('depth', this.depth);
    this.model.set('weight', this.getWeight());
    if (this.eventView) {
      this.eventView.refresh({
        width: this.width,
        height: this.height
      });
    }
    if (recursive && this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._refreshViewModel(true);
      });
    }
  },
  /**
   *
   * @return DOMNode the current Wrapping DOM object for this Node. If this TreeNode is not yet
   * rendered, or does not have a representation in the DOM it will return
   * getParent().currentWarpingDOMObject();
   */
  currentWrappingDOMObject: function () {
    if (this.parent === null) { return null; }

    // each node with a specific rendering should overwrite this

    return this.parent;
  },


  //-------------- Tree Browsing -------------------//

  /**
   * @return TreeNode parent or null if root
   */
  getParent: function () {
    return this.parent;
  },

  /**
   * @return Array of TreeNode or null if leaf
   */
  getChildren: function () {
    throw new Error(this.className + ': getChildren must be implemented');
  },


  /**
   * Return the total weight (in TreeMap referential) of this node and it's children
   * This should be overwritten by Leaf nodes
   * @return Number
   */
  getWeight: function () {
    if (this.getChildren() === null) {
      throw new Error(this.className + ': Leafs must overwrite getWeight');
    }
    var weight = 0;
    this.getChildren().forEach(function (child) {
      weight += child.getWeight();
    });
    return weight;
  },



  //----------- event management ------------//

  /**
   * Add an Event to the Tree
   * @param event Event
   * @return TreeNode the node in charge of this event. To be handled directly,
   * next event addition or renderView() call can modify structure, and change
   * the owner of this Event. This is designed for animation. .. add event then
   * call returnedNode.currentWarpingDOMObject()
   */
  eventEnterScope: function () {
    throw new Error(this.className + ': eventEnterScope must be implemented');
  },

  /**
   * the Event changed from the Tree
   * @param event Event or eventId .. to be discussed
   */
  eventChange: function () {
    throw new Error(this.className + ': eventChange must be implemented');
  },

  /**
   * Event removed
   * @parma eventChange
   */
  eventLeaveScope: function () {
    throw new Error(this.className + ': eventLeaveScope must be implemented');
  },
  //----------- debug ------------//
  _debugTree : function () {
    var me = {
      className : this.className,
      weight : this.getWeight()
    };
    if (this.getChildren()) {
      me.children = [];
      _.each(this.getChildren(), function (child) {
        me.children.push(child._debugTree());
      });
    }
    return me;
  }
});
