const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
    conversationId: {
        type: String,
        required: true
    },
    firstUser: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    secondUser: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    },
    dialog: [{
        dialogId: {
            type: String
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        content: {
            type: String
        },
        unread: {
            type: String,
            default: "1"
        },
        created: {
            type: String,
            default: String(Math.floor(Date.now() / 1000))
        }
    }]
});

module.exports = Conversation = mongoose.model('conversations', ConversationSchema);
