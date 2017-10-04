'use strict';

var knex = require('./connection');
var readFileSync = require('fs').readFileSync;
Promise = require('bluebird');

/**
 * makes macrocosm schema
 * @func macrocosmSchema
 */
function macrocosmSchema (knex, Promise) {
  // statements to add macrocosm schema
  return knex.raw(readFileSync('../sql/macrocosm-db.sql').toString())
  .then(function() {})
  .catch(function(e) { throw new Error(e); });
}

/**
 * makes admin boundaries table 
 * @func adminBoundariesSchema schema
 */
function adminBoundariesSchema (knex, Promise) {
  // statements to add adminBoundariesSchema
  return knex.raw(readFileSync('../sql/201709141932_admin_boundaries.sql').toString())
  .then(function() {})
  .catch(function(e) { throw new Error(e); });
}

/**
 * makes properties schema
 * @func propertiesSchema
 */
function propertiesSchema (knex, Promise) {
  return knex.raw(readFileSync('../sql/201709142003_properties.sql').toString())
  .then(function() {})
  .catch(function(e) { throw new Error(e)});
}

/**
 * makes field data schema
 * @func fieldDataSchema
 */
function fieldDataSchema (knex, Promise) {
  return knex.raw(readFileSync('../sql/201709142329_field_data_geometries.sql').toString())
  .then(function() {})
  .catch(function(e) { throw new Error(e); });
}

/**
 * makes road stats schema
 * @func roadStatsSchema
 */
function roadStatsSchema (knex, Promise) {
  return knex.raw(readFileSync('../sql/201709142341_road_stats.sql').toString())
  .then(function() {})
  .catch(function(e) { throw new Error(e); });
}


// insert db schema by chaining each of the table's schema functions together
macrocosmSchema(knex, Promise)
.then(function() { return adminBoundariesSchema(knex, Promise); })
.then(function() { return propertiesSchema(knex, Promise); })
.then(function() { return fieldDataSchema(knex, Promise); })
.then(function() { return roadStatsSchema(knex, Promise); })
.catch(function(e) { throw new Error(e); })
.finally(function() { return knex.destroy(); });