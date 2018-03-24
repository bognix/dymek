'use strict';
var AWS = require("aws-sdk");

module.exports.notify = (event) => {
  let sns;
  let topicArn;
  if (process.env.IS_OFFLINE === true) {
    sns = new AWS.SNS({
      endpoint: 'http://localhost:4002',
      region: 'localhost'
    })
    topicArn = `arn:aws:sns:${process.env.APP_REGION}:123456789012:${process.env.SNS_TOPIC_NAME}`
  } else {
    sns = new AWS.SNS();
    topicArn = process.env.SNS_TOPIC_ARN
  }
  sns.publish({
    TopicArn: topicArn,
    Message: JSON.stringify({event})
  }, function(err, data) {
    if (err) {
      console.error('error publishing to SNS');
      console.error(err);
    }
  });
};
