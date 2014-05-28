
/*var Marionette = require('backbone.marionette'),
  CreateFormView = require('./CreateFormView.js'),
  SuccessView = require('./SuccessView.js'),
  _ = require('underscore');


var Layout = Marionette.Layout.extend({
  template: '#create-sharings-modal-template',

  regions: {
    createForm: '#create-sharings-form',
    success: '#success-sharings'
  },
  initialize: function () {
    this.$el =  $('.modal-content');
  },
  ui: {
    cancel: '#cancel',
    publish: '#publish'
  },
  createSharing: function (e) {
    e.preventDefault();
    var $btn = this.ui.publish;
    var $name = $('#input-name', this.$el),
      $token = $('#input-token', this.$el),
      $permission = $('#input-global-permission', this.$el),
      $spin = $('.fa-spin', $btn);
    var access = {}, name = $name.val().trim(), token = $token.val().trim(),
      permission = $permission.val();
    if (name.length === 0) {
      $('#form-create-sharing', this.$el).find(':submit').click();
      return;
    }
    if (permission !== 'read' && permission !== 'manage' && permission !== 'contribute') {
      permission = 'read';
    }
    access.name = name;
    access.token = token;
    access.permissions = [];
    if ($spin) {
      $spin.show();
    }
    //TODO parse checkbox
   eachStream(this.collection, function (model) {
      if (model.get('checked')) {
        access.permissions.push({streamId : model.get('id'), level: permission});
      }
    });

    this.connection.accesses.create(access, function (error, result) {
      if ($spin) {
        $spin.hide();
      }

      if (error || result.message) {
        $btn.addClass('btn-pryv-alizarin');
        window.PryvBrowser.showAlert('.modal-content',
          i18n.t('slices.messages.errInvalidSharingToken'));
        return;
      }

      $btn.removeClass('btn-pryv-alizarin');
      this.trigger('sharing:createSuccess', { name: name, token: token });
    }.bind(this));
  }
});
var Controller = module.exports = function ($modal, connection, streams, timeFilter, target) {
  this.$modal = $modal;
  this.target = target;
  this.connection = connection;

  this.streams = streams;
  this.timeFrom = timeFilter[1];
  this.timeTo = timeFilter[0];
  this.container = '.modal-content';
  this.view = null;
  this.createForm = null;
  this.success = null;
};
_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.view.on('sharing:createSuccess', this.createSuccess.bind(this));
    this.createForm = new CreateFormView({connection: this.connection, streams: this.streams});
    this.view.render();
    this.view.createForm.show(this.createForm);
    $('body').i18n();
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
      this.createForm.reset();
      this.success.reset();
    }
  },
  createSuccess: function (params) {
    this.success = new SuccessView({connection: this.connection,
     token: params.token, name: params.name});
    this.createForm.close();
    this.view.success.show(this.success);
    this.view.ui.publish.remove();
    this.view.ui.cancel.text(i18n.t('common.actions.close')).addClass('btn-pryv-turquoise');
  }
});      */