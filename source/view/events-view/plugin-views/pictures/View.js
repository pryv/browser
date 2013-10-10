var  Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#picturesView',
  initialize: function () {
    this.listenTo(this.model, 'change:width', this.adjustImage);
    this.listenTo(this.model, 'change:height', this.adjustImage);
    this.$el.css('height', '100%');
    this.$el.css('width', '100%');
  },
  change: function () {
    this.render();
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
    this.$image = this.$('img');
    this.$image.load(function () {
      if (typeof this.imageWidth === 'undefined' && typeof this.imageHeight === 'undefined') {
        this.imageWidth = this.$image.width();
        this.imageHeight = this.$image.height();
      }
      this.adjustImage();
    }.bind(this));
    this.bindUIElements();
    this.adjustImage();
    if (this.onRender) { this.onRender(); }
    this.trigger('render', this);
    this.trigger('item:rendered', this);
    return this;
  },
  adjustImage: function () {


    var that = this;
    if (this.imageWidth > 0 ||  this.imageHeight > 0) {
      _adjustCss();
    }


    function _adjustCss() {
      var cssAdjust = _computeCss(
        that.imageWidth,
        that.imageHeight,
        that.model.get('width'),
        that.model.get('height')
      );
      if (cssAdjust) {
        that.$image.css(cssAdjust);
      }
    }
    function _computeCss(imgW, imgH, divW, divH) {

      if (imgW <= 0 || imgH <= 0 || divW <= 0 || divH <= 0) {
        return;
      }
      var maxW = imgW * 2.5,
        maxH = imgH * 2.5,
        width = imgW,
        height = imgH,
        marginTop = 0,
        marginLeft = 0;

      if (maxW < divW && maxH < divH) {
        /* Image, even if stretched, is shorter in width and height. */
        width = maxW;
        height = maxH;
        marginTop = (divH - maxH) / 2;

      } else if (maxW < divW) {
        /* Image is shorter in width. */
        /* We have to adapt height to div. */
        height = divH;
        width = (imgW / imgH) * divH;

      } else if (maxH < divH) {
        /* Image is shorter in height. */
        /* We have to adapt to div width. */
        width = divW;
        height = (imgH / imgW) * divW;
        marginTop = (divH - height) / 2;

      } else {
        /* Stretched image is larger in width and height. */
        var diffH = maxH / divH,
          diffW = maxW / divW;

        if (diffH < diffW) {
          /* Resize to fit div height. */
          height = divH;
          width = (imgW / imgH) * divH;
          marginLeft = (divW - width) / 2;

        } else {
          /* Resize to fit div width, center vertically. */
          width = divW;
          height = (imgH / imgW) * divW;
          marginTop = (divH - height) / 2;

        }
      }

      return {
        'margin-top': marginTop,
        'margin-left': marginLeft,
        width: width,
        height: height
      };
    }
  },
  close: function () {
    this.remove();
  }
});