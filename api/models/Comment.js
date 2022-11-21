const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const opts = {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: {
      currentTime: () => Math.floor(Date.now() / 1000),
      createdAt: 'created',
      updatedAt: 'modified',
  }
};

/**
 * Comments schema that has reference to Post and user schemas
 */
const commentSchema = Schema({
  comment: {
    type: String,
    required: true,
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "posts",
  },
  poster: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  created: Number,
  modified: Number,
}, opts);

module.exports = Comment = mongoose.model("comments", commentSchema);
