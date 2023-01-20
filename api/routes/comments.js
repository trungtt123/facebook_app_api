const router = require('express').Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const verify = require('../utils/verifyToken');
var {responseError, setAndSendResponse} = require('../response/error');
const validInput = require('../utils/validInput');
const {getUserIDFromToken} = require('../utils/getUserIDFromToken');
const MAX_WORD_COMMENT = 500;
const COUNT_DEFAULT  = 2;

function countWord(str) {
    return str.split(" ").length;
}

// @route  POST it4788/comment/set_comment
// @desc   add new comment
// @access Public
router.post('/set_comment', verify, async (req, res) => {
    var {id, comment, index, count} = req.query;
    var user = req.user;

    if(!id || !comment || (index !== 0 && !index) || (count !== 0 && !count)) {
        console.log("No have parameter id, comment, index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string") || (comment && typeof comment !== "string") || (index && typeof index !== "string") || (count && typeof count !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    if(!validInput.checkNumber(index) || !validInput.checkNumber(count)) {
        console.log("chi chua cac ki tu so");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    if(comment && countWord(comment) > MAX_WORD_COMMENT) {
        console.log("MAX_WORD_COMMENT");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    var post;
    try {
        post = await Post.findById(id);
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
        }
        console.log("findById Post");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    if (!post) {
        console.log("Post is not existed");
        return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
    }

    // Create Comment
    const _comment = new Comment({
        comment: comment,
        poster: user.id,
        post: id
    });

    try {
        const userDB = await User.findById(user.id);
        // Save comment
        const savedComment = await _comment.save();
        if(!post.comments) {
            post.comments = [savedComment._id];
        } else {
            post.comments.push(savedComment._id);
        }
        const updatedPost = await post.save();

        const comments = await Comment.find({post: id}).populate('poster').sort("created");

        let sliceComments = comments.slice(index, index + count);

        res.status(200).send({
            code: "1000",
            message: "OK",
            data: sliceComments.map(comment => {
                return {
                    id: comment._id,
                    comment: comment.comment ? comment.comment : null,
                    created: comment.created.toString(),
                    poster: comment.poster ? {
                        id: comment.poster._id,
                        name: comment.poster.name ? comment.poster.name : null,
                        avatar: comment.poster.avatar.url ? comment.poster.avatar.url : null
                    } : null,
                    is_blocked: is_blocked(userDB, comment.poster)
                };
            })
        });
    } catch (err) {
        console.log(err);
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
});

// @route  POST it4788/comment/get_comment
// @desc   add new comment
// @access Public
router.post('/get_comment', async (req, res) => {
    var {token, id, index, count} = req.query;

    if(!id || (index !== 0 && !index) || (count !== 0 && !count)) {
        console.log("No have parameter id, index, count");
        return setAndSendResponse(res, responseError.PARAMETER_IS_NOT_ENOUGH);
    }

    // PARAMETER_TYPE_IS_INVALID
    if((id && typeof id !== "string") || (index && typeof index !== "string") || (count && typeof count !== "string") || (token && typeof token !== "string")) {
        console.log("PARAMETER_TYPE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_TYPE_IS_INVALID);
    }

    if(!validInput.checkNumber(index) || !validInput.checkNumber(count)) {
        console.log("chi chua cac ki tu so");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    index = parseInt(index, 10);
    count = parseInt(count, 10);
    if(isNaN(index) || isNaN(count)) {
        console.log("PARAMETER_VALUE_IS_INVALID");
        return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
    }

    var post, user;
    try {
        if(token) {
            user = await getUserIDFromToken(token);
            if(user && typeof user == "string") {
                return setAndSendResponse(res, responseError[user]);
            }
        }
        post = await Post.findById(id);
    } catch (err) {
        if(err.kind == "ObjectId") {
            console.log("Sai id");
            return setAndSendResponse(res, responseError.PARAMETER_VALUE_IS_INVALID);
        }
        console.log("Can not connect to DB");
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }

    if(!post) {
        console.log('Post is not existed');
        return setAndSendResponse(res, responseError.POST_IS_NOT_EXISTED);
    }

    try {
        const comments = await Comment.find({post: id}).populate('poster').sort({"created" : -1});

        if(!comments) {
            console.log('Post no have comments');
            return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        }

        let sliceComments = comments.slice(index, index + count);

        if(sliceComments.length < 0) {
            console.log('sliceComments no have comments');
            return setAndSendResponse(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        }

        res.status(200).send({
            code: "1000",
            message: "OK",
            data: sliceComments.map(comment => {
                return {
                    id: comment._id,
                    comment: comment.comment ? comment.comment : null,
                    created: comment.created.toString(),
                    poster: comment.poster ? {
                        id: comment.poster._id,
                        name: comment.poster.name ? comment.poster.name : null,
                        avatar: comment.poster.avatar.url ? comment.poster.avatar.url : null
                    } : null,
                    is_blocked: is_blocked(user, comment.poster)
                };
            })
        });
    } catch (err) {
        console.log(err);
        return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
    }
});

function is_blocked(user, author) {
    if(user && author && author.blockedList && author.blockedList.findIndex((element) => {return element.user.toString() == user._id.toString()}) != -1) return "1";
    if(user && author && user.blockedList && user.blockedList.findIndex((element) => {return element.user.toString() == author._id.toString()}) != -1) return "1";
    return "0";
}

module.exports = router;