/* global $ */
var Marionette = require('backbone.marionette'),
    ManageAppsView = require('./ManageAppsView.js'),
    AppListView = require('./AppListView.js'),
    _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#apps-modal-template',

  regions: {
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
  this.manageApps = null;
  this.appList = null;


};
_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.manageApps = new ManageAppsView({connection: this.connection});
    this.appList = new AppListView({connection: this.connection});
    this.view.render();
    this.view.manageApps.show(this.manageApps);
    this.view.otherApps.show(this.appList);
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
  }
});
