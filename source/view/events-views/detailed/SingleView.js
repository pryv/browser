/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  container: '.modal-content',
  itemViewContainer: '#modal-left-content',
  ui: {
    li: 'li',
    edit: '.edit'
  },
  templateHelpers: function () {
    return {
      showContent: function () {
        return this.objectToHtml('content', this.model.get('event').content, 'content');
      }.bind(this)
    };
  },
  initialize: function () {
    if ($('.modal-panel-left').length === 0) {
      /*jshint -W101 */
      $(this.container).append('<div class="modal-panel-left"><div id="modal-left-content"></div></div>');
    }
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
    }
  },
  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
    key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
    value = $($elem).val().trim();
    if (key === 'time') {
      value = new Date(value);
      if (isNaN(value)) {
        // TODO input is not a date decide what to do
        return;
      }
      value = value.getTime() / 1000;
    }
    eval('event.' + key + ' = value');
    this.model.set('event', event).save();
    this.completeEdit($($elem).parent());
    this.render();
  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  objectToHtml: function (key, object, id) {
    var result = '';
    if (_.isObject(object)) {
      result += '<ul>' + key;
      _.each(_.keys(object), function (k) {
        result += this.objectToHtml(k, object[k], id + '-' + k);
      }.bind(this));
      result += '</ul>';
      return result;
    } else {
      return '<li id="current-' + id + '">' + key + ': <label>' + object + '</label>' +
        '<input class="edit" id="edit-' + id + '" value="' + object + '"></li>';
    }
  }
});