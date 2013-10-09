/**
 * With grunt, mocha is called programmatically so we need to explicitly wrap blanket this way.
 */
require('blanket')({
  // Only files that match the pattern will be instrumented
  pattern: ['/source/']
});
