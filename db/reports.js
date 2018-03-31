const AWS = require('aws-sdk');
const uuid = require('uuid/v4')
const ddbGeo = require('dynamodb-geo');
const {dynamoDb, dynamoDbClient} =  require('./index');
const markerDB =  require('./markers');
const notifier = require('../server/notifier');
const {getReportWithUserTokens} = require('../server/query');

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

class Report {};

function getReport(id, withMarkers = false) {
  return dynamoDbClient.query({
    TableName: REPORTS_TABLE,
    IndexName: 'id-index',
    KeyConditionExpression: 'id=:id',
    ExpressionAttributeValues: {
      ':id': id,
    },
    Limit: 1
  }).promise()
  .then(({Items}) => {
    const report = Object.assign(new Report(), Items[0]);
    if (withMarkers) {
      return markerDB.getMarkers({reportId: report.id})
        .then(markers => {
          return Object.assign({}, {markers}, report);
        })
    }
    return report;
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

    if (location) return reportsGeoTableManager.queryRadius({
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

    if (internal) {
      return dynamoDbClient.scan(params, (error, result) => {
        return resolve(result.Items)
      })
    }
  })
}

function updateReport(id, {status}) {
  if (!id) {
    throw new Error('Pass ID in order to update report')
  }

  if (status && !REPORTS_SUPPORTED_STATUSES[status]) {
    throw new Error('Status not supported')
  }

  if (!status) {
    throw new Error('Pass at least one parameter to change')
  }

  return getReportWithUserTokens(id)
  .then(resp => {
    const report = resp.data.node
    const oldStatus = report.status;

    if (oldStatus === status) {
      return Promise.resolve(report);
    }

    const ExpressionAttributeValues = {}
    const ExpressionAttributeNames = {}

    if (status) {
      ExpressionAttributeValues[':status'] = status
      ExpressionAttributeNames['#s'] = 'status'
    }

    const UpdateExpression = `set ${status ? '#s=:status' : ''}`

    return dynamoDbClient.update({
      TableName: REPORTS_TABLE,
      Key: {
        'hashKey': report.hashKey,
        'createdAt': report.createdAt
      },
      ExpressionAttributeValues,
      ExpressionAttributeNames,
      UpdateExpression,
    })
    .promise().then(() => {
      const tokens = Object.keys(report.markers.reduce((keys, marker) => {
        return Object.assign({}, {[marker.user.registrationToken]: true}, keys)
      }, {}));

      const reportMeta = {
        status: report.status,
        oldStatus,
        type: report.type,
        geoJson: report.geoJson,
      };

      notifier.publish({
        tokens: tokens,
        message: {
          title: 'Zmiana statusu zgłoszenia',
          body: `Twoje zgłoszenie zmieniło status z ${oldStatus} na ${status}`,
          meta: reportMeta
        }
      })
      return Object.assign(report, {status})
    })
  })
}

module.exports = {
  getReportForMarker,
  getReports,
  createReportForMarker,
  updateReport,
  getReport,
  Report
}
