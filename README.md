# Zero - WhatsApp Auto-Reply Bot

AI-powered WhatsApp bot that handles messages when you're offline.

## Features

- 🤖 AI-powered replies using Groq API
- 💬 Language detection (English/Hindi/Hinglish)
- 📝 Message logging and statistics
- ⏰ Time-based emojis
- 🔄 Conversation history per user
- 🚫 Rate limiting
- 👋 Greeting detection

## Setup

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```
   GROQ_API_KEY=your_api_key_here
   ```

4. Run bot:
   ```bash
   node index.js
   ```

5. Scan QR code with WhatsApp

## Deployment

See [DEPLOY.md](DEPLOY.md) for server deployment guide.

## Configuration

- `away_message.txt` - Custom away message
- `vip_contacts.txt` - VIP contact numbers
- `schedule.json` - Auto-reply schedule

## Owner

Bot name: Zero  
Owner: Sunny (Coding & AI/ML)
