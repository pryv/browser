/* global window */
var EventsNode = require('../EventsNode'),
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
  var eventTypeClass = eventType.split('/')[0];
  return (
    eventTypeClass === 'money' ||
      eventTypeClass === 'absorbed-dose' ||
      eventTypeClass === 'absorbed-dose-equivalent' ||
      eventTypeClass === 'absorbed-dose-rate' ||
      eventTypeClass === 'absorbed-dose-rate' ||
      eventTypeClass === 'area' ||
      eventTypeClass === 'capacitance' ||
      eventTypeClass === 'catalytic-activity' ||
      eventTypeClass === 'count' ||
      eventTypeClass === 'data-quantity' ||
      eventTypeClass === 'density' ||
      eventTypeClass === 'dynamic-viscosity' ||
      eventTypeClass === 'electric-charge' ||
      eventTypeClass === 'electric-charge-line-density' ||
      eventTypeClass === 'electric-current' ||
      eventTypeClass === 'electrical-conductivity' ||
      eventTypeClass === 'electromotive-force' ||
      eventTypeClass === 'energy' ||
      eventTypeClass === 'force' ||
      eventTypeClass === 'length' ||
      eventTypeClass === 'luminous-intensity' ||
      eventTypeClass === 'mass' ||
      eventTypeClass === 'mol' ||
      eventTypeClass === 'power' ||
      eventTypeClass === 'pressure' ||
      eventTypeClass === 'speed' ||
      eventTypeClass === 'temperature' ||
      eventTypeClass === 'time' ||
      eventTypeClass === 'volume'
    );
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

