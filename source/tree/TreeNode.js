/* global $, window */
var _ = require('underscore'),
  NodeView = require('../view/NodeView.js'),
  Backbone = require('backbone'),
  TreemapUtil = require('../utility/treemap.js');

/**
 * The model for all Nodes
 * @param parent
 * @constructor
 */
var DEFAULT_OFFSET = 18;
var DEFAULT_MARGIN = 2;
var DEFAULT_MIN_WIDTH = 550;
var DEFAULT_MIN_HEIGHT = 500;
var MAIN_CONTAINER_ID = 'tree';
var TreeNode = module.exports = function (treemap, parent) {
  //Init all the instance variables
  this.treeMap = treemap;
  this.parent = parent;
  this.uniqueId = _.uniqueId('node_');
  this.width = null;
  this.height = null;
  this.x = 0;
  this.y = 0;
  this.aggregated = false;
  this.view = null;
  this.model = null;
  this.offset = DEFAULT_OFFSET;
  this.margin = DEFAULT_MARGIN;
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
      this._refreshViewModel(false);
      this.view = new NodeView({model: this.model});
    }
    if (this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._createView();
      });
    }
  },
  _closeView: function (recursive) {
    if (recursive) {
      _.each(this.getChildren(), function (child) {
        child._closeView(recursive);
      });
    }
    if (this.view) {
      this.view.close();
      this.view = null;
    }
  },
  /**
   * Generate the size and position of each child of this node
   * @param x
   * @param y
   * @param width
   * @param height
   * @param recursive
   * @private
   */
  _generateChildrenTreemap: function (x, y, width, height, recursive) {
    if (window.PryvBrowser && window.PryvBrowser.customConfig) {
      this.minWidth = DEFAULT_MIN_WIDTH > 0 && DEFAULT_MIN_WIDTH <= 1 ?
        DEFAULT_MIN_WIDTH * $(window).width() : DEFAULT_MIN_WIDTH;
      this.minHeight = DEFAULT_MIN_HEIGHT > 0 && DEFAULT_MIN_HEIGHT <= 1 ?
        DEFAULT_MIN_HEIGHT * $(window).height() : DEFAULT_MIN_HEIGHT;
    }
    if (this.getWeight() === 0) {
      return;
    }
    if (this._needToAggregate() && !this.aggregated) {
      this._aggregate();
    }
    if (!this._needToAggregate() && this.aggregated) {
      this._desaggregate();
    }
    var children = this.getChildren();
    if (children) {
      // we need to normalize child weights by the parent weight
      var weight = this.getWeight();
      _.each(children, function (child) {
        child.normalizedWeight = (child.getWeight() / weight);
      }, this);

      // we squarify all the children passing a container dimension and position
      // no recursion needed
      var squarified =  TreemapUtil.squarify({
        x: x,
        y: y + this.offset,
        width: width,
        height: height - this.offset
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
  _needToAggregate: function () {
    this.aggregated = false;
    return this.aggregated;
  },
  _aggregate: function () {
    return;
  },
  _desaggregate: function () {
    return;
  },
  /** Render or close the view if needed
   For more performance we need to render or close views once all processing are done
   i.e: when eventLeaveScope is trigged and a eventsNode becomes empty if we close it right away
   it result with a unpleasant visual with div disappears randomly.
   So we need to close all the view at the same time.
   */
  renderView: function (recurcive) {
    /** If the node has no events to display (getWeight = 0) we close it **/
    if (this.getWeight() === 0) {
      this.aggregated = false; // Reset the aggregation to false;
      if (this.eventView) {
        this.eventView.close();
        this.eventView = null;
      }
      if (this.view) {
        this.view.close();
        this.view = null;
      }
    } else {
      // Test is the view is not already displayed and the view is not null
      if ($('#' + this.uniqueId).length === 0 && this.view) {
        this.view.renderView();
        // event listenner for focus on stream when clicked on it
        // i.e display only this stream when clicked on it
        this.view.on('headerClicked', function () {
          if (this.stream) {
            this.treeMap.focusOnStreams(this.stream);
          }
        }, this);
      }
    }
    if (recurcive) {
      _.each(this.getChildren(), function (child) {
        child.renderView(true);
      });
    }
  },
  /**
   * Refresh the model of the view and create it if there is no
   * If the model change this will automatically update the view thanks to backbone
   * @param recursive
   * @private
   */
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
    } else {
      // TODO For now empty nodes (i.e streams) are not displayed
      // but we'll need to display them to create event, drag drop ...
      /*if (this.getWeight() === 0) {
       if (this.model) {
       this.model.set('width', 0);
       this.model.set('height', 0);
       }
       return;
       } */
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
    }
    if (recursive && this.getChildren()) {
      _.each(this.getChildren(), function (child) {
        child._refreshViewModel(true);
      });
    }
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
  onDateHighLighted: function (time) {
    _.each(this.getChildren(), function (child) {
      child.onDateHighLighted(time);
    });
  },
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

try {
  window.PryvBrowser = _.extend({}, window.PryvBrowser);
  Object.defineProperty(window.PryvBrowser, 'minWidth', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_MIN_WIDTH = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      if (DEFAULT_MIN_WIDTH > 0 && DEFAULT_MIN_WIDTH <= 1) {
        return 'ratio: ' + DEFAULT_MIN_WIDTH + ' absolute: ' +
          DEFAULT_MIN_WIDTH * $(window).width();
      } else {
        return 'absolute: ' + DEFAULT_MIN_WIDTH;
      }
    }
  });
  Object.defineProperty(window.PryvBrowser, 'minHeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_MIN_HEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      if (DEFAULT_MIN_HEIGHT > 0 && DEFAULT_MIN_HEIGHT <= 1) {
        return 'ratio: ' + DEFAULT_MIN_HEIGHT + ' absolute: ' +
          DEFAULT_MIN_HEIGHT * $(window).height();
      } else {
        return 'absolute: ' + DEFAULT_MIN_HEIGHT;
      }
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}
