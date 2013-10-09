var Interface = require('../../utility/Interface.js'),
    _ = require('underscore');


module.exports = function (events, width, height, options) {
  // List all the plugin view here
  this.registeredPluginViews = {
    'Notes' : require('./plugin-views/notes/NotesPlugin.js'),
    'Pictures' : require('./plugin-views/pictures/PicturesPlugin.js')
  };

  this.options = _.extend({
    pluginViewName: null
  }, options);
  var viewInterface = new Interface('viewInterface', ['eventEnter', 'eventLeave',
    'eventChange', 'OnDateHighlightedChange', 'getHtml', 'refresh']);

  var view = {};
  if (this.options.pluginViewName) {
    if (!this.registeredPluginViews[this.option.pluginViewName]) {
      throw new Error('This plugin view ' + this.option.pluginViewName + ' is not registered');
    }
    if (this.registeredPluginViews[this.option.pluginViewName].acceptTheseEvents(events)) {
      view = new this.registeredPluginViews[this.option.pluginViewName](events, width, height);
      Interface.ensureImplements(view, viewInterface);
      return view;
    } else {
      throw new Error('These events are not accepted for the plugin view ' +
        this.option.pluginViewName);
    }
  }

  var keys = _.keys(this.registeredPluginViews);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (this.registeredPluginViews[key].acceptTheseEvents(events)) {
      view = new this.registeredPluginViews[key](events, width, height);
      Interface.ensureImplements(view, viewInterface);
      return view;
    }
  }
  //throw new Error('No view was found for these events');
  console.log('No view was found for these events');
  return;
};