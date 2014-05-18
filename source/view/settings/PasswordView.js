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

    this.ui.current.parent().parent().removeClass('has-error');
    this.ui.new.parent().parent().removeClass('has-error');
    this.ui.reNew.parent().parent().removeClass('has-error');

    var newPass = this.ui.new.val();
    var reNewPass = this.ui.reNew.val();
    var currentPass = this.ui.current.val();

    if (newPass && newPass.length > 0 && newPass === reNewPass) {
      this.ui.spinner.show();
      this.ui.save.prop('disabled', true);
      this.options.connection.account.changePassword(currentPass, newPass, function (err) {
        this.ui.spinner.hide();
        this.ui.save.prop('disabled', false);
        if (err) {
          var errMsg;
          switch (err.id) {
          case 'invalid-operation':
            errMsg = i18n.t('settings.security.messages.errCurrentPasswordInvalid');
            this.ui.current.parent().parent().addClass('has-error');
            break;
          case 'invalid-parameters-format':
            errMsg = i18n.t('settings.security.messages.errPasswordRequirements');
            this.ui.new.parent().parent().addClass('has-error');
            break;
          default:
            errMsg = i18n.t('common.messages.errUnexpected');
            window.PryvBrowser.reportError(err, {
              component: 'settings.security',
              action: 'change password'
            });
            break;
          }
          this.ui.save.addClass('btn-pryv-alizarin');
          window.PryvBrowser.showAlert('.modal-content', errMsg);
          return;
        }

        this.ui.save.removeClass('btn-pryv-alizarin');
        this.ui.current.val('');
        this.ui.new.val('');
        this.ui.reNew.val('');
      }.bind(this));
    } else {
      this.ui.reNew.parent().parent().addClass('has-error');
      window.PryvBrowser.showAlert('.modal-content',
        i18n.t('settings.security.messages.errPasswordsDontMatch'));
    }
  }

});


