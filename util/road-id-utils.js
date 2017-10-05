'use strict';

const path_ = require('path');
const _ = require('lodash');

// These are often specific to the country and road ID schema of use
const ROAD_ID_PATTERN = /^(\d{3}[A-Za-z]{2}\d{1,5}).*?$/;

function standardizeRoadId (roadId) {
  // Pad the second set of numbers in a VPRoMMS road ID using zeros
  if (roadId.length < 10) {
    roadId = roadId.slice(0,5)
      .concat(_.padStart(roadId.slice(5), 5, '0'));
  }
  return roadId.toUpperCase();
};

module.exports = {
  ROAD_ID_PATTERN,
  standardizeRoadId,
  getRoadIdFromPath: path => {
    // Check each ancestor directory name for a valid road ID
    const pathParts = path.split(path_.sep).reverse();
    const roadId = pathParts.reduce((found, one) => {
      if (!found) {
        const match = one.match(ROAD_ID_PATTERN);
        if (match) { found = standardizeRoadId(match[1]); }
      }
      return found;
    }, null);
    return roadId;
  },
  getResponsibilityFromRoadId: roadId => {
    // Extract the road's responsibility from its ID
    const RESPONSIBILITIES = {
      '1': 'national',
      '2': 'provincial',
      '3': 'district',
      '4': 'commune',
      '5': 'village',
      '6': 'rural',
      '7': 'special',
      '8': null,
      '9': null,
      '0': null
    };
    const RESPONSIBILITY_PATTERN = /^\d{2}(\d)[a-zA-Z]{2}\d{5}$/;
    const match = roadId.match(RESPONSIBILITY_PATTERN);
    if (match) {
      return RESPONSIBILITIES[match[1]];
    } else {
      return null;
    }
  }
};
