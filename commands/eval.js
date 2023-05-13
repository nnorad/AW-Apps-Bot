const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const guildSchema = require('../schemas/guild-schema')
const suggestionSchema = require('../schemas/suggestion-schema')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('eval')
		.setDescription('Evaluate Javascript code.')
        .addStringOption(option => option
            .setName('code')
            .setDescription('The code to evaluate.')
            .setRequired(true))
        .addBooleanOption(option => option
            .setName('ephemeral')
            .setDescription('Whether the response to this command should be ephemeral.')
            .setRequired(true)),
	async execute(interaction) {
        const { options, user} = interaction

        if (interaction.user.id !== '614672325190615051') return await interaction.reply({ content: 'This command is strictly off limits.', ephemeral: true })

        const code = options.getString('code')
        const ephemeral = options.getBoolean('ephemeral')

        await interaction.deferReply({ ephemeral })

        try {
            const result = await eval(`(async () => {${code}})()`)

            await interaction.editReply({ content: `${result}`, allowedMentions: { users: [] } })
        } catch (e) {
            await interaction.editReply({ content: `${e}` })
        }
    },
}