var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/generics/Model.js');


/**
 * Holder for EventsNode
 * @type {*}
 */
var GenericEventsNode = module.exports = EventsNode.implement(
  function (treemap, parentStreamNode) {
    EventsNode.call(this, treemap, parentStreamNode);
  },
  {
    className: 'GenericEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
GenericEventsNode.acceptThisEventType = function (/*eventType*/) {
  return true;
};

