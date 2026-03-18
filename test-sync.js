require('dotenv').config();
const { syncGoogleToDatabase } = require('./.qodo/services/google/calendarSync');
syncGoogleToDatabase();