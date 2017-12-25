'use strict';
const Boom = require('boom');
const {
  applyPatch,
  validate
} = require('fast-json-patch');
const knex = require('../connection.js');
const {
  groupBy,
  some,
  get,
  map
} = require('lodash');


const validateId = (id) => /^\d{3}([A-ZĐ]{2}|00)\d{5}$/.test(id);
const PAGE_SIZE = 20;


function getHandler (req, res) {
  const sortField = req.query.sortField || 'id';
  const sortOrder = req.query.sortOrder || 'asc';
  const page = req.query.page === undefined ? 1 : parseInt(req.query.page);
  const province = req.query.province;
  const district = req.query.district;

  if (sortField !== 'id' && sortField !== 'hasOSMData') {
    return res(Boom.badData(`Expected 'sortField' query param to be either 'id', 'hasOSMData', or not included.  Got ${req.query.sortField}`));
  }
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    return res(Boom.badData(`Expected 'sortOrder' query param to be either 'asc', 'desc', or not included.  Got ${req.query.sortOrder}`));
  }

  if (page === 0 || isNaN(page)) {
    return res(Boom.badData(`Expected 'page' query param to be a number >= 1, or not included.  Got ${req.query.page}`));
  }


  knex('road_properties as roads')
    .select('roads.id', 'roads.properties', 'ways.visible AS hasOSMData')
    .distinct('roads.id')
    .modify(function(queryBuilder) {
      if (province && district) {
        queryBuilder.whereRaw(`id LIKE '${province}_${district}%'`);
      } else if (province) {
        queryBuilder.whereRaw(`id LIKE '${province}%'`);
      }
    })
    .leftJoin(knex.raw(`(SELECT way_id, v FROM current_way_tags WHERE k = 'or_vpromms') AS tags`), 'roads.id', 'tags.v')
    .leftJoin(knex.raw(`(SELECT id AS way_id, visible FROM current_ways WHERE visible = true) AS ways`), 'tags.way_id', 'ways.way_id')
    .orderBy(sortField, sortOrder)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
  .then(function(response) {
    return res(
      response.map(({ id, properties, hasOSMData }) => ({
        id, properties, hasOSMData: !!hasOSMData
      }))
    ).type('application/json');
  })
  .catch(function(err) {
    console.error('Error GET /properties/roads', err);
    return res(Boom.badImplementation());
  });
}


function getByIdHandler (req, res) {
  knex('road_properties AS roads')
    .select('roads.id', 'roads.properties', 'tags.v', 'ways.visible')
    .distinct('roads.id')
    .leftJoin(knex.raw(`(SELECT way_id, v FROM current_way_tags WHERE k = 'or_vpromms') AS tags`), 'roads.id', 'tags.v')
    .leftJoin(knex.raw(`(SELECT id AS way_id, visible FROM current_ways WHERE visible = true) AS ways`), 'tags.way_id', 'ways.way_id')
    .where({ id: req.params.road_id })
  .then(function([row]) {
    if (row === undefined) {
      return res(Boom.notFound());
    }

    return res({
      id: row.id,
      properties: row.properties,
      hasOSMData: !!row.visible
    }).type('application/json');
  })
  .catch(function(err) {
    console.error('Error GET /properties/roads/{road_id}', err);
    return res(Boom.badImplementation());
  });
}


function getByIdGeoJSONHandler (req, res) {
  const id = req.params.road_id;

  knex.raw(`
    SELECT
        cw.id AS way_id,
        ST_ASTEXT(ST_MAKEPOINT(
            cn.longitude::FLOAT / 10000000,
            cn.latitude::FLOAT / 10000000
        )) AS point
    FROM current_way_tags AS cwt
    LEFT JOIN current_ways AS cw
        ON cwt.way_id = cw.id
    LEFT JOIN current_way_nodes AS cwn
        ON cw.id = cwn.way_id
    LEFT JOIN current_nodes AS cn
        ON cwn.node_id = cn.id
    WHERE cwt.k = 'or_vpromms' AND
        cw.visible AND
        cwt.v = '${id}'
    ORDER BY cw.id,
        cwn.sequence_id
  `)
    .then(function({ rows }) {
      const features = map(
        groupBy(rows, row => get(row, 'way_id')),
        wayPoints => ({
          type: 'Feature',
          properties: { id },
          geometry: {
            type: 'LineString',
            coordinates: map(wayPoints, ({ point }) => ([
              parseFloat(/[0-9\.]+/.exec(point)[0]),
              parseFloat(/ [0-9\.]+/.exec(point)[0])
            ]))
          }
        })
      );

      return res({
        type: 'FeatureCollection',
        features
      }).type('application/json');
    })
    .catch(function(err) {
      console.error('Error GET /field/geometries/{id}', err);
      return res(Boom.badImplementation());
    });
};


function getCountHandler (req, res) {
  const province = req.query.province;
  const district = req.query.district || '';


  knex('road_properties as roads')
    .select('roads.id', 'ways.visible AS hasOSMData')
    .distinct('roads.id')
    .leftJoin(knex.raw(`(SELECT way_id, v FROM current_way_tags WHERE k = 'or_vpromms') AS tags`), 'roads.id', 'tags.v')
    .leftJoin(knex.raw(`(SELECT id AS way_id, visible FROM current_ways WHERE visible = true) AS ways`), 'tags.way_id', 'ways.way_id')
    .modify(function(queryBuilder) {
      if (province && district) {
        queryBuilder.whereRaw(`id LIKE '${province}_${district}%'`);
      } else if (province) {
        queryBuilder.whereRaw(`id LIKE '${province}%'`);
      }

      queryBuilder.distinct('id');
    })
  .then(function(rows) {
    res({
      count: rows.length,
      osmCount: rows.filter(({ hasOSMData }) => hasOSMData).length
    }).type('application/json');
  })
  .catch(function(err) {
    console.error('Error GET /properties/roads/count', err);
    return res(Boom.badImplementation());
  });
}


function createHandler(req, res) {
  if (!validateId(req.params.road_id)) {
    return res(Boom.badData());
  }

  knex('road_properties')
    .insert({
      id: req.params.road_id,
      properties: {}
    })
  .then(function(response) {
    return res({ id: req.params.road_id }).type('application/json');
  })
  .catch(function(err) {
    if (err.constraint === 'road_properties_pkey') {
      return res(Boom.conflict());
    }

    console.error('Error PUT /properties/roads/{road_id}', err);
    return res(Boom.badImplementation());
  });
}

function moveHandler(req, res) {
  if (!validateId(req.payload.id)) {
    return res(Boom.badData());
  }

  return knex('road_properties')
    .where({ id: req.params.road_id })
    .update({
      id: req.payload.id
    })
  .then(function(response) {
    if (response === 0) {
      // no road_properties rows were updated, meaning id does not exist
      // return a 404 Not Found
      throw new Error('404');
    }
    return response;
  })
  .then(function() {
    return knex('current_way_tags')
      .where({
        k: 'or_vpromms',
        v: req.params.road_id
      })
      .update({
        v: req.payload.id
      });
  })
  .then(function(response) {
    return res({ id: req.payload.id }).type('application/json');
  })
  .catch(function(err) {
    if (err.constraint === 'road_properties_pkey') {
      return res(Boom.conflict());
    }

    if (err.message === '404') {
      return res(Boom.notFound());
    }

    console.error('Error POST /properties/roads/{road_id}/move', err);
    return res(Boom.badImplementation());
  });
}

function deleteHandler(req, res) {
  return knex('field_data_geometries')
    .where('road_id', req.params.road_id)
    .update({
      road_id: null
    })
  .then(function() {
    return knex('point_properties')
      .where('road_id', req.params.road_id)
      .update({
        road_id: null
      });
  })
  .then(function() {
    return knex('road_properties')
      .where('id', req.params.road_id)
      .delete();
  })
  .then(function(response) {
    if (response === 0) {
      return res(Boom.notFound());
    }

    res();
  })
  .catch(function(err) {
    console.error('Error: DELETE /properties/roads/{road_id}', err);
    return res(Boom.badImplementation());
  });
}


function patchPropertyHandler(req, res) {
  if (
    validate(req.payload) !== undefined ||
    some(req.payload, ({ path }) => path.match(/\//g).length > 1)
  ) {
    return res(Boom.badData());
  }

  return knex('road_properties')
    .select('id', 'properties')
    .where({ id: req.params.road_id })
  .then(function([response]) {
    if (response === undefined) {
      return res(Boom.notFound());
    }

    return knex('road_properties')
      .where({ id: req.params.road_id })
      .update({ properties: applyPatch(response.properties, req.payload).newDocument });
  })
  .then(function() {
    res();
  })
  .catch(function(err) {
    console.error('Error: PUT /properties/roads/{road_id}', err);
    return res(Boom.badImplementation());
  });
}


module.exports = [
  /**
   * @api {get} /properties/roads?province=XX&district=YY&page=ZZ&sortOrder=asc Get Roads
   * @apiGroup Properties
   * @apiName Get Roads
   * @apiVersion 0.3.0
   *
   * @apiParam {String} province filter by province
   * @apiParam {String} district filter by district
   * @apiParam {Number} page request page number
   * @apiParam {String} sortField [id|hasOSMData]
   * @apiParam {String} sortOrder [asc|desc]
   *
   * @apiSuccessExample {JSON} Success-Response
   * [
   *   {
   *     "id": "212TH00002",
   *     "hasOSMData": true,
   *     "properties": { ... }
   *   },
   *   {
   *     "id": "212TH00004",
   *     "hasOSMData": false,
   *     "properties": { ... }
   *   },
   *   ...
   * ]
   *
   * @apiExample {curl} Example Usage:
   *  curl -X GET localhost:4000/properties/roads?page=1&sortField=id&sortOrder=asc&province=21&district=TH
   */
  {
    method: 'GET',
    path: '/properties/roads',
    handler: getHandler
  },
  /**
   * @api {get} /properties/roads/:id Get Road
   * @apiGroup Properties
   * @apiName Get Road
   * @apiVersion 0.3.0
   *
   * @apiSuccessExample {JSON} Success-Response
   * {
   *   "id": "212TH00030",
   *   "hasOSMData": true,
   *   "properties": { ... }
   * }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X GET localhost:4000/properties/roads/212TH00030
   */
  {
    method: 'GET',
    path: '/properties/roads/{road_id}',
    handler: getByIdHandler
  },
  /**
   * @api {get} /properties/roads/:id.geojson Get Road GeoJSON
   * @apiGroup Properties
   * @apiName Get Road As GeoJSON
   * @apiVersion 0.3.0
   *
   * @apiSuccessExample {JSON} Success-Response
   * {
   *     "type": "FeatureCollection",
   *     "features": [
   *         {
   *             "type": "Feature",
   *             "properties": { "id": "212TH00030" },
   *             "geometry": {
   *                 "type": "LineString",
   *                 "coordinates": [...]
   *             }
   *        }
   *     ]
   * }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X GET localhost:4000/properties/roads/212TH00030.geojson
   */
  {
    method: 'GET',
    path: '/properties/roads/{road_id}.geojson',
    handler: getByIdGeoJSONHandler
  },
  /**
   * @api {get} /properties/roads/count?province=XX&district=YY Get Road Counts
   * @apiGroup Properties
   * @apiName Get Road Count
   * @apiVersion 0.3.0
   *
   * @apiSuccessExample {JSON} Success-Response
   * {
   *   "count": 2805,
   *   "osmCount": 252,
   *   "pageCount": 141,
   *   "pageSize": 20
   * }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X GET localhost:4000/properties/roads/count?province=21
   */
  {
    method: 'GET',
    path: '/properties/roads/count',
    handler: getCountHandler
  },
  /**
   * @api {PUT} /properties/roads/:id Create road
   * @apiGroup Properties
   * @apiName Create road
   * @apiVersion 0.3.0
   *
   * @apiParam {String} id new road id
   *
   * @apiErrorExample {json} Error-Response
   *     Road already exists
   *     HTTP/1.1 409 Conflict
   *     {
   *       error: "Conflict",
   *     }
   * @apiErrorExample {json} Error-Response
   *     Road id is invalid
   *     HTTP/1.1 422 Unprocessable Entity
   *     {
   *       error: "Unprocessable Entity"
   *     }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X PUT http://localhost:4000/properties/roads/123
   */
  {
    method: 'PUT',
    path: '/properties/roads/{road_id}',
    handler: createHandler
  },
  /**
   * @api {PATCH} /properties/roads/:id Patch road properties
   * @apiGroup Properties
   * @apiName Patch road properties
   * @apiVersion 0.3.0
   *
   * @apiParam {String} id road id
   * @apiParam {String} json-patch patch operations to apply to road properties.  See https://tools.ietf.org/html/rfc6902 for spec details.
   *
   * @apiErrorExample {json} Error-Response
   *     Patch operations are invalid
   *     HTTP/1.1 422 Unprocessable Entity
   *     {
   *       error: "Unprocessable Entity"
   *     }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X PATCH- H "Content-Type: application/json-patch+json" -d '[{"op": "replace", path: "/Risk Score", value: "2"}]' http://localhost:4000/properties/roads/123
   */
  {
    method: 'PATCH',
    path: '/properties/roads/{road_id}',
    handler: patchPropertyHandler
  },
  /**
   * @api {POST} /properties/roads/:id/move Rename road id
   * @apiGroup Properties
   * @apiName Rename road id
   * @apiVersion 0.3.0
   *
   * @apiParam {String} id new road id
   *
   * @apiErrorExample {json} Error-Response
   *     Road already exists
   *     HTTP/1.1 409 Conflict
   *     {
   *       error: "Conflict",
   *     }
   * @apiErrorExample {json} Error-Response
   *     Road id is invalid
   *     HTTP/1.1 422 Unprocessable Entity
   *     {
   *       error: "Unprocessable Entity"
   *     }
   *
   * @apiExample {curl} Example Usage:
   *  curl -X POST -H "Content-Type: application/json" -d '{"id": "456"}' http://localhost:4000/properties/roads/123/move
   */
  {
    method: 'POST',
    path: '/properties/roads/{road_id}/move',
    handler: moveHandler
  },
  /**
   * @api {DELETE} /properties/roads/:id Delete road
   * @apiGroup Properties
   * @apiName Delete road
   * @apiVersion 0.3.0
   *
   * @apiParam {String} id road id
   *
   * @apiExample {curl} Example Usage:
   *  curl -X DELETE http://localhost:4000/properties/roads/456
   */
  {
    method: 'DELETE',
    path: '/properties/roads/{road_id}',
    handler: deleteHandler
  }
];
