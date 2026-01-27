import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  sessionName: process.env.SESSION_NAME || 'dg_session',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // For cross-origin deployments (frontend/backend on different domains), use 'none'
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  // OpenAI API key for Whisper speech-to-text
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

if (!config.dbUrl) {
  console.warn('DATABASE_URL is not set. Set it before starting the server.');
}

