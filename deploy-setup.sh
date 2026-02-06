#!/bin/bash
# Zero Bot Deployment Script

echo "🚀 Starting Zero Bot Deployment..."

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "📥 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# Create directory
echo "📁 Creating project directory..."
mkdir -p ~/zero-bot
cd ~/zero-bot

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your bot files using SCP"
echo "2. Run: cd ~/zero-bot && npm install"
echo "3. Run: node index.js (scan QR code)"
echo "4. Run: pm2 start index.js --name zero-bot"
