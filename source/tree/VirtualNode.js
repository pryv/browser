var Pryv = require('pryv');
var _ = require('underscore');


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

var KEY = 'browser:virtualnode';
var SERIAL = 0;
var VirtualNode = module.exports = function VirtualNode(node, name) {
  this._node = node;
  this._name = name;
  this.id = 'vn_' + SERIAL;
  SERIAL++;

  this._createIfNotExist();
  //this._emptyData();
};

VirtualNode.prototype._emptyData = function () {
  if (this._node instanceof Pryv.Connection) {
    this._node.privateProfile()[KEY] = [];
  } else if (this._node instanceof Pryv.Stream) {
    this._node.clientData[KEY] = [];
  }
  this._pushChanges();
};

VirtualNode.prototype._integrity = function () {
  if (!this._node) {
    throw new Error('_integrity: Node does not exists');
  }
};

VirtualNode.prototype._createIfNotExist = function () {
  var data = null;
  if (this._node instanceof Pryv.Connection) {
    data = this._node.privateProfile();
  } else if (this._node instanceof Pryv.Stream) {
    data = this._node.clientData;
  }

  if (!data[KEY]) {
    data[KEY] = [];
  }
  data = data[KEY];

  var found = false;
  for (var i = 0; i < data.length; ++i) {
    if (data[i].name === this._name) {
      found = true;
      break;
    }
  }
  if (!found) {
    data.push({name: this._name, filters: []});
  }
};

VirtualNode.prototype._getDataPointer = function () {
  var data = null;
  if (this._node instanceof Pryv.Connection) {
    data = this._node.privateProfile()[KEY];
  } else if (this._node instanceof Pryv.Stream) {
    data = this._node.clientData[KEY];
  }
  return data;
};

VirtualNode.prototype._pushChanges = function () {
  this._integrity();
  var changes = null;
  if (this._node instanceof Pryv.Connection) {
    changes = {'browser:virtualnode': this._getDataPointer()};
    console.log('Pushing these changes in privateProfile', changes);
    this._node.profile.setPrivate(changes, function (error, result) {
      console.log('privateProfile for', KEY, 'has been pushed:', error, result);
    });
  } else if  (this._node instanceof Pryv.Stream) {
    changes = {id: this._node.id, clientData: this._node.clientData};
    console.log('Pushing these changes in clientData', changes);
    this._node.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for', KEY, 'has been pushed:', error, result);
    });
  }
};

Object.defineProperty(VirtualNode.prototype, 'filters', {
  get: function () {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        return d[i].filters;
      }
    }
    return [];
  },
  set: function (filters) {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        d[i].filters = filters;
        this._pushChanges();
        break;
      }
    }
  }
});

Object.defineProperty(VirtualNode.prototype, 'name', {
  get: function () {
    return this._name;
  },
  set: function (name) {
    var d = this._getDataPointer();
    for (var i = 0; i < d.length; ++i) {
      if (d[i].name === this._name) {
        d[i].name = name;
        this._name = name;
        this._pushChanges();
        break;
      }
    }
  }
});

Object.defineProperty(VirtualNode.prototype, 'parent', {
  get: function () {
    return this._node;
  },
  set: function () {
    throw new Error('Virtual nodes having connection as parent not supported.');
  }
});

VirtualNode.prototype.addFilters = function (filter) {
  this._integrity();
  var d = this._getDataPointer();
  if (filter && filter.length !== 0) {
    var found = false;
    filter = (filter instanceof Array) ? filter : [filter];
    for (var i = 0, n = d.length; i < n; ++i) {
      if (d[i].name === this._name) {
        found = true;
        break;
      }
    }

    if (found) {
      if (!d[i].filters) {
        d[i].filters = [filter];
      } else {
        for (var j = 0; j < filter.length; ++j) {
          d[i].filters.push(filter[j]);
        }
      }
    } else {
      d.push({name: this._name, filters: filter});
    }
    this._pushChanges();
  }
};


/*
 * Static testing and accessing functions
 */


/**
 * Extracts and creates an interface between the node and its virtual nodes
 * @param node the node, can be a stream or a connection
 * @returns {*}
 */
VirtualNode.getNodes = function (node) {
  var vn = [];
  var data = null;
  if (node instanceof Pryv.Connection) {
    data = node.privateProfile()[KEY];
    if (!data) {
      return vn;
    }
  } else if (node instanceof Pryv.Stream) {
    if (node.clientData && node.clientData[KEY]) {
      data = node.clientData[KEY];
    } else {
      return vn;
    }
  }
  _.each(data, function (e) {
    if (e.name) {
      vn.push(new VirtualNode(node, e.name));
    }
  });
  return vn;
};


/**
 * Checks if node has virtual children.
 * @param node a connection or stream
 * @returns {*}
 */
VirtualNode.nodeHas = function (node) {
  if (node instanceof Pryv.Connection) {
    var pp = node.privateProfile();
    return (pp[KEY] ? true : false);
  } else if (node instanceof Pryv.Stream) {
    return (node.clientData) && (node.clientData[KEY]) &&
      (node.clientData[KEY].length !== 0);
  } else {
    return false;
  }
};
