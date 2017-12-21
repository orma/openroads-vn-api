'use strict';

const path_ = require('path');

// These are often specific to the country and road ID schema of use

const NO_ID = 'NO_ID';
const ONLY_PROPERTIES = 'ONLY_PROPERTIES';

const getRoadIdFromPath = (path, existingRoadIds) => {
  // Check each ancestor directory name for a valid road ID
  existingRoadIds = existingRoadIds.concat([NO_ID, ONLY_PROPERTIES]);
  const pathParts = path.split(path_.sep).reverse();
  const roadId = pathParts.reduce(
    (found, one) => found || (existingRoadIds.includes(one) && one) || null,
    null
  );
  return roadId;
};

module.exports = {
  NO_ID,
  ONLY_PROPERTIES,
  getRoadIdFromPath
};
