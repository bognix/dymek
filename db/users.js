const AWS = require('aws-sdk');
const uuid = require('uuid/v4')
const {dynamoDb, dynamoDbClient} =  require('./index');

const USERS_TABLE = process.env.USERS_TABLE;

class User {}

function getUser(id) {
  return dynamoDbClient.query({
    TableName: USERS_TABLE,
    ExpressionAttributeValues: {
      ':id': id
    },
    KeyConditionExpression: 'userId=:id',
    Limit: 1
  }).promise().then(({Items}) => {
    const user = new User()
    return Object.assign(user, Items[0])
  })
}

function updateOrCreateUser(id, registrationToken = null) {
  const updatedAt = new Date().toISOString()

  if (!id) {
    throw new Error('Can not create user without ID')
  }

  return dynamoDbClient.update(
    {
      TableName: USERS_TABLE,
      Key: {
        userId: id
      },
      UpdateExpression: 'set registrationToken = :token, updatedAt = :date',
      ExpressionAttributeValues: {
        ':token': registrationToken,
        ':date': updatedAt
      }
    }
  ).promise().then(() => getUser(id))
}

module.exports = {
  User,
  getUser,
  updateOrCreateUser,
}
