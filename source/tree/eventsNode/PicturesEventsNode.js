var EventsNode = require('../EventsNode');

/**
 * Holder for EventsNode
 * @type {*}
 */
var PicturesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'PicturesEventsNode',
    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
PicturesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'picture/attached');
};


