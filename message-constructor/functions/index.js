const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const Groq = require('groq-sdk');
const { buildSmartPrompt, SYSTEM_PROMPT } = require('./prompts');
const { validateUserData, checkWarnings } = require('./validators');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Инициализация Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Генерация user ID из IP
function getUserId(req) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || '';
  const crypto = require('crypto');
  return crypto.createHash('md5').update(`${ip}:${ua}`).digest('hex');
}

// Проверка лимита
async function checkLimit(userId) {
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    await userRef.set({
      generationsCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastGeneration: null
    });
    return 0;
  }
  
  return userDoc.data().generationsCount || 0;
}

// Увеличение счетчика
async function incrementLimit(userId) {
  const userRef = db.collection('users').doc(userId);
  await userRef.update({
    generationsCount: admin.firestore.FieldValue.increment(1),
    lastGeneration: admin.firestore.FieldValue.serverTimestamp()
  });
}

// API: Генерация сообщения
app.post('/generate', async (req, res) => {
  try {
    const userId = getUserId(req);
    const currentCount = await checkLimit(userId);
    
    // Проверка лимита
    if (currentCount >= 50) {
      return res.status(429).json({
        error: 'Лимит исчерпан',
        message: 'Вы использовали все 50 генераций',
        generationsLeft: 0
      });
    }
    
    // Валидация
    const validation = validateUserData(req.body.user_answers);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Ошибка валидации',
        message: validation.error
      });
    }
    
    // Предупреждения
    const warnings = checkWarnings(req.body.user_answers);
    
    // Строим промпт
    const prompt = buildSmartPrompt(req.body.salon, req.body.user_answers);
    
    // Генерация через Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9
    });
    
    const generatedText = completion.choices[0].message.content;
    
    // Увеличиваем счетчик
    await incrementLimit(userId);
    
    res.json({
      success: true,
      message: generatedText,
      generationsLeft: 50 - (currentCount + 1),
      warnings: warnings,
      metrics: {
        tokensUsed: completion.usage.total_tokens,
        model: completion.model
      }
    });
    
  } catch (error) {
    console.error('Ошибка генерации:', error);
    res.status(500).json({
      error: 'Ошибка генерации',
      message: error.message
    });
  }
});

// API: Генерация вариации (не считается в лимит)
app.post('/generate-variation', async (req, res) => {
  try {
    const variationPrompt = `
Перепиши это сообщение ДРУГИМИ СЛОВАМИ, сохранив все цифры и структуру:

${req.body.original_message}

Новая версия:
`;
    
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Ты эксперт по рерайтингу холодных сообщений." },
        { role: "user", content: variationPrompt }
      ],
      temperature: 0.9,
      max_tokens: 1000
    });
    
    res.json({
      success: true,
      message: completion.choices[0].message.content
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Проверка лимита
app.get('/check-limit', async (req, res) => {
  try {
    const userId = getUserId(req);
    const currentCount = await checkLimit(userId);
    
    res.json({
      generationsUsed: currentCount,
      generationsLeft: 50 - currentCount,
      limit: 50
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Экспортируем как Cloud Function
exports.api = functions.https.onRequest(app);