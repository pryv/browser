var EventsNode = require('../EventsNode'),
    EventsView = require('../../view/events-views/pictures/Model.js');

/**
 * Holder for EventsNode
 * @type {*}
 */
var PicturesEventsNode = module.exports = EventsNode.implement(
  function (treemap, parentStreamNode) {
    EventsNode.call(this, treemap, parentStreamNode);
  },
  {
    className: 'PicturesEventsNode',
    pluginView: EventsView,

    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
PicturesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'picture/attached');
};


