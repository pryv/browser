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
      renderContent: function () {
        return this.renderContent(this.model.get('event').content);
      }.bind(this),
      renderAttachments: function () {
        return this.renderAttachments();
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
  renderAttachments: function () {
    var event =  this.model.get('event');
    var attachments = event.attachments;
    var html = '';
    if (attachments) {
      html += '<ul class="generic-attachments">';
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
  renderContent: function (content, cssExtraClass) {
    var classSuffix = cssExtraClass ? (' ' + cssExtraClass) : '';
    if (_.isBoolean(content)) {
      return this.renderSimpleValue(content, 'generic-bool' + classSuffix);
    } else if (_.isNumber(content)) {
      return this.renderSimpleValue(content, 'generic-num' + classSuffix);
    } else if (_.isString(content)) {
      return this.renderSimpleValue(content, 'generic-str' + classSuffix);
    } else if (_.isArray(content)) {
      return this.renderArray(content, 'generic-arr' + classSuffix);
    } else if (_.isObject(content)) {
      return this.renderObject(content, 'generic-obj' + classSuffix);
    } else {
      throw new Error('Unknown content type: ' + content);
    }
  },

  renderSimpleValue: function (value, cssClass) {
    return '<span class="' + cssClass + '">' + value + '</span>';
  },

  renderObject: function (obj, cssClass) {
    var res = '<ul class="' + cssClass + '">';
    _.each(obj, function (value, key) {
      res += '<li class="generic-prop">';
      res += '<span class="generic-prop-key">' + key + '</span>';
      res += this.renderContent(value, 'generic-prop-val');
      res += '</li>';
    }.bind(this));
    res += '</ul>';
    return res;
  },

  renderArray: function (arr, cssClass) {
    var res = '<ol class="' + cssClass + '">';
    _.each(arr, function (item) {
      res += '<li class="generic-arr-item">';
      res += this.renderContent(item);
      res += '</li>';
    }.bind(this));
    res += '</ol>';
    return res;
  }
});
