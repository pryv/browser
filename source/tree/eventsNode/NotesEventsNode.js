var EventsNode = require('../EventsNode');


/**
 * Holder for EventsNode
 * @type {*}
 */
var NotesEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    pluginViewName: 'Notes',
    className: 'NotesEventsNode',
    getWeight: function () {
      return 1;
    }

  });

// we accept all kind of events
NotesEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'note/txt');
};


