/* global $ */
var Marionette = require('backbone.marionette'),
    eventUtils = require('../../../../utility/eventUtils');

module.exports = Marionette.ItemView.extend({
  type: 'Activity',
  template: '#template-detail-content-activity',
  itemViewContainer: '#detail-content',
  className: 'activity-content',
  templateHelpers: function () {
    return {
      getContent: function () {
        return eventUtils.getActivityPreview(this.model.get('event'));
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
  }
});
