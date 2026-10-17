/**
 * Test bootstrap. Runs before any test file imports the app, so every module
 * that reads configuration at import time (env, session, rate limiter) sees a
 * deterministic, credential-free setup. No real Google, Gemini, or MongoDB
 * credentials are required to run this suite.
 */
process.env.NODE_ENV = 'test'
process.env.PORT = '5000'
process.env.CLIENT_URL = 'http://localhost:5173'

process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/auth/google/callback'

process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-1234567890'
process.env.SESSION_STORE_URI = ''
process.env.MONGODB_URI = ''

process.env.AI_API_KEY = 'test-ai-key'
process.env.AI_MODEL = 'test-model'
process.env.AI_BASE_URL = 'https://api.groq.com/openai/v1'
