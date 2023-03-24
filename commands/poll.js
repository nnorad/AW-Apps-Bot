const { PermissionFlagsBits, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const guildSchema = require('../schemas/guild-schema')
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Poll')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionFlagsBits.AddReactions)
        .setDMPermission(false),
	async execute(interaction) {
        const { targetMessage: message, channel, guild } = interaction
        const missingPermissions = channel.permissionsFor(guild.members.me).missing([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.AddReactions])

        if (missingPermissions.length > 0) {
            const permissions = {
                'AddReactions': 'Add Reactions',
                'ViewChannel': 'View Channels'
            }
      
            return await interaction.reply({ content: `Please grant me these permissions in ${channel}:\n\n${missingPermissions.map(p => `• ${permissions[p]}`).join('\n')}`, ephemeral: true })
        }

        await message.react('<:yes:1084332973870026892>')
        await message.react('<:no:1084332972683051068>')
        await interaction.reply({ content: 'Done.', ephemeral: true })
    },
}