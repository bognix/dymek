const admin = require('firebase-admin');

const serviceAccount = require('./cert.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const handler = (event) => {
  const payload = JSON.parse(event.Records[0].Sns.Message).event;

  if (!payload.token) {
    console.error('token not set.');
    return;
  }

  const message = {
    data: payload.message,
    token: payload.token
  };

  admin.messaging().send(message)
    .catch((error) => {
      console.error(payload);
      console.error('Error sending message:', error);
    });

}

module.exports = {
  handler
}
