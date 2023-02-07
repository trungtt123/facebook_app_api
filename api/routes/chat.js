const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verify = require('../utils/verifyToken');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const convertString = require('../utils/convertString');
const { responseError, callRes } = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');

async function verifySocketToken(token) {
    try {
        if (!token) return false;
        const verified = jwt.verify(token, process.env.jwtSecret);
        const user = await User.findById(verified.id);
        if (!user) return false;
        if (user.isBlocked == true) return false;
        if (user.dateLogin) {
            var date = new Date(verified.dateLogin);
            if (user.dateLogin.getTime() == date.getTime()) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } catch (err) {
        console.log('verify error', err);
        return false;
    }
}
//Not API
module.exports = function (socket) {
    // socket.on('create_conversation', async (data) => {

    //     const { conversationId, firstUserId, secondUserId, token } = data;
    //     if (!verifySocketToken(token)) socket.emit('server_create_conversation', { message: 'failed', reason: 'token invalid' })
    //     let firstUser, secondUser;
    //     firstUser = await User.findById(firstUserId);
    //     secondUser = await User.findById(secondUserId);
    //     const newConversation = new Conversation({
    //         conversationId: conversationId,
    //         firstUser: firstUser._id,
    //         secondUser: secondUser._id
    //     });
    //     newConversation.save();
    //     _io.to(conversationId).emit({ message: "OK", data: newConversation });
    // });
    socket.on('client_join_conversation', async (data) => {
        try {
            const { thisUserId, targetUserId, token } = data;
            const verifyToken = await verifySocketToken(token);
            if (!verifyToken) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }
            const verified = jwt.verify(token, process.env.jwtSecret);
            if (thisUserId !== verified.id) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }
            const thisUser = await User.findById(thisUserId);
            const targetUser = await User.findById(targetUserId);
            if (thisUser == null || targetUser == null) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'thisUserId or targetUserId invalid' });
                return;
            }
            const conversationId = (thisUserId < targetUserId) ? thisUserId + "_" + targetUserId : targetUserId + "_" + thisUserId;
            console.log('conversationId', conversationId);
            socket.join(conversationId);
            const boxChat = await Conversation.findOne({ conversationId: conversationId });
            //đoạn chat chưa tồn tại
            if (boxChat == null) {
                const newConversation = new Conversation({
                    conversationId: conversationId,
                    firstUser: (thisUserId < targetUserId) ? thisUserId : targetUserId,
                    secondUser: (thisUserId < targetUserId) ? targetUserId : thisUserId
                });
                newConversation.save();
                _io.in(conversationId).emit('server_send_conversation', { message: "OK", data: newConversation });
            }
            else {
                let dialog = boxChat.dialog;
                for (let i = dialog.length - 1; i >= 0; i--) {
                    if (dialog[i].sender.toString() === thisUserId) break;
                    dialog[i].unread = "0";
                }
                const dataUpdate = await Conversation.findOneAndUpdate({ conversationId: conversationId }, { dialog: dialog }, { new: true, useFindAndModify: false });
                _io.in(conversationId).emit('server_send_conversation', { message: "OK", data: dataUpdate });
            }
        }
        catch (e) {
            console.log(e);
            socket.emit('server_send_conversation', { message: "failed" });
        }

        // if (thisUser.isBlocked){
        //     return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
        // }
        // let data = {
        //     conversation: []
        // }
        // if (req.query.index === undefined || req.query.count === undefined){
        //     return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index and count');
        // }
        // if (req.query.partner_id){
        //     let targetConversation;
        //     let index = req.query.index;
        //     let count = req.query.count;
        //     if (typeof index != "string"){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     if (typeof count != "string"){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     let isNumIndex = /^\d+$/.test(index);
        //     if (!isNumIndex){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     let isNumCount = /^\d+$/.test(count);
        //     if (!isNumCount){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     index = parseInt(req.query.index);
        //     count = parseInt(req.query.count);
        //     if (index < 0){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     if (count < 0){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     if (count == 0){
        //         return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        //     }
        //     let partnerId = req.query.partner_id;
        //     try{
        //         var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
        //         var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        //     }catch (err){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        //     }
        //     if (targetConversation1){
        //         if (targetConversation1.secondUser == id){
        //             targetConversation = targetConversation1;
        //         }
        //         else {
        //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        //         }
        //     }
        //     else if (targetConversation2){
        //         if (targetConversation2.firstUser == id){
        //             targetConversation = targetConversation2;
        //         }
        //         else {
        //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        //         }
        //     }
        //     else {
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        //     }
        //     let endFor = targetConversation.dialog.length < index + count ? targetConversation.dialog.length : index + count;
        //     for (let i = index; i < endFor; i++){
        //         let x = targetConversation.dialog[i];
        //         let dialogInfo = {
        //             message: null,
        //             message_id: null,
        //             unread: null,
        //             created: null,
        //             sender: {
        //                 id: null,
        //                 username: null,
        //                 avatar: null
        //             }
        //         }
        //         let targetUser;
        //         targetUser = await User.findById(x.sender);
        //         if (x.content === undefined || x.dialogId === undefined || x.created === undefined || x.content == '' || x.dialogId == '' || x.created == ''){
        //             continue;
        //         }
        //         dialogInfo.message = x.content;
        //         dialogInfo.message_id = x.dialogId;
        //         dialogInfo.unread = x.unread;
        //         dialogInfo.created = x.created;
        //         dialogInfo.sender.id = targetUser._id;
        //         dialogInfo.sender.username = targetUser.name;
        //         dialogInfo.sender.avatar = targetUser.avatar.url;
        //         data.conversation.push(dialogInfo);
        //     }
        // }
        // else if (req.query.conversation_id) {
        //     let targetConversation;
        //     let index = req.query.index;
        //     let count = req.query.count;
        //     if (typeof index != "string"){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     if (typeof count != "string"){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     let isNumIndex = /^\d+$/.test(index);
        //     if (!isNumIndex){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     let isNumCount = /^\d+$/.test(count);
        //     if (!isNumCount){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     index = parseInt(req.query.index);
        //     count = parseInt(req.query.count);
        //     if (index < 0){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        //     }
        //     if (count < 0){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        //     }
        //     if (count == 0){
        //         return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        //     }
        //     let conversationId = req.query.conversation_id;
        //     targetConversation = await Conversation.findOne({ conversationId: conversationId });
        //     if (!targetConversation){
        //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        //     }
        //     let endFor = targetConversation.dialog.length < index + count ? targetConversation.dialog.length : index + count;
        //     for (let i = index; i < endFor; i++){
        //         let x = targetConversation.dialog[i];
        //         let dialogInfo = {
        //             message: null,
        //             message_id: null,
        //             unread: null,
        //             created: null,
        //             sender: {
        //                 id: null,
        //                 username: null,
        //                 avatar: null
        //             }
        //         }
        //         let targetUser;
        //         targetUser = await User.findById(x.sender);
        //         dialogInfo.message = x.content;
        //         dialogInfo.message_id = x.dialogId;
        //         dialogInfo.unread = x.unread;
        //         dialogInfo.created = x.created;
        //         dialogInfo.sender.id = targetUser._id;
        //         dialogInfo.sender.username = targetUser.name;
        //         dialogInfo.sender.avatar = targetUser.avatar.url;
        //         data.conversation.push(dialogInfo);
        //     }
        // }
        // else{
        //     return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
        // }
        // if (data.conversation.length == 0){
        //     return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        // }
        // code = "1000";
        // message = "OK";
        // res.json({ code, message, data });
    });
    //Not API
    socket.on('client_leave_conversation', async (data) => {
        try {
            const { thisUserId, targetUserId, token } = data;
            const verifyToken = await verifySocketToken(token);
            if (!verifyToken) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }
            const verified = jwt.verify(token, process.env.jwtSecret);
            if (thisUserId !== verified.id) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }

            const thisUser = await User.findById(thisUserId);
            if (thisUser == null) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'thisUserId invalid' });
                return;
            }
            const conversationId = (thisUserId < targetUserId) ? thisUserId + "_" + targetUserId : targetUserId + "_" + thisUserId;
            socket.leave(conversationId);
        }
        catch (e) {
            console.log(e);
            socket.emit('server_send_conversation', { message: "failed" });
        }
    });
    socket.on('client_add_dialog', async (data) => {
        try {
            const { senderId, targetUserId, token, content } = data;
            const verifyToken = await verifySocketToken(token);
            if (!verifyToken) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }
            const verified = jwt.verify(token, process.env.jwtSecret);
            if (senderId !== verified.id) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
                return;
            }

            const thisUser = await User.findById(senderId);
            if (thisUser == null) {
                socket.emit('server_send_conversation', { message: 'failed', reason: 'senderId invalid' });
                return;
            }
            const conversationId = (senderId < targetUserId) ? senderId + "_" + targetUserId : targetUserId + "_" + senderId;
            // socket.join(conversationId);

            let conversation = await Conversation.findOne({ conversationId });
            let dialog = conversation.dialog;
            const numUsers = _io.sockets.adapter.rooms.get(conversationId).size;
            for (let i = dialog.length - 1; i >= 0; i--) {
                if (dialog[i].sender.toString() === senderId) break;
                dialog[i].unread = "0";
            }
            console.log('numUsers', numUsers, typeof numUsers);
            dialog.push({
                sender: senderId,
                content: content,
                created: String(Math.floor(Date.now() / 1000)),
                unread: numUsers === 2 ? "0" : "1"
            });
            const dataUpdate = await Conversation.findOneAndUpdate({ conversationId: conversationId }, { dialog: dialog }, { new: true, useFindAndModify: false });
            _io.in(conversationId).emit('server_send_conversation', { message: 'OK', data: dataUpdate });
        }
        catch (e) {
            console.log(e);
            socket.emit('server_send_conversation', { message: "failed" });
        }
    });

    // socket.on('delete_conversation', verify, async (req, res) => {
    //     let token = req.query.token;
    //     if (token === undefined) {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    //     }
    //     if (typeof token != "string") {
    //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    //     }
    //     let id = req.user.id;
    //     let thisUser = await User.findById(id);
    //     if (thisUser.isBlocked) {
    //         return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    //     }
    //     if (req.query.partner_id) {
    //         let targetConversation;
    //         let partnerId = req.query.partner_id;
    //         try {
    //             var partnerUser = await User.findById(partnerId);
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         if (partnerUser == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         try {
    //             var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
    //             var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
    //         }
    //         if (targetConversation1) {
    //             if (targetConversation1.secondUser == id) {
    //                 targetConversation = targetConversation1;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else if (targetConversation2) {
    //             if (targetConversation2.firstUser == id) {
    //                 targetConversation = targetConversation2;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         await Conversation.deleteOne({ _id: targetConversation._id });
    //     }
    //     else if (req.query.conversation_id) {
    //         let targetConversation;
    //         let conversationId = req.query.conversation_id;
    //         targetConversation = await Conversation.findOne({ conversationId: conversationId });
    //         if (targetConversation == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         if (targetConversation.firstUser != id && targetConversation.secondUser != id) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
    //         }
    //         await Conversation.deleteOne({ _id: targetConversation._id });
    //     }
    //     else {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    //     }
    //     return callRes(res, responseError.OK, 'Successfully delete conversation');
    // });

    // socket.on('delete_message', verify, async (req, res) => {
    //     let token = req.query.token;
    //     if (token === undefined) {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    //     }
    //     if (typeof token != "string") {
    //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    //     }
    //     let id = req.user.id;
    //     let thisUser = await User.findById(id);
    //     if (thisUser.isBlocked) {
    //         return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    //     }
    //     if (req.query.message_id === undefined) {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'message_id');
    //     }
    //     if (req.query.partner_id) {
    //         let flag = false;
    //         let targetConversation;
    //         let partnerId = req.query.partner_id;
    //         let messageId = req.query.message_id;
    //         try {
    //             var partnerUser = await User.findById(partnerId);
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         if (partnerUser == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         try {
    //             var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
    //             var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
    //         }
    //         if (targetConversation1) {
    //             if (targetConversation1.secondUser == id) {
    //                 targetConversation = targetConversation1;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else if (targetConversation2) {
    //             if (targetConversation2.firstUser == id) {
    //                 targetConversation = targetConversation2;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         for (dialog in targetConversation.dialog) {
    //             if (targetConversation.dialog[dialog].dialogId == messageId) {
    //                 if (targetConversation.dialog[dialog].sender == id) {
    //                     targetConversation.dialog.splice(dialog, 1);
    //                     flag = true;
    //                     break;
    //                 }
    //                 else {
    //                     return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
    //                 }
    //             }
    //         }
    //         if (!flag) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
    //         }
    //         targetConversation = await targetConversation.save();
    //     }
    //     else if (req.query.conversation_id) {
    //         let flag = false;
    //         let targetConversation;
    //         let conversationId = req.query.conversation_id;
    //         let messageId = req.query.message_id;
    //         targetConversation = await Conversation.findOne({ conversationId: conversationId });
    //         if (targetConversation == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         for (dialog in targetConversation.dialog) {
    //             if (targetConversation.dialog[dialog].dialogId == messageId) {
    //                 if (targetConversation.dialog[dialog].sender == id) {
    //                     targetConversation.dialog.splice(dialog, 1);
    //                     flag = true;
    //                     break;
    //                 }
    //                 else {
    //                     return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
    //                 }
    //             }
    //         }
    //         if (!flag) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
    //         }
    //         targetConversation = await targetConversation.save();
    //     }
    //     else {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    //     }
    //     return callRes(res, responseError.OK, 'Successfully delete message');
    // });

    // socket.on('set_read_message', verify, async (req, res) => {
    //     let token = req.query.token;
    //     if (token === undefined) {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    //     }
    //     if (typeof token != "string") {
    //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    //     }
    //     let id = req.user.id;
    //     let thisUser = await User.findById(id);
    //     if (thisUser.isBlocked) {
    //         return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    //     }
    //     if (req.query.partner_id) {
    //         let targetConversation;
    //         let partnerId = req.query.partner_id;
    //         try {
    //             var partnerUser = await User.findById(partnerId);
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         if (partnerUser == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
    //         }
    //         try {
    //             var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
    //             var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
    //         } catch (err) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
    //         }
    //         if (targetConversation1) {
    //             if (targetConversation1.secondUser == id) {
    //                 targetConversation = targetConversation1;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else if (targetConversation2) {
    //             if (targetConversation2.firstUser == id) {
    //                 targetConversation = targetConversation2;
    //             } else {
    //                 return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //             }
    //         }
    //         else {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         for (dialog in targetConversation.dialog) {
    //             targetConversation.dialog[dialog].unread = "0";
    //         }
    //         targetConversation = await targetConversation.save();
    //     }
    //     else if (req.query.conversation_id) {
    //         let targetConversation;
    //         let conversationId = req.query.conversation_id;
    //         targetConversation = await Conversation.findOne({ conversationId: conversationId });
    //         if (targetConversation == null) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //         }
    //         if (targetConversation.firstUser != id && targetConversation.secondUser != id) {
    //             return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
    //         }
    //         for (dialog in targetConversation.dialog) {
    //             targetConversation.dialog[dialog].unread = "0";
    //             await targetConversation.save();
    //         }
    //         targetConversation = await targetConversation.save();
    //     }
    //     else {
    //         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    //     }
    //     return callRes(res, responseError.OK, 'Successfully set read message');
    // });

    socket.on('client_get_list_conversation', async (dataSocket) => {
        const { token, thisUserId } = dataSocket;
        const verifyToken = await verifySocketToken(token);
        if (!verifyToken) {
            socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
            return;
        }
        const verified = jwt.verify(token, process.env.jwtSecret);
        if (thisUserId !== verified.id) {
            socket.emit('server_send_conversation', { message: 'failed', reason: 'token invalid' });
            return;
        }
        let data = [];
        let totalNewMessage = 0;
        var conversations = [];
        let conversationFirst = await Conversation.find({ firstUser: thisUserId });
        let conversationSecond = await Conversation.find({ secondUser: thisUserId });
        for (let conversation in conversationFirst) {
            conversations.push(conversationFirst[conversation]);
        }
        for (let conversation in conversationSecond) {
            conversations.push(conversationSecond[conversation]);
        }
        //console.log(conversations);
        // let endFor = conversations.length < index + count ? conversations.length : index + count;
        for (let i = 0; i < conversations.length; i++) {
            let x = conversations[i];
            if (x.conversationId == null || x.conversationId == "") {
                continue;
            }
            let conversationInfo = {
                id: null,
                partner: {
                    id: null,
                    username: null,
                    avatar: null
                },
                lastMessage: {
                    message: null,
                    created: null,
                },
                numNewMessage: 0
            }
            let partner, lastDialog;
            if (x.firstUser == thisUserId) {
                partner = await User.findById(x.secondUser);
            }
            else {
                partner = await User.findById(x.firstUser);
            }
            lastDialog = x.dialog[x.dialog.length - 1];
            conversationInfo.id = x.conversationId;
            conversationInfo.partner.id = partner._id;
            conversationInfo.partner.username = partner.name;
            conversationInfo.partner.avatar = partner.avatar.url;
            conversationInfo.lastMessage.message = lastDialog?.content;
            conversationInfo.lastMessage.created = lastDialog?.created;
            var numNewMessage = 0;
            for (let j = x.dialog.length - 1; j >= 0; j--) {
                if (x.dialog[j].unread == "1" && x.dialog[j].sender.toString() !== thisUserId) {
                    numNewMessage += 1;
                }
                else break;
            }
            if (numNewMessage > 0) totalNewMessage += 1;
            conversationInfo.numNewMessage = numNewMessage;
            data.push(conversationInfo);
        }
        socket.emit('server_send_list_conversation', { message: 'OK', data: data, totalNewMessage: totalNewMessage });
    });


}


// module.exports = router;
