'use strict';

const Boom = require('boom');
const {
  NO_ID,
  ONLY_PROPERTIES
} = require('./road-id-utils');

module.exports = {
  nullRoadIds: Boom.badData(
    'Failed to ingest data; ' +
    'cannot ingest invalid or missing road IDs. ' +
    'Please assign IDs to all roads, in the standard form ' +
    'of ###ZZ#####, and try uploading again. ' +
    `If a road truly has no ID, then assign an ID of '${NO_ID}'. ` +
    'If this is a run to collect IRI for many roads at a time, ' +
    `then assign an ID of '${ONLY_PROPERTIES}'.`
  ),
  unknownRoadIds: ids => Boom.notFound(
    'Failed to ingest data; ' +
    'found road IDs that are not known to the platform. ' +
    'Please add these road IDs to the platform first, ' +
    'or standardize IDs to the standard form of ###ZZ#####, ' +
    'or remove these roads from your data and upload again. ' +
    `If a road truly has no ID, then assign an ID of '${NO_ID}'. ` +
    'If this is a run to collect IRI for many roads at a time, ' +
    `then assign an ID of '${ONLY_PROPERTIES}'.`,
    ids
  ),
  badPaths: paths => Boom.badData(
    'Failed to ingest data; ' +
    'found file paths that don\'t contain a road ID, or ' +
    'contain road IDs that are not known to the platform. ' +
    'Please correct these file paths, or add these road IDs to the platform, ' +
    'or remove these roads from your data and upload again. ' +
    `If a road truly has no ID, then assign an ID of '${NO_ID}'. ` +
    'If this is a run to collect IRI for many roads at a time, ' +
    `then assign an ID of '${ONLY_PROPERTIES}'.`,
    paths
  ),
  alreadyIngested: Boom.badData(
    'All data in the upload is already present in the platform. ' +
    'No further action is required.'
  ),
  cannotUseNoId: Boom.badData(
    `Cannot use '${NO_ID}' as a road ID value in this type of upload. ` +
    'Please remove that data, or label it with a standard road ID.'
  ),
  cannotUseOnlyProperties: Boom.badData(
    `Cannot use '${ONLY_PROPERTIES}' as a road ID value in this type of upload. ` +
    'Please remove that data, or label it with a standard road ID.'
  ),

  // Errors solely for tabular uploads
  noCSV: Boom.badData(
    'No CSV provided, or cannot parse CSV'
  ),
  noCSVRows: Boom.badData(
    'CSV must contain data, but no rows detected'
  ),
  noDuplicateTabularHeaders: Boom.badData(
    'CSV cannot have duplicate column names'
  ),
  noQuotesInTabularHeader: Boom.badData(
    'Do not use quotes or commans in the CSV headers'
  ),
  noExtraQuotesInTabular: Boom.badData(
    'Do not use unnecessary quotations'
  )
};
