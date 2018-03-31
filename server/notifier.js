'use strict';
const sns = require('./sns');

module.exports.publish = (payload) => {
  const tokens = payload.tokens;

  tokens.forEach(token => {
    return sns.publish(
      Object.assign({}, {message: payload.message}, {token}),
      'SNS_NOTIFICATION_TOPIC_NAME',
      'SNS_NOTIFICATION_TOPIC_ARN'
    )
  })
};
