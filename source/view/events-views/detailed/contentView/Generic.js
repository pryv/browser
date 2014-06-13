/* global $, FormData */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

module.exports = Marionette.ItemView.extend({
  type: 'Generic',
  template: '#template-detail-content-generic',
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
      showContent: function () {
        return this.objectToHtml(null, this.model.get('event').content, 'content');
      }.bind(this),
      showAttachment: function () {
        return this.showAttachment();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    //this.addAttachment();
//    this.ui.li.bind('dblclick', this.onEditClick.bind(this));
//    this.ui.edit.bind('blur', this.onEditBlur.bind(this));
//    this.ui.edit.bind('keypress', this.onEditKeypress.bind(this));
//    _.each(_.keys(this.attachmentId), function (k) {
//      $('#' + k + ' i').bind('click', { id: k, fileName: this.attachmentId[k] },
//        this._onRemoveFileClick.bind(this));
//    }.bind(this));
  },
  onEditClick: function (e) {
    $(e.currentTarget).addClass('editing');
    this.ui.edit.focus();
  },
  onEditBlur: function (e) {
    this.updateEvent(e.currentTarget);
    if (e.relatedTarget && e.relatedTarget.id === 'submit-edit') {
      this.submit();
    }
    return true;
  },
  onEditKeypress: function (e) {
    var ENTER_KEY = 13;
    if (e.which === ENTER_KEY) {
      this.updateEvent(e.currentTarget);
    }
  },
  addAttachment: function () {
    var id = 'attachment-' + this.addAttachmentId;
    var html = '<li><input type="file" id="' + id + '"></li>';
    this.addAttachmentId++;
    $(this.addAttachmentContainer).append(html);
    $('#' + id).bind('change', this._onFileAttach.bind(this));
  },
  _onFileAttach : function (event)	{
    var file = new FormData();
    event.target.disabled = true;
    file.append('attachment-0', event.target.files[0]);
    this.model.addAttachment(file);
    this.addAttachment();
  },
  showAttachment: function () {
    var event =  this.model.get('event');
    var attachments = event.attachments;
    var html = '';
    if (attachments) {
      html += '<h5>File(s)</h5>';
      html += '<ul>';
      var keys = _.keys(attachments);
      var href = event.url + '/' + attachments[keys[0]].id + '/' +
        attachments[keys[0]].fileName + '?readToken=' + attachments[keys[0]].readToken;
      html += '<li id="' + keys[0] + '"> <a href="' + href + '" target="_blank">' +
        '<span class="fa fa-paperclip"></span> ' + attachments[keys[0]].fileName + '</a></li>';
      this.attachmentId[keys[0]] = attachments[keys[0]].fileName;
     /* _.each(_.keys(attachments), function (k) {
        html += '<li id="' + k + '">' + k + ': <a href="' + href + '" target="_blank"> ' +
          attachments[k].fileName + '</a>  <i class="delete"></i> </li>';
        this.attachmentId[k] = attachments[k].fileName;
      }.bind(this));  */
      html += '</ul>';
    } else {
      return '';
    }
    return html;
  },
  _onRemoveFileClick: function (event) {
    this.model.removeAttachment(event.data.fileName, function () {
      $('#' + event.data.id + ' i').off();
      $('#' + event.data.id).remove();
      delete this.attachmentId[event.data.id];
    }.bind(this));
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
  },
  objectToHtml: function (key, value, id) {
    if (! value) {
      return '';
    }
    var result = '';
    if (! key) { // HACK: i.e. is root
      result += '<h5>Content</h5>';
    }
    if (_.isObject(value)) {
      if (key) {
        result += '<strong>' + key + '</strong>';
      }
      result += '<ul>';
      _.each(_.keys(value), function (k) {
        var subId = id + '-' + k;
        result += '<li class="editable" id="current-' + subId + '">' +
            this.objectToHtml(k, value[k], subId) +
            '</li>';
      }.bind(this));
      result += '</ul>';
    } else {
      if (key) {
        result += '<span class="obj-key">' + key + ':</span> ';
      }
      result += '<label>' + value + '</label>'; // removed input here, wasn't usable anyway
    }
    return result;
  }
});
