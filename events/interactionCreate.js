const { Events, InteractionType, ComponentType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const suggestionSchema = require('../schemas/suggestion-schema');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		switch(interaction.type) {
			case InteractionType.ApplicationCommand: {
				const command = interaction.client.commands.get(interaction.commandName);

				if (!command) {
					console.error(`No command matching ${interaction.commandName} was found.`);
					return;
				}

				try {
					await command.execute(interaction);
				} catch (error) {
					console.error(`Error executing ${interaction.commandName}`);
					console.error(error);
				}
				break
			}
			case InteractionType.MessageComponent: {
				switch (interaction.componentType) {
					case ComponentType.Button: {
						switch (interaction.customId) {
							case 'delete_suggestion': {
								const { message, user } = interaction
								const messages = [message]
								const result = await suggestionSchema.findOne({ messageId: messages[0].id })

								if (user.id !== result.userId) return await interaction.reply({ content: 'You cannot delete this suggestion.', ephemeral: true })
								if (result.status !== 'NO_STATUS') return await interaction.reply({ content: 'This suggestion cannot be deleted.', ephemeral: true })

								const components = [
									new ActionRowBuilder()
										.addComponents(
											new ButtonBuilder()
												.setCustomId('cancel')
												.setLabel('Cancel')
												.setStyle(ButtonStyle.Secondary),
											new ButtonBuilder()
												.setCustomId('delete')
												.setLabel('Delete')
												.setStyle(ButtonStyle.Danger)
										)
								]

								messages.push(await interaction.reply({ content: 'Are you sure you want to delete this suggestion?', components, ephemeral: true }))

								components[0].components.forEach((c) => c.data.disabled = true)

								messages[1].awaitMessageComponent({ time: 15000 })
									.then(async (i) => {
										switch (i.customId) {
											case 'cancel': {
												await i.update({ content: `Suggestion ${result.suggestionId} has not been deleted.`, components })
												break
											}
											case 'delete': {
												await messages[0].delete()
												await i.update({ content: `Suggestion ${result.suggestionId} has been deleted.`, components })
												break
											}
										}
									}).catch(async () => {
										await interaction.editReply({ content: `Suggestion ${result.suggestionId} has not been deleted.`, components })
									})
								break
							}
						}
						break
					}
				}
				break
			}
		}
	},
};