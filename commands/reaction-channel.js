const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const guildSchema = require('../schemas/guild-schema')
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reaction-channel')
		.setDescription('Set the reaction channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
	async execute(interaction) {
        const { guildId } = interaction
        const result = await guildSchema.findOne({ guildId })

        const components = [
            new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('reaction_channel_select')
                        .setPlaceholder('Select a Channel')
                        .addChannelTypes(ChannelType.GuildText)
                ),
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('reaction_channel_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('reaction_channel_disable')
                        .setLabel('Disable')
                        .setDisabled(result?.reactionChannelId ? false : true)
                        .setStyle(ButtonStyle.Danger)
                )
        ]

        const message = await interaction.reply({ content: result?.reactionChannelId ? `The reaction channel is set to <#${result.reactionChannelId}>.` : null, components, ephemeral: true })

        components.forEach((row) => row.components.forEach((component) => component.data.disabled = true))

        await message.awaitMessageComponent({ time: 30000 })
            .then(async (i) => {
                switch (i.customId) {
                    case 'reaction_channel_select': {
                        const channel = i.channels.first()

                        if (channel.id === result?.reactionChannelId) return await i.update({ content: `The reaction channel is already set to ${channel}.`, components, ephemeral: true })

                        await guildSchema.updateOne({ guildId }, { reactionChannelId: channel.id }, { upsert: true })
                        await i.update({ content: `The reaction channel has been set to ${channel}.`, components, ephemeral: true })
                        break
                    }
                    case 'reaction_channel_cancel': {
                        await i.update({ components })
                        break
                    }
                    case 'reaction_channel_disable': {
                        await guildSchema.updateOne({ guildId }, { $unset: { reactionChannelId: '' } })
                        await i.update({ content: `The reaction channel has been disabled.`, components, ephemeral: true })
                        break
                    }
                }
            }).catch(async () => {
                await interaction.editReply({ components })
            })
    },
}