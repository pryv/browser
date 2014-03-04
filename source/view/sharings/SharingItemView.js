var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  tagName: 'tr',
  template: '#template-sharingItemView',
  ui: {
    editName: '.sharing-edit-name',
    editNameInput: '.sharing-name .input-group input',
    editNameSpan: '.sharing-name .input-group span',
    editNameButton: '.sharing-name .input-group button',
    editNameSpinner: '.sharing-name .fa-spin'
  },
  events: {
    'click .sharing-trash': '_onTrashClick',
    'click i.sharing-edit-name': '_onEditNameClick'
  },

  initialize: function () {
    this.listenTo(this.model, 'change', this.render);

  },
  onRender: function () {
    this.ui.editNameInput.hide();
    this.ui.editNameSpan.hide();
    this.ui.editNameSpinner.hide();
    this.ui.editNameButton.click(this._onSaveClick.bind(this));
  },
  _onTrashClick: function () {
    this.trigger('sharing:delete', this.model);
  },
  _onEditNameClick: function () {
    this.ui.editName.hide();
    this.ui.editNameSpinner.hide();
    this.ui.editNameButton.removeClass('btn-danger').addClass('btn-default');
    this.ui.editNameInput.show();
    this.ui.editNameSpan.show();
  },
  _onSaveClick: function () {
    var val = this.ui.editNameInput.val().trim();
    if (val.length > 0) {
      this.model.get('sharing').oldName = this.model.get('sharing').name;
      this.model.get('sharing').name = val;
      this.ui.editNameSpinner.show();
      this.trigger('sharing:update', this);
    }
  },
  endUpdateSharing: function (error) {
    this.ui.editNameSpinner.hide();
    if (error) {
      this.ui.editNameButton.removeClass('btn-default').addClass('btn-danger');
      this.model.get('sharing').name = this.model.get('sharing').oldName;
    } else {
      this.ui.editNameInput.hide();
      this.ui.editNameSpan.hide();
      this.ui.editName.show();
      this.render();
    }
  }
});