var streamUtils = module.exports = {};

var BgColorClientDataKey = streamUtils.BgColorClientDataKey = 'pryv-browser:bgColor';

/**
 * Gets the stream's color (if any) from its client data.
 *
 * @param {Stream} stream
 * @param {boolean} lookupAncestors If true, the stream's color will fall back to that of the
 *                                  nearest ancestor, if any (default: true)
 * @returns {string} The hex color code (e.g. "#FFF")
 */
streamUtils.getColor = function (stream, lookupAncestors) {
  if (! stream) { return ''; }

  if (stream.clientData && stream.clientData[BgColorClientDataKey]) {
    return stream.clientData[BgColorClientDataKey];
  }
  if (lookupAncestors !== false && stream.parent) {
    return streamUtils.getColor(stream.parent);
  }
  return '';
};

/**
 * Sets the stream's color (initializing client data if needed).
 *
 * @param stream
 * @param {string} color Hex color code
 */
streamUtils.setColor = function (stream, color) {
  if (! stream.clientData) {
    stream.clientData = {};
  }
  stream.clientData[BgColorClientDataKey] = color;
};
