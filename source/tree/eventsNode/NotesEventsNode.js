/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/notes/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var NotesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'NotesEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
NotesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'note/txt' || eventType === 'note/text');
};
try {
  Object.defineProperty(window.PryvBrowser, 'noteWeight', {
    set: function (value) {
      value = +value;
      if (_.isFinite(value)) {
        this.customConfig = true;
        DEFAULT_WEIGHT = value;
        if (_.isFunction(this.refresh)) {
          this.refresh();
        }
      }
    },
    get: function () {
      return DEFAULT_WEIGHT;
    }
  });
} catch (err) {
  console.warn('cannot define window.PryvBrowser');
}

