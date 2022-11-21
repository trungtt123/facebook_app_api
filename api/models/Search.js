const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * Search Schema for saving search history
 */
const searchSchema = Schema(
  {
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
    },
    keyword: {
        type: Schema.Types.String,
        required: true,
    },
    created: {
        type: Schema.Types.Date,
        default: Date.now
    }
  }
);

module.exports = Search = mongoose.model('search', searchSchema);
