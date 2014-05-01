/* global window, i18n, $*/
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


      var baseHref = $('base').attr('href');
      var apps = {};
      $.get(baseHref + 'locales/appList.json')
        .done(function (result) {
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
                    access.iconURL = apps[access.name].iconURL;
                  }

                  var m = new App({
                    app: access
                  });
                  allList.add(m);
                }
              }.bind(this));
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
      function (error) {
        if (!error) {
          allList.remove(model);
          this.debounceRender();
        } else {
          window.PryvBrowser.showAlert('.modal-content',
            i18n.t('error.createdSlice.delete.' + error.id));
          console.warn(error);
        }
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
