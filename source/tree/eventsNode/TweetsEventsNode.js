/* global window */
var EventsNode = require('../EventsNode'),
  EventsView = require('../../view/events-views/tweet/Model.js'),
  _ = require('underscore'),
  DEFAULT_WEIGHT = 1;

/**
 * Holder for TweetsNode
 * @type {*}
 */
var TweetsEventsNode = module.exports = EventsNode.implement(
  function (parentStreamNode) {
    EventsNode.call(this, parentStreamNode);
  },
  {
    className: 'TweetsEventsNode',
    pluginView: EventsView,
    getWeight: function () {
      return DEFAULT_WEIGHT;
    }

  });

// we accept all kind of events
TweetsEventsNode.acceptThisEventType = function (eventType) {
  return (eventType === 'message/twitter');
};
try {
  Object.defineProperty(window.PryvBrowser, 'tweetWeight', {
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

