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

var VirtualNode = module.exports = function VirtualNode(parent, name, filters) {
  this.parent = null;
  this._parent = parent;
  this.name = name;
  this._name = name;
  this.filters = filters ? filters : [];
};
Object.defineProperty(VirtualNode.prototype, 'parent', {
  get: function () {
    return this._parent;
  },
  set: function (p) {
    if (p && this.parent.clientData && this.parent.clientData[KEY]) {
      var vn = null;
      for (var i = 0, n = this.parent.clientData[KEY]; i < n; ++i) {
        if (this.parent.clientData[KEY][i].name === this._name) {
          vn = _.clone(this.parent.clientData[KEY][i]);
          this.parent.clientData[KEY].splice(i, 1);
          break;
        }
      }
      p.clientData[KEY].push(vn);
      this._parent = p;
    }
  }
});
Object.defineProperty(VirtualNode.prototype, 'name', {
  get: function () {
    return this._name;
  },
  set: function (name) {
    console.log('Object.defineProperty(VirtualNode.prototype, name, set', name);
    if (this.parent instanceof Pryv.Connection) {
      throw new Error('Virtual nodes having connection as parent not supported.');
    } else if (this.parent instanceof Pryv.Stream) {
      if (!this.parent.clientData) {
        this.parent.clientData = {};
      }
      if (!this.parent.clientData[KEY] || !this._name) {
        this.parent.clientData[KEY] = [{name: name, filters: []}];
      } else {
        var found = false;
        for (var i = 0, n = this.parent.clientData[KEY].length; i < n; ++i) {
          if (this.parent.clientData[KEY][i].name === this._name) {
            found = true;
            break;
          }
        }
        if (found) {
          this.parent.clientData[KEY][i].name = name;
        } else {
          this.parent.clientData[KEY].push({name: name, filters: []});
        }
      }
    }
    this._name = name;
  }
});
Object.defineProperty(VirtualNode.prototype, 'filters', {
  get: function () {
    if (this.parent instanceof Pryv.Connection) {
      throw new Error('Virtual nodes having connection as parent not supported.');
    } else if (this.parent instanceof Pryv.Stream &&
      this.parent.clientData && this.parent.clientData[KEY]) {
      for (var i = 0, n = this.parent.clientData[KEY].length; i < n; ++i) {
        if (this.parent.clientData[KEY][i].name === this._name) {
          return this.parent.clientData[KEY][i].filters;
        }
      }
    }
    return [];
  },
  set: function (f) {
    if (f && f.length !== 0 && this.parent.clientData && this.parent.clientData[KEY]) {
      for (var i = 0, n = this.parent.clientData[KEY].length; i < n; ++i) {
        if (this.parent.clientData[KEY][i].name === this._name) {
          this.parent.clientData[KEY][i].filters = f;
          break;
        }
      }
    }
  }
});
VirtualNode.prototype.update = function () {
  if (this._name) {
    if (!this.parent) {
      throw new Error('Parent unset');
    }
    if (this.parent instanceof Pryv.Connection) {
      throw new Error('Virtual nodes having connection as parent not supported.');
    } else if (this.parent instanceof Pryv.Stream &&
      this.parent.clientData && this.parent.clientData[KEY]) {
      if (!this.parent.clientData[KEY]) {
        this.parent.clientData[KEY] = [];
      }
      this.parent.clientData[KEY].push({
        name: this._name,
        filters: []
      });
    }
  }
};
VirtualNode.prototype.remove = function () {
  if (this._name) {
    if (!this.parent) {
      throw new Error('Parent unset');
    } else if (this.parent instanceof Pryv.Connection) {
      throw new Error('Virtual nodes having connection as parent not supported.');
    } else if (this.parent instanceof Pryv.Stream &&
      this.parent.clientData && this.parent.clientData[KEY]) {
      for (var i = 0, n = this.parent.clientData[KEY]; i < n; ++i) {
        if (this.parent.clientData[KEY][i].name === this._name) {
          this.parent.clientData[KEY].splice(i, 1);
          break;
        }
      }
    }
  }
};
VirtualNode.prototype.addFilter = function (streamId, type) {
  if (!this.parent) {
    throw new Error('Parent unset');
  } else if (this.parent instanceof Pryv.Connection) {
    throw new Error('Virtual nodes having connection as parent not supported.');
  } else if (this.parent instanceof Pryv.Stream &&
    this.parent.clientData && this.parent.clientData[KEY]) {
    var found = false;
    for (var i = 0, n = this.clientData[KEY].length; i < n; ++i) {
      if (this.clientData[KEY][i].name === this.name) {
        if (!this.clientData[KEY][i].filters) {
          this.clientData[KEY][i].filters = [];
        }
        this.clientData[KEY][i].filters.push({streamId: streamId, type: type});
        break;
      }
    }
    if (!found) {
      this.clientData[KEY].push({name: this.name, filters: [
        {streamId: streamId, type: type}
      ]});
    }
  }
};
VirtualNode.prototype.removeFilter = function (streamId, type) {
  for (var i = 0, n = this.clientData[KEY].length; i < n; ++i) {
    if (this.clientData[KEY][i].name === this.name) {
      if (!this.clientData[KEY][i].filters) {
        break;
      } else {
        for (var j = 0, l = this.clientData[KEY][i].filters.length; j < l; ++j) {
          if (this.clientData[KEY][i].filters[j].streamId === streamId &&
            this.clientData[KEY][i].filters[j].type === type) {
            this.clientData[KEY][i].filters.splice(j, 1);
            break;
          }
        }
      }
    }
  }
};

/* Static accessor methods. */
/**
 * Returns an array of virtual nodes of a stream or a connection.
 * @param node Can be a Stream or a Connection
 * @returns {Array} an array of VirtualNodes
 */
VirtualNode.getFromNode = function (node) {
  if (node instanceof Pryv.Connection) {
    throw new Error('Virtual nodes having connection as parent not supported.');
  } else if (node instanceof Pryv.Stream) {
    var ret = [];
    if (!this.clientData) {
      return [];
    }
    var vn = this.clientData[KEY];
    vn = vn ? vn : [];
    for (var i = 0, n = vn.length; i < n; ++i) {
      ret.push(new VirtualNode(vn[i].name, node, vn[i].filters));
    }
    return ret;
  } else {
    return [];
  }
};

/**
 * Checks if node has virtual children.
 * @param node a connection or stream
 * @returns {*}
 */
VirtualNode.hasInNode = function (node) {
  if (node instanceof Pryv.Connection) {
    throw new Error('Virtual nodes having connection as parent not supported.');
  } else if (node instanceof Pryv.Stream) {
    return (node.clientData) && (node.clientData[KEY]) &&
      (node.clientData[KEY].length !== 0);
  } else {
    return false;
  }
};
