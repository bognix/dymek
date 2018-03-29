const AWS = require('aws-sdk');
const uuid = require('uuid/v4')
const ddbGeo = require('dynamodb-geo');
const {dynamoDb, dynamoDbClient} =  require('./index');

const REPORTS_TABLE = process.env.REPORTS_TABLE;

const REPORTS_SUPPORTED_STATUSES = {
  RESOLVED: 'RESOLVED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  REJECTED: 'REJECTED',
  NEW: 'NEW'
}

const config = new ddbGeo.GeoDataManagerConfiguration(dynamoDb, REPORTS_TABLE);
config.longitudeFirst = true;
config.hashKeyLength = 5;
config.rangeKeyAttributeName = 'createdAt'
const reportsGeoTableManager = new ddbGeo.GeoDataManager(config);

class Report {}

function getReport(id) {
  return dynamoDbClient.query({
    TableName: REPORTS_TABLE,
    IndexName: 'reportId-index',
    ExpressionAttributeValues: {
      ':reportId': id
    },
    KeyConditionExpression: 'reportId=:reportId',
    Limit: 1
  }).promise()
  .then(({Items}) => {
    const report = new Report()
    return Object.assign(report, Items[0])
  }).catch((err) => {
    throw new Error(err)
  })
}

function getReportForMarker(marker) {
  return dynamoDbClient.query({
    TableName: REPORTS_TABLE,
    IndexName: 'geohash-index',
    KeyConditionExpression: 'geohash=:ghash and hashKey=:hkey',
    FilterExpression: '#t = :type',
    ExpressionAttributeValues: {
      ':hkey': marker.hashKey,
      ':ghash': marker.geohash,
      ':type': marker.type
    },
    ExpressionAttributeNames: {
      '#t': 'type'
    },
    Limit: 1
  }).promise()
  .then(({Items}) => {
    return Items[0]
  }).catch((err) => {
    throw new Error(err)
  })
}

function createReportForMarker(marker) {
  const createdAt = new Date().toISOString()
  const id = uuid();

  const report = {
    geohash: marker.geohash,
    hashKey: marker.hashKey,
    geoJson: marker.geoJson,
    type: marker.type,
    status: REPORTS_SUPPORTED_STATUSES.NEW,
    createdAt,
    id,
    updatedAt: createdAt,
  }

  return dynamoDbClient.put({
    TableName: REPORTS_TABLE,
    Item: report
  }).promise()
  .then(() => report)
  .catch((err) => {
    throw new Error(err)
  })
}


module.exports = {
  getReportForMarker,
  createReportForMarker
}
