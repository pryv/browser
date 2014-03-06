/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Picture',
  tagName: 'div',
  className: 'full-height full-width',
  template: '#template-detail-content-picture',
  itemViewContainer: '#detail-content',
  addAttachmentContainer: '#add-attachment',
  addAttachmentId: 0,
  attachmentId: {},
  ui: {
    li: 'li.editable',
    edit: '.edit'
  },
  templateHelpers: function () {
    return {
      getSrc: function () {
        return this.getSrc();
      }.bind(this),
      getAlt: function () {
        return this.getAlt();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    $('#current-picture .fa-angle-left').click(function () {
      this.trigger('previous');
    }.bind(this));
    $('#current-picture .fa-angle-right').click(function () {
      this.trigger('next');
    }.bind(this));
    this.addAttachment();
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (e)	{
    var file = new FormData(),
      keys = this.model.get('event').attachments ? _.keys(this.model.get('event').attachments) :
        [e.target.files[0].name];
    e.target.disabled = true;
    file.append(keys[0].split('.')[0], e.target.files[0]);
    this.model.addAttachment(file);
  },
  getSrc: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return event.url + '/' + attachments[keys[0]].id + '?auth=' + event.connection.auth;
    } else {
      return '';
    }
  },
  getAlt: function () {
    var event = this.model.get('event'),
      attachments = event.attachments;
    if (attachments) {
      var keys = _.keys(attachments);
      return keys[0];
    } else {
      return '';
    }
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