const Groq = require("groq-sdk");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require("discord.js");
const axios = require("axios");
const API_KEYS = [process.env.GROQ_API_KEY1, process.env.GROQ_API_KEY2];
const pdfParse = require("pdf-parse");
const { IsInBlacklist } = require("../../utils/blacklist");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const langdetect = require("langdetect");

async function getAudioAnswer(prompt) {
  const detectedLanguage = langdetect.detect(prompt);

  const voices = {
    en: "en-US-AndrewNeural",
    es: "es-ES-AlvaroNeural",
    // TODO: Add more languages
  };

  const selectedVoice = voices[detectedLanguage] || voices["en"];

  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    selectedVoice,
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );
  const filePath = "./audio.mp3";
  await tts.toFile(filePath, prompt);
  return filePath;
}

async function getMarkdownContent(url) {
  try {
    const response = await axios.get(`https://r.jina.ai/${url}`);
    const markdownContent = response.data
      .match(/Markdown Content:(.*)/s)[1]
      .trim();
    return markdownContent;
  } catch (error) {
    console.log(error);
    return "";
  }
}

async function getTextFromPDFLink(url) {
  try {
    if (url.includes("pdf")) {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data, "binary");
      let pdfData = await pdfParse(buffer).then((pdfData) => {
        return pdfData.text.slice(0, 3500);
      });
      return pdfData;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function getGroqChatCompletion(prompt) {
  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      const groq = new Groq({ apiKey: API_KEYS[i] });
      return await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "Your name is Applio, a virtual assistant focused on short and precise audio conversations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        temperature: 0.75,
      });
    } catch (error) {
      console.log(`Error with API key ${i + 1}: ${error}`);
      if (i === API_KEYS.length - 1) {
        throw new Error("All API keys failed");
      }
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chat-voice")
    .setDescription("Info » Interactive chat with Applio.")
    .setDescriptionLocalizations({
      "es-ES": "Info » Habla con Applio de forma interactiva.",
    })
    .addStringOption((option) =>
      option
        .setName("prompt")
        .setDescription("The message you want to send to Applio.")
        .setDescriptionLocalizations({
          "es-ES": "El mensaje que quieres enviar a Applio.",
        })
        .setMaxLength(64)
        .setRequired(true)
    )
    .setDMPermission(false),

  async execute(interaction) {
    const userId = interaction.user.id;
    if (IsInBlacklist(userId)) {
      return;
    }

    await interaction.deferReply(); // Defer the reply to buy time

    let prompt = interaction.options.getString("prompt");
    const urlRegex = /\b(https?:\/\/[^\s]+)/g;
    const urls = prompt.match(urlRegex);
    if (urls) {
      for (let url of urls) {
        if (url.endsWith(",")) {
          url = url.slice(0, -1);
        }
        url = url.replace(/\/,$/, "/");
        if (url.includes("applio.org")) continue;
        let markdownContent;
        if (url.includes("pdf")) {
          markdownContent = await getTextFromPDFLink(url);
        } else {
          markdownContent = await getMarkdownContent(url);
        }

        if (!markdownContent) continue;

        prompt += `\nWeb content: ${markdownContent}`;
      }
    }
    const chatCompletion = await getGroqChatCompletion(prompt);

    try {
      const AI = new ButtonBuilder()
        .setLabel("🦾 Generated by AI")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("ai")
        .setDisabled(true);

      const User = new ButtonBuilder()
        .setLabel(`👤 ${interaction.user.username}`)
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("user")
        .setDisabled(true);

      const row = new ActionRowBuilder().addComponents(AI, User);

      const audioFilePath = await getAudioAnswer(
        chatCompletion.choices[0]?.message?.content
      );

      await interaction.editReply({
        files: [audioFilePath],
        allowedMentions: { parse: [] },
        components: [row],
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content: "An error occurred while processing the message.",
        ephemeral: true,
      });
    }
  },
};
