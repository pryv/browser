var EventsNode = require('../EventsNode');

/**
 * Holder for EventsNode
 * @type {*}
 */
var GenericEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'GenericEventsNode',

    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
GenericEventsNode.acceptThisEventType = function (/*eventType*/) {
  return true;
};

