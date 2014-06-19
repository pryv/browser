/* global $, i18n */
var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({
  template: '#template-detail-batch-action-view',
  itemViewContainer: '.modal-panel-left',
  id: 'batch-action-view',
  ui: {
    itemsSelectedLabel: '#batch-action-items-selected',
    selectAll: '#select-all',
    unselectAll: '#unselect-all',
    trash: '#trash',
    cancel: '#cancel',
    spinner: '#trash fa-spinner'
  },

  initialize: function () {
  },

  onRender: function () {
    $(this.itemViewContainer).append(this.el);
    this.ui.cancel.bind('click', function () {
      this.trigger('close');
    }.bind(this));
    this.ui.selectAll.bind('click', this.selectAll.bind(this));
    this.ui.unselectAll.bind('click', this.unselectAll.bind(this));
    this.ui.trash.bind('click', this.trash.bind(this));
    $('body').i18n();
    this.updateItemsSelectedLabel();
  },

  updateItemsSelectedLabel: function () {
    this.ui.itemsSelectedLabel.html(i18n.t('events.common.labels.batchActionItemsSelected', {
      count: countChecked(this.collection)
    }));
  },

  trash: function () {
    var i = 0;
    this.ui.spinner.show();
    this.ui.trash.prop('disabled', true);
    this.collection.each(function (model) {
      if (model.get('checked')) {
        i++;
        model.trash(function () {
          i--;
          if (i === 0) {
            this.ui.spinner.hide();
            this.ui.trash.prop('disabled', false);
          }
        }.bind(this));
      }
    }.bind(this));
    if (i === 0) {
      this.ui.spinner.hide();
      this.ui.trash.prop('disabled', false);
    }
  },

  selectAll: function () {
    this.collection.each(function (model) {
      model.set('checked', true);
      model.trigger('change:checked');
    }.bind(this));
    this.updateItemsSelectedLabel();
  },

  unselectAll: function () {
    this.collection.each(function (model) {
      model.set('checked', false);
      model.trigger('change:checked');
    }.bind(this));
    this.updateItemsSelectedLabel();
  },

  onClose: function () {
    $('#' + this.id).remove();
  }
});

function countChecked(collection) {
  var count = 0;
  collection.each(function (model) {
    if (model.get('checked')) {
      count++;
    }
  });
  return count;
}
