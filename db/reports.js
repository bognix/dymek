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

function getReports({location}, internal = false) {
  return new Promise ((resolve, reject) => {
    if (!location && !internal) {
      throw new Error('You need to provide at least one filter')
      return reject();
    }
    const params = {
      TableName: REPORTS_TABLE
    }
    let ExpressionAttributeNames = {}
    let ExpressionAttributeValues = {}

    return reportsGeoTableManager.queryRadius({
      RadiusInMeter: location.radius,
      CenterPoint: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    })
    .then((items) => {
      let filteredItems = items;

      return resolve(filteredItems.map(item => AWS.DynamoDB.Converter.unmarshall(item)))
    });
  })
}

module.exports = {
  getReportForMarker,
  getReports,
  createReportForMarker
}
