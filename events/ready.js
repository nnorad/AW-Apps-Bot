const { Events } = require('discord.js');
const mongo = require('../mongo')

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await mongo()
	},
};