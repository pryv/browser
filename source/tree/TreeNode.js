var _ = require('underscore');

/**
 * The model for all Nodes
 * @param parent
 * @constructor
 */
var TreeNode = module.exports = function (parent) {
  this.parent = parent;
  console.log('TreeNode ' + this.className + ':  created');
};


TreeNode.implement = function (constructor, members) {
  var result = constructor;
  if (typeof Object.create === 'undefined') {
    Object.create = function (prototype) {
      function C() { }
      C.prototype = prototype;
      return new C();
    };
  }
  result.prototype = Object.create(this.prototype);
  _.extend(result.prototype, members);
  return result;
};

_.extend(TreeNode.prototype, {
  className: 'TreeNode',
  /** TreeNode parent or null if rootNode **/

  //---------- visual rendering ------------//

  /**
   * render the View version A
   * @param height height of the Node
   * @param width width of the Node
   * @return A DOM Object, EventView..
   */
  renderView: function (h, w) {
    throw new Error(this.className + ': renderView must be implemented');
  },


  /**
   *
   * @return DOMNode the current Wrapping DOM object for this Node. If this TreeNode is not yet
   * rendered, or does not have a representation in the DOM it will return
   * getParent().currentWarpingDOMObject();
   */
  currentWrappingDOMObject: function () {
    if (this.parent === null) { return null; }

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
  eventEnterScope: function (event, reason) {
    throw new Error(this.className + ': eventEnterScope must be implemented');
  },

  /**
   * the Event changed from the Tree
   * @param event Event or eventId .. to be discussed
   */
  eventChange: function (event, reason) {
    throw new Error(this.className + ': eventChange must be implemented');
  },

  /**
   * Event removed
   * @parma eventChange
   */
  eventLeaveScope: function (removed, reason) {
    throw new Error(this.className + ': eventLeaveScope must be implemented');
  },


  //----------- debug ------------//
  _debugTree : function () {
    var me = { className : this.className };
    if (this.getChildren()) {
      me.children = [];
      _.each(this.getChildren(), function (child) {
        me.children.push(child._debugTree());
      });
    }
    return me;
  }
});
