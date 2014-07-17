/* global $ */
var Marionette = require('backbone.marionette'),
  _ = require('underscore');

var Layout = Marionette.Layout.extend({
  template: '#manage-stream-modal-template',

  regions: {
    otherApps: '#manage-stream'
  },
  initialize: function () {
    this.$el =  $('.modal-content');
  }
});
var Controller = module.exports  = function ($modal, connection, streams,  target) {
  this.connection = connection;
  this.streams = streams;
  this.$modal = $modal;
  this.target = target;
  this.view  = null;

};
_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.view.render();
    $('#manage-stream').streamController({
      connections: this.connection,
      streams: this.streams,
      editMode: true,
      autoOpen: 1
    });
    $('body').i18n();
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
    }
  }
});
