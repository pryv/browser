/* global $ */
var Marionette = require('backbone.marionette'),
  Backbone = require('backbone'),
  StreamView = require('./View.js'),
  _ = require('underscore');

var Model = Backbone.Model.extend({});

var Layout = Marionette.Layout.extend({
  template: '#stream-config-modal-template',

  regions: {
    streamConfig: '#stream-config'
  },
  initialize: function () {
    this.$el =  $('.modal-content');
  }
});
var Controller = module.exports  = function ($modal, stream, target) {
  this.stream = stream;
  this.$modal = $modal;
  this.target = target;
  this.view  = null;
  this.streamConfig  = null;
};


_.extend(Controller.prototype, {
  show: function () {
    this.$modal.modal({currentTarget: this.target});
    setTimeout(function () {
      $('.modal-content').fadeIn();
    }.bind(this), 500);
    this.view = new Layout();
    this.view.on('close', this.close.bind(this));
    this.streamConfig = new StreamView({model: new Model({stream: this.stream})});
    this.view.render();
    this.view.streamConfig.show(this.streamConfig);
  },
  close: function () {
    if (this.view) {
      this.view = null;
      $('.modal-content').empty();
      $('#pryv-modal').hide().removeClass('in').attr('aria-hidden', 'true');
      $('.modal-backdrop').remove();
      this.$modal.trigger('hidden.bs.modal');
      this.streamConfig.reset();
    }
  }
});