/* global window */
var EventsNode = require('../EventsNode'),
  _ = require('underscore'),
  EventsView = require('../../view/events-views/generics/Model.js');


/**
 * Holder for EventsNode
 * @type {*}
 */
var DEFAULT_WEIGHT = 1;
var GenericEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'GenericEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
GenericEventsNode.acceptThisEventType = function (/*eventType*/) {
  return true;
};
try {
  Object.defineProperty(window.PryvBrowser, 'genericWeight', {
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
