const AWS = require('aws-sdk');
const uuid = require('uuid/v4')

const MARKERS_TABLE = process.env.MARKERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
const DEV_DB_PORT = process.env.DEV_DB_PORT

let dynamoDb
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: `http://localhost:${DEV_DB_PORT}`
  })
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

class Marker {}

function getMarker(id) {
  return new Promise((resolve, reject) => {
    dynamoDb.get({
      TableName: MARKERS_TABLE,
      Key: {
        id: id
      }
    }, (err, data) => {
      if (err) {
        console.log(err);
        return reject();
        // throw new Error(`Could not get marker with id: ${id}`);
      }
      console.log(data);
      resolve(data)
    })
  })
}

function createMarker(latitude, longitude, userId = '123') {
  return new Promise((resolve, reject) => {
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

    const id = uuid()
    const createdAt = new Date().toISOString()

    const params = {
      TableName: MARKERS_TABLE,
      Item: {id, latitude: latitudeNum, longitude: longitudeNum, userId, createdAt},
    };

    dynamoDb.put(params, (error, item) => {
      if (error) {
        throw new Error('Could not create marker');
      }
      return resolve({ id, latitude, longitude, userId, createdAt });
    });
  })
}

function getMarkers(userId) {
  return new Promise ((resolve, reject) => {
    let FilterExpression = '';
    let ExpressionAttributeValues = {}
    if (userId) {
      FilterExpression += "userId=:userId"
      ExpressionAttributeValues[':userId'] = userId
    }
    const params = {
      TableName: MARKERS_TABLE
    }

    if (Object.keys(ExpressionAttributeValues).length > 0) {
      Object.assign(params, {
        ExpressionAttributeValues,
        FilterExpression
      })
    }

    dynamoDb.scan(params, (error, result) => {
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
  })
}

module.exports = {
  Marker,
  getMarkers,
  getMarker,
  createMarker
}