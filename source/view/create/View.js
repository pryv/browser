/* global $, FileReader*/
var Marionette = require('backbone.marionette'),
  _ = require('underscore'),
  Model = require('./EventModel.js'),
  creationStep = {typeSelect: 'typeSelect', streamSelect: 'streamSelect',
    pictureSelect: 'pictureSelect', eventEdit: 'eventEdit'},
  validType = ['note/txt', 'picture/attached', 'position/wgs84'];

module.exports = Marionette.ItemView.extend({
  type: 'Creation',
  step: creationStep.typeSelect,
  className: 'full-height',
  pictureFile: null,
  newEvents: null,
  eventTime: null,
  eventType: null,
  connectionSelected: null,
  streamSelected: null,
  canPublish : true,
  getTemplate: function () {
    if (this.step === creationStep.typeSelect) {
      return '#template-detail-creation-type';
    } else if (this.step === creationStep.streamSelect) {
      return '#template-detail-creation-stream';
    } else if (this.step === creationStep.pictureSelect) {
      return '#template-detail-picture-select';
    } else if (this.step === creationStep.eventEdit) {
      return '#template-detail-creation-event';
    }
  },
  templateHelpers: function () {
    return {
      getStream: function () {
        return this.getStream();
      }.bind(this),
      getTypedView: function () {
        var result = '';
        var reader = new FileReader();
        var toRead = [];
        var  readFile = function (elems) {
          var elem = elems.shift(), file, selector;
          if (elem) {
            file = elem.file;
            selector = elem.selector;
            reader.onload = function (e) {
              $(selector).attr('src', e.target.result);
              readFile(elems);
            };
            reader.readAsDataURL(file);
          }
        };
        if (this.eventType === validType[1]) {
          if (this.newEvents.length === 1) {
            var event = this.newEvents[0].get('event');
            result += '<div id="creation-picture" class="col-md-12">' +
              '<img src="#" id="preview-0"></div>';
            result += '<form id="creation-form" role="form">' +
              '<div id="progress-0' +
                '" class="td-progress progress progress-striped active" >' +
              '<div class="progress-bar" role="progressbar" aria-valuenow="" aria-valuemin="0" ' +
                'aria-valuemax="100" style="width: 0%"></div></div>' +
              '  <div class="form-group td-tags">' +
              '    <label class="sr-only" for="tags">Tags</label>' +
              '    <input type="text" class="form-control" id="tags-0" ' +
              'placeholder="Enter tags (comma separated)">' +
              '    </div>' +
              '    <div class="form-group td-time">' +
              '      <label class="sr-only" for="edit-time">Time</label>' +
              '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
              'value="' + new Date(Math.round(event.time * 1000)).toISOString().slice(0, -5) +
              '">' +
              '      </div>' +
              '      <div class="form-group td-description">' +
              '        <label class="sr-only" for="description">Description</label>' +
              '        <textarea row="3" class="form-control" id="description-0" ' +
              'placeholder="Description"></textarea>' +
              '      </div>' +
              '    </form>';
            toRead.push({file: event.previewFile, selector: '#preview-0'});
          } else {
            result = '<table id="creation-picture-table" class="table table-striped">';
            for (var i = 0; i < this.newEvents.length; i++) {
              var model = this.newEvents[i];
              result += '<tr>' +
                '<td class="td-preview"><div class="preview"><img src="#" id="preview-' + i +
                '"></div></td>' +
                '<td class="td-progress"><div id="progress-' + i +
                '" class="progress progress-striped active" >' +
                '<div class="progress-bar" role="progressbar" aria-valuenow="" aria-valuemin="0" ' +
                'aria-valuemax="100" style="width: 0%"></div></div></td>' +
                '<td class="td-tags"><div class="form-group"><label class="sr-only" ' +
                'for="tags">Tags</label>' +
                '<input type="text" class="form-control" id="tags-' + i +
                '" placeholder="Enter tags (comma separated)">' +
                '</div></td>' +
                '<td class="td-time"><div class="form-group"><label class="sr-only" ' +
                'for="edit-time">Time</label>' +
                '<input type="datetime-local" class="edit" id="edit-time-' + i + '" value="' +
                new Date(Math.round(model.get('event').time * 1000)).toISOString().slice(0, -5) +
                '"></div></td>' +
                '<td class="td-description"><div class="form-group"><label class="sr-only" ' +
                'for="description">Description' +
                '</label><textarea row="3" class="form-control" id="description-' + i + '" ' +
                'placeholder="Description"></textarea></div></td>' +
                '</tr>';
              toRead.push({file: model.get('event').previewFile, selector: '#preview-' + i});
            }
            result += '</table>';
          }
          readFile(toRead);
          return result;
        }
      }.bind(this)
    };
  },
  itemViewContainer: '#modal-content',
  ui: {
    type: '#type-select',
    fileElem: '#fileElem',
    fileSelect: '#fileSelect',
    stream: 'ul#stream-select',
    publish: '#publish',
    cancel: '#cancel'
  },
  initialize: function () {
    this.step = creationStep.typeSelect;
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);
    this.ui.type.bind('click', this.onTypeClick.bind(this));
    this.ui.stream.bind('click', this.onStreamClick.bind(this));
    this.ui.fileSelect.bind('click', this.onFileSelectClick.bind(this));
    this.ui.fileElem.bind('change', this.onFileSelected.bind(this));
    this.ui.publish.bind('click', this.onPublishClick.bind(this));
    this.ui.cancel.bind('click', this.onCancelClick.bind(this));
    $('.td-progress').hide();
  },
  onPublishClick: function () {
    if (!this.canPublish) {
      return;
    }
    this.canPublish = false;
    var asyncCount = this.newEvents.length;
    var create = function (model, $progressBar) {
      var error = false;
      model.create(function (err) {
        asyncCount--;
        $progressBar.removeClass('progress-striped', 'active');
        if (err) {
          error = true;
          $progressBar.find('.progress-bar').css({'background-color': '#e74c3c', 'width' : '100%'});
        } else {
          $progressBar.find('.progress-bar').css({'background-color': '#2ecc71', 'width' : '100%'});
          model.set('published', true);
        }
        if (error && asyncCount === 0) {
          this.canPublish = true;
        }
      }.bind(this),
        function (e) {
          $progressBar.find('.progress-bar').css(
            {'width' : Math.ceil(e.loaded / e.total) * 100 + '%'}
          );
        });
    };
    if (this.streamSelected && this.connectionSelected) {
      var tags, description, time, event, $progressBar;
      $('.td-tags, .td-time, .td-description').hide();
      $('.td-progress').show();
      for (var i = 0; i < this.newEvents.length; i++) {
        if (!this.newEvents[i].get('published')) {
          event = this.newEvents[i].get('event');
          $progressBar = $('#progress-' + i);
          $progressBar.addClass('progress-striped', 'active');
          $progressBar.find('.progress-bar').css({'background-color': '#2980b9', 'width' : '0%'});
          tags = $('#tags-' + i).val().trim().split(',');
          description = $('#description-' + i).val().trim();
          time = new Date($('#edit-time-' + i).val()).getTime() / 1000;
          event.tags = tags;
          event.description = description;
          event.time = time;
          event.streamId = this.streamSelected;
          event.connection = this.connectionSelected;
          create(this.newEvents[i], $progressBar);
        }
      }
    }
  },
  onCancelClick: function () {

  },
  onStreamClick: function (e) {
    var streamSelected = $(e.target).attr('data-stream'),
      connectionSelected = this.connection.get($(e.target).attr('data-connection'));
    this.streamSelected = streamSelected;
    if (connectionSelected) {
      this.connectionSelected = connectionSelected;
      //event.connection = connectionSelected;
      //this.trigger('endOfSelection');
    }
    return true;
  },
  onTypeClick: function (e) {
    var typeSelected =  $(e.target).attr('data-type') || $(e.target).parent().attr('data-type'),
      event = this.model.get('event');

    if (validType.indexOf(typeSelected) !== -1) {
      event.type = this.eventType =  typeSelected;
      if (typeSelected === validType[1]) {
        this.step = creationStep.pictureSelect;
      } else {
        this.step = creationStep.streamSelect;
      }

      this.render();
    }
    return true;
  },
  onFileSelectClick: function () {
    this.ui.fileElem.click();
  },
  onFileSelected: function (e) {
    var files = e.target.files;
    if (!files) {
      return false;
    }
    this.newEvents = [];
    _.each(files, function (file) {
      if (file.type.indexOf('image') !== -1) {
        var time = new Date().getTime() / 1000;
        if (file.lastModifiedDate) {
          time = file.lastModifiedDate.getTime() / 1000;
        }
        var model = new Model({event: {
          time: time,
          type: this.eventType,
          tags: [],
          content: null,
          description: ''
        }});
        model.addAttachment(file);
        this.newEvents.push(model);
      }
    }.bind(this));
    if (this.newEvents.length > 0) {
      this.step = creationStep.eventEdit;
      this.render();
      return true;
    } else {
      return false;
    }
  },
  getStream: function () {
    var result = '<ul id="stream-select">',
      connections  = this.connection._connections;
    _.each(connections, function (c) {
      if (!this._isWritePermission(c)) {
        return;
      }
      result += '<ul>' + c.username + ' / ' + c._accessInfo.name;
      result += this.getStreamStructure(c);
      result += '</ul>';

    }.bind(this));
    return result + '</ul>';
  },
  getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (this._isWritePermission(connection, rootStreams[i])) {
        result += '<ul>' + this._walkStreamStructure(rootStreams[i]) + '</ul>';
      }
    }
    return result;

  },
  _walkStreamStructure: function (stream) {
    var preSelected = this.connectionId === stream.connection.serialId &&
      this.streamId === stream.id ? 'preSelected-stream' : '';
    var result = '<li class="' + preSelected + '" data-connection="' +
      stream.connection.serialId + '" data-stream="' +
      stream.id + '">' + stream.name + '</li>';
    for (var j = 0; j < stream.children.length; j++) {
      if (this._isWritePermission(stream.connection, stream.children[j])) {
        result += '<ul>' + this._walkStreamStructure(stream.children[j]) + '</ul>';
      }
    }
    return result;
  },
  _isWritePermission: function (connection, streamId) {
    if (!connection._accessInfo) {
      return false;
    }
    if (connection._accessInfo.type === 'personal') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId !== 'read') {
      return true;
    }
    if (connection._accessInfo.permissions &&
      connection._accessInfo.permissions[0].streamId === '*' &&
      connection._accessInfo.permissions[0].streamId === 'read') {
      return false;
    }
    if (streamId) {
      return !!_.find(connection._accessInfo.permissions, function (p) {
        return p.streamId === streamId && p.level !== 'read';
      });
    }
    return false;
  }
});