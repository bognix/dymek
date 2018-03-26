const AWS = require("aws-sdk");

function publish(payload, topicNameEnv, topicArnEnv) {
  let sns;
  let topicArn;
  if (process.env.IS_OFFLINE === true) {
    sns = new AWS.SNS({
      endpoint: 'http://localhost:4002',
      region: 'localhost'
    })
    topicArn = `arn:aws:sns:${process.env.APP_REGION}:123456789012:${process.env[topicNameEnv]}`
  } else {
    sns = new AWS.SNS();
    topicArn = process.env[topicArnEnv]
  }
  sns.publish({
    TopicArn: topicArn,
    Message: JSON.stringify(payload)
  }, function(err, data) {
    if (err) {
      console.error('error publishing to SNS');
      console.error(err);
    }
  });
}

module.exports = {
  publish
}
