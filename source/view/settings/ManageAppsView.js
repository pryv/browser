/* global window, i18n, $, localStorage, location*/
var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var _ = require('underscore');

var GridRow = Marionette.ItemView.extend({
  template: '#apps-item-settings-template',
  tagName: 'tr',
  events: {
    'click .app-trash': '_onTrashClick'
  },
  _onTrashClick: function () {
    this.trigger('app:delete', this.model);
  }
});



var App = Backbone.Model.extend({});

var AppList = Backbone.Collection.extend({
  model: App
});

var allList = new AppList([]);


// The grid view
module.exports = Marionette.CompositeView.extend({
  tagName: 'div',
  template: '#apps-list-settings-template',
  itemView: GridRow,
  connection: null,

  initialize: function () {
    this.collection =  this.options.collection || allList;
    this.listenTo(allList, 'change', this.debounceRender);
    this.on('itemview:app:delete', this._onDeleteAppClick.bind(this));
    this.connection = this.options.connection;
    if (this.connection) {

      //var baseHref = $('base').attr('href');
      var domain = localStorage.getItem('domain') || 'pryv.me';
      var url = 'https://reg.' + domain + '/apps'; // TODO ?

      var apps = {};
      $.get(url)
        .done(function (result) {
          result = result.apps || [];
          result.forEach(function (app) {
            apps[app.id] = app;
          });

          this.connection.accesses.get(function (error, result) {
            if (error) {
              window.PryvBrowser.showAlert('.modal-content',
                i18n.t('error.manageApps.' + error.id));
            } else {
              result.forEach(function (access) {
                if (access.type === 'app') {
                  access.displayName = access.name;
                  if (apps[access.name]) {
                    access.displayName = apps[access.name].displayName;
                    access.settingsPageURL = apps[access.name].settingsPageURL;
                    if (apps[access.name].trustedConnection) {
                      access.settingsPageURL +=
                      '?username=' + this.connection.username + '&auth=' + this.connection.auth +
                      '&domain=' + this.connection.settings.domain + '&returnUrl=' + location.href;
                    }

                    access.iconURL = apps[access.name].iconURL;
                  }

                  var m = new App({
                    app: access
                  });
                  allList.add(m);
                }
              }.bind(this));
              this.debounceRender();
            }
          }.bind(this));

        }.bind(this))
        .fail(function () {
          window.PryvBrowser.showAlert('.modal-content',
            i18n.t('error.manageApps.cannot-load-app-list'));
        });




    }
  },
  appendHtml: function (collectionView, itemView) {
    collectionView.$('tbody').append(itemView.el);
  },
  _onDeleteAppClick: function (e, model) {
    this.connection.accesses.delete(model.get('app').id,
      function (err) {
        if (err) {
          // TODO: check actual error and handle it properly
          window.PryvBrowser.reportError(err, {
            component: 'connected apps',
            action: 'delete app access'
          });
          window.PryvBrowser.showAlert('.modal-content', i18n.t('common.messages.errUnexpected'));
          return;
        }
        allList.remove(model);
        this.debounceRender();
      }.bind(this));
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

