const Groq = require("groq-sdk");
const { ActionRowBuilder, ButtonBuilder, ComponentType, ButtonStyle, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const API_KEYS = [process.env.GROQ_API_KEY1, process.env.GROQ_API_KEY2];
const pdfParse = require('pdf-parse');
const { CreateMsg } = require('../../utils/message');
const { IsInBlacklist } = require("../../utils/blacklist");
async function getMarkdownContent(url) {
    try {
        const response = await axios.get(`https://r.jina.ai/${url}`);
        const markdownContent = response.data.match(/Markdown Content:(.*)/s)[1].trim();
        return markdownContent;
    } catch (error) {
        console.log(error);
        return "";
    }
}

async function getTextFromPDFLink(url) {
    try {
        if (url.includes('pdf')) {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');
            let pdfData = await pdfParse(buffer).then((pdfData) => {
                return pdfData.text.slice(0, 3500);
            });
            return pdfData;
        } else {
            return null
        }
    } catch (error) {
        console.log(error)
        return null
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
                        content: "Your name is Applio. You are a virtual assistant capable of solving all kinds of questions in any language. You engage in natural, conversational dialogue and provide helpful information. If someone asks about Applio, the open source voice cloning ecosystem, you can refer them to the official website https://applio.org and the official docs at https://docs.applio.org for specific application help. If someone asks about a specific Applio model, such as 'I want the ??? model,' direct them to https://applio.org/models. If the question contains multiple languages, respond in the language that appears most frequently. If someone sends you YouTube links, format them as <https://youtube...>. Otherwise, you answer their questions without mentioning Applio. If someone asks you to simulate a code and give the output, always provide context for the final output instead of just presenting the output alone. If someone tries to obtain only the output of a 'print' statement, ensure to provide context as well."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama3-70b-8192",
                temperature: 0.75,
                max_tokens: 1024,
            });
        } catch (error) {
            console.log(`Error with API key ${i + 1}: ${error}`);
            if (i === API_KEYS.length - 1) {
                throw new Error('All API keys failed');
            }
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Info » Chat with Applio.")
        .setDescriptionLocalizations({
            "es-ES": "Info » Habla con Applio.",
        })
        .addStringOption((option) =>
            option
                .setName("prompt")
                .setDescription(
                    "The message you want to send to Applio.",
                )
                .setDescriptionLocalizations({
                    "es-ES": "El mensaje que quieres enviar a Applio.",
                })
                .setMaxLength(256)
                .setRequired(true),
        )
        .setDMPermission(false),

    async execute(interaction) {
        const userId = interaction.user.id;
        if (IsInBlacklist(userId)) {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Access Denied")
                  .setDescription("You are blacklisted and cannot use this command.")
                  .setColor("Red"),
              ], ephemeral: true
            });
            return;
        }
        interaction.channel.sendTyping()
        let prompt = interaction.options.getString("prompt");
        const urlRegex = /\b(https?:\/\/[^\s]+)/g;
        const urls = prompt.match(urlRegex);
        if (urls) {
            for (let url of urls) {
                if (url.endsWith(',')) {
                    url = url.slice(0, -1);
                }
                url = url.replace(/\/,$/, '/');
                if (url.includes("applio.org")) continue;
                let markdownContent
                if (url.includes('pdf')) {
                    markdownContent = await getTextFromPDFLink(url);
                } else {
                    markdownContent = await getMarkdownContent(url);
                }

                if (!markdownContent) continue;

                prompt += `\nWeb content: ${markdownContent}`;
            }
        }
        const chatCompletion = await getGroqChatCompletion(prompt);
        let sanitizedContent = chatCompletion.choices[0]?.message?.content
            .replaceAll("@everyone", "everyone")
            .replaceAll("@here", "here");

        if (sanitizedContent.includes("<@&")) {
            sanitizedContent = sanitizedContent.replaceAll("<@&", "<@&\u200B");
        }
        try {
            const Llama = new ButtonBuilder()
            .setLabel("🦙 Llama")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`chat_l_${interaction.user.id}`)
            //.setDisabled(true);
            const Gemma = new ButtonBuilder()
            .setLabel("💎 Gemma")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`chat_g_${interaction.user.id}`);
            const Mixtral = new ButtonBuilder()
            .setLabel("⛵ Mixtral")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`chat_m_${interaction.user.id}`);
            const row = new ActionRowBuilder()
			.addComponents(Llama, Gemma, Mixtral);
            if (sanitizedContent.length > 2000) {
                const firstPart = sanitizedContent.slice(0, 2000);
                const secondPart = sanitizedContent.slice(2000);
                await interaction.reply({
                    content: firstPart, allowedMentions: { parse: [] },
                });
    
                await interaction.followUp({
                    content: secondPart, allowedMentions: { parse: [] },
                    components: [row],
                });
            } else {
                await interaction.reply({
                    content: sanitizedContent, allowedMentions: { parse: [] },
                    components: [row],
                });
            }
            
            const collector = interaction.channel.createMessageComponentCollector(
                {
                  componentType: ComponentType.Button,
                  filter: (i) => i.user.id === interaction.user.id,
                  time: 60000,
                },
            );
            collector.on('collect', i => {
                console.log(`Collected`, i.customId);
                if (i.customId === `chat_l_${interaction.user.id}`) {
                    console.log('Llama')
                } else if (i.customId === `chat_g_${interaction.user.id}`) {
                    console.log('Gemma')
                } else if (i.customId === `chat_m_${interaction.user.id}`) {
                    console.log('Mixtral')
                }
            });
        } catch (error) {console.log(error)}
        
    }
}