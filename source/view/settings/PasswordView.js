/* global window, i18n */
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#password-settings-modal-template',
  ui: {
    form: 'form',
    save: 'button[type=submit]',
    spinner: '.fa-spinner',
    current: '#currentPassword',
    new: '#newPassword',
    reNew: '#reNewPassword'
  },
  onRender: function () {
    this.bindUIElements();
    this.ui.spinner.hide();
    this.ui.form.submit(this._onFormSubmit.bind(this));
  },
  _onFormSubmit: function (e) {
    e.preventDefault();
    var newPass = this.ui.new.val();
    var reNewPass = this.ui.reNew.val();
    var currentPass = this.ui.current.val();
    if (newPass && newPass.length > 0 && newPass === reNewPass) {
      this.ui.reNew.parent().parent().removeClass('has-error');
      this.ui.spinner.show();
      this.ui.save.prop('disabled', true);
      this.options.connection.account.changePassword(currentPass, newPass, function (error) {
        this.ui.spinner.hide();
        this.ui.save.prop('disabled', false);
        if (error) {
          console.warn(error);
          this.ui.save.addClass('btn-pryv-alizarin');
          window.PryvBrowser.showAlert('.modal-content',
            i18n.t('error.changePassword.' + error.id));
        }  else {
          this.ui.save.removeClass('btn-pryv-alizarin');
          this.ui.new.val('');
          this.ui.reNew.val('');
          this.ui.current.val('');
        }
      }.bind(this));
    } else {
      this.ui.reNew.parent().parent().addClass('has-error');
      window.PryvBrowser.showAlert('.modal-content',
        i18n.t('error.changePassword.pass-dont-match'));
    }
  }

});


