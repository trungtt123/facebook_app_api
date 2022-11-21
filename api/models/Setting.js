const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Search Schema for saving search history
 */
const settingSchema = Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    like_comment: {
      type: Schema.Types.Number,
      default: 1
    },
    from_friends: {
      type: Schema.Types.Number,
      default: 1
    },
    requested_friend: {
      type: Schema.Types.Number,
      default: 1
    },
    suggested_friend: {
      type: Schema.Types.Number,
      default: 1
    },
    birthday: {
      type: Schema.Types.Number,
      default: 1
    },
    video: {
      type: Schema.Types.Number,
      default: 1
    },
    report: {
      type: Schema.Types.Number,
      default: 1
    },
    sound_on: {
      type: Schema.Types.Number,
      default: 1
    },
    notification_on: {
      type: Schema.Types.Number,
      default: 1
    },
    vibrant_on: {
      type: Schema.Types.Number,
      default: 1
    },
    led_on: {
      type: Schema.Types.Number,
      default: 1
    }
  }
);

module.exports = Setting = mongoose.model('settings', settingSchema);
