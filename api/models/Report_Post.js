const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const opts = {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: {
      currentTime: () => Math.floor(Date.now() / 1000),
      createdAt: 'created',
      updatedAt: 'modified',
  }
};

const reportPostSchema = Schema({
    post: {
      type: Schema.Types.ObjectId,
      ref: "posts",
    },
    subject: {
        type: String,
        required: true,
    },
    details: {
        type: String,
        required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    created: Number,
    modified: Number,
  }, opts);

module.exports = Report_Post = mongoose.model('reports_post', reportPostSchema);