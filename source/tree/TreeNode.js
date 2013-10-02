var _ = require('underscore'),
// $ = require('node-jquery'),
  NodeView = require('../view/NodeView.js'),
  NodeModel = require('../model/NodeModel.js'),
  TreemapUtil = require('../utility/treemap.js');

/**
 * The model for all Nodes
 * @param parent
 * @constructor
 */
var MIN_WIDTH = 30;
var MIN_HEIGHT = 30;
var MAIN_CONTAINER_ID = 'tree';
var TreeNode = module.exports = function (parent) {
  this.parent = parent;
  this.uniqueId = _.uniqueId('node_');
  this.width = null;
  this.height = null;
  this.x = 0;
  this.y = 0;
  this.aggregated = false;
  this.display = true;
  this.view = null;
  this.model = null;
  this.depth = this.parent ? this.parent.depth + 1 : 0;
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
    if (!this.view) {
      // if width is not defined we are at the root node
      // so we need to define a container dimension
      //TODO pass a container id at the creation of the root node
      if (this.width === null || this.height === null) {
        this.width = $(document).width();
        this.height = $(document).height();
      }
      this._generateChildrenTreemap(0, 0, this.width, this.height);
      this.model = new NodeModel({
        containerId: this.parent ? this.parent.uniqueId : MAIN_CONTAINER_ID,
        id: this.uniqueId,
        name: this.className,
        width: this.width,
        height: this.height,
        x: this.x,
        y: this.y,
        depth: this.depth,
        weight: this.getWeight(),
        display: this.display
      });
      this.view = new NodeView({model: this.model});
    }
    /* TODO review this part
    problem: when we remove some events and re-add them they don't render
    why? because the view is still present, only the oldest parent is automaticly removed by
    the refresh view model (see NodeView when width or height = 0)
    Solution: when parent is removed, must removed all this child to (i.e make a boolean ....)

     */
    if ($('#' + this.uniqueId).length === 0) {
      this.renderView();
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
    if (this.getChildren()) {
      // we need to normalize child weights by the parent weight
      _.each(this.getChildren(), function (child) {
        child.normalizedWeight = (child.getWeight() / this.getWeight());
      }, this);

      // we squarify all the children passing a container dimension and position
      // no recursion needed
      var squarified =  TreemapUtil.squarify({
        x: x,
        y: x,
        width: width,
        height: height
      }, this.getChildren());
      _.each(this.getChildren(), function (child) {
        child.x = squarified[child.uniqueId].x;
        child.y = squarified[child.uniqueId].y;
        child.width = squarified[child.uniqueId].width;
        child.height = squarified[child.uniqueId].height;
        // test if we need to aggregate the view by testing if a child is to small
        // (child weight must be > 0)
      }, this);
      if (this.getWeight() > 0  && (this.width <= MIN_WIDTH || this.height <= MIN_HEIGHT)) {
        this.aggregated = true;
      } else {
        this.aggregated = false;
      }
      _.each(this.getChildren(), function (child) {
        child.display = !this.aggregated;
        if (recursive) {
          child._generateChildrenTreemap(0, 0, child.width, child.height, true);
        }
      }, this);
    }
  },
  /**
   * render the View version A
   * @param height height of the Node
   * @param width width of the Node
   * @return A DOM Object, EventView..
   */
  renderView: function () {
    this.view.renderView();

    this.view.on('click', function () {

    }, this);

  },

  _refreshViewModel: function (recursive) {
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
    this.model.set('display', this.display);
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
  eventEnterScope: function (event, reason, callback) {
    throw new Error(this.className + ': eventEnterScope must be implemented');
  },

  /**
   * the Event changed from the Tree
   * @param event Event or eventId .. to be discussed
   */
  eventChange: function (event, reason, callback) {
    throw new Error(this.className + ': eventChange must be implemented');
  },

  /**
   * Event removed
   * @parma eventChange
   */
  eventLeaveScope: function (removed, reason, callback) {
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
