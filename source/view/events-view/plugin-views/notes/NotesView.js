var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.render);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },

  renderView: function () {

    this.render();
  },
  render: function () {
    if (this.beforeRender) { this.beforeRender(); }
    this.trigger('before:render', this);
    this.trigger('item:before:render', this);
    var data = this.serializeData();
    var template = this.getTemplate();
    var html = Marionette.Renderer.render(template, data);
    this.$el.addClass('animated  bounceIn');
    this.$el.html(html);
    this.bindUIElements();

    if (this.onRender) { this.onRender(); }
    this.trigger('render', this);
    this.trigger('item:rendered', this);
    return this;
    //  this.$el.css('z-index', this.model.get('depth'));
    /*  this._refreshStyle();
     this.$el.html(this.model.get('className'));
     $('#' + this.model.get('containerId')).append(this.$el);
     this.$el.addClass('animated  fadeIn');    */

  },

  close: function () {
    this.remove();
  }
});