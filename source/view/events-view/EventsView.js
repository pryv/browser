var Interface = require('../../utility/Interface.js'),
    _ = require('underscore');


module.exports = function (events, options) {
  // List all the plugin view here
  this.registeredPluginViews = {
    'Notes' : require('./plugin-views/notes/NotesPlugin.js'),
    'Pictures' : require('./plugin-views/pictures/PicturesPlugin.js')
  };
  this.pluginViewName = null;
  this.width = null;
  this.height = null;
  _.extend(this, options);
  var viewInterface = new Interface('viewInterface', ['eventEnter', 'eventLeave',
    'eventChange', 'OnDateHighlightedChange', 'getHtml', 'refresh']);

  var view = {};
  if (this.pluginViewName) {
    if (!this.registeredPluginViews[this.pluginViewName]) {
      throw new Error('This plugin view ' + this.pluginViewName + ' is not registered');
    }
    if (this.registeredPluginViews[this.pluginViewName].acceptTheseEvents(events)) {
      view = new this.registeredPluginViews[this.pluginViewName](events, this.width, this.height);
      Interface.ensureImplements(view, viewInterface);
      return view;
    } else {
      throw new Error('These events are not accepted for the plugin view ' +
        this.pluginViewName);
    }
  }

  var keys = _.keys(this.registeredPluginViews);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (this.registeredPluginViews[key].acceptTheseEvents(events)) {
      view = new this.registeredPluginViews[key](events, this.width, this.height);
      Interface.ensureImplements(view, viewInterface);
      return view;
    }
  }
  //throw new Error('No view was found for these events');
  console.log('No view was found for these events');
  return;
};