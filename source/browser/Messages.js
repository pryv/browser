
var Messages = module.exports = { };

var SignalEmitter = require('pryv').Utility.SignalEmitter;


Messages.BrowserFilter = {
  UNREGISTER_LISTENER : SignalEmitter.Messages.UNREGISTER_LISTENER,
  SIGNAL : {
    /** called when a batch of changes is expected, content: <batchId> unique**/
    BATCH_BEGIN : SignalEmitter.Messages.BATCH_BEGIN,
    /** called when a batch of changes is done, content: <batchId> unique**/
    BATCH_DONE : SignalEmitter.Messages.BATCH_DONE,

    /** called when some streams are hidden, content: Array of Stream**/
    STREAM_HIDE : 'hideStream',
    STREAM_SHOW : 'hideShow',
    /** called when events Enter Scope, content: {reason: one of .., content: array of Event }**/
    EVENT_SCOPE_ENTER : 'eventEnterScope',
    EVENT_SCOPE_LEAVE : 'eventLeaveScope',
    EVENT_CHANGE : 'eventChange'
  },
  REASON : {
    EVENT_SCOPE_ENTER_ADD_CONNECTION : 'connectionAdded',
    EVENT_SCOPE_LEAVE_FOCUS_ON_STREAM : 'focusOnStream',
    // may happend when several refresh requests overlaps
    FORCE : 'forced'
  }
};