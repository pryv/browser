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

var VirtualNode = module.exports = function VirtualNode(node, name) {
  this._node = node;
  this._name = name;

  this._clientData();
  this._createIfNotExist();
  //this._emptyStream();
};

VirtualNode.prototype._emptyStream = function () {
  if (this._node.clientData) {
    delete this._node.clientData;
  }
  this._pushChanges();
};

VirtualNode.prototype._integrity = function () {
  if (!this._node) {
    throw new Error('_integrity: Node does not exists');
  }
};

VirtualNode.prototype._createIfNotExist = function () {
  var found = false;
  for (var i = 0; i < this._node.clientData[KEY].length; ++i) {
    if (this._node.clientData[KEY][i].name === this._name) {
      found = true;
      break;
    }
  }
  if (!found) {
    this._node.clientData[KEY].push({name: this._name, filters: []});
  }
};


VirtualNode.prototype._clientData = function () {
  if (!this._node.clientData) {
    this._node.clientData = {};
  }
  if (!this._node.clientData[KEY]) {
    this._node.clientData[KEY] = [];
  }
};


VirtualNode.prototype._pushChanges = function () {
  this._integrity();
  if (this._node instanceof Pryv.Connection) {
    console.log('_pushChanges: to private data');
    throw new Error('Virtual nodes having connection as parent not supported.');
  } else if  (this._node instanceof Pryv.Stream) {
    var changes = {id: this._node.id, clientData: this._node.clientData};
    console.log('Pushing these changes', changes);
    this._node.connection.streams._updateWithData(changes, function (error, result) {
      console.log('clientData for', KEY, 'has been pushed:', error, result);
    });
  }
};

Object.defineProperty(VirtualNode.prototype, 'filters', {
  get: function () {
    for (var i = 0; i < this._node.clientData[KEY].length; ++i) {
      if (this._node.clientData[KEY][i].name === this._name) {
        return this._node.clientData[KEY][i].filters;
      }
    }
    return [];
  },
  set: function (filters) {
    for (var i = 0; i < this._node.clientData[KEY].length; ++i) {
      if (this._node.clientData[KEY][i].name === this._name) {
        this._node.clientData[KEY][i].filters = filters;
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
    for (var i = 0; i < this._node.clientData[KEY].length; ++i) {
      if (this._node.clientData[KEY][i].name === this._name) {
        this._node.clientData[KEY][i].name = name;
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
  this._clientData();
  if (filter && filter.length !== 0) {
    var found = false;
    filter = (filter instanceof Array) ? filter : [filter];
    for (var i = 0, n = this._node.clientData[KEY].length; i < n; ++i) {
      if (this.parent.clientData[KEY][i].name === this._name) {
        found = true;
        break;
      }
    }

    if (found) {
      if (!this.parent.clientData[KEY][i].filters) {
        this.parent.clientData[KEY][i].filters = [filter];
      } else {
        for (var j = 0; j < filter.length; ++j) {
          this.parent.clientData[KEY][i].filters.push(filter[j]);
        }
      }
    } else {
      this.parent.clientData[KEY].push({name: this._name, filters: filter});
    }
    this._pushChanges();
  }
};


/*****************************************3333
 *333333333333333333333333333333333333333333333
 */


VirtualNode.getNodes = function (node) {
  var vn = [];
  if (node.clientData && node.clientData[KEY]) {
    _.each(node.clientData[KEY], function (e) {
      if (e.name) {
        vn.push(new VirtualNode(node, e.name));
      }
    });
  }
  return vn;
};


/**
 * Checks if node has virtual children.
 * @param node a connection or stream
 * @returns {*}
 */
VirtualNode.nodeHas = function (node) {
  if (node instanceof Pryv.Connection) {
    throw new Error('Virtual nodes having connection as parent not supported.');
  } else if (node instanceof Pryv.Stream) {
    return (node.clientData) && (node.clientData[KEY]) &&
      (node.clientData[KEY].length !== 0);
  } else {
    return false;
  }
};
