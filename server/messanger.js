const admin = require('firebase-admin');

const serviceAccount = require('./cert.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const handler = (event, context, callback) => {
  const payload = JSON.parse(event.Records[0].Sns.Message).event;

  if (!payload.token) {
    console.error('token not set.');
    return callback(`token not set, payload: ${JSON.stringify(payload)}`);
  }

  const message = {
    data: payload.message,
    token: payload.token
  };

  admin.messaging().send(message)
    .then(callback)
    .catch((error) => {
      console.error(payload);
      console.error('Error sending message:', error);
      callback(error);
    });

}

module.exports = {
  handler
}
