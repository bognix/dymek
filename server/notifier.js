'use strict';
const sns = require('./sns');

module.exports.publish = (payload) => {
  return sns.publish(payload, 'SNS_NOTIFICATION_TOPIC_NAME', 'SNS_NOTIFICATION_TOPIC_ARN')
};
