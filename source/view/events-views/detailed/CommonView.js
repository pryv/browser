/* global $, moment, window, i18n */
var Marionette = require('backbone.marionette'),
    dateTime = require('../../../utility/dateTime');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-full',
  itemViewContainer: '#detail-common',
  tagName: 'div',
  id: 'detail-full',
  // addAttachmentContainer: '#add-attachment',
  waitSubmit: false,
  timer: null,
  ui: {
    editBtn: '#edit-button',
    editForm: '#edit-form',
    editOff: '#edit-off',
    editOn: '#edit-on',
    editStopEditing: '#edit-stop-editing',
    saveSpin: '#edit-save .fa-spin',
    saveBtn: '#edit-save',
    editStream: '#edit-stream',
    editTime: '#edit-time',
    editTimePicker: '#edit-time-picker',
    editTags: '#edit-tags',
    editDescription: '#edit-description',
    addDuration: '#add-duration',
    stopDuration: '#stop-duration',
    editDuration: '#edit-duration',
    removeDuration: '#remove-duration',
    duration: '.duration',
    durationRunning: '#duration-running',
    durationStopped: '#duration-stopped',
    durationStoppedClock: '#duration-end-clock',
    durationNone: '#duration-none'
  },
  templateHelpers: function () {
    return {
      getStreamStructure: function () {
        return this.getStreamStructure();
      }.bind(this),
      getDurationControl: function () {
        return this.getDurationControl();
      }.bind(this),
      displayDuration: function () {
        return this.displayDuration();
      }.bind(this)
    };
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.modelChanged);
  },
  modelChanged: function () {
    var event = this.model.get('event');
    if (event) {
      event.newDuration = event.duration;
    }
    this.render();
  },
  onClose: function () {
    $('.popover-duration').remove();
    this.stopTimer();
  },
  onBeforeRender: function () {
    $('.popover-duration').remove();
    this.stopTimer();
  },
  onRender: function () {
    $(this.itemViewContainer).html(this.el);

    this.ui.duration.hide();
    this.initAddDuration();
    this.initEditDuration();
    this.ui.removeDuration.bind('click', this.removeDuration.bind(this));
    this.ui.stopDuration.bind('click', this.stopDuration.bind(this));
    var event = this.model.get('event');
    if (event) {
      if (! event.hasOwnProperty('newDuration')) {
        event.newDuration = event.duration;
      }
      if (event.newDuration === null) {
        this.startTimer();
        this.ui.durationRunning.show();
      } else if (event.newDuration && event.newDuration > 0) {
        this.ui.durationStopped.show();
        this.ui.durationStoppedClock.html(
            dateTime.getDurationText(event.newDuration, {nbValues: 2}) +
            ' (end: ' + dateTime.getTimeText(event.time + event.newDuration) + ')'
        );
      } else if (!event.newDuration || event.newDuration === 0) {
        this.ui.durationNone.show();
      }
    }
    this.ui.editBtn.bind('click', this.showEdit.bind(this));
    this.ui.editStopEditing.bind('click', this.hideEdit.bind(this));
    this.ui.editForm.bind('submit', this.submit.bind(this));
    if ($('#modal-left-content').hasClass('editing')) {
      this.showEdit();
    } else {
      this.hideEdit();
    }
    // Can cause problem if custom time selector is open
    $('.bootstrap-datetimepicker-widget.dropdown-menu').remove();
    this.ui.editTimePicker.datetimepicker({
      direction: 'auto',
      language: i18n.lng()
    });
    if (this.model.get('event')) {
      var evtDate = moment.unix(this.model.get('event').time);
      this.ui.editTimePicker.data('DateTimePicker').setDate(evtDate);
      if (!this.model.isEditPermission()) {
        this.ui.editBtn.hide();
      }
    }

    $('body').i18n();
  },
  showEdit: function () {
    $('#modal-left-content').addClass('editing');
    $('#modal-left-content').trigger('editing:on');
    this.ui.editOff.hide();
    this.ui.editOn.show();
  },
  hideEdit: function () {
    $('#modal-left-content').removeClass('editing');
    $('#modal-left-content').trigger('editing:off');
    this.ui.editOn.hide();
    this.ui.editOff.show();
  },
  submit: function (e) {
    e.preventDefault();
    this.ui.saveBtn.prop('disabled', true);
    this.ui.saveSpin.show();
    var event = this.model.get('event');
    var tags = this.ui.editTags.val();
    tags = tags.split(',');
    tags = tags.map(function (e) {return e.trim(); })
      .filter(function (e) {return e.length > 0; });
    event.tags = tags;
    event.description = this.ui.editDescription.val().trim();
    event.streamId = this.ui.editStream.val().trim();
    event.time = moment(this.ui.editTimePicker.data('DateTimePicker').getDate()).unix();
    event.duration = event.newDuration;
    this.model.set('event', event).save(function (err) {
      this.ui.saveBtn.prop('disabled', false);
      this.ui.saveSpin.hide();
      if (err) {
        window.PryvBrowser.showAlert('.modal-content', i18n.t('error.detailed.update.' + err.id));
      }
    }.bind(this));
  },
  getStreamStructure: function () {
    var rootStreams = this.model.get('event').connection.datastore.getStreams(),
      currentStreamId = this.model.get('event').streamId,
      result = '';
    for (var i = 0; i < rootStreams.length; i++) {
      result += this._walkStreamStructure(rootStreams[i], 0, currentStreamId);
    }
    return result;

  },
  startTimer: function () {
    this.stopTimer();
    this.timer = setInterval(function () {
      var duration = (new Date()).getTime() / 1000 - this.model.get('event').time;
      if (this.model && this.model.get('event') && this.model.get('event').isRunning()) {
        $('#duration-clock').html(dateTime.getDurationText(duration));
      }
      if (this.model.get('event').newDuration === null) {
        $('#duration-edit-clock').html(dateTime.getDurationText(duration));
      }
    }.bind(this), 500);
  },
  stopTimer: function () {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },
  /* jshint ignore:start */
  removeDuration: function () {
    this.model.get('event').newDuration = 0;
    this.render();
  },
  stopDuration: function () {
    var event = this.model.get('event');
    if (event.newDuration === null) {
      event.newDuration = moment().unix() - event.time;
      this.render();
    }
  },
  initAddDuration: function () {
    var that = this;
    $('#add-duration').popover('destroy');
    $('#add-duration').popover({
      html: true,
      placement: 'top',
      container: 'body',
      template: '<div class="popover popover-duration" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>',
      content: function () {
        return $('<form class="form-horizontal">' +
          '<div class="form-group">' +
          '  <label for="endDatePicker">' + i18n.t('events.common.labels.endDatePicker') + '</label>' +
          '  <div class="input-group date picker" id="endDatePicker">' +
          '    <input type="text" class="form-control"/> ' +
          '    <span id="endDateButton" class="input-group-addon">' +
          '      <span class="fa fa-calendar"></span>' +
          '    </span>' +
          '  </div>' +
          '</div>' +
          '<button type="button" id="cancel-add-duration" ' +
          'class="btn btn-default col-md-4"  style="float: none" >' +
          i18n.t('common.actions.cancel') + '</button>' +

          '<button type="button" id="ok-add-duration" class="btn btn-default col-md-7 col-md-offset-1"' +
          ' style="float: none">' +
          i18n.t('common.actions.ok') + '</button>' +
          '<hr>' +
          '<label>Or...</label>' +
          '<button type="button" id="start-add-duration" class="btn btn-default btn-block">' +
          i18n.t('common.actions.start') + '</button>' +
          '</form>').html();
      }
    });
    $('#add-duration').on('hidden.bs.popover', function () {
      $('.bootstrap-datetimepicker-widget.dropdown-menu').remove();
    });
    $('#add-duration').on('shown.bs.popover', function () {
      var endDate = moment();
      $(document.body).off('click', '#ok-add-duration');
      $(document.body).on('click', '#ok-add-duration', function () {
        endDate = moment(endDate);
        if (endDate.isValid()) {
          $('#add-duration').popover('toggle');
          var event = that.model.get('event');
          event.newDuration = endDate.unix() - event.time;
          that.render();
        }
      });
      $(document.body).off('click', '#cancel-add-duration');
      $(document.body).on('click', '#cancel-add-duration', function () {
        $('#add-duration').popover('toggle');
      });
      $(document.body).off('click', '#start-add-duration');
      $(document.body).on('click', '#start-add-duration', function () {
        that.model.get('event').newDuration = null;
        $('#add-duration').popover('toggle');
        that.render();
      });
      $(document.body).off('click', '#endDateButton');
      $(document.body).on('click', '#endDateButton', function () {
        endDate = moment();
        $('#endDateButton').trigger('click');
      });

      $(document.body).off('click', '#endDatePicker input');
      $(document.body).on('click', '#endDatePicker input', function () {
        endDate = moment();
        $('#endDateButton').trigger('click');
      });
      $('#endDatePicker').datetimepicker({
        direction: 'auto',
        language: i18n.lng()
      });
      $('#endDatePicker').on('dp.change', function (e) {
        endDate = e.date;
      });
      $('#endDatePicker').data('DateTimePicker').setDate(endDate);
    });
  },
  initEditDuration: function () {
    var that = this;
    $('#edit-duration').popover('destroy');
    $('#edit-duration').popover({
      html: true,
      placement: 'top',
      container: 'body',
      template: '<div class="popover popover-duration" role="tooltip"><div class="arrow"></div><div class="popover-content"></div></div>',
      content: function () {
        return $('<form class="form-horizontal">' +
          '<div class="form-group">' +
          '  <label for="endDatePicker">' + i18n.t('events.common.labels.endDatePicker') + '</label>' +
          '  <div class="input-group date picker" id="endDatePicker">' +
          '    <input type="text" class="form-control"/> ' +
          '    <span id="endDateButton" class="input-group-addon">' +
          '      <span class="fa fa-calendar"></span>' +
          '    </span>' +
          '  </div>' +
          '</div>' +
          '<button type="button" id="cancel-add-duration" ' +
          'class="btn btn-default col-md-4"  style="float: none">' +
          i18n.t('common.actions.cancel') + '</button>' +

          '<button type="button" id="ok-add-duration" class="btn btn-default col-md-7 col-md-offset-1"' +
          ' style="float: none">' +
          i18n.t('common.actions.ok') + '</button>' +
          '</form>').html();
      }
    });
    $('#edit-duration').attr('title', i18n.t('events.common.labels.endDatePicker'));
    $('#edit-duration').on('hidden.bs.popover', function () {
      $('.bootstrap-datetimepicker-widget.dropdown-menu').remove();
    });
    $('#edit-duration').on('shown.bs.popover', function () {
      var event = that.model.get('event');
      var endDate = moment.unix(event.time + event.newDuration);
      $(document.body).off('click', '#ok-add-duration');
      $(document.body).on('click', '#ok-add-duration', function () {
        endDate = moment(endDate);
        if (endDate.isValid()) {
          $('#edit-duration').popover('toggle');
          event.newDuration = endDate.unix() - event.time;
          that.render();
        }
      });
      $(document.body).off('click', '#cancel-add-duration');
      $(document.body).on('click', '#cancel-add-duration', function () {
        $('#edit-duration').popover('toggle');
      });
      $(document.body).off('click', '#endDateButton');
      $(document.body).on('click', '#endDateButton', function () {
        endDate = moment();
        $('#endDateButton').trigger('click');
      });

      $(document.body).off('click', '#endDatePicker input');
      $(document.body).on('click', '#endDatePicker input', function () {
        endDate = moment.unix(event.time + event.newDuration);
        $('#endDateButton').trigger('click');
      });
      $('#endDatePicker').datetimepicker({
        direction: 'auto',
        language: i18n.lng()
      });
      $('#endDatePicker').on('dp.change', function (e) {
        endDate = e.date;
      });
      $('#endDatePicker').data('DateTimePicker').setDate(endDate);
    });
  },
  displayDuration: function () {
    var event = this.model.get('event');
    if (event.isRunning()) {
      this.startTimer();
      return '<span id="duration-clock"></span>';
    } else if (event.duration && event.duration > 0) {
      return '<span>' + dateTime.getDurationText(event.duration, {nbValues: 2}) +
        ' (end: ' + dateTime.getTimeText(event.time + event.duration) + ' )</span>';
    }
  },
  getDurationControl: function () {
    var event = this.model.get('event');
    var html = '';
    html += '<div id="duration-running" class="duration"><span id="duration-edit-clock"></span>' +
      '<button id="stop-duration" class="btn btn-default" data-i18n="common.actions.stop" type="button"></button></div>';
    html += '<div id="duration-stopped" class="duration"><span id="duration-end-clock"></span>' +
        '<span class="btn-group">' +
      '<button class="btn btn-default" id="edit-duration" type="button" title="' + i18n.t('events.common.labels.endDatePicker') + '"><i class="fa fa-calendar"></i></button>' +
      '<button class="btn btn-danger" id="remove-duration" type="button" title="' +  i18n.t('events.common.labels.removeDuration') + '"><i class="fa fa-times"></i></button>' +
        '</span></div>';
    html += '<div id="duration-none" class="duration"><button class="btn btn-default" id="add-duration" type="button">Add duration</button></div>';
    return html;
  },
  /* jshint ignore:end */
  _walkStreamStructure: function (stream, depth, currentStreamId) {
    var indentNbr = 4,
      result = '<option ';
    result += stream.id === currentStreamId ? 'selected="selected" ' : '';
    result += 'value="' + stream.id + '" >';
    for (var i = 0; i < depth * indentNbr; i++) {
      result += '&nbsp;';
    }
    result += stream.name;
    result += '</option>';
    depth++;
    for (var j = 0; j < stream.children.length; j++) {
      result += this._walkStreamStructure(stream.children[j], depth, currentStreamId);
    }
    return result;
  }
});
