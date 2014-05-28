
/*
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  UNIQUE_ID = 0;

module.exports = Marionette.ItemView.extend({
  template: '#create-sharings-form-template',
  templateHelpers: function () {
    return {
      getStream: function () {
        return this._getStream();
      }.bind(this)
    };
  },
  ui: {
    label: 'label',
    checkbox: 'input[type=checkbox]'
  },
  initialize: function () {
    this.connection = this.options.connection;
    this.streams = this.options.streams
  },
  onRender: function () {
    var self = this;
    this.ui.label.click(function (e) {
      e.stopPropagation();
      var input = $($(e.currentTarget).parent()).find('input');
      var checked = input.prop('checked');
      input.prop({
        indeterminate: false,
        checked: !checked
      });
      input.trigger('change');
      this._applyFilter();
    }.bind(this));
    this.ui.checkbox.click(function (e) {
      e.stopPropagation();
    });
    this.ui.checkbox.change(function (e, options) {
      var checked = $(e.currentTarget).prop('checked'),
        container = $($(e.currentTarget).parent().parent().attr('data-target'), self.$el);
      self.ui.applyBtn.prop('disabled', false);
      container.find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: checked
      });
      if (!options || !options.noIndeterminate) {
        self._isChildrenCheck(container.parent().parent());
      }
    });
    this.bindUIElements();
    this.onFocusStreamChanged();
    setTimeout(function () {$('body').i18n(); }, 100);
  },
  onFocusStreamChanged: function () {
    var focusedStreams = this.streams;
    var focusedStreamsIds = [];
    try {
      this.ui.checkbox.prop({
        indeterminate: false,
        checked: false
      });
    } catch (e) {
      return false;
    }

    _.each(focusedStreams, function (stream) {
      focusedStreamsIds.push(stream.connection.serialId + '/' + stream.id);
    });
    var $parent, c, s;
    _.each(this.ui.checkbox, function (checkbox) {
      checkbox = $(checkbox);
      $parent = $(checkbox.parent().parent());
      if ($parent && $parent.attr('data-connection') && $parent.attr('data-stream')) {
        c = this.MainModel.connections.get($parent.attr('data-connection'));
        if (c) {
          s = c.datastore.getStreamById($parent.attr('data-stream'));
          if (s) {
            if (focusedStreamsIds.indexOf(c.serialId + '/' + s.id) !== -1 ||
              focusedStreamsIds.length === 0) {
              checkbox.prop({
                indeterminate: false,
                checked: true
              });
              checkbox.trigger('change', {noIndeterminate: true});
            }
          }
        }
      }
    }.bind(this));
    return true;
  },
  _isChildrenCheck: function ($el) {
    if ($el.attr('id') === 'collapseFilterByStream') {
      return;
    }
    var allChecked = true;
    var allUncheck = true;
    var children  = $($el).find('input[type="checkbox"]');
    for (var i = 0; i < children.length; i++) {
      allChecked = allChecked && $(children[i]).prop('checked');
      allUncheck = allUncheck && !$(children[i]).prop('checked');
    }
    if (allUncheck) {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: false
      });
    } else if (!allChecked && !allUncheck) {
      $('li[data-target=#' + $el.attr('id') + ']', this.$el).find('input[type="checkbox"]').prop({
        indeterminate: true,
        checked: false
      });
    }
    this._isChildrenCheck($($($el).parent().parent()));
  },
  _getStream: function () {
    var connections = [this.connection],
      result = '';
    _.each(connections, function (c) {
      result += '<li class="stream-tree-summary connection disclosure"' +
        ' data-toggle="collapse" ' +
        'data-target="#collapse' + UNIQUE_ID + '">' +
        '<div class="pryv-checkbox">' +
        '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
        '"><label for="afilterStream' + UNIQUE_ID + '">' +   c.username;
      if (c._accessInfo.name !== 'pryv-browser') {
        result += ' / ' + c._accessInfo.name;
      }
      result += '</label></div></li>';
      result += '<ul id="collapse' + UNIQUE_ID +
        '" class="panel-collapse  collapse in stream-tree-children">' +
        '<div class="panel-body">';
      UNIQUE_ID++;
      result += this._getStreamStructure();
      result += '</div></ul>';
    }.bind(this));

    return result;
  },
  _getStreamStructure: function () {
    var rootStreams = this.streams,
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (!rootStreams[i].virtual) {
        result += this._walkStreamStructure(rootStreams[i]);
      }
    }
    return result;
  },
  _walkStreamStructure: function (stream) {
    var disclosure = '';
    if (stream.children.length > 0) {
      disclosure = 'disclosure';
    }
    var result = '<li data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '" class="stream-tree-summary collapsed ' + disclosure +
      '" data-toggle="collapse" ' +
      'data-target="#collapse' + UNIQUE_ID + '">' +
      '<div class="pryv-checkbox">' +
      '<input type="checkbox" name="filterStream" id="filterStream' + UNIQUE_ID +
      '"><label for="afilterStream' + UNIQUE_ID + '">' +
      stream.name + '</label></div></li>';
    result += '<ul id="collapse' + UNIQUE_ID +
      '" class="panel-collapse  collapse stream-tree-children">' +
      '<div class="panel-body">';
    UNIQUE_ID++;
    for (var j = 0; j < stream.children.length; j++) {
      if (!stream.children[j].virtual) {
        result += this._walkStreamStructure(stream.children[j]);
      }

    }
    result += '</div></ul>';
    return result;
  }

});


           */