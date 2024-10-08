const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("support")
		.setNameLocalizations({
			"es-ES": "soporte",
		})

		.setDescription("Info » Join the Applio support server.")
		.setDescriptionLocalizations({
			"es-ES": "Info » Únete al servidor de soporte de Applio.",
		})
		.setDMPermission(false),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setTitle("Applio — Support server")
			.setDescription(
				`Join the official Applio server to get support and find out all the latest news!\n\n[Support Server](${process.env.SUPPORT_SERVER})`,
			)
			.setColor("White")
			.setTimestamp();

		return interaction.reply({
			embeds: [embed],
			ephemeral: false,
		});
	},
};
