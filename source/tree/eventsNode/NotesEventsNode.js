var EventsNode = require('../EventsNode'),
    EventsView = require('../../view/events-views/notes/Model.js');

/**
 * Holder for EventsNode
 * @type {*}
 */
var NotesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'NotesEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
NotesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'note/txt' || eventType === 'note/text');
};


