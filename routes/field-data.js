'use strict';

var knex = require('../connection.js');
var Boom = require('boom');
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
function groupGeometriesById(geoms) {
  // first group geometries by road id.
  // this top level grouping allows for the 'group by source' to be applied to each road id's data
  geoms = groupBy(geoms, 'road_id');
  // for each road id group:
  //   1. take geometries and group them by source (aka sourceGroup)
  //   2. take each source group and generate a feature collection (aka sourceGeometries)
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
}

module.exports = [
  {
  /**
   * @api {get} /field/{ids}/geometries Group Road field data by source
   * @apiGroup Field Data
   * @apiName FieldGeometries
   * @apiDescription Returns list of each road id's field data, grouped by source (either RoadLabPro or RouteShoot)
   * @apiVersion 0.1.0
   * 
   * @apiExample {curl} Example Usage:
   *    curl http://localhost:4000/field/024LC00002,024LC00001/geometries
   *
   * @apiSuccessExample {json} Success-Response:
   *  [
   *    {
   *      '024LC00002' : [
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RoadLabPro',
   *            vProMMs: '024LC00002' 
   *          }
   *        },
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RouteShoot',
   *            vProMMs: '024LC00002'
   *          }
   *        }
   *      ],
   *    },
   *    {
   *      '024LC00001' : [
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RoadLabPro',
   *            vProMMs: '024LC00001' 
   *          }
   *        },
   *        {
   *          type: "FeatureCollection",
   *          features: [
   *            {
   *              type: 'Line',
   *              coordinates: [...]
   *            }
   *          ],
   *          properties: {
   *            source: 'RouteShoot',
   *            vProMMs: '024LC00001'
   *          }
   *        }
   *      ]
   *    }
   *  ]
   *  ...
   */
    method: 'GET',
    path: '/field/{ids}/geometries',
    handler: function (req, res) {
      // get the vpromms id supplied in request parameters
      const ids = req.params.ids.split(',');
      // select roads with
      knex('field_data_geometries')
      .whereIn('road_id', ids)
      .select('type as source', 'road_id', knex.raw(`ST_AsGeoJSON(geom) as geometry`))
      .then(geoms => {
        let groupedGeometries = groupGeometriesById(geoms);
        res(groupedGeometries);
      })
      .catch(e => {
        // deal with any errors
        console.log(e);
        res(Boom.wrap(e));
      });
    }
  }
];
