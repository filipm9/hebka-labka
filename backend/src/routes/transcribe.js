import express from 'express';
import multer from 'multer';
import { authRequired } from '../auth.js';
import { config } from '../config.js';

export const transcribeRouter = express.Router();

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
});

/**
 * Use GPT to clean up transcription errors
 */
async function cleanupTranscription(rawText) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Si asistent na opravu slovenského textu z hlasového prepisu. 
Tvoja úloha je opraviť prípadné chyby v prepise (preklepy, chýbajúca interpunkcia, nesprávne rozpoznané slová).
Zachovaj pôvodný význam a štýl. Nevymýšľaj nič nové, len oprav chyby.
Vráť IBA opravený text, žiadne vysvetlenia ani komentáre.`
        },
        {
          role: 'user',
          content: rawText
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error('GPT cleanup failed:', response.status);
    return rawText; // Return original if cleanup fails
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || rawText;
}

/**
 * POST /transcribe
 * Accepts audio file and returns transcribed text using OpenAI Whisper
 * Then cleans up the text using GPT
 */
transcribeRouter.post('/', authRequired, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!config.openaiApiKey) {
      return res.status(503).json({ error: 'Speech-to-text service is not configured' });
    }

    // Step 1: Transcribe with Whisper
    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { 
      type: req.file.mimetype || 'audio/webm' 
    });
    formData.append('file', audioBlob, req.file.originalname || 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'sk');
    formData.append('response_format', 'text');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json().catch(() => ({}));
      console.error('OpenAI Whisper error:', whisperResponse.status, errorData);
      
      if (whisperResponse.status === 401) {
        return res.status(503).json({ error: 'Invalid OpenAI API key' });
      }
      
      return res.status(500).json({ error: errorData.error?.message || 'Transcription failed' });
    }

    const rawTranscription = await whisperResponse.text();
    console.log('Whisper raw:', rawTranscription);

    // Step 2: Clean up with GPT
    const cleanedText = await cleanupTranscription(rawTranscription);
    console.log('GPT cleaned:', cleanedText);

    res.json({ 
      raw: rawTranscription,
      text: cleanedText,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});
