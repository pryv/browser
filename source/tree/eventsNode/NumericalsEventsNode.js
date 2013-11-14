var EventsNode = require('../EventsNode'),
    EventsView = require('../../view/events-views/numericals/Model.js');

/**
 * Holder for EventsNode
 * @type {*}
 */
var NumericalsEventsNode = module.exports = EventsNode.implement(
  function (treemap, parentStreamNode) {
    EventsNode.call(this, treemap, parentStreamNode);
  },
  {
    className: 'NumericalsEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return 1;
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
    eventTypeClass === 'volume'
    );
};


