var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  container: null,
  rendered: false,
  initialize: function () {
    this.listenTo(this.model, 'change:top', this.change);
    this.listenTo(this.model, 'change:left', this.change);
    this.listenTo(this.model, 'change:width', this.change);
    this.listenTo(this.model, 'change:height', this.change);
    this.$el.css('position', 'absolute');
    this.$el.addClass('animated  fadeInLeftBig node singleNote');
  },
  change: function () {
    this.render();
  },
  renderView: function (container) {
    if (container !== this.container) {
      this.rendered = false;
    }
    this.container = container;

    this.render();
  },
  onRender: function () {
    this.$el.css({
      top: this.model.get('top') + '%',
      left: this.model.get('left') + '%',
      width: this.model.get('width') + '%',
      height: this.model.get('height') + '%'
    });
    if (this.container && !this.rendered) {
      $('#' + this.container).append(this.el);
      this.rendered = true;
      this.$el.mouseover(function () {
        $('#' + this.container + ' .countView div').css('opacity', '0');
      }.bind(this));
      this.$el.mouseout(function () {
        $('#' + this.container + ' .countView div').css('opacity', '1');
      }.bind(this));
    }
  },
  close: function () {
    this.$el.removeClass('animated fadeInLeftBig');
    this.$el.addClass('animated fadeOutRightBig');
    this.rendered = false;
    setTimeout(function () {this.remove(); }.bind(this), 1000);
  }
});