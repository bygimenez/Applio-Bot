const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("report-model")
    .setNameLocalizations({
      "es-ES": "reportar-modelo",
    })

    .setDescription(
      "RVC » Report a model if you think there has been a problem with it so that it can be reviewed.",
    )
    .setDescriptionLocalizations({
      "es-ES":
        "RVC » Informe de un modelo si cree que ha habido algún problema con él para que pueda ser revisado.",
    })
    .addStringOption((option) =>
      option
        .setName("model")
        .setDescription("Enter the name of the model that has a problem.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(
          "Enter the reason why you believe there has been a problem with the model.",
        )
        .setRequired(true),
    )
    .setDMPermission(false),
  async execute(interaction) {
    const model = interaction.options?.get("model").value;
    const reason = interaction.options?.get("reason").value;
    const autor = interaction.user.username;

    const embed = new EmbedBuilder()
      .setTitle("New report from " + autor)
      .addFields(
        { name: "**Model**", value: `${model}`, inline: true },
        { name: "**Reason**", value: `${reason}`, inline: true },
      )
      .setDescription(`Model reported by ${interaction.user}`)

      .setColor("#5865F2")
      .setTimestamp();
    const channel = interaction.guild.channels.cache.get("1135012781679181935");

    const embed_exito = new EmbedBuilder()
      .setDescription(`Successfully submitted!`)
      .setColor("#5865F2")
      .setTimestamp();

    await interaction
      .reply({
        embeds: [embed_exito],
        ephemeral: true,
      })
      .then(() => {
        channel.send({ embeds: [embed] }).then((sentMessage) => {
          sentMessage.react("✅");
          sentMessage.react("❌");
        });
      });
  },
};
