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
        const { client, guild, guildId } = interaction
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
                        if (!channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageWebhooks)) return await i.update({ content: `Please grant me the Manage Webhooks permission for ${channel}.`, components, ephemeral: true })

                        let webhook = await client.fetchWebhook(result?.reactionChannelWebhookId, result?.reactionChannelWebhookToken).catch(() => {})

                        if (webhook) {
                            if (!webhook.channelId !== channel.id) await webhook.edit({ channel: channel.id })
                        } else {
                            webhook = await channel.createWebhook({ name: client.user.username, avatar: client.user.displayAvatarURL({ extension: 'png', size: 4096 }) })

                            await guildSchema.updateOne({ guildId }, { guildId, reactionChannelWebhookId: webhook.id, reactionChannelWebhookToken: webhook.token }, { upsert: true })
                        }

                        await guildSchema.updateOne({ guildId }, { reactionChannelId: channel.id }, { upsert: true })
                        await i.update({ content: `The reaction channel has been set to ${channel}.`, components, ephemeral: true })
                        break
                    }
                    case 'reaction_channel_cancel': {
                        await i.update({ components })
                        break
                    }
                    case 'reaction_channel_disable': {
                        const webhook = await client.fetchWebhook(result?.reactionChannelWebhookId, result?.reactionChannelWebhookToken).catch(() => {})

                        if (webhook) {
                            if (webhook.channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageWebhooks)) await webhook.delete()

                            await guildSchema.updateOne({ guildId }, { $unset: { reactionChannelWebhookId: '', reactionChannelWebhookToken: '' } })
                        }
                        
                        await guildSchema.updateOne({ guildId }, { $unset: { reactionChannelId: '' } })
                        await i.update({ content: `The reaction channel has been disabled.`, components, ephemeral: true })
                        break
                    }
                }
            }).catch(async (e) => {
                console.log(e)
                await interaction.editReply({ components })
            })
    },
}