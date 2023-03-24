const { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildSchema = require('../schemas/guild-schema');
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	name: Events.MessageReactionAdd,
	async execute(reaction, user) {
        if (user.bot) return

        const { client, emoji, message } = reaction
        const result = await suggestionSchema.findOne({ messageId: message.id })

        if (result && result?.status === 'NO_STATUS') {
            await message.fetch()
            
            const { editable, embeds, channel, guild, reactions } = message
            const yes = (await reactions.resolve('1084332973870026892').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
            const no = (await reactions.resolve('1084332972683051068').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
            const diff = yes - no

            if (diff >= 15) {
                if (embeds.length > 0 && editable) {
                    const embed = embeds[0]
                    const newEmbed = EmbedBuilder.from(embed).setColor(0xfee75c).spliceFields(0, 2, { name: 'Status', value: 'Pending' })
                    
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
        } else {
            const result = await guildSchema.findOne({ guildId: message.guildId })
            let webhook = await client.fetchWebhook(result?.reactionLogWebhookId, result?.reactionLogWebhookToken).catch(() => {})

            if (!webhook) return

            const embeds = [
                new EmbedBuilder()
                    .setColor(0x57f287)
                    .setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL() })
                    .setTitle('Reaction Added')
                    .setDescription(`${emoji}`)
                    .setFooter({ text: `Message ID: ${message.id} `})
                    .setThumbnail(emoji?.url)
            ]

            const components = [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('Jump')
                            .setURL(message.url)
                            .setStyle(ButtonStyle.Link)
                    )
            ]

            await webhook.send({ embeds, components })
        }
	},
};