var TreeNode = require('./TreeNode'),
    Backbone = require('backbone'),
    EventsView = require('../view/events-view/EventsView.js'),
    _ = require('underscore');

/**
 * Holder for EventsNode
 * @type {*}
 */
var EventsNode = module.exports = TreeNode.implement(
  function (parentStreamNode) {
    TreeNode.call(this, parentStreamNode);
    this.events = {};

    this.eventDisplayed = null;
    this.eventModel = null;
    this.eventsNbr = 0;
    this.eventView = null;

  },
  {
    className: 'EventsNode',

    getChildren: function () {
      return null;
    },

    eventEnterScope: function (event, reason, callback) {
      this.events[event.id] = event;
      this.eventsNbr++;
      var parent = this.parent;
      while (parent) {
        parent.eventsNbr++;
        parent = parent.parent;
      }
      //temp hack
      if (this.className === 'PicturesEventsNode' || this.className === 'NotesEventsNode') {
        if (!this.eventView) {
         // console.log(this.uniqueId + ' create');
          this.eventView = new EventsView(this.events, this.width, this.height);
        } else {
          //console.log(this.uniqueId + ' modif');
          this.eventView.eventEnter(event);
        }
      }
      if (callback) {
        callback(null);
      }
    },

    eventLeaveScope: function (event, reason, callback) {
      delete this.events[event.id];
      this.eventsNbr--;
      var parent = this.parent;
      while (parent) {
        parent.eventsNbr--;
        parent = parent.parent;
      }
      if (this.eventsNbr === 0 && this.view) {
        this.view.close();
        this.view = null;
        parent = this.parent;
        if (parent.aggregated) {
          delete parent.eventsNodesAggregated[this.className];
        } else {
          delete parent.eventsNodes[this.className];
        }
        while (parent) {
          if (parent.eventsNbr === 0 && parent.view) {
            parent.view.close();
            parent.view = null;
          }
          parent = parent.parent;
        }
      }
      if (callback) {
        callback(null, this);
      }
    },
    /*jshint -W098 */
    eventChange: function (event, reason, callback) {
      throw new Error('EventsNode.eventChange No yet implemented' + event.id);
    }

  });


EventsNode.acceptThisEventType = function () {
  throw new Error('EventsNode.acceptThisEventType nust be overriden');
};

