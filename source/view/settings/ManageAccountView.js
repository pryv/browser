/* global window, i18n */
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#account-settings-modal-template',
  ui: {
    passwordForm: '#passwordForm',
    currentPass: '#currentPassword',
    newPass: '#newPassword',
    rePass: '#reNewPassword',
    emailForm: '#emailForm',
    newEmail: '#newEmail',
    save: 'button[type=submit]',
    spinner: '.fa-spinner'
  },
  onRender: function () {
    this.bindUIElements();
    this.ui.spinner.hide();
    this.ui.passwordForm.submit(this._onPasswordSubmit.bind(this));
    this.ui.emailForm.submit(this._onEmailSubmit.bind(this));
  },
  _onEmailSubmit: function (e) {
    e.preventDefault();

    this.ui.newEmail.parent().parent().removeClass('has-error');

    var newEmail = this.ui.newEmail.val();

    if (newEmail && newEmail.length > 0) {
      this.ui.spinner.show();
      this.ui.save.prop('disabled', true);
      
      this.options.connection.request({
        method: 'PUT',
        path: '/account',
        jsonData: {
          email: newEmail
        },
        callback: function (err) {
          this.ui.spinner.hide();
          this.ui.save.prop('disabled', false);
          if (err) {
            this.ui.save.addClass('btn-pryv-alizarin');
            var errMsg = i18n.t('settings.account.messages.errEmail');
            if (err.message) {
              errMsg += ' ' + err.message;
            }
            window.PryvBrowser.showAlert('.modal-content', errMsg);
          } else {
            this.ui.save.removeClass('btn-pryv-alizarin');
            this.ui.newEmail.val('');
            window.PryvBrowser.showSuccess('.modal-content',
              i18n.t('settings.account.messages.emailChanged'));
          }
        }.bind(this)
      });
    }
  },
  _onPasswordSubmit: function (e) {
    e.preventDefault();

    this.ui.currentPass.parent().parent().removeClass('has-error');
    this.ui.newPass.parent().parent().removeClass('has-error');
    this.ui.rePass.parent().parent().removeClass('has-error');

    var newPass = this.ui.newPass.val();
    var reNewPass = this.ui.rePass.val();
    var currentPass = this.ui.currentPass.val();

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
            errMsg = i18n.t('settings.account.messages.errCurrentPasswordInvalid');
            this.ui.currentPass.parent().parent().addClass('has-error');
            break;
          case 'invalid-parameters-format':
            errMsg = i18n.t('settings.account.messages.errPasswordRequirements');
            this.ui.newPass.parent().parent().addClass('has-error');
            break;
          default:
            errMsg = i18n.t('common.messages.errUnexpected');
            window.PryvBrowser.reportError(err, {
              component: 'settings.account',
              action: 'change password'
            });
            break;
          }
          this.ui.save.addClass('btn-pryv-alizarin');
          window.PryvBrowser.showAlert('.modal-content', errMsg);
          return;
        }

        this.ui.save.removeClass('btn-pryv-alizarin');
        this.ui.currentPass.val('');
        this.ui.newPass.val('');
        this.ui.rePass.val('');
        window.PryvBrowser.showSuccess('.modal-content',
         i18n.t('settings.account.messages.passwordChanged'));
      }.bind(this));
    } else {
      this.ui.rePass.parent().parent().addClass('has-error');
      window.PryvBrowser.showAlert('.modal-content',
        i18n.t('settings.account.messages.errPasswordsDontMatch'));
    }
  }
});


