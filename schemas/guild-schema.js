const mongoose = require('mongoose')

const guildSchema = mongoose.Schema({
    guildId: String,
    suggestionLogId: String,
    suggestionId: Number,
    reactionLogId: String,
    reactionLogWebhookId: String,
    reactionLogWebhookToken: String
})

module.exports = mongoose.model('guilds', guildSchema)