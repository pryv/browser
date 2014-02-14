
/* Definition of a virtual node attached to a stream as its child
 *  stream: <streamId>, // the node where it's attached to
 *  name: <my name>,    // the name of that virtual node
 *  filters: [          // an array of filter/setting pairs contained in this virtual node
 *    { filter: f1,
 *      settings:             // settings of that filter, such as color,
 *        [{ color: 'green', // style, ... (especially for charts)
 *        style: 'bar',
 *         ... }, {}]
 *    },
 *    { filter: f2, settings: {...}},
 *    ...
 *   ]
 *   Note:
 *   The filters are ofa special kind. Each filter concerns exactly one type.
 *   The settings override the stream/type pair's default one. Numerical data
 *   would contain style (line, bar, ..), color, transform.
 */



var Settings = module.exports = function Setting(stream, type, virtualNode, offset) {
  this._stream = stream;
  this._type = type;
  this._virtualNode = virtualNode;

  this._offset = offset ? offset : 0;
  this._cnt = offset ? offset : 0;

  this._ptr = null;

  this._createIfNotExist();
  //this._emptyData();
};


Settings.prototype._createIfNotExist = function () {
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
    if (!this._stream.clientData) {
      this._stream.clientData = {};
    }
    if (!this._stream.clientData['pryv-browser:charts']) {
      this._stream.clientData['pryv-browser:charts'] = {};
    }
    if (!this._stream.clientData['pryv-browser:charts'][this._type]) {
      this._stream.clientData['pryv-browser:charts'][this._type] = {settings: {}};
    }
    this._ptr = this._stream.clientData['pryv-browser:charts'][this._type].settings;
  }
};


Settings.prototype._emptyData = function () {
  if (!this._virtualNode) {
    var changes = {id: this._stream.id, clientData: {'pryv-browser:charts': {}} };
    this._stream.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for has been pushed:', error, result);
    });
  }
};



Settings.prototype._pushChanges = function () {
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


Settings.prototype.set = function (key, value) {
  this._ptr[key] = value;
  this._pushChanges();
};

Settings.prototype.get = function (key) {
  return this._ptr[key];
};
