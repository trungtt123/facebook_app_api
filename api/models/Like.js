const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Like schema that has references to Post and User schema
 */
const likeSchema = Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'posts',
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Like = mongoose.model('likes', likeSchema);
