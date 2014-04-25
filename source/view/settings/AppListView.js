/* global window, i18n, $*/
var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var _ = require('underscore');

var GridRow = Marionette.ItemView.extend({
  template: '#other-apps-item-settings-template',
  tagName: 'div',
  className: 'col-sm-6 col-md-4'
});



var App = Backbone.Model.extend({});

var AppList = Backbone.Collection.extend({
  model: App
});

var allList = new AppList([]);


// The grid view
module.exports = Marionette.CompositeView.extend({
  tagName: 'div',
  template: '#other-apps-list-settings-template',
  itemView: GridRow,
  connection: null,
  myAppsId: null,
  apps: null,
  initialize: function () {
    this.myAppsId = [];
    this.apps = [];
    var sync = false;
    this.collection =  this.options.collection || allList;
    this.listenTo(allList, 'change', this.debounceRender);
    this.connection = this.options.connection;
    if (this.connection) {
      this.connection.accesses.get(function (error, result) {
        if (error) {
          window.PryvBrowser.showAlert('.modal-content',
            i18n.t('error.manageApps.' + error.id));
        } else {
          result.forEach(function (access) {
            if (access.type === 'app') {
              this.myAppsId.push(access.name);
            }
          }.bind(this));
          if (sync) {
            this.showAppList();
          } else {
            sync = true;
          }
        }
      }.bind(this));
      var baseHref = $('base').attr('href');
      $.get(baseHref + 'locales/appList.json')
        .done(function (result) {
          result.forEach(function (app) {
            this.apps.push(app);
          }.bind(this));
          if (sync) {
            this.showAppList();
          } else {
            sync = true;
          }
        }.bind(this))
        .fail(function () {
          window.PryvBrowser.showAlert('.modal-content',
            i18n.t('error.manageApps.cannot-load-app-list'));
        });

    }
  },
  showAppList: function () {
    this.apps.forEach(function (app) {
      if (this.myAppsId.indexOf(app.id) === -1) {
        var m = new App({
          app: app
        });
        allList.add(m);
      }
    }.bind(this));
  },
  appendHtml: function (collectionView, itemView) {
    collectionView.$('#appList .panel-body').append(itemView.el);
  },
  onRender: function () {
    $('body').i18n();
  },
  reset: function () {
    this.collection.reset();
    allList.reset();
  },
  debounceRender: _.debounce(function () {
    this.render();
  }, 10)
});

