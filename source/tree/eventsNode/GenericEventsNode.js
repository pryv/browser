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
    weight: 1,


    incrementWeight: function() {
      this.weight++;
    },
    getWeight: function () {
      return this.weight;
    }

  });

// we accept all kind of events
GenericEventsNode.acceptThisEventType = function (/*eventType*/) {
  return true;
};

