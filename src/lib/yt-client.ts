import { google } from 'googleapis';

if (!process.env.YT_API_KEY) {
  throw new Error("Missing Plaid credentials in environment variables");
}

google.options({
  auth: !process.env.YT_API_KEY ? undefined : process.env.YT_API_KEY,
});

const youtube = google.youtube({
  version: 'v3'
})

async function getActiveLiveChatId() {
  const response = await youtube.liveBroadcasts.list({
    part: ['snippet', 'contentDetails'],
    broadcastStatus: 'active',
    mine: true, // requires OAuth2
  });
  1
  const broadcasts = response.data.items;
  if (!broadcasts || broadcasts.length === 0) {
    console.log('No active broadcast found.');
    return null;
  }

  // extract activeLiveChatId from the first broadcast
  const activeLiveChatId = broadcasts[0].snippet?.liveChatId;
  console.log('Active live chat ID:', activeLiveChatId);
  return activeLiveChatId;
}