const AWS = require('aws-sdk');
const uuid = require('uuid/v4')
const ddbGeo = require('dynamodb-geo');

const MARKERS_TABLE = process.env.MARKERS_TABLE;
const DEV_DB_PORT = process.env.DEV_DB_PORT
const IS_OFFLINE = process.env.IS_OFFLINE;

const MARKERS_SUPPORTED_TYPES = {
  DOOG_POOP: 1,
  ILLEGAL_PARKING: 2,
  CHIMNEY_SMOKE: 3
}

let dynamoDb
let dynamoDbClient
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${DEV_DB_PORT}`)
  })
  dynamoDbClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: `http://localhost:${DEV_DB_PORT}`
  })
} else {
  dynamoDb = new AWS.DynamoDB();
  dynamoDbClient = new AWS.DynamoDB.DocumentClient()
}

const config = new ddbGeo.GeoDataManagerConfiguration(dynamoDb, MARKERS_TABLE);
config.longitudeFirst = true;
config.hashKeyLength = 5;
config.rangeKeyAttributeName = 'createdAt'
const markersGeoTableManager = new ddbGeo.GeoDataManager(config);

class Marker {}

function getMarker(id) {
  return dynamoDbClient.query({
    TableName: MARKERS_TABLE,
    IndexName: 'id-index',
    ExpressionAttributeValues: {
      ':id': id
    },
    KeyConditionExpression: 'id=:id',
    Limit: 1
  }).promise().then(({Items}) => {
    const marker = new Marker()
    return Object.assign(marker, Items[0])
  })
}

function createMarker(latitude, longitude, type, userId) {
  const createdAt = new Date().toISOString()
  const id = uuid();

  if (!Object.keys(MARKERS_SUPPORTED_TYPES).includes(type)) {
    throw new Error('Not supported type')
  }

  if (!latitude || !longitude) {
    throw new Error('Lat or Long not set');
  }

  const latitudeNum = Number(latitude);
  const longitudeNum = Number(longitude);

  if (isNaN(latitudeNum) || isNaN(longitudeNum)) {
    throw new Error('Lat or Long has invalid form');
  }

  if (!userId) {
    throw new Error('You can not post markers as not identified user');
  }

  if (!type) {
    throw new Error('You can not create marker without a type');
  }

  return markersGeoTableManager.putPoint({
    RangeKeyValue: { S: createdAt },
    GeoPoint: {
      latitude: latitude,
      longitude: longitude
    },
    PutItemInput: {
      Item: {
        type: { N: MARKERS_SUPPORTED_TYPES[type].toString() },
        userId: { S: userId },
        id: { S: id }
      }
    }
  }).promise().then(() => getMarker(id))
}

function getMarkers({userId, markerType, location}, internal) {
  return new Promise ((resolve, reject) => {
    if (!location && !userId && !markerType && !internal) {
      throw new Error('You need to provide at least one filter')
      return reject();
    }
    const params = {
      TableName: MARKERS_TABLE
    }
    let ExpressionAttributeNames = {}
    let ExpressionAttributeValues = {}

    if (markerType && !Object.keys(MARKERS_SUPPORTED_TYPES).includes(markerType)) {
      throw new Error('Not supported type')
    }

    if (location) {
      return markersGeoTableManager.queryRadius({
        RadiusInMeter: location.radius,
        CenterPoint: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      })
      .then((items) => {
        let filteredItems = items;
        if (userId) {
          filteredItems = filteredItems.filter(item => {
            return item.userId.S === userId
          })
        }

        if (markerType) {
          filteredItems = filteredItems.filter(item => {
            return item.type.N === MARKERS_SUPPORTED_TYPES[markerType].toString()
          })
        }
        return resolve(filteredItems.map(item => AWS.DynamoDB.Converter.unmarshall(item)))
      });
    }

    // use userId-createdAt-index
    if (userId) {
      params.IndexName = "userId-createdAt-index"
      ExpressionAttributeValues[':userId'] = userId
      params.KeyConditionExpression = "userId=:userId"

      if (markerType) {
        ExpressionAttributeValues[':markerType'] = MARKERS_SUPPORTED_TYPES[markerType]
        params.FilterExpression = "#t=:markerType"
        ExpressionAttributeNames['#t'] = 'type'
      }
    }


    if (Object.keys(ExpressionAttributeValues).length) {
      params.ExpressionAttributeValues = ExpressionAttributeValues

      if (Object.keys(ExpressionAttributeNames).length) {
        params.ExpressionAttributeNames = ExpressionAttributeNames
      }
    }

    if (params.IndexName) {
      return dynamoDbClient.query(params, (error, result) => {
        if (error) {
          console.log(error);
          throw new Error('Could not get markers')
        }

        if (result && result.Items) {
          return resolve(result.Items)
        }

        console.log(error);
        throw new Error('Could not get markers')
      });
    }

    if (internal) {
      return dynamoDbClient.scan(params, (error, result) => {
        return resolve(result.Items)
      })
    }

    throw new Error('oops, query not supported');
  })
}

module.exports = {
  Marker,
  getMarkers,
  getMarker,
  createMarker,
  MARKERS_SUPPORTED_TYPES
}
