/* global $ */
var Marionette = require('backbone.marionette'),
  NavView = require('./NavView.js'),
  PasswordView = require('./PasswordView.js'),
  ManageAppsView = require('./ManageAppsView.js'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#settings-modal-template',

  regions: {
    nav: '#settings-nav',
    password: '#settings-password',
    manageApps: '#settings-manage-apps'
  },
  initialize: function () {
    this.$el =  $('.modal-content');
  }
});
var Controller = module.exports  = function ($modal, connection, target) {
  this.connection = connection;
  this.$modal = $modal;
  this.target = target;
  this.view  = null;
  this.nav = null;
  this.password = null;
  this.manageApps = null;
  this.currentRegion = '';


};
_.extend(Controller.prototype, {
  show: function (region) {
    region = region || 'password';
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.nav = new NavView();
    this.password = new PasswordView({connection: this.connection});
    this.manageApps = new ManageAppsView({connection: this.connection});
    this.view.render();
    this.view.nav.show(this.nav);
    this._showRegion(region);
    this.nav.activeRegion(region);
    this.nav.on('showRegion', this._showRegion.bind(this));
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
      this.manageApps.reset();
    }
  },
  _showRegion: function (region) {
    var regionView;
    if (region && this.view && region !== this.currentRegion) {
      switch (region) {
        case 'password':
          regionView = this.password;
          break;
        case 'manageApps':
          regionView = this.manageApps;
          break;
        default:
          break;
      }
      if (region) {
        this.currentRegion = region;
        this.password.close();
        this.manageApps.close();
        this.view[region].show(regionView);
        $('body').i18n();
      }
    }
  }
});
