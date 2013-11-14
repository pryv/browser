var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/positions/Model.js');

/**
 * Holder for EventsNode
 * @type {*}
 */
var PositionsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'PositionsEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
PositionsEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'position/wgs84');
};


