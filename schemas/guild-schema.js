const mongoose = require('mongoose')

const guildSchema = mongoose.Schema({
    guildId: String,
    suggestionChannelId: String,
    suggestionId: Number
})

module.exports = mongoose.model('guilds', guildSchema)