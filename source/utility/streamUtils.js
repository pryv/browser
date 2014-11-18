var streamUtils = module.exports = {};

var BgColorClientDataKey = streamUtils.BgColorClientDataKey = 'pryv-browser:bgColor',
    ChartClientDataKey = streamUtils.ChartClientDataKey = 'pryv-browser:charts';

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
 * @returns {string} The color
 */
streamUtils.setColor = function (stream, color) {
  if (! stream.clientData) {
    stream.clientData = {};
  }
  stream.clientData[BgColorClientDataKey] = color;
  return color;
};

/**
 * Gets the stream's chart settings for the given event type, if any.
 *
 * @param {Stream} stream
 * @param {string} type
 * @returns {object} The chart settings object, or null if not found
 */
streamUtils.getChartSettingsForType = function (stream, type) {
  if (! stream || ! stream.clientData || ! stream.clientData[ChartClientDataKey] ||
      ! stream.clientData[ChartClientDataKey][type]) {
    return null;
  }

  return stream.clientData[ChartClientDataKey][type].settings || null;
};

/**
 * Sets the stream's chart settings for the given event type (initializing client data if needed).
 *
 * @param {Stream} stream
 * @param {string} type
 * @param {object} settings
 * @returns {object} The settings
 */
streamUtils.setChartSettingsForType = function (stream, type, settings) {
  if (! stream.clientData) {
    stream.clientData = {};
  }
  if (! stream.clientData[ChartClientDataKey]) {
    stream.clientData[ChartClientDataKey] = {};
  }
  if (! stream.clientData[ChartClientDataKey][type]) {
    stream.clientData[ChartClientDataKey][type] = {};
  }
  stream.clientData[ChartClientDataKey][type].settings = settings;
  return settings;
};
