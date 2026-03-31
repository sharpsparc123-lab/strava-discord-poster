const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const STRAVA_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'mysecret123';

console.log('✅ Strava → Discord poster is starting...');

// Verify webhook (Strava calls this first)
app.get('/webhook/strava', (req, res) => {
  if (req.query['hub.verify_token'] === STRAVA_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
    console.log('✅ Strava webhook verified');
  } else {
    res.sendStatus(403);
  }
});

// Receive new activity from Strava
app.post('/webhook/strava', async (req, res) => {
  res.sendStatus(200);

  const event = req.body;
  if (event.aspect_type !== 'create' || event.object_type !== 'activity') return;

  try {
    const activityRes = await axios.get(`https://www.strava.com/api/v3/activities/${event.object_id}`, {
      headers: { Authorization: `Bearer ${process.env.STRAVA_ACCESS_TOKEN}` }
    });

    const a = activityRes.data;
    const distanceKm = (a.distance / 1000).toFixed(2);
    const timeMin = Math.round(a.moving_time / 60);

    const embed = {
      title: `🏃 New Activity: ${a.name || 'Untitled'}`,
      color: 0xFC4C02,
      url: `https://www.strava.com/activities/${a.id}`,
      fields: [
        { name: "Distance", value: `${distanceKm} km`, inline: true },
        { name: "Time", value: `${timeMin} min`, inline: true },
        { name: "Type", value: a.type, inline: true },
        { name: "View on Strava", value: `[Click here](https://www.strava.com/activities/${a.id})` }
      ],
      timestamp: new Date().toISOString()
    };

    await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
    console.log(`✅ Posted activity to Discord`);
  } catch (err) {
    console.error('Error:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
