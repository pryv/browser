/* global $, FormData */
var Marionette = require('backbone.marionette'),
    _ = require('underscore'),
    marked = require('marked');

module.exports = Marionette.ItemView.extend({
  type: 'Note',
  template: '#template-detail-content-note',
  itemViewContainer: '#detail-content',
  className: 'note-content',
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  templateHelpers: function () {
    return {
      getContent: function () {
        return marked(this.model.get('event').content);
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    $('body').i18n();
  },
  onEditClick: function (e) {
    $('#submit-edit').show();
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
      value = $($elem).val();
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();

  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  }
});