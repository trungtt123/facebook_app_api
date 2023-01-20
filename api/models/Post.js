const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    // author of post
    author: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    // description of post
    described: {
        type: String
    },
    // status of author
    status: {
        type: String
    },
    // time when post is created
    created: {
        type: Number
    },
    // time when post is modified
    modified:  {
        type: Number
    },
    // number people liked post
    like: {
        type: Number
    },
    //number people commented post
    comment: {
        type: Number
    },
    // like user
    likedUser: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'comments'
    }],
    image: [{
        filename: {
            type: String
        },
        url: {
            type: String
        }
    }],
    video: {
        filename: {
            type: String
        },
        url: {
            type: String
        },
        width: {
            type: Number
        },
        height: {
            type: Number
        }
    },
    reports_post: [{
        type: Schema.Types.ObjectId,
        ref: 'reports_post'
    }]
});
module.exports = mongoose.model('posts', postSchema);
