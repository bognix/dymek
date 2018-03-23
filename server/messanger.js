const admin = require('firebase-admin');

const serviceAccount = require('./cert.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// This registration token comes from the client FCM SDKs.
var registrationToken = 'fc_Srk6uYzs:APA91bFxQXEBj-n31YmV-VKIyR78rl6dRPGdo-s8D870tKpa1hu_n2dseBqLqWR7LPITcljiyhUjSan-mR2qGLSyiqeAC7seHNYLsDHrcK_ba9ftOJkUKATrz3Saa65oVdKR2lwXdN_k';

// See documentation on defining a message payload.
var message = {
  data: {
    score: '850',
    time: '2:45'
  },
  token: registrationToken
};

// Send a message to the device corresponding to the provided
// registration token.
admin.messaging().send(message)
  .then((response) => {
    // Response is a message ID string.
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
