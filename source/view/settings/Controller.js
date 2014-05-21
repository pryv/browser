/* global $ */
var Marionette = require('backbone.marionette'),
  NavView = require('./NavView.js'),
  PasswordView = require('./PasswordView.js'),
  ManageAppsView = require('../connect-apps/ManageAppsView.js'),
  AppListView = require('../connect-apps/AppListView.js'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#settings-modal-template',

  regions: {
    nav: '#settings-nav',
    password: '#settings-password',
    manageApps: '#settings-manage-apps',
    otherApps: '#settings-other-apps'
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
  this.appList = null;
  this.currentRegion = '';


};
_.extend(Controller.prototype, {
  show: function (region) {
    region = region || 'manageApps';
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.nav = new NavView();
    this.password = new PasswordView({connection: this.connection});
    this.manageApps = new ManageAppsView({connection: this.connection});
    this.appList = new AppListView({connection: this.connection});
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
      this.appList.reset();
    }
  },
  _showRegion: function (region) {
    if (region && this.view && region !== this.currentRegion) {
      this.password.close();
      this.manageApps.close();
      this.appList.close();
      switch (region) {
        case 'password':
          this.view.password.show(this.password);
          break;
        case 'manageApps':
          this.view.manageApps.show(this.manageApps);
          this.view.otherApps.show(this.appList);
          break;
        default:
          break;
      }
      this.currentRegion = region;
      $('body').i18n();
    }
  }
});
