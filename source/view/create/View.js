/* global $, FileReader, document, window, i18n, navigator*/
var Marionette = require('backbone.marionette'),
    _ = require('underscore'),
    Model = require('./EventModel.js'),
    MapLoader = require('google-maps'),
    creationStep = {typeSelect: 'typeSelect', streamSelect: 'streamSelect',
      pictureSelect: 'pictureSelect', eventEdit: 'eventEdit'},
    validType = ['note/txt', 'picture/attached', 'position/wgs84'],
    UNIQUE_ID = 0;

module.exports = Marionette.ItemView.extend({
  type: 'Creation',
  step: creationStep.typeSelect,
  className: 'full-height',
  pictureFile: null,
  focusedStream: null,
  newEvents: null,
  eventTime: null,
  eventType: null,
  google: null,
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
      getEventType: function () {
        return this.eventType.split('/')[0] || '';
      }.bind(this),
      getTypedView: function () {
        if (this.eventType === validType[2]) {
          this._initPositionView();
          return this._getPositionView();
        }
        if (this.eventType === validType[1]) {
          return this._getPictureView();
        }
        if (this.eventType === validType[0]) {
          return this._getNoteView();
        }
      }.bind(this)
    };
  },
  itemViewContainer: '#modal-content',
  ui: {
    type: '#type-select',
    fileElem: '#fileElem',
    fileSelect: '#fileSelect',
    stream: '.stream-tree-summary',
    inputStream: 'input.create-stream',
    selectStreamRadio: 'input.select-stream',
    publish: '#publish',
    cancel: '#cancel',
    spin: '.fa-spin',
    createStreamFrom: '.create-stream'
  },
  initialize: function () {
    this.step = creationStep.typeSelect;
  },
  onRender: function () {
    $(this.itemViewContainer).html($(this.el).fadeIn());
    this.ui.type.bind('click', this.onTypeClick.bind(this));
    this.ui.stream.bind('click', this.onStreamClick.bind(this));
    this.ui.fileSelect.bind('click', this.onFileSelectClick.bind(this));
    this.ui.fileElem.bind('change', this.onFileSelected.bind(this));
    this.ui.publish.bind('click', this.onPublishClick.bind(this));
    this.ui.cancel.bind('click', this.onCancelClick.bind(this));
    this.ui.inputStream.bind('keypress past', this.onInputStreamChange.bind(this));
    this.ui.createStreamFrom.bind('submit', function (e) {
      e.preventDefault();
      this.onPublishClick();
    }.bind(this));
    this.ui.spin.hide();
    this.ui.publish.prop('disabled', false);
    $('.td-progress').hide();
    $('body').i18n();
  },
  _close: function () {
    this.trigger('close');
  },
  onInputStreamChange: function (e) {
    var currentValue = e.target.value;
    this.ui.selectStreamRadio.each(function (i, elem) {
      elem.checked = false;
    });
    this.ui.inputStream.val('');
    this.streamSelected = null;
    this.connectionSelected = null;
    $(e.target).parent().parent().find('input[type="radio"]').prop('checked', true);
    e.target.value = currentValue;
  },
  onPublishClick: function () {
    if (this.streamSelected && this.connectionSelected) {
      this.ui.spin.show();
      this.ui.publish.removeClass('btn-pryv-alizarin');
      this.ui.publish.prop('disabled', true);
      if (this.eventType === validType[2]) {
        this._publishPosition();
      }
      else if (this.eventType === validType[1]) {
        this._publishPicture();
      }
      else if (this.eventType === validType[0]) {
        this._publishNote();
      }
    } else {
      var input, parentId, name;
      /*jshint -W083 */
      for (var i = 0; i < this.ui.inputStream.length; i++) {
        input = $(this.ui.inputStream[i]);
        if (input.val().length > 0) {
          this.ui.spin.show();
          this.ui.publish.removeClass('btn-pryv-alizarin');
          this.ui.publish.prop('disabled', true);
          name = input.val().trim();
          parentId = input.attr('data-parentId') || null;
          this.connectionSelected = this.connection.get(input.attr('data-connection'));
          this.connectionSelected.streams.create({parentId: parentId, name: name},
              function (err, res) {
                if (err) {
                  var errMsg;
                  switch (err.id) {
                  case 'item-already-exists':
                    errMsg = i18n.t('events.common.messages.errStreamNameAlreadyExists');
                    break;
                  default:
                    errMsg = i18n.t('common.messages.errUnexpected');
                    window.PryvBrowser.reportError(err, {
                      component: 'event creation',
                      action: 'create stream'
                    });
                    break;
                  }

                  this.ui.publish.addClass('btn-pryv-alizarin');
                  this.ui.spin.hide();
                  this.ui.publish.prop('disabled', false);
                  window.PryvBrowser.showAlert(this.itemViewContainer, errMsg);
                  return;
                }

                this.streamSelected = res.id;
                this.onPublishClick();
              }.bind(this));
          break;
        }
      }
      if (! name) {
        window.PryvBrowser.showAlert(this.itemViewContainer,
            i18n.t('events.common.messages.errNoStreamSelected'));
      }
    }
  },

  _publishNote: function () {
    var event = this.newEvents.get('event');
    var tags = $('#tags-0').val().trim().split(',');
    var description = $('#description-0').val().trim();
    var content = $('#content-0').val();
    var time = new Date($('#edit-time-0').val()).getTime() / 1000;
    event.content = content;
    event.tags = tags;
    event.description = description;
    event.time = time;
    event.streamId = this.streamSelected;
    event.connection = this.connectionSelected;
    this.newEvents.create(function (err) {
      this.ui.spin.hide();
      this.ui.publish.prop('disabled', false);

      if (err) {
        window.PryvBrowser.reportError(err, {
          component: 'event creation',
          action: 'create note'
        });
        this.ui.publish.addClass('btn-pryv-alizarin');
        window.PryvBrowser.showAlert(this.itemViewContainer,
            i18n.t('common.messages.errUnexpected'));
        return;
      }

      this.ui.publish.removeClass('btn-pryv-alizarin');
      this._close();
    }.bind(this));
  },

  _publishPosition: function () {
    var event = this.newEvents.get('event');
    var tags = $('#tags-0').val().trim().split(',');
    var description = $('#description-0').val().trim();
    var time = new Date($('#edit-time-0').val()).getTime() / 1000;
    event.tags = tags;
    event.description = description;
    event.time = time;
    event.streamId = this.streamSelected;
    event.connection = this.connectionSelected;
    this.newEvents.create(function (err) {
      this.ui.spin.hide();
      this.ui.publish.prop('disabled', false);
      if (err) {
        window.PryvBrowser.reportError(err, {
          component: 'event creation',
          action: 'create position'
        });
        this.ui.publish.addClass('btn-pryv-alizarin');
        window.PryvBrowser.showAlert(this.itemViewContainer,
            i18n.t('common.messages.errUnexpected'));
        return;
      }

      this.ui.publish.removeClass('btn-pryv-alizarin');
      this._close();
    }.bind(this));
  },

  _publishPicture: function () {
    var self = this;
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
          window.PryvBrowser.reportError(err, {
            component: 'event creation',
            action: 'create picture'
          });
          window.PryvBrowser.showAlert(this.itemViewContainer,
              i18n.t('common.messages.errUnexpected'));
          $progressBar.find('.progress-bar')
              .css({'background-color': '#e74c3c', 'width' : '100%'});
        } else {
          $progressBar.find('.progress-bar')
              .css({'background-color': '#2ecc71', 'width' : '100%'});
          model.set('published', true);
        }
        if (error && asyncCount === 0) {
          self.ui.spin.hide();
          self.canPublish = true;
        } else if (!error && asyncCount === 0) {
          self.ui.spin.hide();
          self._close();
        }
      },
      function (e) {
        $progressBar.find('.progress-bar').css(
            {'width' : Math.ceil(100 * (e.loaded / e.total)) + '%'}
        );
      });
    };
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
  },

  onCancelClick: function () {
    this._close();
  },

  onStreamClick: function (e) {
    var streamSelected = $(e.target).attr('data-stream') ||
            $(e.target).parent().attr('data-stream') ||
            $(e.target).parent().parent().attr('data-stream'),
        connectionSelected = this.connection.get($(e.target).attr('data-connection') ||
            $(e.target).parent().attr('data-connection') ||
            $(e.target).parent().parent().attr('data-connection'));
    if (streamSelected && connectionSelected) {
      this.ui.inputStream.val('');
      $(e.target).find('input[type="radio"]').prop('checked', true);
    }
    this.streamSelected = streamSelected;
    if (connectionSelected) {
      this.connectionSelected = connectionSelected;
    }
    return true;
  },
  onTypeClick: function (e) {
    var typeSelected =  $(e.target).attr('data-type') || $(e.target).parent().attr('data-type'),
        event = this.model.get('event');

    if (validType.indexOf(typeSelected) !== -1) {
      event.type = this.eventType =  typeSelected;
      $('#myModalLabel').attr('data-i18n',
          'events.' + this.eventType.split('/')[0] + '.labels.addTitle');
      if (typeSelected === validType[1]) {
        this.step = creationStep.pictureSelect;
      } else  if (typeSelected === validType[2]) {
        MapLoader.KEY = 'AIzaSyCWRjaX1-QcCqSK-UKfyR0aBpBwy6hYK5M';
        MapLoader.load().then(function (google) {
          this.google = google;
        }.bind(this));
        this.step = creationStep.eventEdit;
      } else {
        this.step = creationStep.eventEdit;
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
    this.streamSelected  = this.focusedStream ? this.focusedStream.id : null;
    this.connectionSelected  = this.focusedStream ? this.focusedStream.connection : null;
    var result = '<div id="stream-select"><form>',
        connections  = this.connection._connections,
        open = '';
    if (this.focusedStream && this.focusedStream.length === 1) {
      this.focusedStream.ancestor = this._getStreamAncestor(this.focusedStream[0]);
    }
    _.each(connections, function (c) {
      if (!this._isWritePermission(c)) {
        return;
      }
      if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
          this.focusedStream.ancestor[0].serialId === c.serialId) {
        open = 'in';
        this.focusedStream.ancestor.shift();
      } else {
        open = '';
      }

      UNIQUE_ID++;
      result += '<li class="stream-tree-summary connection" data-toggle="collapse" ' +
          'data-target="#collapse' + UNIQUE_ID + '">' +
          '<label for="selectStream' + UNIQUE_ID + '">' +
          c.username;
      if (c._accessInfo.name !== 'pryv-browser') {
        result += ' / ' + c._accessInfo.name;
      }
      result += '</label></li>';
      result += '<ul id="collapse' + UNIQUE_ID +
          '" class="panel-collapse  collapse in stream-tree-children">' +
          '<div class="panel-body">';
      result += this.getStreamStructure(c);
      UNIQUE_ID++;
      result +=  '<li class="stream-tree-summary"><div class="pryv-radio">' +
          '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
          '" class="select-stream"><label for="selectStream' + UNIQUE_ID + '">' +
          '<input type="text" class="form-control create-stream" ' +
          'data-i18n="[placeholder]events.common.actions.addNewStream;"' +
          ' data-parentId="" data-connection="' + c.serialId + '">' +
          '</label></div></li>';
      result += '</div></ul>';

    }.bind(this));
    return result + '</form></div>';
  },
  getStreamStructure: function (connection) {
    var rootStreams = connection.datastore.getStreams(),
        result = '', open = '', checked = '';
    for (var i = 0; i < rootStreams.length; i++) {
      if (this._isWritePermission(connection, rootStreams[i])) {
        if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
            this.focusedStream.ancestor[0].id === rootStreams[i].id) {
          open = 'in';
          this.focusedStream.ancestor.shift();
          if (this.focusedStream.ancestor.length === 0) {
            checked = 'checked';
          }
        } else {
          checked = '';
          open = '';
        }
        result += this._walkStreamStructure(rootStreams[i], checked, open);
      }
    }
    return result;

  },
  _walkStreamStructure: function (stream, checked, open) {
    UNIQUE_ID++;
    var disclosure = '';
    if (stream.children.length > 0) {
      disclosure = 'disclosure';
    }
    var result = '<li data-connection="' +
        stream.connection.serialId + '" data-stream="' +
        stream.id + '" class="stream-tree-summary collapsed ' + disclosure +
        '" data-toggle="collapse" ' +
        'data-target="#collapse' + UNIQUE_ID + '">' +
        '<div class="pryv-radio">' +
        '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
        '" class="select-stream" ' +
        checked + '><label for="selectStream' + UNIQUE_ID + '">' +
        stream.name + '</label></div></li>';
    result += '<ul id="collapse' + UNIQUE_ID +
        '" class="panel-collapse  collapse ' + open + ' stream-tree-children">' +
        '<div class="panel-body">';
    open = '';
    checked = '';
    for (var j = 0; j < stream.children.length; j++) {
      if (this._isWritePermission(stream.connection, stream.children[j])) {
        if (this.focusedStream && this.focusedStream.ancestor && this.focusedStream.ancestor[0] &&
            this.focusedStream.ancestor[0].id === stream.children[j].id) {
          open = 'in';
          this.focusedStream.ancestor.shift();
          if (this.focusedStream.ancestor.length === 0) {
            checked = 'checked';
          }
        } else {
          open = '';
          checked = '';
        }
        result += this._walkStreamStructure(stream.children[j], checked, open);
      }
    }
    UNIQUE_ID++;
    result +=  '<li class="stream-tree-summary"><div class="pryv-radio">' +
        '<input type="radio" name="selectStream" id="selectStream' + UNIQUE_ID +
        '" class="select-stream"><label for="selectStream' + UNIQUE_ID + '">' +
        '<input type="text" class="form-control create-stream" ' +
        'data-i18n="[placeholder]events.common.actions.addNewStream;"' +
        ' data-parentId="' + stream.id + '" data-connection="' + stream.connection.serialId + '">' +
        '</label></div></li>' +
        '</div></ul>';
    return result;
  },
  _isWritePermission: function (connection, stream) {
    if (!connection._accessInfo) {
      return false;
    }

    if (connection._accessInfo.type === 'personal') {
      return true;
    }
    if (!stream) {
      if (connection._accessInfo.permissions &&
        connection._accessInfo.permissions[0].level !== 'read') {
        return true;
      } else {
        return false;
      }
    }
    if (stream) {
      if (connection._accessInfo.permissions &&
        connection._accessInfo.permissions[0].streamId === '*' &&
        connection._accessInfo.permissions[0].level !== 'read') {
        return true;
      }
      return !!_.find(connection._accessInfo.permissions, function (p) {
        return p.streamId === stream.id && p.level !== 'read';
      });
    }
    return false;
  },
  _getStreamAncestor: function (stream) {
    var result = [];
    var ancestor = stream.parent;
    result.unshift(stream);
    while (ancestor) {
      result.unshift(ancestor);
      ancestor = ancestor.parent;
    }
    result.unshift(stream.connection);
    return result;
  },
  _initPositionView: function () {

    if (!this.google) {
      _.delay(this._initPositionView.bind(this), 100);
      return;
    }
    var map, elevator, marker, lat, lng;


    var initMap = function () {

      this.newEvents.get('event').content.latitude = lat;
      this.newEvents.get('event').content.longitude = lng;

      map = new this.google.maps.Map(document.getElementById('creation-position'), {
        zoom: 16,
        center: new this.google.maps.LatLng(lat, lng),
        mapTypeId: this.google.maps.MapTypeId.ROADMAP
      });
      elevator = new this.google.maps.ElevationService();
      marker = new this.google.maps.Marker({
        position: new this.google.maps.LatLng(lat, lng),
        draggable: true
      });

      this.google.maps.event.addListener(marker, 'dragend', function (evt) {
        var event = this.newEvents.get('event');
        event.content.latitude = evt.latLng.lat();
        event.content.longitude = evt.latLng.lng();
        var positionalRequest = {
          'locations': [evt.latLng]
        };
        elevator.getElevationForLocations(positionalRequest, function (results, status) {
          if (status === this.google.maps.ElevationStatus.OK) {
            // Retrieve the first result
            if (results[0]) {
              var event = this.newEvents.get('event');
              event.content.altitude = results[0].elevation;
            }
          }
        }.bind(this));
      }.bind(this));
      map.setCenter(marker.position);
      marker.setMap(map);
    };


    this.newEvents = new Model({event: {
      time: new Date().getTime() / 1000,
      type: this.eventType,
      tags: [],
      content: {},
      description: ''
    }});
    if (this.newEvents.get('event')) {
      // default position of LaForge
      lat = 46.51759;
      lng = 6.56267;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          var coords = position.coords;
          lat = coords.latitude;
          lng = coords.longitude;
          initMap.apply(this);
        }.bind(this), function () {
          initMap.apply(this);
        }.bind(this));
      }
      else {
        initMap.apply(this);
      }
    }
  },
  _getNoteView: function () {
    this.newEvents = new Model({event: {
      time: new Date().getTime() / 1000,
      type: this.eventType,
      tags: [],
      content: null,
      description: ''
    }});
    var result = '';
    result += '<form id="creation-form" role="form">' +
        '      <div class="form-group td-content">' +
        '        <label class="sr-only" for="content">Content</label>' +
        '        <textarea rows="15" class="form-control" id="content-0" ' +
        'data-i18n="[placeholder]events.note.labels.contentPlaceholder"></textarea>' +
        '      </div>' +
        '  <div class="form-group td-tags">' +
        '    <label class="sr-only" for="tags">Tags</label>' +
        '    <input type="text" class="form-control" id="tags-0" ' +
        'data-i18n="[placeholder]events.common.labels.tagsPlaceholder">' +
        '    </div>' +
        '    <div class="form-group td-time">' +
        '      <label class="sr-only" for="edit-time">Time</label>' +
        '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
        'value="' + new Date().toISOString().slice(0, -5) +
        '">' +
        '      </div>' +
        '      <div class="form-group td-description">' +
        '        <label class="sr-only" for="description">Description</label>' +
        '        <textarea rows="3" class="form-control" id="description-0" ' +
        'data-i18n="[placeholder]events.common.labels.descriptionPlaceholder"></textarea>' +
        '      </div>' +
        '    </form>';
    return result;
  },
  _getPositionView: function () {
    var result = '';
    result += '<div id="creation-position" class="col-md-12"></div>';
    result += '<form id="creation-form" role="form">' +
        '  <div class="form-group td-tags">' +
        '    <label class="sr-only" for="tags">Tags</label>' +
        '    <input type="text" class="form-control" id="tags-0" ' +
        'data-i18n="[placeholder]events.common.labels.tagsPlaceholder">' +
        '    </div>' +
        '    <div class="form-group td-time">' +
        '      <label class="sr-only" for="edit-time">Time</label>' +
        '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
        'value="' + new Date().toISOString().slice(0, -5) +
        '">' +
        '      </div>' +
        '      <div class="form-group td-description">' +
        '        <label class="sr-only" for="description">Description</label>' +
        '        <textarea rows="3" class="form-control" id="description-0" ' +
        'data-i18n="[placeholder]events.common.labels.descriptionPlaceholder;"></textarea>' +
        '      </div>' +
        '    </form>';
    return result;
  },
  _getPictureView: function () {
    var reader = new FileReader();
    var toRead = [];
    var  readFile = function (elems) {
      var elem = elems.shift(), file, selector;
      if (elem) {
        file = elem.file;
        selector = elem.selector;
        reader.onload = function (e) {
          $(selector).attr('src', e.target.result).load(function () {
            readFile(elems);
          });
        };
        reader.readAsDataURL(file);
      }
    };
    var result = '';
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
          'data-i18n="[placeholder]events.common.labels.tagsPlaceholder;">' +
          '    </div>' +
          '    <div class="form-group td-time">' +
          '      <label class="sr-only" for="edit-time">Time</label>' +
          '      <input type="datetime-local" class="edit" id="edit-time-0" ' +
          'value="' + new Date(Math.round(event.time * 1000)).toISOString().slice(0, -5) +
          '">' +
          '      </div>' +
          '      <div class="form-group td-description">' +
          '        <label class="sr-only" for="description">Description</label>' +
          '        <textarea rows="3" class="form-control" id="description-0" ' +
          'data-i18n="[placeholder]events.common.labels.descriptionPlaceholder;"></textarea>' +
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
            '" data-i18n="[placeholder]events.common.labels.tagsPlaceholder;">' +
            '</div></td>' +
            '<td class="td-time"><div class="form-group"><label class="sr-only" ' +
            'for="edit-time">Time</label>' +
            '<input type="datetime-local" class="edit" id="edit-time-' + i + '" value="' +
            new Date(Math.round(model.get('event').time * 1000)).toISOString().slice(0, -5) +
            '"></div></td>' +
            '<td class="td-description"><div class="form-group"><label class="sr-only" ' +
            'for="description">Description' +
            '</label><textarea row="3" class="form-control" id="description-' + i + '" ' +
            'data-i18n="[placeholder]events.common.labels.descriptionPlaceholder;"></textarea>' +
            '</div></td></tr>';
        toRead.push({file: model.get('event').previewFile, selector: '#preview-' + i});
      }
      result += '</table>';
    }
    _.delay(function () { readFile(toRead); }, 1000);
    return result;
  }
});
