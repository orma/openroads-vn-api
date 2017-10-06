'use strict';

const _ = require('lodash');
const fastCSV = require('fast-csv');
const linestring = require('turf-linestring');
const moment = require('moment');
const distance = require('@turf/distance');
const getRoadIdFromPath = require('../util/road-id-utils').getRoadIdFromPath;

moment.locale('en');

function cleanGeometry (points) {
  // If a sensor has not made a measurement for a while, then
  // assume that the shorter part of the road is erroneous data
  const TIME_DIFF_THRESHOLD = 2 * 60 * 1000;
  const DATE_STRING_FORMAT = 'HH:mm:ss YYYY-MMMM-DD';

  // Also, check for and exclude erroneous jumps in space
  // If they're too far away to be reasonable
  // Let's say a maximum realistic speed, including GPS uncertanty,
  // of 150 km/h. Convert to kilometers per millisecond, for ease of use later.
  const MAX_SPEED_THRESHOLD = 150 / 60 / 60 / 1000;

  const pieces = points.reduce((all, one) => {
    if (all[0].length === 0) { return [[one]]; }

    const currentPiece = _.last(all);
    const lastDatum = _.last(currentPiece);

    const previousTime = moment(lastDatum.time, DATE_STRING_FORMAT);
    const currentTime = moment(one.time, DATE_STRING_FORMAT);

    const timeDiff = currentTime - previousTime;

    const traveledKm = distance(
      [Number(lastDatum.longitude), Number(lastDatum.latitude)],
      [Number(one.longitude), Number(one.latitude)]
    );
    const speed = traveledKm / timeDiff;

    if (timeDiff <= TIME_DIFF_THRESHOLD && speed <= MAX_SPEED_THRESHOLD) {
      all[all.length - 1] = currentPiece.concat(one);
    } else {
      all = all.concat([[one]]);
    }
    return all;
  }, [[]]);

  // This'll work even if there's only one piece
  const longest = pieces.reduce((longest, one) =>
    one.length > longest.length ? one : longest
  , []);

  // Clean up the geometry into a linestring
  const geom = linestring(longest.map(d =>
    [Number(d.longitude), Number(d.latitude)]
  ));
  return geom;
}

module.exports = async function (path, contentsStream) {
  const roadId = getRoadIdFromPath(path);

  let points = [];
  return new Promise(resolve =>
    contentsStream.pipe(fastCSV
      .parse({headers: true})
      .on('data', d => { points = points.concat(d); })
      .on('end', async () => {
        resolve({
          road_id: roadId,
          type: 'RoadLabPro',
          geom: cleanGeometry(points)
        });
      })
    )
  );
};
