/* global $ */
var Backbone = require('backbone'),
    Marionette = require('backbone.marionette'),
    _ = require('underscore');
// The recursive tree view
/*var slugMe = function (value) {
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
};  */
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
  tagName: 'details',
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
    collectionView.$('summary:first').after(itemView.el);
  },
  onRender: function () {
    this.ui.checkbox[0].checked = this.model.get('checked');
    this.ui.checkbox.click(this.toggleCheck.bind(this));
  },
  toggleCheck: function () {
    var checked = !this.model.get('checked');
    this.model.set('checked', checked);
    eachStream(this.collection, function (model) {
      model.set('checked', checked);
    });
  }
});

// The tree's root: a simple collection view that renders 
// a recursive tree structure for each item in the collection
var TreeRoot = Marionette.CollectionView.extend({
  itemView: TreeView,
  id: '',
  className: 'create-sharing full-height',
  onRender: function () {
    var dateFrom = new Date(this.options.timeFrom * 1000);
    var dateTo = new Date(this.options.timeTo * 1000);
    function toDateInputValue(date) {
      var local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 10);
    }

    this.$el.prepend(
      '<h1>Settings</h1>' +
      '<form role="form" id="form-create-sharing"' +
      '<div class="form-horizontal">' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<input type="text" class="form-control" id="input-name" placeholder="Name" required>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<div class="col-sm-5">' +
      '<select class="form-control" id="input-global-permission">' +
      '  <option value="read" selected="selected">Allow read only</option>' +
      '  <option value="contribute">Allow contributing events</option>' +
      '  <option value="manage">Allow managing events and streams</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="col-sm-5 panel panel-default advanced-settings">' +
      '  <div class="panel-heading">' +
      '    <h4 class="panel-title">' +
      '       <a data-toggle="collapse" data-parent="#accordion" href="#collapseOne">' +
      '       Advanced settings ' +
      '       </a>' +
      '     </h4>' +
      '   </div>' +
      '   <div id="collapseOne" class="panel-collapse collapse">' +
      '     <div class="panel-body">' +
      '<div class="form-horizontal">' +
      '<div class="form-group">' +
      '<div class="col-sm-12">' +
      '<input type="text" class="form-control" id="input-token" placeholder="Token">' +
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
      '      </div>' +
      ' </div> ' +
      '  </div> ' +
      '<h1>Select streams</h1>' +
      '');
    var $form = $('#form-create-sharing', this.$el),
      $name = $('#input-name', this.$el);
    $form.submit(this.createSharing.bind(this));
    $name.bind('change paste keyup', function () {
      //$token.val(slugMe($name.val()));
    });
  },
  createSharing: function (e, $btn) {
    e.preventDefault();
    $btn = $btn || $('#publish');
    var $name = $('#input-name', this.$el),
      $token = $('#input-token', this.$el),
      $permission = $('#input-global-permission', this.$el),
      $spin = $('.fa-spin', $btn);
    var access = {}, name = $name.val().trim(), token = $token.val().trim(),
      permission = $permission.val();
    if (permission !== 'read' || permission !== 'manage' || permission !== 'contribute') {
      permission = 'read';
    }
    access.name = name;
    access.token = token;
    access.permissions = [];
    if ($spin) {
      $spin.show();
    }
    eachStream(this.collection, function (model) {
      if (model.get('checked')) {
        access.permissions.push({streamId : model.get('id'), level: permission});
      }
    });
    this.options.connection.accesses.create(access, function (error, result) {
      if ($spin) {
        $spin.hide();
      }
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
});
var TreeNode = Backbone.Model.extend({
  defaults : {
    checked: true
  },
  initialize: function () {
    var children = this.get('children');
    var c = [];
    if (!children && this.get('connection') && this.get('childrenIds')) {
      _.each(this.get('childrenIds'), function (childId) {
        c.push(this.get('connection').streams.getById(childId));
      }.bind(this));
      children = c;
    }
    if (children) {
      this.children = new TreeNodeCollection(children);
      //this.unset('children');
    }
  }
});
var TreeNodeCollection = Backbone.Collection.extend({
  model: TreeNode
});
var Controller = module.exports = function ($modal, connection, streams, timeFilter, target) {
  this.$modal = $modal;
  this.target = target;
  this.connection = connection;
  this.streams = streams;
  this.timeFrom = timeFilter[1];
  this.timeTo = timeFilter[0];
  this.container = '.modal-content';
  this.treeView = null;
};
Controller.prototype.show = function () {
  this.$modal.modal({currentTarget: this.target});
  $(this.container).hide();
  setTimeout(function () {
    $(this.container).fadeIn();
  }.bind(this), 500);
  var tree = new TreeNodeCollection(this.streams);
  this.treeView = new TreeRoot({
    collection: tree,
    timeFrom: this.timeFrom,
    timeTo: this.timeTo,
    connection: this.connection
  });
  this.treeView.render();
  $(this.container).prepend('<div class="modal-header">  ' +
    '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">' +
    '&times;</button> ' +
    '<h4 class="modal-title" id="myModalLabel">Share a slice of life</h4>' +
    '<div class="modal-close"></div> ' +
    '</div><div id="modal-content"><div id="creation-content"></div>' +
    '<div id="creation-footer" class="col-md-12">' +
    '<button id="publish" class="btn btn-pryv-turquoise">Share  ' +
    '<i class="fa fa-spinner fa-spin" style="display: none;"></i></button>' +
    '<button id="cancel" class="btn" data-dismiss="modal">Cancel</button>' +
    '</div></div>');
  $('#creation-content').html(this.treeView.el);
  $('#publish').click(function (e) {
    this.treeView.createSharing(e, $('#publish'));
  }.bind(this));
  this.treeView.on('sharing:createSuccess', function (token) {
    $('#publish').remove();
    $('#cancel').text('Ok').addClass('btn-pryv-turquoise');
    $('#creation-content').empty();
    var url = this.connection.id.replace(/\?auth.*$/, '');
    url = url.replace(/\.in/, '.li');
    url = url.replace(/\.io/, '.me');
    url += '#/sharings/' + token;
    $('#creation-content').html('<div class="container">' +
      '<h4>Your sharing was successfully created, share it via ' +
      'Facebook, Twitter, mail or this link: </h4>' +
      '<h3 class="share-link"><a href="' + url + '">' + url + '</a></h3>' +
      '<p class="text-center share">' +
      '<a target="_blank" href="https://www.facebook.com/sharer.php?u=' +
      url.replace(/#/g, '%23') + '&t=" ' +
      'onclick="javascript:window.open(this.href, \'\', ' +
      '\'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=400,width=700\');' +
      'return false;">' +
      '<i class="fa fa-facebook"></i></a>' +
      '<a target="_blank" href="https://twitter.com/share?url=' +
      url.replace(/#/g, '%23') + '&via=pryv" ' +
      'onclick="javascript:window.open(this.href, \'\', ' +
      '\'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=400,width=700\');' +
      'return false;">' +
      '<i class="fa fa-twitter"></i></a>' +
      '<a href="mailto:?subject=Slice of life&amp;body=' +
      'I just shared a slice of life with you: ' + url +
      '" title="Share by Email">' +
      '<i class="fa fa-envelope"></i></a>' +
      '</p></div>');
  }.bind(this));
};
Controller.prototype.close = function () {
  this.treeView.close();
  $(this.container).empty();
};