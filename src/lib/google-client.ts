import { google } from 'googleapis';

if (!process.env.YT_API_KEY) {
  throw new Error("Missing Plaid credentials in environment variables");
}

google.options({
  auth: !process.env.YT_API_KEY ? undefined : process.env.YT_API_KEY,
});
