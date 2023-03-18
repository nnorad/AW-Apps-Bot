const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const suggestionSchema = require('../schemas/suggestion-schema')
const guildSchema = require('../schemas/guild-schema')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('suggestion')
		.setDescription('Edit or get a suggestion, or set the suggestion channel.')
        .addSubcommand((subcommand) => subcommand
            .setName('channel')
            .setDescription('Set the suggestion channel.'))
        .addSubcommand((subcommand) => subcommand
            .setName('get')
            .setDescription('Get a suggestion.')
            .addIntegerOption((option) => option
                .setName('suggestion_id')
                .setDescription('The ID of the suggestion to get.')
                .setRequired(true)))
        .addSubcommand((subcommand) => subcommand
            .setName('approve')
            .setDescription('Approve a suggestion.')
            .addIntegerOption((option) => option
                .setName('suggestion_id')
                .setDescription('The ID of the suggestion to approve.')
                .setRequired(true))
            .addStringOption((option) => option
                .setName('reason')
                .setDescription('The reason for approving this suggestion.')))
        .addSubcommand((subcommand) => subcommand
            .setName('reject')
            .setDescription('Reject a suggestion.')
            .addIntegerOption((option) => option
                .setName('suggestion_id')
                .setDescription('The ID of the suggestion to reject.')
                .setRequired(true))
            .addStringOption((option) => option
                .setName('reason')
                .setDescription('The reason for rejecting this suggestion.')))
        .addSubcommand((subcommand) => subcommand
            .setName('reset')
            .setDescription('Reset a suggestion.')
            .addIntegerOption((option) => option
                .setName('suggestion_id')
                .setDescription('The ID of the suggestion to reset.')
                .setRequired(true)))
        .addSubcommand((subcommand) => subcommand
            .setName('reason')
            .setDescription('Edit the reason for a suggestion.')
            .addIntegerOption((option) => option
                .setName('suggestion_id')
                .setDescription('The ID of the suggestion to approve.')
                .setRequired(true))
            .addStringOption((option) => option
                .setName('reason')
                .setDescription('The new reason.')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
	async execute(interaction) {
        const { guild, guildId, options, client } = interaction

        const statuses = {
            'APPROVED': {
                color: 0x57f287,
                value: `Approved`
            },
            'REJECTED': {
                color: 0xed4245,
                value: 'Rejected'
            },
            'NO_STATUS': {
                color: 0x5865f2
            },
            'PENDING': {
                color: 0xfee75c,
                value: 'Pending'
            }
        }

        switch (options.getSubcommand()) {
            case 'channel': {
                const result = await guildSchema.findOne({ guildId })

                const components = [
                    new ActionRowBuilder()
                        .addComponents(
                            new ChannelSelectMenuBuilder()
                                .setCustomId('suggestion_channel_select')
                                .setPlaceholder('Select a Channel')
                                .addChannelTypes(ChannelType.GuildText)
                        ),
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('suggestion_channel_cancel')
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('suggestion_channel_disable')
                                .setLabel('Disable Suggestions')
                                .setDisabled(result?.suggestionChannelId ? false : true)
                                .setStyle(ButtonStyle.Danger)
                        )
                ]

                const message = await interaction.reply({ content: result?.suggestionChannelId ? `The suggestion channel is set to <#${result.suggestionChannelId}>.` : null, components, ephemeral: true })

                components.forEach((row) => row.components.forEach((component) => component.data.disabled = true))

                await message.awaitMessageComponent({ time: 30000 })
                    .then(async (i) => {
                        switch (i.customId) {
                            case 'suggestion_channel_select': {
                                const channel = i.channels.first()

                                if (channel.id === result?.suggestionChannelId) return await i.update({ content: `The suggestion channel is already set to ${channel}.`, components, ephemeral: true })

                                await guildSchema.updateOne({ guildId }, { suggestionChannelId: channel.id }, { upsert: true })
                                await i.update({ content: `The suggestion channel has been set to ${channel}.`, components, ephemeral: true })
                                break
                            }
                            case 'suggestion_channel_cancel': {
                                await i.update({ components })
                                break
                            }
                            case 'suggestion_channel_disable': {
                                await guildSchema.updateOne({ guildId }, { $unset: { suggestionChannelId: '' } })
                                await i.update({ content: `The suggestion channel has been disabled.`, components, ephemeral: true })
                                break
                            }
                        }
                    }).catch(async () => {
                        await interaction.editReply({ components })
                    })
                break
            }
            case 'get': {
                const suggestionId = options.getInteger('suggestion_id')
                const result = await suggestionSchema.findOne({ suggestionId, guildId })

                if (!result) return await interaction.reply({ content: `Suggestion ${suggestionId} does not exist in this server.`, ephemeral: true })

                const status = statuses[result.status]
                const user = await client.users.fetch(result.userId).catch(() => {})

                const embed = new EmbedBuilder()
                    .setColor(status.color)
                    .setTitle(result.title)
                    .setDescription(result.suggestion)
                    .setAuthor({ name: user ? `${user.tag} (${user.id})` : result.userId, iconURL: user ? user.displayAvatarURL() : null })
                    .setFooter({ text: `Suggestion ${suggestionId}` })

                if (status.value) {
                    embed.addFields([{ name: 'Status', value: status.value }])
                }
            
                if (result.reason) {
                    embed.addFields([{ name: 'Reason', value: result.reason }])
                }
                
                await interaction.reply({ files: result.files, embeds: [embed], ephemeral: true })
                break
            }
            case 'approve': {
                const suggestionId = options.getInteger('suggestion_id')
                const result = await suggestionSchema.findOne({ suggestionId, guildId })

                if (!result) return await interaction.reply({ content: `Suggestion ${suggestionId} does not exist in this server.`, ephemeral: true })

                const channel = guild.channels.cache.get(result.channelId)
                const reason = options.getString('reason')
                
                if (!channel) return await interaction.reply({ content: `The channel with suggestion ${suggestionId} does not exist.`, ephemeral: true })

                const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.UseExternalEmojis])
      
                if (missingPermissions.length > 0) {
                    const permissions = {
                        'ViewChannel': 'View Channel',
                        'SendMessages': 'Send Messages',
                        'EmbedLinks': 'Embed Links'
                    }
            
                    return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
                }

                const message = await channel.messages.fetch(result.messageId).catch(() => {})
      
                if (!message) return interaction.reply({ content: `The message with suggestion ${suggestionId} does not exist.`, ephemeral: true })
                if (result.status === 'APPROVED') return await interaction.reply({ content: `Suggestion ${suggestionId} has already been approved.`, ephemeral: true })
                
                const user = await client.users.fetch(result.userId).catch(() => {})

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setTitle(result.title)
                    .setAuthor({ name: user ? `${user.tag} (${user.id})` : result.userId, iconURL: user ? user.displayAvatarURL() : null })
                    .setDescription(result.suggestion)
                    .addFields({ name: 'Status', value: 'Approved' })
                    .setFooter({ text: `Suggestion ${result.suggestionId}` })

                if (reason) {
                    embed.addFields({ name: 'Reason', value: reason })
                }
                
                await suggestionSchema.updateOne({ guildId, suggestionId }, { reason, status: 'APPROVED' })
                await message.edit({ embeds: [embed] })

                if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) await message.unpin()
                
                await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) has been approved.`)
                break
            }
            case 'reject': {
                const suggestionId = options.getInteger('suggestion_id')
                const result = await suggestionSchema.findOne({ suggestionId, guildId })

                if (!result) return await interaction.reply({ content: `Suggestion ${suggestionId} does not exist in this server.`, ephemeral: true })

                const channel = guild.channels.cache.get(result.channelId)
                const reason = options.getString('reason')
                
                if (!channel) return await interaction.reply({ content: `The channel with suggestion ${suggestionId} does not exist.`, ephemeral: true })

                const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.UseExternalEmojis])
      
                if (missingPermissions.length > 0) {
                    const permissions = {
                        'ViewChannel': 'View Channel',
                        'SendMessages': 'Send Messages',
                        'EmbedLinks': 'Embed Links'
                    }
            
                    return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
                }

                const message = await channel.messages.fetch(result.messageId).catch(() => {})
      
                if (!message) return interaction.reply({ content: `The message with suggestion ${suggestionId} does not exist.`, ephemeral: true })
                if (result.status === 'REJECTED') return await interaction.reply({ content: `Suggestion ${suggestionId} has already been rejected.`, ephemeral: true })
                
                const user = await client.users.fetch(result.userId).catch(() => {})

                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setTitle(result.title)
                    .setAuthor({ name: user ? `${user.tag} (${user.id})` : result.userId, iconURL: user ? user.displayAvatarURL() : null })
                    .setDescription(result.suggestion)
                    .addFields({ name: 'Status', value: 'Rejected' })
                    .setFooter({ text: `Suggestion ${result.suggestionId}` })

                if (reason) {
                    embed.addFields({ name: 'Reason', value: reason })
                }
                
                await suggestionSchema.updateOne({ guildId, suggestionId }, { reason, status: 'REJECTED' })
                await message.edit({ embeds: [embed] })

                if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) await message.unpin()
                
                await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) has been rejected.`)
                break
            }
            case 'reason': {
                const suggestionId = options.getInteger('suggestion_id')
                const result = await suggestionSchema.findOne({ suggestionId, guildId })

                if (!result) return await interaction.reply({ content: `Suggestion ${suggestionId} does not exist in this server.`, ephemeral: true })

                const channel = guild.channels.cache.get(result.channelId)
                const reason = options.getString('reason')
                
                if (!channel) return await interaction.reply({ content: `The channel with suggestion ${suggestionId} does not exist.`, ephemeral: true })

                const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.UseExternalEmojis])
      
                if (missingPermissions.length > 0) {
                    const permissions = {
                        'ViewChannel': 'View Channel',
                        'SendMessages': 'Send Messages',
                        'EmbedLinks': 'Embed Links'
                    }
            
                    return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
                }

                const message = await channel.messages.fetch(result.messageId).catch(() => {})

                if (!message) return interaction.reply({ content: `The message with suggestion ${suggestionId} does not exist.`, ephemeral: true })
                if (!['APPROVED', 'REJECTED'].includes(result.status)) return await interaction.reply({ content: `Suggestion ${suggestionId} cannot be given a reason.`, ephemeral: true })
                if (reason === result.reason) return await interaction.reply({ content: 'Please choose a different reason.', ephemeral: true })

                const status = statuses[result.status]
                const user = await client.users.fetch(result.userId).catch(() => {})

                const embed = new EmbedBuilder()
                    .setColor(status.color)
                    .setTitle(result.title)
                    .setAuthor({ name: user ? `${user.tag} (${user.id})` : result.userId, iconURL: user ? user.displayAvatarURL() : null })
                    .setDescription(result.suggestion)
                    .addFields({ name: 'Status', value: status.value })
                    .setFooter({ text: `Suggestion ${result.suggestionId}` })
    
                if (reason) {
                    embed.addFields({ name: 'Reason', value: reason })
                }

                await suggestionSchema.updateOne({ guildId, suggestionId }, { reason })
                await message.edit({ embeds: [embed] })
                await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) has been edited.`)
                break
            }
            case 'reset': {
                const suggestionId = options.getInteger('suggestion_id')
                const result = await suggestionSchema.findOne({ suggestionId, guildId })

                if (!result) return await interaction.reply({ content: `Suggestion ${suggestionId} does not exist in this server.`, ephemeral: true })

                const channel = guild.channels.cache.get(result.channelId)
                
                if (!channel) return await interaction.reply({ content: `The channel with suggestion ${suggestionId} does not exist.`, ephemeral: true })

                const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.UseExternalEmojis])
      
                if (missingPermissions.length > 0) {
                    const permissions = {
                        'ViewChannel': 'View Channel',
                        'SendMessages': 'Send Messages',
                        'EmbedLinks': 'Embed Links'
                    }
            
                    return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
                }

                const message = await channel.messages.fetch(result.messageId).catch(() => {})
      
                if (!message) return interaction.reply({ content: `The message with suggestion ${suggestionId} does not exist.`, ephemeral: true })
                
                const user = await client.users.fetch(result.userId).catch(() => {})

                const embed = new EmbedBuilder()
                    .setTitle(result.title)
                    .setAuthor({ name: user ? `${user.tag} (${user.id})` : result.userId, iconURL: user ? user.displayAvatarURL() : null })
                    .setDescription(result.suggestion)
                    .setFooter({ text: `Suggestion ${result.suggestionId}` })

                const yes = (await message.reactions.resolve('1084332973870026892').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
                const no = (await message.reactions.resolve('1084332972683051068').users.fetch()).filter((u) => !u.bot && u.id !== result.userId).size
                const diff = yes - no

                switch (true) {
                    case diff >= 15: {
                        if (result.status === 'PENDING') return await interaction.reply({ content: 'No changes were made.', ephemeral: true })

                        embed
                            .setColor(0xfee75c)
                            .addFields({ name: 'Status', value: 'Pending' })
                        
                        await suggestionSchema.updateOne({ guildId, suggestionId }, { $unset: { reason: '' }, status: 'PENDING' })
                        await message.edit({ embeds: [embed] })
        
                        if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) await message.pin()
                        
                        await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) is now pending.`)
                        break
                    }
                    case diff <= -15: {
                        if (result.status === 'REJECTED') return await interaction.reply({ content: 'No changes were made.', ephemeral: true })

                        embed
                            .setColor(0xed4245)
                            .addFields({ name: 'Status', value: 'Rejected' })
                        
                        await suggestionSchema.updateOne({ guildId, suggestionId }, { $unset: { reason: '' }, status: 'REJECTED' })
                        await message.edit({ embeds: [embed] })
        
                        if (channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) await message.unpin()
                        
                        await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) has been rejected.`)
                        break
                    }
                    default: {
                        if (result.status === 'NO_STATUS') return await interaction.reply({ content: 'No changes were made.', ephemeral: true })

                        embed
                            .setColor(0x5865f2)
                        
                        await suggestionSchema.updateOne({ guildId, suggestionId }, { $unset: { reason: '' }, status: 'NO_STATUS' })
                        await message.edit({ embeds: [embed] })
                        await interaction.reply(`[Suggestion ${suggestionId}](${message.url}) has been reset.`)
                    }
                }
                break
            }
        }
    },
}
