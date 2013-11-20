/* global $ */
var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#notesView',
  container: null,
  rendered: false,
  currentAnimation: 'bounceIn',
  triggers: {
    'click .aggregated-nbr-events': 'nodeClicked'
  },
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    /* this.listenTo(this.model, 'change:left', this.change);
     this.listenTo(this.model, 'change:width', this.change);
     this.listenTo(this.model, 'change:height', this.change);    */
    this.$el.css('position', 'absolute');
    this.$el.addClass('animated node singleNote ' + this.currentAnimation);
    this.$el.attr('id', this.model.get('id'));
  },
  change: function () {
    this.render();
  },
  renderView: function (container, animation) {
    this.rendered = false;
    this.container = container;
    this.$el.removeClass('animated ' + this.currentAnimation);
    this.currentAnimation = animation ? animation : this.currentAnimation;
    this.$el.addClass('animated ' + this.currentAnimation);
    this.render();
  },
  onRender: function () {
    /*  Mosaic code
     this.$el.css({
     top: this.model.get('top') + '%',
     left: this.model.get('left') + '%',
     width: this.model.get('width') + '%',
     height: this.model.get('height') + '%'
     });  */
    /* hack no mosaic */
    this.$el.css({
      top: '0%',
      left: '0%',
      width: '100%',
      height: '100%'
    });
    if (this.container && !this.rendered) {
      $('#' + this.container).append(this.el);
      this.rendered = true;

    }
  },
  close: function (animation) {
    this.$el.attr('id', '');
    this.$el.removeClass('animated ' + this.currentAnimation);
    this.currentAnimation = animation ? animation : this.currentAnimation;
    this.$el.addClass('animated ' + this.currentAnimation);
    this.rendered = false;
    this.container = null;
    setTimeout(function () {this.remove(); }.bind(this), 1000);
  }
});