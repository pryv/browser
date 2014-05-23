/* global $, FormData, PryvBrowser */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Tweet',
  template: '#template-detail-content-tweet',
  itemViewContainer: '#detail-content',
  className: 'note-content',
  templateHelpers: {
    getUrl: function () {
      var id = this.event.content.id,
        screenName = this.event.content['screen-name'],
        date = new Date(this.event.time * 1000);
      return '<a href="https://twitter.com/' + screenName + '/status/' + id + '"' +
        'data-datetime="' + date.toISOString() + '">' +
          PryvBrowser.getTimeString(this.event.time) + '</a>';
    }
  },
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    return true;
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  }
});