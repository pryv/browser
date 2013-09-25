
var _ = require('underscore');
var TreemapUtils = module.exports = TreemapUtils || {};
TreemapUtils.sumArray = function (nodes) {
  // Use one adding function rather than create a new one each
  // time sumArray is called.
  return _.reduce(TreemapUtils._extractWeight(nodes), function (memo, num) {
    return memo + num;
  }, 0);

};
TreemapUtils._getMaxWeight = function (nodes) {
  return Math.max.apply(null, TreemapUtils._extractWeight(nodes));
};
TreemapUtils._getMinWeight = function (nodes) {
  return Math.min.apply(null, TreemapUtils._extractWeight(nodes));
};
TreemapUtils._extractWeight = function (nodes) {
  var result = [];
  _.each(nodes, function (node) {
    result.push(node.normalizedWeight);
  });
  return result;
};
//
// Treemap squarify layout function.
//  rect - containing rectangle; an array of 4 values x, y, width, height
//  vals - array of (normalized) float values each representing percent contribution to
//  total area of containing rectangle
//
// Non-recursive implementation of the squarify treemap layout algorithm published in:
// "Squarified Treemaps" by Mark Bruls, Kees Huizing and Jarke J. van Wijk
// http://www.win.tue.nl/~vanwijk/stm.pdf
//
// Includes tips and tricks from:
// http://ejohn.org/blog/fast-javascript-maxmin/#postcomment
//
TreemapUtils.squarify = function (rect, vals) {
  // console.log('squrify begin');

  var Subrectangle = function (rect) {
    this.setX = function (x) {
      rect.width -= x - rect.x;
      rect.x = x;
    };
    this.setY = function (y) {
      rect.height -= y - rect.y;
      rect.y = y;
    };
    this.getX = function () {
      return rect.x;
    };
    this.getY = function () {
      return rect.y;
    };
    this.getW = function () {
      return rect.width;
    };
    this.getH = function () {
      return rect.height;
    };
    this.getWidth = function () {
      return Math.min(rect.width, rect.height);
    };
  };
  //
  // The function worst() gives the highest aspect ratio of a list
  // of rectangles, given the length of the side along which they are to
  // be laid out.
  // Let a list of areas R be given and let s be their total sum. Then the function worst is
  // defined by:
  // worst(R,w) = max(max(w^2r=s^2; s^2=(w^2r)))
  //              for all r in R
  // Since one term is increasing in r and the other is decreasing, this is equal to
  //              max(w^2r+=(s^2); s^2=(w^2r-))
  // where r+ and r- are the maximum and minimum of R.
  // Hence, the current maximum and minimum of the row that is being laid out.
  //
  var worst = function (r, w) {
    var rMax = TreemapUtils._getMaxWeight(r);
    var rMin = TreemapUtils._getMinWeight(r);

    var s = TreemapUtils.sumArray(r);
    var sSqr = s * s;
    var wSqr = w * w;
    return Math.max((wSqr * rMax) / sSqr, sSqr / (wSqr * rMin));
  };

  // Take row of values and calculate the set of rectangles
  // that will fit in the current subrectangle.
  var layoutrow = function (row) {
    var x = subrect.getX(),
      y = subrect.getY(),
      maxX = x + subrect.getW(),
      maxY = y + subrect.getH(),
      rowHeight,
      i,
      w;

    if (subrect.getW() < subrect.getH()) {
      rowHeight = Math.ceil(TreemapUtils.sumArray(row) / subrect.getW());
      if (y + rowHeight >= maxY) { rowHeight = maxY - y; }
      for (i = 0; i < row.length; i++) {
        w = Math.ceil(row[i].normalizedWeight  / rowHeight);
        if (x + w > maxX || i + 1 === row.length) { w = maxX - x; }
        layout[row[i].uniqueId] = {x: x, y: y, width: w, height: rowHeight};

        x = (x + w);
      }
      subrect.setY(y + rowHeight);
    } else {
      rowHeight = Math.ceil(TreemapUtils.sumArray(row) / subrect.getH());
      if (x + rowHeight >= maxX) { rowHeight = maxX - x; }
      for (i = 0; i < row.length; i++) {
        w = Math.ceil(row[i].normalizedWeight  / rowHeight);
        if (y + w > maxY || i + 1 === row.length) { w = maxY - y; }
        // layout.push({x: x, y: y, width: rowHeight, height: w});
        layout[row[i].uniqueId] = {x: x, y: y, width: rowHeight, height: w};

        y = (y + w);
      }
      subrect.setX(x + rowHeight);
    }
  };

  // Pull values from input array until the aspect ratio of rectangles in row
  // under construction degrades.
  var buildRow = function (children) {
    var row = [];
    row.push(children.shift()); // descending input
    //row.push(children.pop()); // ascending input
    if (children.length === 0) {
      return row;
    }
    var newRow = row.slice();
    var w = subrect.getWidth();
    do {
      newRow.push(children[0]); // descending input
      //newRow.push(children[children.length-1]); // ascending input
      //  console.log('worst');
//      console.log(worst(row, w));
      if (worst(row, w) > worst(newRow, w)) {
        row = newRow.slice();
        children.shift(); // descending input
        //children.pop(); // ascending input
      }
      else {
        break;
      }
    } while (children.length > 0);
    return row;
  };

  // Non recursive version of Bruls, Huizing and van Wijk
  // squarify layout algorithim.
  // While values exist in input array, make a row with good aspect
  // ratios for its values then caclulate the row's geometry, repeat.
  var nrSquarify = function (children) {
    do {
      layoutrow(buildRow(children));
    } while (children.length > 0);
  };


  var layout = {};
  var newVals;

  newVals =  _.clone(_.sortBy(vals, function (num) {
    return num.normalizedWeight;
  }).reverse());

  var i;

  // if either height or width of containing rect are <= 0
  // simply copy containing rect to layout rects
  if (rect.width <= 0 || rect.height <= 0) {
    for (i = 0; i < vals.length; i++) {
      layout[vals[i].uniqueId] = rect;
    }
  } else { // else compute squarified layout
    _.each(newVals, function (val) {
      val.normalizedWeight = Math.round(val.normalizedWeight * rect.width * rect.height);

    });
    // vals come in normalized. convert them here to make them relative to containing rect
    // newVals = vals.map(function(item){return item*(rect.width*rect.height);});
    var subrect = new Subrectangle(rect);
    nrSquarify(newVals);
  }
  return layout;
};