'use strict';

var fc = require('@turf/helpers').featureCollection;
var map = require('lodash').map;
var groupBy = require('lodash').groupBy;

/**
 * @func groupGeometriesById
 * Given an array of objects that represent field data geometries,
 * returns an array of objects that, for each road ids, include road geometries grouped by source.
 * @param geoms {array} array of field data goemetry representing data
 * @return {array} array of field data geometries grouped by road id
 */
exports.groupGeometriesById = function (geoms) {
  // first group geometries by road id.
  // this top level grouping allows for the 'group by source' to be applied to each road id's data
  geoms = groupBy(geoms, 'road_id');
  // for each road id group:
  //   1. take geometries and group them by source (aka sourceGroup)
  //   2. take each source group and generate a feature collection (aka sourceGeometries)   var groupedGeoms = map(geoms, (roadId ,k) => {
  var groupedGeoms = map(geoms, (roadId ,k) => {
     // group road id geometries by their source
    let sourceGroup = groupBy(roadId, 'source');
    // for each source group, make a feature collection
    sourceGroup = map(sourceGroup, (sourceGeometry, i) => {
      // transform each sourceGeometry into a feature collection representation of it
      sourceGeometry = map(sourceGeometry, (sourceObj, j) => {
        // make properties object that includes the sourceObj's source name as well as the roadId
        let props = {properties: {source: sourceObj.source, vProMMsId: k}};
        // parse geometry string to a json
        let geom = JSON.parse(sourceObj.geometry);
        // return props and geom as a single object (mirroring a geojson feature)
        return Object.assign(geom, props);
      });
      // after being passsed through the map function, sourceGeometry is an array of geojson features.
      // by passing it through turf's feature collection function, we turn it into a feature collection
      return fc(sourceGeometry);
    });
    // finally, take sourceGroup, currently an array of sourceGeometry feature collections,
    // and generate roadObject. roadObject is an obj with a key=roadId, and property=sourceGroup.
    const roadObject = {};
    roadObject[k] = sourceGroup;
    return roadObject;
  });
  // returned groupedGeoms, a list of roadObjects
  return groupedGeoms;
};

/**
 * given a list objects with road geometries, id, and source, creates a feature class from the array
 * @func makeGeomFC
 * @param {array} geoms list of objects, each of which including a road geometry, its road id, and its source
 * @return {featureCollection} feature collection for roads.
 */
exports.makeGeomsFC = function (geoms) {
  // make features, a list of geojson features, from the raw geoms arrayprovided
  let features = map(geoms, (geom, k) => {
    // first parse the stringified feature geometry generated from the ST_ASGeoJSON() query used as part of the endpoint
    const geometry = JSON.parse(geom.geometry);
    // genereate a properties object with the road_id and source provided too from the query
    const props = {properties:  {road_id: geom.road_id, source: geom.source}};
    // return a geojson feature including both the geometry and properties
    return Object.assign(geometry, props);
  });
  // return this list of features passed through the turn feature collection function, which returns a feature collection
  return fc(features);
};


/**
 * given a two arrays, one with road ids in the database, the other of road ids provided by api query
 * returns an array of objects showing which among the ids provided by the api query are in the database
 * @func mapExistingIds
 * @param {array} existingIds list of ids existing in the database
 * @param {array} ids list of ids provided by an api query
 * @return {array} array of objects where each object key is a road id, and each property is a boolean (true if in the db, false if not)
 */
exports.mapExistingIds = function (existingIds, ids) {
  // transform list of ids into objects denoting if they exist in the database
  return ids.map(id => {
    // isAnExistingId searches for `id` in the `existingids` list, then casts the search to a boolean. (true if found, false if not)
    const isAnExistingId = Boolean(existingIds.find(existingId => existingId.road_id === id));
    // return an object with a k=vprommsId and v=isAnExistingId
    const returnObj = {};
    returnObj[id] = isAnExistingId;
    return returnObj;
  });
};