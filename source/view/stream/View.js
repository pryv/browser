/* global $, window, i18n*/
var Marionette = require('backbone.marionette');



// The grid view
module.exports = Marionette.ItemView.extend({
  tagName: 'div',
  template: '#stream-config-template',
  newName: null,
  newColor: null,
  newParent: null,
  ui: {
    form: 'form',
    submitBtn: '#publish',
    submitSpinner: '#publish .fa-spinner',
    deleteBtn: '#delete',
    deleteSpinner: '#delete .fa-spinner',
    colorPicker: '#streamColor',
    name: '#streamName',
    parent: '#streamParent'
  },
  templateHelpers: function () {
    return {
      getColor: function () {
        return this.getColor(this.stream);
      }.bind(this),
      getStreamStructure: function () {
        return this.getStreamStructure();
      }.bind(this)
    };
  },
  initialize: function () {
    this.stream = this.model.get('stream');
  },
  afterRender: function () {
    $('body').i18n();
    this.ui.submitSpinner.hide();
    this.ui.deleteSpinner.hide();
    this.ui.submitBtn.prop('disabled', true);
    var that = this;
    this.ui.name.change(function () {
      this.newName = this.ui.name.val().trim();
      this.ui.submitBtn.prop('disabled', false);
    }.bind(this));
    this.ui.parent.change(function () {
      this.newParent = this.ui.parent.val();
      this.ui.submitBtn.prop('disabled', false);
    }.bind(this));
    this.ui.deleteBtn.click(function () {
      var mergeParent = false;
      var confirmDeleteMsg = i18n.t('stream.messages.confirmDelete');
      if (this.stream.parentId) {
        mergeParent = window.confirm(i18n.t('stream.messages.mergeParent'));
        if (mergeParent) {
          confirmDeleteMsg = i18n.t('stream.messages.confirmDeleteMerging');
        }
      }

      var confirm = window.confirm(confirmDeleteMsg);
      if (confirm) {
        this.ui.deleteBtn.prop('disabled', true);
        this.ui.deleteSpinner.show();
        this.stream.connection.streams.delete(this.stream.id, function (err) {
          this.ui.deleteSpinner.hide();
          if (err) {
            var errMsg = i18n.t('stream.common.messages.' + err.id) ||
                         i18n.t('common.messages.errUnexpected');
            window.PryvBrowser.showAlert(this.$el, errMsg);
          } else {
            this.stream.connection.streams.delete(this.stream.id, function (err) {
              this.ui.deleteSpinner.hide();
              if (err) {
                var errMsg = i18n.t('stream.common.messages.' + err.id) ||
                  i18n.t('common.messages.errUnexpected');
                window.PryvBrowser.showAlert(this.$el, errMsg);
              } else {
                this.onActionDone();
              }
            }.bind(this), !!mergeParent);
          }
        }.bind(this), !!mergeParent);
      }
    }.bind(this));
    this.ui.colorPicker.colpick({
      colorScheme: 'light',
      layout: 'hex',
      color: this.getColor(this.stream),
      onSubmit: function (hsb, hex, rgb, el) {
        $(el).css('background-color', '#' + hex);
        $(el).colpickHide();
        this.newColor = '#' + hex;
        that.ui.submitBtn.prop('disabled', false);
      }.bind(this)
    });
    this.ui.form.submit(function (e) {
      e.preventDefault();
      this.ui.submitSpinner.show();
      var update = {
        id: this.stream.id,
        name: this.newName || this.stream.name,
        parentId: this.newParent || this.stream.parentId
      };
      update.parentId = this.newParent === '_null' ? null : this.newParent;
      if (this.newColor) {
        update.clientData = this.stream.clientData || {};
        update.clientData['pryv-browser:bgColor'] = this.newColor;
      }
      this.stream.connection.streams.update(update, function (err) {

        this.ui.submitSpinner.hide();
        this.ui.submitBtn.prop('disabled', true);
        if (err) {
          var errMsg;
          switch (err.id) {
            case 'item-already-exists':
              errMsg = i18n.t('events.common.messages.errStreamNameAlreadyExists');
              break;
            default:
              errMsg = i18n.t('common.messages.errUnexpected');
              window.PryvBrowser.reportError(err, {
                component: 'stream config',
                action: 'stream edit'
              });
              break;
          }

          this.ui.submitBtn.prop('disabled', false);
          this.ui.submitBtn.addClass('btn-pryv-alizarin');
          window.PryvBrowser.showAlert(this.$el, errMsg);
        } else {
          this.onActionDone();
        }
      }.bind(this));
    }.bind(this));
  },
  onActionDone: function () {
    this.trigger('close');
    window.location.reload();
  },
  getColor: function (c) {
    if (typeof(c) === 'undefined' || !c) {
      return '';
    }
    if (typeof(c.clientData) !== 'undefined' &&
      typeof(c.clientData['pryv-browser:bgColor']) !== 'undefined') {
      return c.clientData['pryv-browser:bgColor'];
    }
    if (typeof(c.parent) !== 'undefined') {
      return this.getColor(c.parent);
    }
    return '';
  },

  getStreamStructure: function () {
    var rootStreams = this.stream.connection.datastore.getStreams(),
      parentId = this.stream.parentId,
      result = '';
    if (!parentId) {
      result += '<option selected="selected" value="_null">-</options>';
    } else {
      result += '<option value="_null">-</options>';
    }
    for (var i = 0; i < rootStreams.length; i++) {
      result += this._walkStreamStructure(rootStreams[i], 1, parentId);
    }
    return result;

  },
  _walkStreamStructure: function (stream, depth, parentId) {
    if (stream.id === this.stream.id) {
      return '';
    }
    var indentNbr = 4,
      result = '<option ';
    result += stream.id === parentId ? 'selected="selected" ' : '';
    result += 'value="' + stream.id + '" >';
    for (var i = 0; i < depth * indentNbr; i++) {
      result += '&nbsp;';
    }
    result += stream.name;
    result += '</option>';
    depth++;
    for (var j = 0; j < stream.children.length; j++) {
      result += this._walkStreamStructure(stream.children[j], depth, parentId);
    }
    return result;
  }
});
