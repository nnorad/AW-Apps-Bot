const mongoose = require('mongoose')

const guildSchema = mongoose.Schema({
    guildId: String,
    suggestionChannelId: String,
    suggestionId: Number,
    reactionLogId: String,
    reactionLogWebhookId: String,
    reactionLogWebhookToken: String,
    giveawayChannelId: String
})

module.exports = mongoose.model('guilds', guildSchema)