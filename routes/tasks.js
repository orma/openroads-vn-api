'use strict';

var Boom = require('boom');
const knex = require('../connection');
const queryWays = require('../services/query-ways');
const toGeoJSON = require('../services/osm-data-to-geojson');

const properties = ['id', 'way_id', 'neighbors'];

async function getNextTask (req, res) {
  const skip = req.query.skip ? req.query.skip.split(',') : [];
  const task = await knex.select(properties)
  .from('tasks')
  .where('pending', false)
  .whereNotIn('id', skip)
  .limit(1);
  if (!task.length) return res(Boom.notFound('There are no pending tasks'));
  const ids = [task[0].way_id].concat(task[0].neighbors);
  queryWays(knex, ids).then(function (ways) {
    return res({
      id: task[0].id,
      data: toGeoJSON(ways)
    }).type('application/json');
  }).catch(function () {
    return res(Boom.badImplementation('Could not retrieve task'));
  });
}

async function getTask (req, res) {
  const task = await knex.select(properties)
  .from('tasks')
  .where('id', req.params.taskId)
  if (!task.length) return res(Boom.notFound('No task with that ID'));
  const ids = [task[0].way_id].concat(task[0].neighbors);
  queryWays(knex, ids).then(function (ways) {
    return res({
      id: task[0].id,
      data: toGeoJSON(ways)
    }).type('application/json');
  }).catch(function () {
    return res(Boom.badImplementation('Could not retrieve task'));
  });
}

async function setTaskPending (req, res) {
  knex('tasks').where('id', req.params.taskId).update({pending: true})
  .then(function () {
    return res(req.params.taskId);
  }).catch(function () {
    return res(Boom.badImplementation('Could not update task'));
  });
}

module.exports = [
  {
    /**
     * @api {get} /tasks/next GeoJSON - Get the next available task
     * @apiGroup Tasks
     * @apiName GetNextTask
     * @apiVersion 0.3.0
     *
     * @apiParam {Array} skip List of task ID's to exclude from this response.
     *
     * @apiSuccess {GeoJSON} data FeatureCollection of Roads that require merging and/or joining.
     * @apiSuccess {Integer} id Current task ID
     *
     * @apiExample {curl} Example Usage:
     *    curl http://localhost:4000/tasks/next?skip=2
     *
     * @apiSuccessExample {json} Success-Response:
     *  {
     *  "id": 1,
     *  "data": {
     *    "type": "FeatureCollection",
     *      "properties": {},
     *      "features": [
     *        {
     *          "type": "Feature",
     *          "properties": {
     *            "highway": "secondary",
     *            "or_vpromms_id": "213TT00008"
     *          },
     *          "meta": {
     *            "id": "87",
     *            "changeset": "1",
     *            "timestamp": "2017-10-04T21:48:20.702Z",
     *            "version": "1"
     *          },
     *          "geometry": {
     *            "type": "LineString",
     *            "coordinates": [[123.8149137,9.5920337],
     *              ...
     *            ]}
     *        },
     *      ...]
     *    }
     *  }
     */
    method: 'GET',
    path: '/tasks/next',
    handler: getNextTask
  },

  {
    /**
     * @api {get} /tasks/:id GeoJSON - Get a specific task
     * @apiGroup Tasks
     * @apiName GetTask
     * @apiVersion 0.3.0
     *
     * @apiSuccess {GeoJSON} data FeatureCollection of Roads that require merging and/or joining.
     * @apiSuccess {Integer} id current task ID
     *
     * @apiExample {curl} Example Usage:
     *    curl http://localhost:4000/tasks/1
     *
     * @apiSuccessExample {json} Success-Response:
     *  {
     *  "id": 1,
     *  "data": {
     *    "type": "FeatureCollection",
     *      "properties": {},
     *      "features": [
     *        {
     *          "type": "Feature",
     *          "properties": {
     *            "highway": "secondary",
     *            "or_vpromms_id": "213TT00008"
     *          },
     *          "meta": {
     *            "id": "87",
     *            "changeset": "1",
     *            "timestamp": "2017-10-04T21:48:20.702Z",
     *            "version": "1"
     *          },
     *          "geometry": {
     *            "type": "LineString",
     *            "coordinates": [[123.8149137,9.5920337],
     *              ...
     *            ]}
     *        },
     *      ...]
     *    }
     *  }
     */
    method: 'GET',
    path: '/tasks/{taskId}',
    handler: getTask
  },

  {
    /**
     * @api {PUT} /tasks/:id Update a task's status to 'pending'
     * @apiGroup Tasks
     * @apiName UpdateTask
     * @apiVersion 0.3.0
     * @apiDescription Set a task status to pending.
     * Returns the updated task ID.
     *
     * @apiExample {curl} Example Usage:
     *  curl -X PUT http://localhost:4000/tasks/1
     */
    method: 'PUT',
    path: '/tasks/{taskId}/pending',
    handler: setTaskPending
  }
];
