const admin = require('firebase-admin');

const serviceAccount = require('../cert.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const handler = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const payload = JSON.parse(event.Records[0].Sns.Message);

  if (!payload.token) {
    console.error('token not set.');
    return callback(`token not set, payload: ${JSON.stringify(payload)}`);
  }

  const message = {
    data: {
      body: payload.message.body,
      title: payload.message.title,
      meta: stringify(payload.message.meta)
    },
    token: payload.token
  };

  return admin.messaging().send(message)
    .then(() => {
      return callback(null, 'success')
    })
    .catch((error) => {
      console.error(payload);
      console.error('Error sending message:', error);
      return callback(error);
    });

}

module.exports = {
  handler
}
