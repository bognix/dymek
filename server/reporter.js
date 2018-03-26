'use strict';
const sns = require('./sns');

module.exports.publish = (payload) => {
  return sns.publish(payload, 'SNS_REPORT_TOPIC_NAME', 'SNS_REPORT_TOPIC_ARN')
};
