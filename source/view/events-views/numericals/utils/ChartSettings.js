var streamUtils = require('../../../../utility/streamUtils');

var ChartSettings = module.exports = function ChartSettings(stream, type, virtualNode, offset) {
  this._stream = stream;
  this._type = type;
  this._virtualNode = virtualNode;

  this._offset = offset ? offset : 0;
  this._cnt = offset ? offset : 0;

  this._ptr = null;

  this._createIfNotExist();
};

ChartSettings.prototype._createIfNotExist = function () {
  if (this._virtualNode) {
    var found = false;
    for (var i = 0; i < this._virtualNode.filters.length; ++i) {
      if (this._virtualNode.filters[i].streamId === this._stream.id &&
        this._virtualNode.filters[i].type === this._type) {
        if (this._cnt === 0) {
          found = true;
          break;
        } else {
          this._cnt--;
        }
      }
    }
    if (found) {
      if (!this._virtualNode.filters[i].settings) {
        this._virtualNode.filters[i].settings = {};
      }
      this._ptr = this._virtualNode.filters[i].settings;
    }
  } else {
    this._ptr = streamUtils.getChartSettingsForType(this._stream, this._type);
    if (! this._ptr) {
      this._ptr = streamUtils.setChartSettingsForType(this._stream, this._type, {});
    }
  }
};

ChartSettings.prototype.get = function (key) {
  return this._ptr[key];
};

ChartSettings.prototype.set = function (key, value) {
  this._ptr[key] = value;
  this._pushChanges();
};

ChartSettings.prototype._pushChanges = function () {
  var changes = null;
  if (this._virtualNode) {
    changes = {'browser:virtualnode': this._virtualNode._getDataPointer()};
    console.log('Pushing these changes in privateProfile', changes);
    this._stream.connection.profile.setPrivate(changes, function (error, result) {
      console.log('privateProfile for', 'browser:virtualnode', 'has been pushed:', error, result);
    });
  } else {
    changes = {id: this._stream.id, clientData: this._stream.clientData};
    console.log('Pushing these changes in clientData', changes);
    this._stream.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for has been pushed:', error, result);
    });
  }
};
