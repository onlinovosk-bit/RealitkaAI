export async function sendSlackMessage(text) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.error("❌ Chýba SLACK_WEBHOOK_URL v .env");
    return;
  }
  return fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, username: "Revolis AI", icon_emoji: ":robot_face:" })
  });
}
