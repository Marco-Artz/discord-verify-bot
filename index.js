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
    Events
} = require('discord.js');

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
// BOT HAZIR OLDUĞUNDA
// ============================================
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);
});

// ============================================
// YENİ ÜYE KATILDIĞINDA
// ============================================
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.user.bot) return;
    
    const unverifiedRole = member.guild.roles.cache.get(CONFIG.UNVERIFIED_ROLE_ID);
    if (!unverifiedRole) return;
    
    try {
        await member.roles.add(unverifiedRole);
        console.log(`✅ ${member.user.tag} için UnVerified rolü verildi.`);
    } catch (error) {
        console.log(`❌ Rol verilemedi: ${error.message}`);
    }
});

// ============================================
// DOĞRULAMA VERİLERİ
// ============================================
const pendingVerifications = new Map(); // { discordID: { robloxUsername, code } }

// ============================================
// MESAJ GÖNDERİLDİĞİNDE - VERIFY MESAJI GÖNDER
// ============================================
client.on(Events.MessageCreate, async (message) => {
    // Sadece verify kanalında ve botun kendisi değilse
    if (message.channelId !== CONFIG.VERIFY_CHANNEL_ID) return;
    if (message.author.bot) return;
    
    // Eğer "setup" yazıldıysa doğrulama mesajını gönder
    if (message.content.toLowerCase() === '!setup') {
        // Eski mesajları temizle (isteğe bağlı)
        try {
            const messages = await message.channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            await message.channel.bulkDelete(botMessages);
        } catch (e) {
            // Yetki yoksa atla
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('Roblox Verify Sistemi')
            .setDescription(
                '**ADIM 1** Aşağıdaki **Hesabı Gir** butonuna basın ve Roblox isminizi girin.\n\n' +
                '**ADIM 2** Talimatları tamamladıktan sonra **Hesabı Onayla** butonuna basarak <@&' + CONFIG.VERIFIED_ROLE_ID + '> rolünüzü alın.'
            )
            .setImage('https://i.imgur.com/placeholder.png') // İstersen kendi görsel linkin
            .setFooter({ text: 'Adana Roleplay © 2024' });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enter_account')
                    .setLabel('Hesabı Gir')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('verify_account')
                    .setLabel('Hesabı Onayla')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        
        await message.channel.send({ embeds: [embed], components: [row] });
        
        // Kullanıcının !setup mesajını sil
        try {
            await message.delete();
        } catch (e) {}
    }
});

// ============================================
// BUTON TIKLANDIĞINDA
// ============================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    
    // Sadece verify kanalında
    if (interaction.channelId !== CONFIG.VERIFY_CHANNEL_ID) return;
    
    // =================== HESABI GİR BUTONU ===================
    if (interaction.customId === 'enter_account') {
        const modal = new ModalBuilder()
            .setCustomId('roblox_modal')
            .setTitle('Roblox Hesabınızı Girin');
        
        const robloxInput = new TextInputBuilder()
            .setCustomId('roblox_username')
            .setLabel('Roblox Kullanıcı Adınız')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('örn: Builderman')
            .setRequired(true)
            .setMaxLength(50);
        
        const firstActionRow = new ActionRowBuilder().addComponents(robloxInput);
        modal.addComponents(firstActionRow);
        
        await interaction.showModal(modal);
    }
    
    // =================== HESABI ONAYLA BUTONU ===================
    if (interaction.customId === 'verify_account') {
        const userData = pendingVerifications.get(interaction.user.id);
        
        if (!userData) {
            await interaction.reply({
                content: '❌ Önce **Hesabı Gir** butonuna basarak Roblox adını girmelisin!',
                ephemeral: true
            });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Roblox API'den kullanıcıyı bul
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
                await interaction.editReply('❌ Bu Roblox kullanıcı adı bulunamadı!');
                return;
            }
            
            const robloxId = userIdData.data[0].id;
            
            // Profili çek
            const profileResponse = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
            const profileData = await profileResponse.json();
            const description = profileData.description || '';
            
            // Kod profilde var mı?
            if (!description.includes(userData.code)) {
                await interaction.editReply({
                    content: '❌ Kod profilinde bulunamadı!\n\n' +
                        `Profilinde şu kodun olması lazım: ||${userData.code}||\n\n` +
                        '**Nasıl eklerim?**\n' +
                        '1. Roblox profiline git\n' +
                        '2. "About" (Hakkımda) kısmına tıkla\n' +
                        '3. Kodu yapıştır\n' +
                        '4. Kaydet\n' +
                        '5. Tekrar **Hesabı Onayla** butonuna bas',
                    ephemeral: true
                });
                return;
            }
            
            // DOĞRULAMA BAŞARILI!
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const unverifiedRole = interaction.guild.roles.cache.get(CONFIG.UNVERIFIED_ROLE_ID);
            const verifiedRole = interaction.guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
            
            if (unverifiedRole) await member.roles.remove(unverifiedRole);
            if (verifiedRole) await member.roles.add(verifiedRole);
            
            // İsmi Roblox adıyla değiştir
            try {
                await member.setNickname(userData.robloxUsername);
            } catch (e) {
                console.log('İsim değiştirilemedi:', e.message);
            }
            
            // Temizlik
            pendingVerifications.delete(interaction.user.id);
            
            await interaction.editReply({
                content: `✅ **Doğrulama başarılı!**\n\n` +
                    `Roblox: **${userData.robloxUsername}**\n` +
                    `<@&${CONFIG.VERIFIED_ROLE_ID}> rolün verildi!\n` +
                    `Kullanıcı adın: **${userData.robloxUsername}** olarak değiştirildi.`,
                ephemeral: true
            });
            
            console.log(`✅ ${interaction.user.tag} -> ${userData.robloxUsername} doğrulandı!`);
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Bir hata oluştu, tekrar dene.');
        }
    }
});

// ============================================
// MODAL GÖNDERİLDİĞİNDE
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
            content: `🔑 **Doğrulama Kodun:** ||${code}||\n\n` +
                `**Adımlar:**\n` +
                `1. Roblox profiline git: https://www.roblox.com/users/profile\n` +
                `2. "About" (Hakkımda) kısmına tıkla\n` +
                `3. Bu kodu yapıştır: ||${code}||\n` +
                `4. Kaydet\n` +
                `5. Buraya dön ve **Hesabı Onayla** butonuna bas`,
            ephemeral: true
        });
    }
});

// ============================================
// BOTU BAŞLAT
// ============================================
client.login(CONFIG.BOT_TOKEN);