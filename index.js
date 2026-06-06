const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    EmbedBuilder,
    PermissionsBitField,
    Events,
    SlashCommandBuilder
} = require('discord.js');

const http = require('http');

const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    GUILD_ID: '1511780606089101352',
    UNVERIFIED_ROLE_ID: '1512530332006617299',
    VERIFIED_ROLE_ID: '1512529546937766082',
    VERIFY_CHANNEL_ID: '1512566743225077810'
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================
// WEB SUNUCUSU (Render için gerekli)
// ============================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Adana Roleplay Bot Aktif!</h1><p>Discord bot calisiyor.</p>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 Web sunucusu ${PORT} portunda calisiyor`);
});

// ============================================
// BOT HAZIR OLDUĞUNDA
// ============================================
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);
    
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (!guild) return;
    
    const verifyCommand = new SlashCommandBuilder()
        .setName('dogrula')
        .setDescription('Roblox hesabini dogrula')
        .addStringOption(opt => 
            opt.setName('roblox_adi')
                .setDescription('Roblox kullanici adin')
                .setRequired(true)
        );
    
    const codeCommand = new SlashCommandBuilder()
        .setName('kodum')
        .setDescription('Dogrulama kodunu gor');
    
    await guild.commands.set([verifyCommand, codeCommand]);
    console.log('✅ Slash komutlari kaydedildi!');
});

// ============================================
// YENI UYE KATILDIGINDA
// ============================================
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;
    
    const unverifiedRole = member.guild.roles.cache.get(CONFIG.UNVERIFIED_ROLE_ID);
    if (!unverifiedRole) return;
    
    try {
        await member.roles.add(unverifiedRole);
        console.log(`✅ ${member.user.tag} icin UnVerified rolu verildi.`);
    } catch (error) {
        console.log(`❌ Rol verilemedi: ${error.message}`);
    }
});

// ============================================
// DOGRULAMA VERILERI
// ============================================
const pendingVerifications = new Map();

// ============================================
// MESAJ GONDERILDIGINDE - VERIFY MESAJI
// ============================================
client.on(Events.MessageCreate, async (message) => {
    if (message.channelId !== CONFIG.VERIFY_CHANNEL_ID) return;
    if (message.author.bot) return;
    
    if (message.content.toLowerCase() === '!setup') {
        try {
            const messages = await message.channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            await message.channel.bulkDelete(botMessages);
        } catch (e) {}
        
              const embed = new EmbedBuilder()
            .setColor(0xFF6B00) // Turuncu renk, Adana teması
            .setTitle('🏙️ ADANA ROLEPLAY')
            .setURL('https://discord.gg/adanaroleplay') // Sunucu linkin varsa
            .setAuthor({ 
                name: 'Roblox Verify Sistemi', 
                iconURL: 'https://i.imgur.com/robloxlogo.png' // Roblox logosu
            })
            .setDescription(
                '> **Adana Roleplay** sunucusuna hoş geldiniz!\n\n' +
                '> Bu sunucuda oynamak için Roblox hesabınızı doğrulamanız gerekiyor.\n\n' +
                '**📝 Nasıl Doğrulanırım?**\n\n' +
                '**1.** Aşağıdaki **Hesabı Gir** butonuna basın\n' +
                '**2.** Roblox kullanıcı adınızı yazın\n' +
                '**3.** Size verilen kodu Roblox profilinize ekleyin\n' +
                '**4.** **Hesabı Onayla** butonuna basarak <@&' + CONFIG.VERIFIED_ROLE_ID + '> rolünüzü alın!\n\n' +
                '**⚠️ Kurallar:**\n' +
                '• Sahte hesap kullanmak yasaktır\n' +
                '• Başkasının hesabıyla doğrulama yasaktır\n' +
                '• Kuralları okumadan doğrulama yapmayınız'
            )
            .setThumbnail('https://cdn.discordapp.com/attachments/1512580110757138432/1512779870978048070/Gemini_Generated_Image_6c4wgg6c4wgg6c4w-Photoroom.png?ex=6a25558b&is=6a24040b&hm=a1f091d9b5d30cafd976010e6754f7e6b10424b5824235cd44d72dd970593e87&') // LOGONUN URL'SİNİ BURAYA YAZ
            .setImage('https://i.imgur.com/BANNER_RESIM_BURAYA.png') // BANNER RESMİN VARSA BURAYA YAZ
            .setFooter({ 
                text: 'Adana Roleplay © 2026 | Güvenliğiniz için doğrulama zorunludur', 
                iconURL: 'https://i.imgur.com/robloxlogo.png' 
            })
            .setTimestamp();
        
                const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_account')
                    .setLabel('HESABI GİR')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('verify_account')
                    .setLabel('HESABI ONAYLA')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        
        await message.channel.send({ embeds: [embed], components: [row] });
        
        try { await message.delete(); } catch (e) {}
    }
});

// ============================================
// BUTON TIKLANDIGINDA
// ============================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.channelId !== CONFIG.VERIFY_CHANNEL_ID) return;
    
    if (interaction.customId === 'enter_account') {
        const modal = new ModalBuilder()
            .setCustomId('roblox_modal')
            .setTitle('Roblox Hesabinizi Girin');
        
        const robloxInput = new TextInputBuilder()
            .setCustomId('roblox_username')
            .setLabel('Roblox Kullanici Adiniz')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('orn: Builderman')
            .setRequired(true)
            .setMaxLength(50);
        
        modal.addComponents(new ActionRowBuilder().addComponents(robloxInput));
        await interaction.showModal(modal);
    }
    
    if (interaction.customId === 'verify_account') {
        const userData = pendingVerifications.get(interaction.user.id);
        
        if (!userData) {
            await interaction.reply({
                content: '❌ Once **Hesabi Gir** butonuna basarak Roblox adini girmelisin!',
                ephemeral: true
            });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const userIdResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usernames: [userData.robloxUsername],
                    excludeBannedUsers: true
                })
            });
            
            const userIdData = await userIdResponse.json();
            
            if (!userIdData.data || userIdData.data.length === 0) {
                await interaction.editReply('❌ Bu Roblox kullanici adi bulunamadi!');
                return;
            }
            
            const robloxId = userIdData.data[0].id;
            const profileResponse = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
            const profileData = await profileResponse.json();
            const description = profileData.description || '';
            
            if (!description.includes(userData.code)) {
                await interaction.editReply({
                    content: '❌ Kod profilinde bulunamadi!\n\n' +
                        `Profilinde su kodun olmasi lazim: ||${userData.code}||\n\n` +
                        '**Nasil eklerim?**\n' +
                        '1. Roblox profiline git\n' +
                        '2. "About" kismina tikla\n' +
                        '3. Kodu yapistir\n' +
                        '4. Kaydet\n' +
                        '5. Tekrar **Hesabi Onayla** butonuna bas',
                    ephemeral: true
                });
                return;
            }
            
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const unverifiedRole = interaction.guild.roles.cache.get(CONFIG.UNVERIFIED_ROLE_ID);
            const verifiedRole = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
            
            if (unverifiedRole) await member.roles.remove(unverifiedRole);
            if (verifiedRole) await member.roles.add(verifiedRole);
            
            try { await member.setNickname(userData.robloxUsername); } catch (e) {}
            
            pendingVerifications.delete(interaction.user.id);
            
            await interaction.editReply({
                content: `✅ **Dogrulama basarili!**\n\n` +
                    `Roblox: **${userData.robloxUsername}**\n` +
                    `<@&${CONFIG.VERIFIED_ROLE_ID}> rolun verildi!`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Bir hata olustu, tekrar dene.');
        }
    }
});

// ============================================
// MODAL GONDERILDIGINDE
// ============================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId === 'roblox_modal') {
        const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
        const code = `ARP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        pendingVerifications.set(interaction.user.id, {
            robloxUsername: robloxUsername,
            code: code
        });
        
        await interaction.reply({
            content: `🔑 **Dogrulama Kodun:** ||${code}||\n\n` +
                `**Adimlar:**\n` +
                `1. Roblox profiline git\n` +
                `2. "About" kismina kodu yapistir\n` +
                `3. Kaydet\n` +
                `4. **Hesabi Onayla** butonuna bas`,
            ephemeral: true
        });
    }
});

// ============================================
// BOTU BASLAT
// ============================================
// TEST KOMUTU
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    
    // Herhangi bir mesaja yanıt ver
    if (message.content === 'ping') {
        await message.reply('pong! Bot calisiyor.');
    }
});
client.login(CONFIG.BOT_TOKEN);
