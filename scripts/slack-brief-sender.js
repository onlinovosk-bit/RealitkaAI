require('dotenv').config(); // TENTO RIADOK TO OPRAVÍ
const fs = require('fs');
const path = require('path');

async function sendBriefToSlack() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("❌ ERROR: Chýba SLACK_WEBHOOK_URL v environment premenných!");
    console.log("💡 Tip: Skontroluj, či máš v súbore .env riadok: SLACK_WEBHOOK_URL=https://hooks...");
    return;
  }

  const briefsDir = path.join(__dirname, '../briefs');
  
  if (!fs.existsSync(briefsDir)) {
    console.log("📂 Priečinok /briefs neexistuje. Vytváram ho...");
    fs.mkdirSync(briefsDir);
    return;
  }

  const files = fs.readdirSync(briefsDir).filter(f => f.endsWith('.md')).sort().reverse();
  
  if (files.length === 0) {
    console.log("ℹ️ Žiadne .md briefy na odoslanie v /briefs. Skús tam nejaký vytvoriť na test.");
    return;
  }

  const latestFile = files[0];
  const briefContent = fs.readFileSync(path.join(briefsDir, latestFile), 'utf8');

  const payload = {
    text: `🚀 *REVOLIS.AI - Intelligence Brief*\n\n${briefContent}`,
    username: "Revolis Intelligence",
    icon_emoji: ":brain:"
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      console.log(`✅ ÚSPECH: Brief [${latestFile}] odoslaný do Slacku!`);
    } else {
      console.error("❌ Slack API error:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("❌ Network error:", error);
  }
}

sendBriefToSlack();
