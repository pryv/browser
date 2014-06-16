/* global $, moment, window, i18n */
var Marionette = require('backbone.marionette');
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
    editBtn: '#edit-button',
    editForm: '#edit-form',
    editOff: '#edit-off',
    editOn: '#edit-on',
    editDone: '#edit-done',
    saveSpin: '#edit-save .fa-spin',
    saveBtn: '#edit-save',
    editStream: '#edit-stream',
    editTime: '#edit-time',
    editTimePicker: '#edit-time-picker',
    editTags: '#edit-tags',
    editDescription: '#edit-description',
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
    this.ui.editBtn.bind('click', this.showEdit.bind(this));
    this.ui.editDone.bind('click', this.hideEdit.bind(this));
    this.ui.editForm.bind('submit', this.submit.bind(this));
    if ($('#modal-left-content').hasClass('editing')) {
      this.showEdit();
    } else {
      this.hideEdit();
    }
    this.ui.editTimePicker.datetimepicker({
      direction: 'auto',
      language: i18n.lng()
    });
    if (this.model.get('event')) {
      var evtDate = moment.unix(this.model.get('event').time);
      this.ui.editTimePicker.data('DateTimePicker').setDate(evtDate);
    }
    $('body').i18n();
  },
  showEdit: function () {
    $('#modal-left-content').addClass('editing');
    $('#modal-left-content').trigger('editing:on');
    this.ui.editOff.hide();
    this.ui.editOn.show();
  },
  hideEdit: function () {
    $('#modal-left-content').removeClass('editing');
    $('#modal-left-content').trigger('editing:off');
    this.ui.editOn.hide();
    this.ui.editOff.show();
  },
  submit: function (e) {
    e.preventDefault();
    this.ui.saveBtn.prop('disabled', true);
    this.ui.saveSpin.show();
    var event = this.model.get('event');
    var tags = this.ui.editTags.val();
    tags = tags.split(',');
    tags = tags.map(function (e) {return e.trim(); })
      .filter(function (e) {return e.length > 0; });
    event.tags = tags;
    event.description = this.ui.editDescription.val().trim();
    event.streamId = this.ui.editStream.val().trim();
    event.time = moment(this.ui.editTimePicker.data('DateTimePicker').getDate()).unix();
    this.model.set('event', event).save(function (err) {
      this.ui.saveBtn.prop('disabled', false);
      this.ui.saveSpin.hide();
      if (err) {
        window.PryvBrowser.showAlert('.modal-content', i18n.t('error.detailed.update.' + err.id));
      }
    }.bind(this));
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