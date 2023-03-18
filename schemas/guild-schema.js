const mongoose = require('mongoose')

const guildSchema = mongoose.Schema({
    guildId: String,
    suggestionChannelId: String,
    suggestionId: Number,
    reactionChannelId: String
})

module.exports = mongoose.model('guilds', guildSchema)