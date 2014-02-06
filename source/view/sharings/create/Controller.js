/* global $, FB, twttr */
var Backbone = require('backbone'),
    Marionette = require('backbone.marionette'),
    _ = require('underscore');
// The recursive tree view
var slugMe = function (value) {
  var rExps = [
    {re: /[\xC0-\xC6]/g, ch: 'A'},
    {re: /[\xE0-\xE6]/g, ch: 'a'},
    {re: /[\xC8-\xCB]/g, ch: 'E'},
    {re: /[\xE8-\xEB]/g, ch: 'e'},
    {re: /[\xCC-\xCF]/g, ch: 'I'},
    {re: /[\xEC-\xEF]/g, ch: 'i'},
    {re: /[\xD2-\xD6]/g, ch: 'O'},
    {re: /[\xF2-\xF6]/g, ch: 'o'},
    {re: /[\xD9-\xDC]/g, ch: 'U'},
    {re: /[\xF9-\xFC]/g, ch: 'u'},
    {re: /[\xC7-\xE7]/g, ch: 'c'},
    {re: /[\xD1]/g, ch: 'N'},
    {re: /[\xF1]/g, ch: 'n'}
  ];
  for (var i = 0, len = rExps.length; i < len; i++) {
    value = value.replace(rExps[i].re, rExps[i].ch);
  }
  return value.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/\-{2,}/g, '-');
};
var eachStream = function (collection, callback) {
  collection.each(function (model) {
    if (_.isFunction(callback)) {
      callback(model);
    }
    if (model.children) {
      eachStream(model.children, callback);
    }
  });
};
var TreeView = Marionette.CompositeView.extend({
  template: '#node-template',
  tagName: 'ul',
  ui: {
    checkbox: '.input-checkbox'
  },
  initialize: function () {
    // grab the child collection from the parent model
    // so that we can render the collection as children
    // of this parent node
    this.collection = this.model.children;
    this.listenTo(this.model, 'change', this.render);
  },
  appendHtml: function (collectionView, itemView) {
    // ensure we nest the child list inside of 
    // the current list item
    collectionView.$('li:first').append(itemView.el);
  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    this.ui.checkbox.click(this.toggleCheck.bind(this));
  },
  toggleCheck: function () {
    this.model.set('checked', !this.model.get('checked'));
    this.collection.each(function (model) {
      model.set('checked', this.model.get('checked'));
    }.bind(this));
  }
});

// The tree's root: a simple collection view that renders 
// a recursive tree structure for each item in the collection
var TreeRoot = Marionette.CollectionView.extend({
  itemView: TreeView,
  id: 'create-sharing',
  className: 'container',
  onRender: function () {
    var dateFrom = new Date(this.options.timeFrom * 1000);
    var dateTo = new Date(this.options.timeTo * 1000);
    function toDateInputValue(date) {
      var local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 10);
    }
    this.$el.prepend('<h1>Create sharing</h1>' +
      '<form role="form" id="form-create-sharing"' +
      '<div class="form-horizontal">' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<input type="text" class="form-control" id="input-name" placeholder="Name">' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<input type="text" class="form-control" id="input-token" placeholder="Token">' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<select class="form-control" id="input-global-permission">' +
      '  <option value ="">Permission for all stream</option>' +
      '  <option value="read">Read</option>' +
      '  <option value="contribute">Contribute</option>' +
      '  <option value="manage">Manage</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="form-inline">' +
      '<div class="form-group">' +
      '<input type="date" class="form-control" id="input-from-date" ' +
      'value="' + toDateInputValue(dateFrom) + '" disabled>' +
      '</div>' +
      '<div class="form-group">' +
      '<input type="time" class="form-control" id="input-from-time" ' +
      'value="' + dateFrom.toLocaleTimeString() + '" disabled>' +
      '</div>' +
      '<label> < --- > </label>' +
      '<div class="form-group">' +
      '<input type="date" class="form-control" id="input-to-date" ' +
      'value="' + toDateInputValue(dateTo) + '" disabled>' +
      '</div>' +
      '<div class="form-group">' +
      '<input type="time" class="form-control" id="input-to-time" ' +
      'value="' + dateTo.toLocaleTimeString() + '" disabled>' +
      '</div>' +
      '</div>' +
      '');
    this.$el.append('<div class="form-group">' +
      '<button type="submit" class="btn btn-primary">Create</button>' +
      '</div>' +
      '</form>');
    var $form = $('#form-create-sharing', this.$el),
      $name = $('#input-name', this.$el),
      $token = $('#input-token', this.$el),
      $permission = $('#input-global-permission', this.$el),
      $btn = $('button', this.$el);
    function createSharing(e) {
      e.preventDefault();
      var access = {}, name = $name.val(), token = $token.val(), permission = $permission.val();
      if (permission !== 'read' || permission !== 'manage' || permission !== 'contribute') {
        permission = 'read';
      }
      access.name = name;
      access.token = token;
      access.permissions = [];
      eachStream(this.collection, function (model) {
        if (model.get('checked')) {
          access.permissions.push({streamId : model.get('id'), level: permission});
        }
      });
      this.options.connection.accesses.create(access, function (error, result) {
        if (error || result.message) {
          $btn.removeClass('btn-primary');
          $btn.addClass('btn-danger');
        } else {
          $btn.removeClass('btn-primary');
          $btn.addClass('btn-success');
          this.trigger('sharing:createSuccess', result.token);
        }
      }.bind(this));
    }
    $form.submit(createSharing.bind(this));
    $btn.click(createSharing.bind(this));
    $name.bind('change paste keyup', function () {
      $token.val(slugMe($name.val()));
    });
  }
});
var TreeNode = Backbone.Model.extend({
  defaults : {
    checked: true
  },
  initialize: function () {
    var children = this.get('children');
    if (children) {
      this.children = new TreeNodeCollection(children);
      this.unset('children');
    }
  }
});
var TreeNodeCollection = Backbone.Collection.extend({
  model: TreeNode
});
var Controller = module.exports = function ($modal, connection, streams, timeFilter) {
  this.$modal = $modal;
  this.connection = connection;
  this.streams = streams;
  this.timeFrom = timeFilter[1];
  this.timeTo = timeFilter[0];
  this.container = '.modal-content';
  this.treeView = null;
};
Controller.prototype.show = function () {
  this.$modal.modal();
  var tree = new TreeNodeCollection(this.streams);
  this.treeView = new TreeRoot({
    collection: tree,
    timeFrom: this.timeFrom,
    timeTo: this.timeTo,
    connection: this.connection
  });
  this.treeView.render();
  $(this.container).html(this.treeView.el);
  this.treeView.on('sharing:createSuccess', function (token) {
    $(this.container).empty();
    var url = this.connection.id.replace(/\?auth.*$/, '');
    url += '#/sharings/' + token;
    $(this.container).html('<div class="container"><h1>Share</h1>' +
      '<p>Your sharing was successfully created, share it or give this url: </p>' +
      '<p><a href="' + url + '">' + url + '</a></p>' +
      '<p class="text-center share">' +
      '<a href="mailto:?subject=Sharing from PrYv&amp;body=Here is a sharing for you: ' + url +
      '" title="Share by Email">' +
      '<img src="./images/mail-24.png"/></a>' +
      '<a href="https://twitter.com/share" class="twitter-share-button"' +
      ' data-url="' + url + '" data-via="pryv" data-count="none">Tweet</a>' +
      '<fb:share-button href="' + url + '" ' +
      ' type="button"></fb:share-button></p></div>');
    FB.XFBML.parse($('.share').get(0));
    twttr.widgets.load();

  }.bind(this));
};
Controller.prototype.close = function () {
  this.treeView.close();
  $(this.container).empty();
};