/* global $, i18n, window */
var Marionette = require('backbone.marionette'),
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
    this.connection = this.options.connection;
  },
  ui: {
    cancel: '#cancel',
    publish: '#publish',
    submit: '#publish',
    checkbox: 'input[type=checkbox]'
  },
  onRender: function () {
    this.bindUIElements();
    this.ui.submit.click(this.createSharing.bind(this));
  },
  createSharing: function (e) {
    e.preventDefault();
    var $btn = this.ui.publish;
    var $name = $('#input-name', this.$el),
      //$token = $('#input-token', this.$el),
      $permission = $('#input-global-permission', this.$el),
      $spin = $('.fa-spin', $btn);
    var access = {}, name = $name.val().trim(),
      //token = $token.val().trim(),
      permission = $permission.val();
    if (name.length === 0) {
      $('#form-create-sharing', this.$el).find(':submit').click();
      return;
    }
    if (permission !== 'read' && permission !== 'manage' && permission !== 'contribute') {
      permission = 'read';
    }
    access.name = name;
   // access.token = token;
    access.permissions = [];
    if ($spin) {
      $spin.show();
    }

    _.each($('#sharing-stream-list input[type=checkbox]'), function (checkbox) {
      var streamId = $($(checkbox).parent().parent()).attr('data-stream');
      if ($(checkbox).prop('checked') && streamId) {
        access.permissions.push({streamId : streamId, level: permission});
      }
    }.bind(this));



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
      this.trigger('sharing:createSuccess', { name: name, token: result.token });
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
    this.view = new Layout({connection: this.connection});
    this.view.on('close', this.close.bind(this));
    this.view.on('sharing:createSuccess', this.createSuccess.bind(this));
    this.createForm = new CreateFormView({connection: this.connection, streams: this.streams});
    this.view.render();
    this.view.createForm.show(this.createForm);
    $(this.view.regions.success).hide();
    $('body').i18n();
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
    }
  },
  createSuccess: function (params) {
    this.success = new SuccessView({connection: this.connection,
     token: params.token, name: params.name});
    $(this.view.regions.createForm).hide();
    $(this.view.regions.success).show();
    this.createForm.close();
    this.view.success.show(this.success);
    this.view.ui.publish.remove();
    this.view.ui.cancel.text(i18n.t('common.actions.close')).addClass('btn-primary');
  }
});