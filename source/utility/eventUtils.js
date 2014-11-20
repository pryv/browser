var dateTime = require('./dateTime'),
    streamUtils = require('./streamUtils');

/**
 * To hold temporary refactored utility functions, until we have proper file structure with
 * fully separate modules for each event type (cf. https://trello.com/c/0P6lmhsS/299).
 */
var eventUtils = module.exports = {};

eventUtils.getActivityPreview = function (event) {
  var html =  '<span class="pins-color 1" style="background-color: ' +
      streamUtils.getColor(event.stream) + '"></span> ' +
      event.stream.name + '<br>';
  if (event.duration !== null) {
    html += dateTime.getDurationText(event.duration, {
      html: true,
      nbValues: 2
    });
  } else {
    html += '(running time)';
  }
  return html;
};
