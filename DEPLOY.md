# Zero Bot - Quick Deploy Commands

## 1. Connect to Server
```powershell
ssh username@57.180.56.180
```

## 2. Upload Files (from Windows)
```powershell
cd "C:\Users\dfult\Documents\zero whatapps"
scp -r * username@57.180.56.180:~/zero-bot/
```

## 3. On Server - Install & Run
```bash
cd ~/zero-bot
npm install
node index.js  # Scan QR code, then Ctrl+C
pm2 start index.js --name zero-bot
pm2 save
pm2 startup
```

## 4. Check Status
```bash
pm2 status
pm2 logs zero-bot
```

Done! 🎉
