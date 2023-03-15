const mongoose = require('mongoose')

const suggestionSchema = mongoose.Schema({
    channelId: String,
    files: Array,
    guildId: String,
    messageId: String,
    reason: String,
    status: String,
    suggestion: String,
    suggestionId: Number,
    userId: String,
    title: String,
    moderatorId: String
})

module.exports = mongoose.model('suggestions', suggestionSchema)