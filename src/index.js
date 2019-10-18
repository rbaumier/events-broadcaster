'use strict';

// we use this to know how many listeners we have on each channel,
// this is stored as:
// {
//   [channel (string)]: connectedClients (int),
//   ...
// }
const channels = {};

module.exports = ({ subscriber, publisher }) => {
  if (!subscriber || !publisher) {
    throw 'You need to provide both a publisher (redis client) and a subscriber (*another* redis client)';
  }
  return {
    maybeSubscribe(channel) {
      return new Promise((resolve, reject) => {
        if (channels[channel] && channels[channel].connected > 0) {
          // we already have listeners so we are already subscribed:
          // no need to subscribe, just increase the listeners count
          channels[channel].connected++;
          return resolve();
        }
        subscriber.subscribe(channel, err => {
          if (err) {
            return reject(err);
          }
          channels[channel] = { connected: 1 };
          resolve();
        });
      });
    },

    maybeUnsubscribe(channel) {
      return new Promise((resolve, reject) => {
        if (channels[channel] && channels[channel].connected > 1) {
          // don't unsubscribe, we need this sub for other listener(s)
          channels[channel].connected--;
          return resolve();
        }
        subscriber.unsubscribe(channel, err => {
          if (err) {
            return reject(err);
          }
          delete channels[channel];
          resolve();
        });
      });
    },

    publish(channel, message) {
      publisher.publish(channel, message);
      return Promise.resolve();
    },

    onMessage(f) {
      subscriber.on('message', (channel, message) => {
        f(channel, message);
      });
    }
  };
};
