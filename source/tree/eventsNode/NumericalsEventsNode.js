/* global window */
var EventsNode = require('../EventsNode'),
  Pryv = require('pryv'),
  EventsView = require('../../view/events-views/numericals/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for EventsNode
 * @type {*}
 */
var NumericalsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'NumericalsEventsNode EventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
NumericalsEventsNode.acceptThisEventType = function (eventType) {
  return Pryv.eventTypes.isNumerical(eventType);
};

try {
  Object.defineProperty(window.PryvBrowser, 'numericalWeight', {
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

