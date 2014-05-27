/* global $ */
var  Marionette = require('backbone.marionette');
 /* TODO This a the view for each node, with dynamic animation
 we can't re-render on change because animation would no be done
 If the model is a event Node we must include a new typed view
 */
module.exports = Marionette.ItemView.extend({
  template: '#nodeView',
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);

    this.$el.attr('id', this.model.get('id'));
    this.$el.attr('data-streamId', this.model.get('streamId'));
    this.$el.attr('data-streamName', this.model.get('streamName'));
    this.$el.attr('data-connectionId', this.model.get('connectionId'));
    this.$el.addClass('node animated  fadeIn');
    this.$el.addClass(this.model.get('className'));

  },
  triggers: {
    'click .nodeHeader': 'headerClicked'
  },
  change: function () {

    this._refreshStyle();
  },

  renderView: function () {

    this.render();
  },
  render: function () {
    if (this.beforeRender) { this.beforeRender(); }
    this.trigger('before:render', this);
    this.trigger('item:before:render', this);
    this._refreshStyle();
    var data = this.serializeData();
    var template = this.getTemplate();
    var html = Marionette.Renderer.render(template, data);
    this.$el.html(html);

    $('#' + this.model.get('containerId')).prepend(this.$el);
    if (this.model.get('eventView')) {
      this.model.get('eventView').render(this.model.get('id'));
    }
    this.bindUIElements();

    if (this.onRender) { this.onRender(); }
    this.trigger('render', this);
    this.trigger('item:rendered', this);
    return this;

  },
  _refreshStyle: function () {
    if (this.model.get('weight') === 0) {
      this.close();
      return;
    }
    this.$el.attr('weight', this.model.get('weight'));
    this.$el.attr('className', this.model.get('className'));
    this.$el.css('width', this.model.get('width'));
    this.$el.css('height', this.model.get('height'));
    this.$el.css('left', this.model.get('x'));
    this.$el.css('top', this.model.get('y'));
    if (this.model.get('color')) {
      $('.pins-color', this.$el).css('background-color', this.model.get('color'));
    }
  },
  close: function () {

    this.$el.removeClass('animated  fadeIn');
    this.$el.addClass('animated  fadeOut');
    this.remove();
  }
});