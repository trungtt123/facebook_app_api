const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verify = require('../utils/verifyToken');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const convertString = require('../utils/convertString');
const {responseError, callRes} = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');

//Not API
router.post('/create_conversation', async (req, res) => {
    let conversationId = req.query.conversationId;
    let firstUserId = req.query.firstUser;
    let secondUserId = req.query.secondUser;
    let firstUser, secondUser;
    firstUser = await User.findById(firstUserId);
    secondUser = await User.findById(secondUserId);
    const newConversation = new Conversation({
        conversationId: conversationId,
        firstUser: firstUser._id,
        secondUser: secondUser._id
    });
    newConversation.save();
    res.json({ message: "OK" });
});
//Not API
router.post('/add_dialog', async (req, res) => {
    let conversationId = req.query.conversationId;
    let dialogId = req.query.dialogId;
    let senderId = req.query.senderId;
    let content = req.query.content;
    let conversation, sender;
    sender = await User.findById(senderId);
    conversation = await Conversation.findOne({conversationId});
    conversation.dialog.push({
        dialogId: dialogId,
        sender: senderId,
        content: content
    })
    conversation.save();
    res.json({ message: "OK" });
});

router.post('/delete_conversation', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    if (req.query.partner_id){
        let targetConversation;
        let partnerId = req.query.partner_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        await Conversation.deleteOne({ _id: targetConversation._id });
    }
    else if (req.query.conversation_id){
        let targetConversation;
        let conversationId = req.query.conversation_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (targetConversation == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        if (targetConversation.firstUser != id && targetConversation.secondUser != id){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
        }
        await Conversation.deleteOne({ _id: targetConversation._id });
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully delete conversation');
});

router.post('/delete_message', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    if (req.query.message_id === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'message_id');
    }
    if (req.query.partner_id){
        let flag = false;
        let targetConversation;
        let partnerId = req.query.partner_id;
        let messageId = req.query.message_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        for (dialog in targetConversation.dialog){
            if (targetConversation.dialog[dialog].dialogId == messageId){
                if (targetConversation.dialog[dialog].sender == id){
                    targetConversation.dialog.splice(dialog, 1);
                    flag = true;
                    break;
                }
                else{
                    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
                }
            }
        }
        if (!flag){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
        }
        targetConversation = await targetConversation.save();
    }
    else if (req.query.conversation_id){
        let flag = false;
        let targetConversation;
        let conversationId = req.query.conversation_id;
        let messageId = req.query.message_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (targetConversation == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        for (dialog in targetConversation.dialog){
            if (targetConversation.dialog[dialog].dialogId == messageId){
                if (targetConversation.dialog[dialog].sender == id){
                    targetConversation.dialog.splice(dialog, 1);
                    flag = true;
                    break;
                }
                else{
                    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
                }
            }
        }
        if (!flag){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
        }
        targetConversation = await targetConversation.save();
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully delete message');
});

router.post('/set_read_message', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    if (req.query.partner_id){
        let targetConversation;
        let partnerId = req.query.partner_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        for (dialog in targetConversation.dialog){
            targetConversation.dialog[dialog].unread = "0"  ;
        }
        targetConversation = await targetConversation.save();
    }
    else if (req.query.conversation_id){
        let targetConversation;
        let conversationId = req.query.conversation_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (targetConversation == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        if (targetConversation.firstUser != id && targetConversation.secondUser != id){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
        }
        for (dialog in targetConversation.dialog){
            targetConversation.dialog[dialog].unread = "0";
            await targetConversation.save();
        }
        targetConversation = await targetConversation.save();
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully set read message');
});

router.post('/get_list_conversation', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let code, message;
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    let { index, count } = req.query;
    if (index === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index');
    }
    if (count === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'count');
    }
    if (typeof index != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
    }
    if (typeof count != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
    }
    let isNumIndex = /^\d+$/.test(index);
    if (!isNumIndex){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
    }
    let isNumCount = /^\d+$/.test(count);
    if (!isNumCount){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
    }
    index = parseInt(req.query.index);
    count = parseInt(req.query.count);
    if (index < 0){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
    }
    if (count < 0){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
    }
    if (count == 0){
        return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }
    var numNewMessage = 0;
    let data = [];
    if (req.query.index === undefined || req.query.count === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index and count');
    }
    var conversations = [];
    let conversationFirst = await Conversation.find({ firstUser: id });
    let conversationSecond = await Conversation.find({ secondUser: id });
    for (conversation in conversationFirst){
        conversations.push(conversationFirst[conversation]);
    }
    for (conversation in conversationSecond){
        conversations.push(conversationSecond[conversation]);
    }
    //console.log(conversations);
    let endFor = conversations.length < index + count ? conversations.length : index + count;
    for (let i = index; i < endFor; i++){
        let x = conversations[i];
        if (x.conversationId == null || x.conversationId == ""){
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
                unread: null
            }
        }
        let partner, lastDialog;
        if (x.firstUser == id){
            partner = await User.findById(x.secondUser);
        }
        else{
            partner = await User.findById(x.firstUser);
        }
        lastDialog = x.dialog[x.dialog.length - 1];
        conversationInfo.id = x.conversationId;
        conversationInfo.partner.id = partner._id;
        conversationInfo.partner.username = partner.name;
        conversationInfo.partner.avatar = partner.avatar.url;
        conversationInfo.lastMessage.message = lastDialog.content;
        conversationInfo.lastMessage.created = lastDialog.created;
        if (lastDialog.unread === undefined || lastDialog.unread == null){
            conversationInfo.lastMessage.unread = "1";
        }
        else{
            conversationInfo.lastMessage.unread = "0";
        }
        for (dialog in x.dialog){
            if (x.dialog[dialog].unread == "1"){
                numNewMessage += 1;
                break;
            }
        }
        data.push(conversationInfo);
    }
    if (data.length == 0){
        return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }
    code = "1000";
    message = "OK";
    res.json({ code, message, data, numNewMessage });
});

router.post('/get_conversation', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let detail;
    let code, message;
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    let data = {
        conversation: []
    }
    if (req.query.index === undefined || req.query.count === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index and count');
    }
    if (req.query.partner_id){
        let targetConversation;
        let index = req.query.index;
        let count = req.query.count;
        if (typeof index != "string"){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        if (typeof count != "string"){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        let isNumIndex = /^\d+$/.test(index);
        if (!isNumIndex){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        let isNumCount = /^\d+$/.test(count);
        if (!isNumCount){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        index = parseInt(req.query.index);
        count = parseInt(req.query.count);
        if (index < 0){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        if (count < 0){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        if (count == 0){
            return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        }
        let partnerId = req.query.partner_id;
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }
            else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }
            else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        let endFor = targetConversation.dialog.length < index + count ? targetConversation.dialog.length : index + count;
        for (let i = index; i < endFor; i++){
            let x = targetConversation.dialog[i];
            let dialogInfo = {
                message: null,
                message_id: null,
                unread: null,
                created: null,
                sender: {
                    id: null,
                    username: null,
                    avatar: null
                }
            }
            let targetUser;
            targetUser = await User.findById(x.sender);
            if (x.content === undefined || x.dialogId === undefined || x.created === undefined || x.content == '' || x.dialogId == '' || x.created == ''){
                continue;
            }
            dialogInfo.message = x.content;
            dialogInfo.message_id = x.dialogId;
            dialogInfo.unread = x.unread;
            dialogInfo.created = x.created;
            dialogInfo.sender.id = targetUser._id;
            dialogInfo.sender.username = targetUser.name;
            dialogInfo.sender.avatar = targetUser.avatar.url;
            data.conversation.push(dialogInfo);
        }
    }
    else if (req.query.conversation_id) {
        let targetConversation;
        let index = req.query.index;
        let count = req.query.count;
        if (typeof index != "string"){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        if (typeof count != "string"){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        let isNumIndex = /^\d+$/.test(index);
        if (!isNumIndex){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        let isNumCount = /^\d+$/.test(count);
        if (!isNumCount){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        index = parseInt(req.query.index);
        count = parseInt(req.query.count);
        if (index < 0){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'index');
        }
        if (count < 0){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'count');
        }
        if (count == 0){
            return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
        }
        let conversationId = req.query.conversation_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (!targetConversation){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        let endFor = targetConversation.dialog.length < index + count ? targetConversation.dialog.length : index + count;
        for (let i = index; i < endFor; i++){
            let x = targetConversation.dialog[i];
            let dialogInfo = {
                message: null,
                message_id: null,
                unread: null,
                created: null,
                sender: {
                    id: null,
                    username: null,
                    avatar: null
                }
            }
            let targetUser;
            targetUser = await User.findById(x.sender);
            dialogInfo.message = x.content;
            dialogInfo.message_id = x.dialogId;
            dialogInfo.unread = x.unread;
            dialogInfo.created = x.created;
            dialogInfo.sender.id = targetUser._id;
            dialogInfo.sender.username = targetUser.name;
            dialogInfo.sender.avatar = targetUser.avatar.url;
            data.conversation.push(dialogInfo);
        }
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    if (data.conversation.length == 0){
        return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    }
    code = "1000";
    message = "OK";
    res.json({ code, message, data });
});

module.exports = router;
