const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    authStrategy: new LocalAuth()
});

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Track processed messages to prevent duplicates
const processedMessages = new Set();

// Store conversation history per user (in-memory)
const conversationHistory = {};

// Rate limiting: Track message count per user
const userMessageCount = {};

// Load conversation history from file if exists
const historyFile = path.join(__dirname, 'conversation_history.json');
if (fs.existsSync(historyFile)) {
    try {
        const data = fs.readFileSync(historyFile, 'utf8');
        Object.assign(conversationHistory, JSON.parse(data));
        console.log('Loaded conversation history from file.');
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

// Save conversation history to file
function saveHistory() {
    try {
        fs.writeFileSync(historyFile, JSON.stringify(conversationHistory, null, 2));
    } catch (err) {
        console.error('Error saving history:', err);
    }
}

// Random delay between min and max milliseconds
function randomDelay(min, max) {
    return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

// Check if message is a greeting
function isGreeting(text) {
    const greetings = ['hello', 'hi', 'hey', 'hii', 'helo', 'hola', 'namaste'];
    const lowerText = text.toLowerCase().trim();
    return greetings.some(greeting => lowerText === greeting || lowerText.startsWith(greeting + ' '));
}

// Message logging to file
const logFile = path.join(__dirname, 'messages_log.txt');
function logMessage(sender, message) {
    try {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const logEntry = `[${timestamp}] ${sender}: ${message}\n`;
        fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (err) {
        console.error('Error logging message:', err);
    }
}

// Load custom away message if exists
const awayMessageFile = path.join(__dirname, 'away_message.txt');
function getCustomAwayMessage() {
    try {
        if (fs.existsSync(awayMessageFile)) {
            return fs.readFileSync(awayMessageFile, 'utf8').trim();
        }
    } catch (err) {
        console.error('Error reading away message:', err);
    }
    return null;
}

// Get time-based greeting emoji
function getTimeBasedEmoji() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return '🌅'; // Morning
    if (hour >= 12 && hour < 18) return '☀️'; // Afternoon
    if (hour >= 18 && hour < 22) return '🌆'; // Evening
    return '🌙'; // Night
}

// Message statistics
const statsFile = path.join(__dirname, 'bot_stats.json');
let messageStats = { totalMessages: 0, startDate: new Date().toISOString() };

// Load stats
if (fs.existsSync(statsFile)) {
    try {
        messageStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

function updateStats() {
    messageStats.totalMessages++;
    messageStats.lastMessage = new Date().toISOString();
    try {
        fs.writeFileSync(statsFile, JSON.stringify(messageStats, null, 2));
    } catch (err) {
        console.error('Error saving stats:', err);
    }
}

// VIP Contacts Management
const vipFile = path.join(__dirname, 'vip_contacts.txt');
let vipContacts = [];

function loadVIPContacts() {
    try {
        if (fs.existsSync(vipFile)) {
            const data = fs.readFileSync(vipFile, 'utf8');
            vipContacts = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        }
    } catch (err) {
        console.error('Error loading VIP contacts:', err);
    }
}

function isVIPContact(number) {
    return vipContacts.some(vip => number.includes(vip));
}

// Keyword Detection
function detectKeywords(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('urgent') || lowerMessage.includes('emergency') || lowerMessage.includes('important')) {
        return 'urgent';
    }
    if (lowerMessage.includes('meeting') || lowerMessage.includes('call') || lowerMessage.includes('schedule')) {
        return 'meeting';
    }
    if (lowerMessage.includes('project') || lowerMessage.includes('work') || lowerMessage.includes('deadline')) {
        return 'work';
    }
    return null;
}

// Auto-Reply Schedule
const scheduleFile = path.join(__dirname, 'schedule.json');
let schedule = { enabled: false, startHour: 9, endHour: 21 };

function loadSchedule() {
    try {
        if (fs.existsSync(scheduleFile)) {
            schedule = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
        }
    } catch (err) {
        console.error('Error loading schedule:', err);
    }
}

function isWithinSchedule() {
    if (!schedule.enabled) return true;
    const hour = new Date().getHours();
    return hour >= schedule.startHour && hour < schedule.endHour;
}

// Message Categorization
const categoriesFile = path.join(__dirname, 'categorized_messages.json');
let categorizedMessages = { work: [], personal: [], spam: [], unknown: [] };

function loadCategories() {
    try {
        if (fs.existsSync(categoriesFile)) {
            categorizedMessages = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function categorizeMessage(sender, message, isVIP) {
    const keyword = detectKeywords(message);
    let category = 'unknown';

    if (keyword === 'work' || keyword === 'meeting') {
        category = 'work';
    } else if (isVIP) {
        category = 'personal';
    } else if (sender.includes('@lid')) {
        category = 'unknown';
    }

    const entry = {
        timestamp: new Date().toISOString(),
        sender: sender,
        message: message,
        keyword: keyword
    };

    categorizedMessages[category].push(entry);

    // Keep only last 100 per category
    if (categorizedMessages[category].length > 100) {
        categorizedMessages[category] = categorizedMessages[category].slice(-100);
    }

    try {
        fs.writeFileSync(categoriesFile, JSON.stringify(categorizedMessages, null, 2));
    } catch (err) {
        console.error('Error saving categories:', err);
    }
}

// Daily Summary
function generateDailySummary() {
    const today = new Date().toISOString().split('T')[0];
    const summaryFile = path.join(__dirname, `daily_summary_${today}.txt`);

    const summary = `Daily Summary - ${today}
=================================
Total Messages: ${messageStats.totalMessages}
Work Messages: ${categorizedMessages.work.length}
Personal Messages: ${categorizedMessages.personal.length}
Unknown Messages: ${categorizedMessages.unknown.length}

Recent Messages:
${categorizedMessages.work.slice(-5).map(m => `- [WORK] ${m.sender}: ${m.message.substring(0, 50)}...`).join('\n')}
${categorizedMessages.personal.slice(-5).map(m => `- [PERSONAL] ${m.sender}: ${m.message.substring(0, 50)}...`).join('\n')}
`;

    try {
        fs.writeFileSync(summaryFile, summary);
        console.log(`📊 Daily summary saved: ${summaryFile}`);
    } catch (err) {
        console.error('Error saving daily summary:', err);
    }
}

// Load all configurations on startup
loadVIPContacts();
loadSchedule();
loadCategories();

// Schedule daily summary at 11:59 PM
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 23 && now.getMinutes() === 59) {
        generateDailySummary();
    }
}, 60000); // Check every minute


client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
    console.log(`📊 Total messages received: ${messageStats.totalMessages}`);
    console.log(`🤖 Zero bot is active and monitoring messages...`);
});

client.on('message_create', async message => {
    try {
        const chat = await message.getChat();

        // Ignore Group Chats
        if (chat.isGroup) return;

        // Ignore messages sent by the bot itself
        if (message.fromMe) return;

        // Ignore status updates
        if (message.from === 'status@broadcast') return;

        // Check if message already processed (deduplication)
        if (processedMessages.has(message.id._serialized)) {
            console.log(`[DUPLICATE] Skipping already processed message: ${message.id._serialized}`);
            return;
        }

        // Mark message as processed
        processedMessages.add(message.id._serialized);

        // Clean up old processed messages (keep last 100)
        if (processedMessages.size > 100) {
            const toDelete = Array.from(processedMessages).slice(0, 50);
            toDelete.forEach(id => processedMessages.delete(id));
        }

        const sender = message.from;

        console.log(`[PRIVATE] ${sender}: ${message.body}`);

        // Log message to file
        logMessage(sender, message.body);

        // Update statistics
        updateStats();

        // Rate limiting: Check message count for this user
        const now = Date.now();
        if (!userMessageCount[sender]) {
            userMessageCount[sender] = { count: 0, resetTime: now + 10000 };
        }

        // Reset counter if 10 seconds have passed
        if (now >= userMessageCount[sender].resetTime) {
            userMessageCount[sender] = { count: 0, resetTime: now + 10000 };
        }

        // Check if user has exceeded limit
        if (userMessageCount[sender].count >= 10) {
            console.log(`[RATE LIMIT] User ${sender} exceeded 10 messages in 10 seconds. Ignoring.`);
            return;
        }

        // Increment message count
        userMessageCount[sender].count++;

        // Initialize conversation history for this user if not exists
        if (!conversationHistory[sender]) {
            conversationHistory[sender] = [];
        }

        // Add user message to history
        conversationHistory[sender].push({
            role: 'user',
            content: message.body
        });

        // Keep only last 20 messages per user (10 exchanges)
        if (conversationHistory[sender].length > 20) {
            conversationHistory[sender] = conversationHistory[sender].slice(-20);
        }

        // Check for custom away message first
        const customMessage = getCustomAwayMessage();
        if (customMessage) {
            const emoji = getTimeBasedEmoji();
            const responseWithEmoji = `${emoji} ${customMessage}`;
            console.log(`[CUSTOM AWAY MESSAGE]: ${responseWithEmoji}`);
            await randomDelay(1000, 3000);
            await message.reply(responseWithEmoji);

            // Add to history
            conversationHistory[sender].push({
                role: 'assistant',
                content: responseWithEmoji
            });
            saveHistory();
            return;
        }

        // Check if it's a greeting
        let aiResponse;
        if (isGreeting(message.body)) {
            const emoji = getTimeBasedEmoji();
            aiResponse = `${emoji} Kya kaam hai?`;
            console.log(`[GREETING DETECTED] Responding with: ${aiResponse}`);
        } else {
            // Get time-based emoji
            const emoji = getTimeBasedEmoji();

            // Build messages array with custom system prompt + conversation history
            const messages = [
                {
                    role: 'system',
                    content: `You are Zero, an auto-reply bot for Sunny, who does coding and AI/ML work. Sunny is currently offline/busy.

YOUR ROLE: Only acknowledge messages briefly and inform that Sunny will reply later.

LANGUAGE MATCHING: 
- Detect the user's language style from their message
- If they write in English, reply in English
- If they write in Hindi (Devanagari), reply in Hindi
- If they write in Hinglish (Roman Hindi-English mix), reply in Hinglish
- Match their tone and formality level

EMOJI USAGE:
- Add the emoji "${emoji}" at the start of your response (already provided based on time of day)
- Keep responses friendly and warm

RULES:
- Keep responses VERY SHORT (1 sentence)
- Acknowledge their message
- Tell them Sunny will reply soon
- If asked who you are, say "Main Zero hoon, Sunny ka auto-reply bot"
- DO NOT offer help or ask questions
- DO NOT give advice

EXAMPLE RESPONSES:
English: "Got your message! Sunny will reply soon."
Hinglish: "Message mil gaya! Sunny jaldi reply karenge."
Hindi: "संदेश मिल गया! Sunny जल्दी जवाब देंगे।"
Who are you: "Main Zero hoon, Sunny ka auto-reply bot."

Remember: You are Zero. Just acknowledge and inform. Sunny will handle everything.`
                },
                ...conversationHistory[sender]
            ];

            // Add delay before calling API (1-3 seconds)
            await randomDelay(1000, 3000);

            // Get AI response from Groq
            const chatCompletion = await groq.chat.completions.create({
                messages: messages,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 500
            });

            aiResponse = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        }

        // Add bot response to history
        conversationHistory[sender].push({
            role: 'assistant',
            content: aiResponse
        });

        // Save history to file
        saveHistory();

        console.log(`[BOT REPLY]: ${aiResponse}`);

        // Add delay before sending reply (1-3 seconds)
        await randomDelay(1000, 3000);

        await message.reply(aiResponse);

    } catch (err) {
        console.error('Error handling message:', err);
        // Send a fallback message if API fails
        try {
            await message.reply('Sorry, I encountered an error. Please try again.');
        } catch (replyErr) {
            console.error('Failed to send error message:', replyErr);
        }
    }
});

client.initialize();
