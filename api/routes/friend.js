const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const verify = require('../utils/verifyToken');
const convertString = require('../utils/convertString');
const { responseError, callRes } = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');
const MAX_FRIEND_NUMBER = 500;
// @route  POST it4788/friend/get_requested_friends
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/get_requested_friends
// -------------------------
// index : last addElement
// count: length of data
// -------------------------
// BODY:
// {
//   "token": "xxxxx",
//   "index": 3,
//   "count": 10
// }
router.post('/get_requested_friends', verify, async (req, res) => {
  let { index, count } = req.query;
  let id = req.user.id;
  let data = {
    request: [],
    total: 0
  };
  let thisUser;

  // check input data
  if (index === undefined || count === undefined)
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, ': index, count');
  if (!checkInput.checkIsInteger(index) || !checkInput.checkIsInteger(count))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, ': index, count');
  if (index < 0 || count < 0) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, ': index, count');

  try {
    thisUser = await User.findById(id)
      .select({ "friends": 1, "friendRequestReceived": 1, "_id": 1 })
      .populate('friendRequestReceived');
    // console.log(thisUser);
    thisUser.friendRequestReceived?.sort((a, b) => {
      if (+a.lastCreated < +b.lastCreated) {
        return 1;
      }
      if (+a.lastCreated > +b.lastCreated) {
        return -1;
      }
      return 0;
    })
    let endFor = thisUser.friendRequestReceived.length < index + count ? thisUser.friendRequestReceived.length : index + count;
    // for (let i = index; i < endFor; i++) {
    for (let i = 0; i < thisUser.friendRequestReceived.length; i++) {
      let sentUser;
      let newElement = {
        id: null, // id người gửi req
        username: null, // tên người gửi req
        avatar: null, // link avatar người gửi req
        same_friends: null, // số bạn chung
        created: null, // thời gian gần nhất req
      }
      let sentUserID = thisUser.friendRequestReceived[i].fromUser.toString();
      sentUser = await User.findById(sentUserID)
        .select({ "friends": 1, "friendRequestSent": 1, "phoneNumber": 1, "_id": 1, "name": 1, "avatar": 1 });

      // console.log(sentUser);
      newElement.id = sentUser._id;
      newElement.username = sentUser.name;
      newElement.avatar = sentUser.avatar.url;
      newElement.same_friends = 0;
      // find number of same_friends
      if (thisUser.friends.length != 0 && sentUser.friends.length != 0) {
        newElement.same_friends = countSameFriend(thisUser.friends, sentUser.friends);
      }
      newElement.created = validTime.timeToSecond(thisUser.friendRequestReceived[i].lastCreated);
      data.request.push(newElement);
    }
    if (data.request.length == 0) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    thisUser = await User.findById(id);
    data.total = thisUser.friendRequestReceived.length;
    return callRes(res, responseError.OK, data);
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR);
  }
})


// @route  POST it4788/friend/set_request_friend
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/set_request_friend
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082"
// }
router.post('/set_request_friend', verify, async (req, res) => {
  let data = {
    requested_friends: null // số người đang đươc tài khoản hiện tại gửi request friend
  }

  let { user_id } = req.query; // user_id là id của người nhận request friend
  if (user_id === undefined)
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'user_id');
  if (typeof user_id != 'string')
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'user_id');
  let id = req.user.id;
  let targetUser, thisUser;
  if (id == user_id) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'user_id');
  } else {
    try {
      targetUser = await User.findById(user_id);
      if (!targetUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'targetUser');
      thisUser = await User.findById(id);
      if (!thisUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'thisUser');
      if (thisUser.friends.length >= MAX_FRIEND_NUMBER)
        return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'out of Max Friends');

      let indexExist = thisUser.friends.findIndex(element => element.friend._id.equals(targetUser._id));
      if (indexExist >= 0)
        return callRes(res, responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER, 'you two are friend');
      // indexExist < 0, chưa là bạn
      let findIndexBlockTarget = targetUser.blockedList.findIndex(e => e.user._id.equals(thisUser._id));

      // đang bị bên kia block
      if (findIndexBlockTarget >= 0) return callRes(res, responseError.NOT_ACCESS, 'bị block rồi em ơi ko gửi kb được');
      else {// ko bị bên kia block, xóa block bên kia đi (nếu có) 
        let findIndexBlockThis = thisUser.blockedList.findIndex(e => e.user._id.equals(targetUser._id));
        if (findIndexBlockThis >= 0) thisUser.blockedList.splice(findIndexBlockThis, 1);
      }
      // add new element to sent request
      let addElement = { "_id": targetUser._id };
      let isExisted = thisUser.friendRequestSent.findIndex(element => element._id.equals(addElement._id));

      if (isExisted < 0) { // chưa gửi yêu cầu trước đó
        thisUser.friendRequestSent.push(addElement);
        thisUser = await thisUser.save();
        data.requested_friends = 1;
        // add new element of request received
        let addElement1 = { fromUser: { "_id": thisUser._id } };
        let isExisted1 = targetUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(addElement1.fromUser._id));
        if (isExisted1 < 0) {
          targetUser.friendRequestReceived.push(addElement1);
          targetUser = await targetUser.save();
        }
        targetUser = await targetUser.save();
      } else { // đã gửi yêu cầu trước đó, gửi lại để hủy yêu cầu
        thisUser.friendRequestSent.splice(isExisted, 1);
        thisUser = await thisUser.save();
        data.requested_friends = 0;
        // xóa request bên nhận
        let isExisted1 = targetUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(thisUser._id));
        if (isExisted1 >= 0) {
          targetUser.friendRequestReceived.splice(isExisted1, 1);
          targetUser = await targetUser.save();
        }
      }
      return callRes(res, responseError.OK, data);

    } catch (err) {
      return callRes(res, responseError.UNKNOWN_ERROR, err.message);
    }
  }
})



router.post("/set_block", verify, async (req, res) => {
  var thisUser, targetUser;

  let { token, user_id, type } = req.query;
  let id = req.user.id;
  thisUser = await User.findById(id);
  if (thisUser.isBlocked) {
    return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
  }
  if (!token || !user_id || !type) {
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token and user_id and type');
  }
  if (type != 1 && type != 0) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'type');
  }
  if (user_id == id) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot block yourself');
  }
  thisUser = await User.findById(id);
  try {
    targetUser = await User.findById(user_id);
  } catch (err) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find user wanting to block');
  }
  if (targetUser == null) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find user wanting to block');
  }
  if (targetUser.isBlocked) {
    return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'User wanted to block has been blocked by server');
  }
  if (!targetUser) {
    return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'User wanted to block not existed');
  }
  else {
    let index = thisUser.blockedList.findIndex(element => element.user._id.equals(targetUser._id));
    let indexFriend = thisUser.friends.findIndex(element => element.friend._id.equals(targetUser._id));
    let indexTargetFriend = targetUser.friends.findIndex(element => element.friend._id.equals(thisUser._id));
    if (index < 0) {
      if (type == 0) {
        if (indexFriend >= 0) {
          thisUser.friends.splice(indexFriend, 1);
          targetUser.friends.splice(indexTargetFriend, 1);
        }
        thisUser.blockedList.push({ user: targetUser._id, createdAt: Date.now() });
        thisUser.save();
        targetUser.save();
        return callRes(res, responseError.OK, 'Successfully block this user');
      }
      else {
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, "You haven't blocked this user");
      }
    }
    else {
      if (type == 1) {
        thisUser.blockedList.splice(index, 1);
        thisUser.save();
        return callRes(res, responseError.OK, 'Successfully unblock this user');
      }
      else {
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, "You have already blocked this user");
      }
    }
  }
});

// @route  POST it4788/friend/set_accept_friend
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/set_accept_friend
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082",
//   "is_accept": 0,
// }
router.post('/set_accept_friend', verify, async (req, res) => {
  let thisUser, sentUser;

  // user_id là id của người nhận request friend
  // is_accept : 0 là từ chối, 1 là đồng ý
  let { user_id, is_accept } = req.query;
  if (user_id === undefined || is_accept === undefined)
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'user_id, is_accept');
  if (typeof user_id != 'string')
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'user_id');
  if (!checkInput.checkIsInteger(is_accept))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'is_accept');
  is_accept = parseInt(is_accept, 10);
  if (is_accept != 0 && is_accept != 1)
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'is_accept');
  let id = req.user.id;
  if (id == user_id) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'user_id');
  } else {
    try {
      thisUser = await User.findById(id);
      if (!thisUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'thisUser');
      sentUser = await User.findById(user_id);
      if (!sentUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'sentUser');
      if (is_accept == 0) {
        // xóa req bên nhận
        let indexExist = thisUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(sentUser._id));
        if (indexExist < 0) return callRes(res, responseError.METHOD_IS_INVALID, 'không có lời mời');
        thisUser.friendRequestReceived.splice(indexExist, 1);
        // xóa req bên gửi
        let indexExist1 = sentUser.friendRequestSent.findIndex(element =>
          element._id.equals(thisUser._id));
        sentUser.friendRequestSent.splice(indexExist1, 1);
        // save
        thisUser = await thisUser.save();
        sentUser = await sentUser.save();
        return callRes(res, responseError.OK);
      } else if (is_accept == 1) {
        let currentTime = Date.now();
        // bỏ block, nếu đang block
        let gg = thisUser.blockedList.findIndex(e => e.user._id.equals(sentUser._id));
        if (gg >= 0) thisUser.blockedList.splice(gg, 1);
        // xóa req bên nhận
        let indexExist = thisUser.friendRequestReceived.findIndex(element =>
          element.fromUser._id.equals(sentUser._id));
        if (indexExist < 0) return callRes(res, responseError.METHOD_IS_INVALID, 'không có lời mời');
        thisUser.friendRequestReceived.splice(indexExist, 1);
        // thêm bạn bên nhận
        let indexExist2 = thisUser.friends.findIndex(element =>
          element.friend._id.equals(sentUser._id))
        if (indexExist2 < 0) thisUser.friends.push({ friend: sentUser._id, createdAt: currentTime });
        // thêm bạn bên gửi
        let indexExist3 = sentUser.friends.findIndex(element =>
          element.friend._id.equals(thisUser._id))
        if (indexExist3 < 0) sentUser.friends.push({ friend: thisUser._id, createdAt: currentTime });
        // xóa req bên gửi
        let indexExist1 = sentUser.friendRequestSent.findIndex(element =>
          element._id.equals(thisUser._id));
        sentUser.friendRequestSent.splice(indexExist1, 1);
        // save
        thisUser = await thisUser.save();
        sentUser = await sentUser.save();
        return callRes(res, responseError.OK);
      }

    } catch (error) {
      return callRes(res, responseError.UNKNOWN_ERROR, error.message);
    }
  }
})


router.post("/get_list_blocks", verify, async (req, res) => {
  let { token, index, count } = req.query;
  if (token === undefined || index === undefined || count === undefined) {
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token and index and count');
  }
  if (typeof index != "string") {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
  }
  if (typeof count != "string") {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
  }
  let isNumIndex = /^\d+$/.test(index);
  if (!isNumIndex) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
  }
  let isNumCount = /^\d+$/.test(count);
  if (!isNumCount) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
  }
  index = parseInt(req.query.index);
  count = parseInt(req.query.count);
  if (index < 0) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
  }
  if (count < 0) {
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
  }
  if (count == 0) {
    return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  }
  let id = req.user.id;
  let thisUser = await User.findById(id);
  if (thisUser.isBlocked) {
    return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
  }
  let code, message;
  let data = [];
  let targetUser;
  targetUser = await User.findById(id);
  let endFor = targetUser.blockedList.length < index + count ? targetUser.blockedList.length : index + count;
  for (let i = index; i < endFor; i++) {
    let x = targetUser.blockedList[i];
    let blockedUser = await User.findById(x.user);
    let userInfo = {
      id: null, // id of this guy
      username: null,
      avatar: null,
    }
    userInfo.id = blockedUser._id.toString();
    userInfo.username = blockedUser.name;
    userInfo.avatar = blockedUser.avatar.url;
    data.push(userInfo);
  }
  if (data.length == 0) {
    return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
  }
  return callRes(res, responseError.OK, data);
});

// @route  POST it4788/friend/get_user_friends
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/friend/get_user_friends
// BODY:
// {
//   "token": "xxxxx",
//   "user_id" : "gh98082",
//   "index": 4,
//   "count": 10
// }
router.post('/get_user_friends', verify, async (req, res) => {
  // input
  let { user_id, index, count } = req.query;
  // user id from token
  let id = req.user.id;

  let data = {
    friends: [],
    total: 0
  }
  if (user_id && typeof user_id != 'string')
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'user_id');
  // check input data
  if (index === undefined || count === undefined)
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, ': index, count');
  if (!checkInput.checkIsInteger(index) || !checkInput.checkIsInteger(count))
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, ': index, count');
  if (index < 0 || count < 0) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, ': index, count');

  // var
  let thisUser, targetUser;

  try {
    thisUser = await User.findById(id).select({ "friends": 1, 'friendRequestSent': 1, 'friendRequestReceived': 1 });
    if (!thisUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'thisUser')
    // console.log(thisUser);
    if (user_id && user_id != id) {
      targetUser = await User.findById(user_id).select({ "friends": 1 });
      if (!targetUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'targetUser');

    } else {
      targetUser = thisUser;
    }
    await targetUser.populate({ path: 'friends.friend', select: { 'friends': 1, 'name': 1, 'avatar': 1 } }).execPopulate();
    console.log(user_id, id);

    let endFor = targetUser.friends.length < index + count ? targetUser.friends.length : index + count;
    // for (let i = index; i < endFor; i++) {
    for (let i = 0; i < targetUser.friends.length; i++) {
      let x = targetUser.friends[i];
      let friendInfor = {
        id: null, // id of this guy
        username: null,
        avatar: null,
        same_friends: 0, //number of same friends
        created: null, //time start friend between this guy and targetUser
        isFriendStatus: 0 // = 0 nếu 2 bên chưa gửi lời mời nào cho nhau, 1 nếu bạn đã gửi lời mời, 
        //2 nếu họ đã gửi lời mời cho bạn, 3 nếu đã là bạn bè, -1 nếu friend chính là thisUser
      }
      friendInfor.id = x.friend._id.toString();
      friendInfor.username = x.friend.name;
      friendInfor.avatar = x.friend.avatar.url;
      friendInfor.created = validTime.timeToSecond(x.createdAt);
      if (id === x.friend._id.toString()){
        friendInfor.isFriendStatus = -1;
      }
      else if (thisUser.friendRequestSent?.find(o => o.toString() === x.friend._id.toString())) friendInfor.isFriendStatus = 1;
      else if (thisUser.friendRequestReceived?.find(o => o.fromUser.toString() === x.friend._id.toString())) friendInfor.isFriendStatus = 2;
      else if (user_id === id) {
        friendInfor.isFriendStatus = 3;
      }
      else if (thisUser.friends?.find(o => o.friend.toString() === x.friend._id.toString())) friendInfor.isFriendStatus = 3;
      if (!thisUser._id.equals(x.friend._id))
        if (thisUser.friends.length > 0 && x.friend.friends.length > 0) {
          friendInfor.same_friends = countSameFriend(thisUser.friends, x.friend.friends);
        }
      data.friends.push(friendInfor);
    }
    if (data.friends.length == 0) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'friends');
    data.total = targetUser.friends.length;
    return callRes(res, responseError.OK, data);
  } catch (error) {
    console.log(error.message)
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
})

router.post('/unfriend', verify, async (req, res) => {
  // input
  let { user_id } = req.query;
  // user id from token
  let id = req.user.id;

  let data = {
    id: null, // id of this guy
    username: null,
    avatar: null,
    same_friends: 0, //number of same friends
  }
  if (user_id && typeof user_id != 'string' && user_id === id)
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'user_id');
  let thisUser, targetUser;

  try {
    thisUser = await User.findById(id);
    if (!thisUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'thisUser')
    // console.log(thisUser);
    if (user_id && user_id != id) {
      targetUser = await User.findById(user_id);
      if (!targetUser) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'targetUser');
      if (!thisUser.friends.find(o => o.friend.toString() === user_id))
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'targetUser');
      if (!targetUser.friends.find(o => o.friend.toString() === id))
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'targetUser');
      thisUser.friends = thisUser.friends.filter(o => o.friend.toString() !== user_id);
      targetUser.friends = targetUser.friends.filter(o => o.friend.toString() !== id);
    }
    // console.log(targetUser);
    data.same_friends = countSameFriend(thisUser.friends, targetUser.friends);
    data.avatar = targetUser.avatar.url;
    data.username = targetUser.name;
    data.id = user_id;
    data.isFriendStatus = 0;
    await thisUser.save();
    await targetUser.save();
    return callRes(res, responseError.OK, data);
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
})

router.post('/get_list_suggested_friends', verify, async (req, res) => {
  try {
    const { index, count } = req.query;
    // check input data
    if (index === undefined || count === undefined)
      return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, ': index, count');
    if (!checkInput.checkIsInteger(index) || !checkInput.checkIsInteger(count))
      return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, ': index, count');
    if (index < 0 || count < 0) return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, ': index, count');

    let id = req.user.id;
    let data = {
      total: 0,
      list_users: []
    };
    let listID = [], list_users = [];
    let thisUser, targetUser;
    thisUser = await User.findById(id);
    if (!thisUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'thisUser');
    const listFriendId = thisUser.friends.map(o => o.friend);
    if (thisUser.friends.length > 0) {
      for (let x of thisUser.friends) {
        targetUser = await User.findById(x.friend).select({ "friends": 1 });
        if (!targetUser) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'targetUser');
        await targetUser.populate({ path: 'friends.friend', select: 'friends _id name avatar' }).execPopulate();
        for (let y of targetUser.friends) {
          if (!y.friend._id.equals(id) && !listID.includes(y.friend._id) && !listFriendId.includes(y._id)) {
            let e = {
              user_id: y.friend._id,
              username: (y.friend.name) ? y.friend.name : null,
              avatar: (y.friend.avatar) ? y.friend.avatar.url : null,
              same_friends: 0
            }
            if (thisUser.friends.length > 0 && y.friend.friends.length > 0) {
              e.same_friends = countSameFriend(thisUser.friends, y.friend.friends);
            }
            list_users.push(e);
            listID.push(y.friend.id);
          }
        }
      }
    }
    if (list_users.length == 0) {
      let users = await User.find({ 'user._id': { $ne: id } })
        .select({ "friends": 1, "_id": 1, "name": 1, "avatar": 1, "friendRequestSent" : 1, "friendRequestReceived" : 1 })
        .sort("-createdAt");
      if (!users) return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA, 'no other user');
      for (let y of users) {
        if (listFriendId.includes(y._id)) continue;
        let e = {
          id: y._id,
          username: y.name,
          avatar: (y.avatar) ? y.avatar.url : null,
          same_friends: 0,
          isFriendStatus: 0 // = 0 nếu 2 bên chưa gửi lời mời nào cho nhau, 1 nếu bạn đã gửi lời mời, 
        //2 nếu họ đã gửi lời mời cho bạn, -1 nếu friend chính là thisUser
        }
        if (thisUser.friends.length > 0 && y.friends.length > 0) {
          e.same_friends = countSameFriend(thisUser.friends, y.friends);
        }
        if (id === y._id.toString()){
          e.isFriendStatus = -1;
        }
        else if (thisUser.friendRequestSent?.find(o => o.toString() === y._id.toString())) e.isFriendStatus = 1;
        else if (thisUser.friendRequestReceived?.find(o => o.fromUser.toString() === y._id.toString())) e.isFriendStatus = 2;
        list_users.push(e);
      }
    }
    data.list_users = list_users;//.slice(index, index + count);
    data.total = list_users.length;
    return callRes(res, responseError.OK, data);
  } catch (error) {
    console.log(error)
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
})

// count same friend between 2 array x, y
// x thisuser, y target user 
function countSameFriend(x, y) {
  let xx = x.map(e => e.friend._id.toString());
  let yy = y.map(e => e.friend.toString());
  let z = xx.filter(function (val) {
    return yy.indexOf(val) != -1;
  });
  return z.length;
}

module.exports = router;
