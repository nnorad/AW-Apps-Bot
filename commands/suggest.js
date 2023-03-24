const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildSchema = require('../schemas/guild-schema')
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggest')
		.setDescription('Create a suggestion.')
        .addStringOption((option) => option
            .setName('suggestion')
            .setDescription('Your suggestion.')
            .setMaxLength(4096)
            .setRequired(true))
        .addStringOption((option) => option
            .setName('title')
            .setDescription('The title for your suggestion.')
            .setMaxLength(256))
        .addAttachmentOption((option) => option
            .setName('attachment_0')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_1')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_2')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_3')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_4')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_5')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_6')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_7')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_8')
            .setDescription('An attachment to include with your suggestion.'))
        .addAttachmentOption((option) => option
            .setName('attachment_9')
            .setDescription('An attachment to include with your suggestion.'))
        .setDMPermission(false),
	async execute(interaction) {
        const { guild, guildId, options, user } = interaction
        const result = await guildSchema.findOne({ guildId })

        console.log(result)

        if (!result?.suggestionChannelId) return await interaction.reply({ content: 'Suggestions are disabled for this server.', ephemeral: true })

        const channel = guild.channels.cache.get(result?.suggestionChannelId)

        if (!channel) return await interaction.reply({ content: 'The suggestion channel does not exist.', ephemeral: true })

        const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.UseExternalEmojis])

        if (missingPermissions.length > 0) {
            const permissions = {
                'AddReactions': 'Add Reactions',
                'ViewChannel': 'View Channels',
                'SendMessages': 'Send Messages',
                'EmbedLinks': 'Embed Links',
                'AttachFiles': 'Attach Files',
                'UseExternalEmojis': 'UseExternalEmojis'
            }
      
            return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
        }

        const suggestion = options.getString('suggestion')
        const title = options.getString('title')
        const { suggestionId } = await guildSchema.findOneAndUpdate({ guildId }, { $inc: { suggestionId: 1 }, guildId }, { upsert: true, returnDocument: 'after' })
        
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(title)
            .setDescription(suggestion)
            .setAuthor({ name: `${user.tag} (${user.id})`, iconURL: user.displayAvatarURL() })
            .setFooter({ text: `Suggestion ${suggestionId}` })

        const files = options.resolved.attachments ? [...options.resolved.attachments.values()].reverse() : []

        const components = [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete_suggestion')
                        .setLabel('Delete Suggestion')
                        .setStyle(ButtonStyle.Danger)
            )
        ]

        const message = await channel.send({ embeds: [embed], files, components })

        await message.react('<:yes:1084332973870026892>')
        await message.react('<:no:1084332972683051068>')
        await suggestionSchema.create({ channelId: channel.id, files, guildId, messageId: message.id, suggestion, suggestionId, userId: user.id, status: 'NO_STATUS', title })
        await interaction.reply(`[Your suggestion](${message.url}) has been sent.`)
    },
}