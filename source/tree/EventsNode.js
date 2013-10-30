var TreeNode = require('./TreeNode'),
  Backbone = require('backbone'),
  NodeView = require('../view/NodeView.js'),
  _ = require('underscore');

/*
 If you want to bypass the plugin detection system (i.e not use EventsView.js)
 just remove EventsView = require... above and add to all the Events typed node:
 var EventsView = require( {path to the plugin view} );  as a global var
 pluginView: EventsView, as an instance var
 to create the view just do: new this.pluginView(params);
 */
/**
 * Holder for EventsNode
 * @type {*}
 */
var EventsNode = module.exports = TreeNode.implement(
  function (parentStreamNode) {
    TreeNode.call(this, parentStreamNode);
    this.events = {};
    this.eventDisplayed = null;
    this.eventView = null;

  },
  {
    className: 'EventsNode',
    aggregated: false,
    getChildren: function () {
      return null;
    },

    eventEnterScope: function (event, reason, callback) {
      this.events[event.id] = event;
      if (!this.eventView) {
        this._createEventView();
      } else {
        this.eventView.eventEnter(event);
      }

      if (callback) {
        callback(null);
      }
    },
    eventLeaveScope: function (event, reason, callback) {
      delete this.events[event.id];
      if (this.eventView) {
        this.eventView.eventLeave(event);
      }
    },
    onDateHighLighted: function (time) {
      if (this.eventView) {
        this.eventView.OnDateHighlightedChange(time);
      }
    },
    /*jshint -W098 */
    eventChange: function (event, reason, callback) {
      throw new Error('EventsNode.eventChange No yet implemented' + event.id);
    },
    _createEventView: function () {
      this.eventView = new this.pluginView(this.events, {
        width: this.width,
        height: this.height,
        id: this.uniqueId
      });
    }

  });


EventsNode.acceptThisEventType = function () {
  throw new Error('EventsNode.acceptThisEventType nust be overriden');
};

