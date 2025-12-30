// server.js - Quiz API + Wikipedia Text Search API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// node-fetch wrapper for CommonJS
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// QUIZ DATA FROM JSON
// ----------------------
const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

const SAMPLE = {
  questions: [
    {
      id: 1,
      question: "Which bin should food scraps go into?",
      options: ["Recyclables","Organics","Hazardous","Residual"],
      correctIndex: 1,
      explanation: "Food scraps are organic and go to organics/compost."
    },
    {
      id: 2,
      question: "Which of these is NOT typically recyclable?",
      options: ["Glass bottles","Plastic grocery bags","Paper","Metal cans"],
      correctIndex: 1,
      explanation: "Plastic grocery bags usually need special collection."
    },
    {
      id: 3,
      question: "Composting reduces which greenhouse gas compared to landfilling?",
      options: ["Carbon monoxide","Methane","Nitrous oxide","Ozone"],
      correctIndex: 1,
      explanation: "Landfills produce methane; composting reduces methane."
    },
    {
      id: 4,
      question: "Glass belongs to which stream?",
      options: ["Organic","Hazardous","Recyclable","E-waste"],
      correctIndex: 2,
      explanation: "Glass is recyclable."
    },
    {
      id: 5,
      question: "What are the 3 Rs?",
      options: [
        "Reduce, Reuse, Recycle",
        "Remove, Repair, Replace",
        "Reduce, Repair, Reuse",
        "Recycle, Repeat, Reduce"
      ],
      correctIndex: 0,
      explanation: "3Rs = Reduce, Reuse, Recycle."
    }
  ]
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(SAMPLE, null, 2), 'utf8');
  console.log('Created sample questions at', QUESTIONS_FILE);
}

// Load bank into memory
let questionBank = [];
function loadQuestions() {
  try {
    const raw = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.questions)) questionBank = parsed.questions;
    else questionBank = [];
    console.log(`Loaded ${questionBank.length} questions`);
  } catch (err) {
    console.error('Failed to load questions file:', err.message);
    questionBank = SAMPLE.questions.slice();
  }
}
loadQuestions();

// helper: pick n random items
function pickRandom(arr, n) {
  if (!Array.isArray(arr)) return [];
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// ----------------------
// QUIZ ROUTES
// ----------------------
app.get('/api/quiz', (req, res) => {
  const NUM = 20;
  if (!Array.isArray(questionBank) || questionBank.length === 0) {
    return res.status(500).json({
      error: 'no-questions',
      message: 'Question bank is empty on server'
    });
  }

  const chosen = pickRandom(questionBank, NUM);
  const publicQuestions = chosen.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    quizTitle: "WasteAware — Quick Quiz",
    totalAvailable: questionBank.length,
    questionsCount: publicQuestions.length,
    questions: publicQuestions
  });
});

app.post('/api/quiz/submit', (req, res) => {
  const payload = req.body || {};
  const answers = Array.isArray(payload.answers) ? payload.answers : [];

  if (!answers.length) {
    return res.status(400).json({
      error: 'no-answers',
      message: 'Please provide answers array.'
    });
  }

  const results = answers.map(ans => {
    const q = questionBank.find(x => x.id === ans.questionId);
    if (!q) return { questionId: ans.questionId, correct: false, reason: 'question-not-found' };
    const correct = (typeof q.correctIndex === 'number') && q.correctIndex === ans.answerIndex;
    return {
      questionId: q.id,
      correct,
      yourAnswerIndex: ans.answerIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation || ''
    };
  });

  const graded = results.filter(r => !r.reason);
  const correctCount = graded.filter(r => r.correct).length;
  const totalCount = graded.length || 0;

  res.json({
    user: payload.user || null,
    totalAsked: answers.length,
    gradedCount: totalCount,
    correctCount,
    score: totalCount
      ? Math.round((correctCount / totalCount) * 100)
      : 0,
    results
  });
});

app.post('/api/admin/reload-questions', (req, res) => {
  loadQuestions();
  res.json({ ok: true, loaded: questionBank.length });
});

// Optional PDF route (kept from your version)
const UPLOADED_PDF = '/mnt/data/quiz questions.pdf';
app.get('/api/original-pdf', (req, res) => {
  if (fs.existsSync(UPLOADED_PDF)) return res.sendFile(path.resolve(UPLOADED_PDF));
  return res.status(404).json({
    error: 'not-found',
    message: `PDF not found at ${UPLOADED_PDF}`
  });
});

// ----------------------
// WIKIPEDIA TEXT SEARCH
// ----------------------

// GET /api/text-search?q=...
app.get('/api/text-search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({
      error: 'missing-query',
      message: 'Query parameter q is required.'
    });
  }

  try {
    const url =
      'https://en.wikipedia.org/w/rest.php/v1/search/page?' +
      `q=${encodeURIComponent(query)}&limit=20`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }
    const data = await response.json();

    const results = (data.pages || []).map((p, index) => ({
      rank: index + 1,
      title: p.title,
      description: p.description || '',
      snippet: p.excerpt || '',
      pageId: p.id,
      key: p.key
    }));

    res.json({
      query,
      count: results.length,
      results
    });
  } catch (err) {
    console.error('Error in /api/text-search:', err);
    res.status(500).json({
      error: 'search-failed',
      message: 'Failed to search Wikipedia',
      details: err.message
    });
  }
});

// GET /api/text-article?title=...
app.get("/api/text-article", async (req, res) => {
  const { title } = req.query;
  if (!title) return res.status(400).json({ error: "Missing title" });

  try {
    // Attempt Wikipedia API first
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=true&format=json&titles=${encodeURIComponent(title)}`;

    const response = await fetch(wikiUrl);
    const data = await response.json();

    const page = Object.values(data.query.pages)[0];

    if (page && page.extract && page.extract.trim().length > 50) {
      return res.json({
        title,
        content: page.extract
      });
    }

    // Fallback (DuckDuckGo)
    const fallbackUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(title)}&format=json`;
    const fallbackRes = await fetch(fallbackUrl);
    const fallbackData = await fallbackRes.json();

    const cleanText = fallbackData.Abstract || fallbackData.Definition || "No content available.";

    return res.json({
      title,
      content: cleanText
    });

  } catch (err) {
    console.error("Article fetch error:", err);
    res.status(500).json({
      title,
      content: "⚠ Error fetching article."
    });
  }
});

// ----------------------
// FALLBACK STATIC
// ----------------------
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Quiz + Text API running on http://localhost:${PORT}`);
});
