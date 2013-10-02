var  Marionette = require('backbone.marionette');

var NodeView = module.exports = Marionette.ItemView.extend({
  initialize: function () {
    this.listenTo(this.model, 'change', this.change);
    this.$el.css('background-color', this.getRandomColor());
    this.$el.addClass('node');
    this.$el.attr('id', this.model.get('id'));
  },
  triggers: {
    'click': 'click'
  },
  change: function () {
    this.refreshView();
    //console.log('change ' + this.model.get('containerId'));
  },
  renderView: function () {

    //console.log('render ' + this.model.get('containerId'));
    this.render();
  },
  render: function () {
  //  this.$el.css('z-index', this.model.get('depth'));
    this.refreshView();
    this.$el.html(this.model.get('name'));
    $('#' + this.model.get('containerId')).append(this.$el);
    this.$el.addClass('animated  fadeIn');

  },
  refreshView: function () {
    if (this.model.get('height') === 0 || this.model.get('width') === 0) {
      this.close();
      return;
    }
    if (this.model.get('display')) {
      this.$el.css('display', 'block');
    }  else {
      this.$el.css('display', 'none');
    }
    this.$el.attr('weight', this.model.get('weight'));
    this.$el.attr('className', this.model.get('name'));
    this.$el.css('width', this.model.get('width'));
    this.$el.css('height', this.model.get('height'));
    this.$el.css('left', this.model.get('x'));
    this.$el.css('top', this.model.get('y'));

  },
  close: function () {
    this.remove();
  },
  getRandomColor: function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.round(Math.random() * 15)];
    }
    return color;
  }
});