const AWS = require('aws-sdk');

const DEV_DB_PORT = process.env.DEV_DB_PORT
const IS_OFFLINE = process.env.IS_OFFLINE;

let dynamoDb
let dynamoDbClient
if (IS_OFFLINE === true) {
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

module.exports = {
  dynamoDb,
  dynamoDbClient
}
