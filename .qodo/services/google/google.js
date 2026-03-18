const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function resolveCredentialsPath() {
  const explicitPath = process.env.GOOGLE_OAUTH_CREDENTIALS_PATH;
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

  const localPath = path.join(__dirname, 'credentials.json');
  if (fs.existsSync(localPath)) return localPath;

  const examplePath = path.join(__dirname, 'credentials.example.json');
  return examplePath;
}

function getOAuthClient() {
  const credPath = resolveCredentialsPath();
  const content = fs.readFileSync(credPath, 'utf8');
  const { web } = JSON.parse(content);

  if (!web?.client_id || !web?.client_secret) {
    throw new Error('Credenciais OAuth do Google nao configuradas. Defina GOOGLE_OAUTH_CREDENTIALS_PATH ou crie .qodo/services/google/credentials.json localmente.');
  }

  return new google.auth.OAuth2(
    web.client_id,
    web.client_secret,
    web.redirect_uris?.[0]
  );
}

function getAuthorizedClient(tokenFile = 'token.json') {
  const oAuth2Client = getOAuthClient();
  const tokenPath = path.join(process.cwd(), tokenFile);

  if (fs.existsSync(tokenPath)) {
    const token = fs.readFileSync(tokenPath, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Autorize este app nesta URL:', authUrl);
  return oAuth2Client;
}

function saveToken(oAuth2Client, code) {
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return reject(err);
      const tokenPath = path.join(process.cwd(), 'token.json');
      fs.writeFileSync(tokenPath, JSON.stringify(token));
      oAuth2Client.setCredentials(token);
      resolve();
    });
  });
}

function calendarClient(tokenFile = 'token.json') {
  const auth = getAuthorizedClient(tokenFile);
  return google.calendar({ version: 'v3', auth });
}

module.exports = { calendarClient, saveToken };
