const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("kick")
		.setNameLocalizations({
			"es-ES": "expulsar",
		})
		.setDescription(
			"Moderation » Kick a user from the server (Moderators only).",
		)
		.setDescriptionLocalizations({
			"es-ES":
				"Moderation » Expulsa a un usuario del servidor (Sólo moderadores).",
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.setDMPermission(false)
		.addUserOption((option) =>
			option
				.setName("user")

				.setNameLocalizations({
					"es-ES": "usuario",
				})
				.setDescription("Select the user to kick.")
				.setDescriptionLocalizations({
					"es-ES": "Selecciona el usuario a expulsar.",
				})
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("reason")
				.setNameLocalizations({
					"es-ES": "razón",
				})
				.setDescription("Reason for the kick of this user.")
				.setDescriptionLocalizations({
					"es-ES": "Razón por la que se expulsa a este usuario.",
				})
				.setMaxLength(512),
		),

	async execute(interaction) {
		const { guild } = interaction;
		const user = interaction.options.getUser("user");
		const reason = interaction.options.getString("reason") || "Not specified";

		if (!user) {
			interaction.reply("The user has most likely left the server.");
			return;
		}

		const memberToKick = guild.members.cache.get(user.id);

		if (!memberToKick) {
			interaction.reply({
				content: "The specified user is not a member of this server.",
			});
			return;
		}

		if (!memberToKick.manageable || !memberToKick.kickable) {
			interaction.reply({
				content: "This bot cannot moderate the selected user.",
			});
			return;
		}

		try {
			await memberToKick.kick({ reason: reason });

			interaction.reply({
				content: `${user} has been successfully kicked: ${reason}`,
				ephemeral: true,
			});
		} catch (error) {
			console.error(error);
			interaction.reply({
				content: "An error occurred while trying to kick the user.",
				ephemeral: true,
			});
		}
	},
};
