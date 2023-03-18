const { Events, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	name: Events.MessageReactionRemove,
	async execute(reaction, user) {
        if (user.bot) return

        const result = await suggestionSchema.findOne({ messageId: reaction.message.id })

        if (result?.status !== 'NO_STATUS') return
        
        const { message } = reaction

        await message.fetch()
        
        const { editable, embeds, channel, guild, reactions } = message
        const yes = (await reactions.resolve('1084332973870026892').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
        const no = (await reactions.resolve('1084332972683051068').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
        const diff = yes - no

        if (diff >= 15) {
            if (embeds.length > 0 && editable) {
                const embed = embeds[0]
                const newEmbed = EmbedBuilder.from(embed).setColor(0xfee75c).spliceFields(0, 2, { name: 'Status', value: `Pending` })
                
                await suggestionSchema.findOneAndUpdate({ messageId: message.id }, { status: 'PENDING' })
                await message.edit({ embeds: [newEmbed] })

                if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) await message.pin()
            }
        }

        if (diff <= -15) {
            if (embeds.length > 0 && editable) {
                const embed = embeds[0]
                const newEmbed = EmbedBuilder.from(embed).setColor(0xed4245).spliceFields(0, 2, { name: 'Status', value: 'Rejected' })
                
                await suggestionSchema.findOneAndUpdate({ messageId: message.id }, { status: 'REJECTED' })
                await message.edit({ embeds: [newEmbed] })
            }
        }
	},
};