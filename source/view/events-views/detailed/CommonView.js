/* global $, FormData, window, i18n */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  itemViewContainer: '#detail-common',
  tagName: 'div',
  id: 'detail-full',
  // addAttachmentContainer: '#add-attachment',
  waitSubmit: false,
  // addAttachmentId: 0,
  // attachmentId: {},
  ui: {
    li: 'li.editable',
    edit: '.edit',
    submit: '#submit-edit',
    submitSpin: '#submit-edit .fa-spin',
    trash: '#trash-edit',
    trashSpin: '#trash-edit .fa-spin'
  },
  templateHelpers: function () {
    return {
      getStreamStructure: function () {
        return this.getStreamStructure();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    //  this.addAttachment();
    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
    this.ui.submit.bind('click', this.submit.bind(this));
    this.ui.trash.bind('click', this.trash.bind(this));
    this.ui.submit.hide();
    $('body').i18n();
  },
  onEditClick: function (e) {
    this.ui.submit.show();
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    this.ui.submit.show();
    if (e.relatedTarget.id === 'submit-edit') {
      this.submit();
    }
    return true;
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
      this.ui.submit.show();
    }
  },

  /* jshint -W098, -W061 */
  updateEvent: function ($elem) {
    var event = this.model.get('event'),
      key = ($($elem).attr('id')).replace('edit-', '').replace('-', '.'),
      value = $($elem).val().trim();
    console.log('DEBUG', key, value);
    if (key === 'time') {
      value = new Date(value);
      if (isNaN(value)) {
        // TODO input is not a date decide what to do
        return;
      }
      value = value.getTime() / 1000;
    } else if (key === 'tags') {
      value = value.split(',');
      value = value.map(function (e) {
        return e.trim();
      });
    }
    eval('event.' + key + ' = value');
    this.completeEdit($($elem).parent());
    this.render();
    if (key === 'streamId') {
      $('#current-streamId label').text($('#edit-streamId option:selected').text().trim());
    }
    if (this.waitSubmit) {
      this.waitSubmit = false;
      this.submit();
    }
  },
  submit: _.throttle(function () {
    if ($('.editing').length !== 0) {
      this.waitSubmit = true;
      return;
    }
    var event = this.model.get('event');
    this.ui.submitSpin.show();
    this.ui.submit.prop('disabled', true);
    if (event.id) {
      this.model.set('event', event).save(function (err) {
        this.ui.submit.prop('disabled', false);
        this.ui.submitSpin.hide();
        if (err) {
          window.PryvBrowser.showAlert('.modal-content', i18n.t('error.detailed.update.' + err.id));
        }
      }.bind(this));
    } else if (event.connection && event.type && event.streamId) {
      this.model.set('event', event).create(function (err) {
        this.ui.submit.prop('disabled', false);
        this.ui.submitSpin.hide();
        if (err) {
          window.PryvBrowser.showAlert('.modal-content', i18n.t('error.detailed.create.' + err.id));
        }
      }.bind(this));
    } else {

      console.err('Creation event failed, missing valid properties', event);
    }
  }, 5 * 1000),

  trash: function () {
    this.ui.trashSpin.show();
    this.ui.trash.prop('disabled', true);
    this.model.trash(function (err) {
      this.ui.trash.prop('disabled', false);
      if (err) {
        window.PryvBrowser.showAlert('.modal-content', i18n.t('error.detailed.trash.' + err.id));
      }
      this.ui.trashSpin.hide();
    }.bind(this));
  },
  completeEdit: function ($elem) {
    $($elem).removeClass('editing');
  },
  getStreamStructure: function () {
    var rootStreams = this.model.get('event').connection.datastore.getStreams(),
      currentStreamId = this.model.get('event').streamId,
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      result += this._walkStreamStructure(rootStreams[i], 0, currentStreamId);
    }
    return result;

  },
  _walkStreamStructure: function (stream, depth, currentStreamId) {
    var indentNbr = 4,
      result = '<option ';
    result += stream.id === currentStreamId ? 'selected="selected" ' : '';
    result += 'value="' + stream.id + '" >';
    for (var i = 0; i < depth * indentNbr; i++) {
      result += '&nbsp;';
    }
    result += stream.name;
    result += '</option>';
    depth++;
    for (var j = 0; j < stream.children.length; j++) {
      result += this._walkStreamStructure(stream.children[j], depth, currentStreamId);
    }
    return result;
  }
});