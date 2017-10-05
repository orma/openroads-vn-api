'use strict';

const _ = require('lodash');
const fastCSV = require('fast-csv');
const midpoint = require('turf-midpoint');
const moment = require('moment');
const point = require('turf-point');
const getRoadIdFromPath = require('../util/road-id-utils').getRoadIdFromPath;

function parseRow (csvRow) {
  const DATE_STRING_FORMAT = 'HH:mm:ss YYYY-MMMM-DD';
  const USED_PROERTIES = ['time', 'start_lat', 'start_lon', 'end_lat', 'end_lon'];

  const coord = midpoint(
    point([Number(csvRow.start_lon), Number(csvRow.start_lat)]),
    point([Number(csvRow.end_lon), Number(csvRow.end_lat)])
  );

  return {
    geom: coord.geometry,
    datetime: moment(csvRow.time, DATE_STRING_FORMAT).toDate(),
    properties: _.omit(csvRow, USED_PROERTIES)
  };
};

module.exports = async function (path, contentsStream) {
  const roadId = getRoadIdFromPath(path);
  let rows = [];
  return new Promise(resolve =>
    contentsStream.pipe(fastCSV
      .parse({headers: true})
      .on('data', d => {
        const row = parseRow(d);
        row.road_id = roadId;
        row.source = 'RoadLabPro';
        rows = rows.concat(row);
      })
      .on('end', () => {
        resolve(rows);
      })
    )
  );
};
