const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const Document = require('./models/Document');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fallback memory store when MongoDB is not available
const memoryStore = {};
let idCounter = 1;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doc-summary', { serverSelectionTimeoutMS: 2000 })
  .then(() => console.log('Connected to MongoDB'))
  .catch(() => console.log('MongoDB not available. Using in-memory store.'));

// Configure Multer (memory storage, 10MB limit)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type. Only PDF, PNG, and JPEG are allowed.'));
  }
});

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Helper: Use Gemini Vision to extract text from any file ─────────────────
// Used as a fallback for scanned PDFs and all images
async function extractTextWithGemini(buffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType,
        data: buffer.toString('base64')
      }
    },
    'Extract and return ALL the text content from this document exactly as it appears. ' +
    'Preserve paragraph breaks. Do not summarize, interpret, or add anything. ' +
    'Just return the raw extracted text.'
  ]);

  return result.response.text().trim();
}

// ─── Route 1: Extract Text ────────────────────────────────────────────────────
app.post('/api/extract', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY missing in server/.env' });
  }

  try {
    let extractedText = '';
    let method = 'pdf-parse';

    if (req.file.mimetype === 'application/pdf') {
      // Step 1: fast local text extraction
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text ? data.text.trim() : '';

      // Step 2: if little/no text, it's a scanned PDF — use Gemini Vision
      if (extractedText.length < 20) {
        console.log('Scanned PDF detected. Using Gemini Vision for OCR...');
        method = 'gemini-vision';
        extractedText = await extractTextWithGemini(req.file.buffer, 'application/pdf');
      }
    } else if (req.file.mimetype.startsWith('image/')) {
      // Always use Gemini Vision for images (more accurate than Tesseract)
      console.log('Image file. Using Gemini Vision for text extraction...');
      method = 'gemini-vision';
      extractedText = await extractTextWithGemini(req.file.buffer, req.file.mimetype);
    }

    if (!extractedText || extractedText.length < 10) {
      return res.status(422).json({
        error: 'Could not extract enough text from this document. The file may contain no readable text.'
      });
    }

    console.log(`Extracted ${extractedText.length} chars via ${method}`);

    // Persist document
    let documentId;
    if (mongoose.connection.readyState === 1) {
      const newDoc = new Document({
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        originalText: extractedText
      });
      await newDoc.save();
      documentId = newDoc._id.toString();
    } else {
      documentId = `mem_${idCounter++}`;
      memoryStore[documentId] = {
        _id: documentId,
        filename: req.file.originalname,
        originalText: extractedText,
        createdAt: new Date()
      };
    }

    res.json({ documentId, text: extractedText });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: 'Extraction failed: ' + err.message });
  }
});

// ─── Route 2: Summarize with Gemini ──────────────────────────────────────────
app.post('/api/summarize/:id', async (req, res) => {
  const { length } = req.body;
  if (!['Short', 'Medium', 'Long'].includes(length)) {
    return res.status(400).json({ error: 'Invalid length. Use Short, Medium, or Long.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Add it to server/.env and restart.' });
  }

  try {
    const id = req.params.id;
    let originalText = '';
    let doc = null;

    if (id.startsWith('mem_')) {
      doc = memoryStore[id];
      if (!doc) return res.status(404).json({ error: 'Document not found.' });
      originalText = doc.originalText;
    } else {
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ error: 'Database not connected.' });
      }
      doc = await Document.findById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found.' });
      originalText = doc.originalText;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const lengthGuide = {
      Short: '2-3 concise sentences',
      Medium: '1 solid paragraph (4-6 sentences)',
      Long: '2-3 detailed paragraphs'
    }[length];

    const prompt = `You are a professional document analyst. Summarize the following text.
Length requirement: ${length} — ${lengthGuide}.
Respond ONLY with valid JSON, no markdown fences, no extra text:
{
  "summaryParagraph": "the summary here",
  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4"]
}

Document text:
${originalText.slice(0, 30000)}`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();

    // Strip any accidental markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    const parsed = JSON.parse(raw);

    // Save summary back
    if (id.startsWith('mem_')) {
      doc.summaryLength = length;
      doc.summaryParagraph = parsed.summaryParagraph;
      doc.keyPoints = parsed.keyPoints;
      memoryStore[id] = doc;
    } else {
      doc.summaryLength = length;
      doc.summaryParagraph = parsed.summaryParagraph;
      doc.keyPoints = parsed.keyPoints;
      await doc.save();
    }

    res.json(doc);
  } catch (err) {
    console.error('Summarization error:', err);
    const msg = err.message?.includes('API_KEY') || err.message?.includes('401')
      ? 'Invalid Gemini API key. Check GEMINI_API_KEY in server/.env.'
      : 'Failed to generate summary: ' + err.message;
    res.status(500).json({ error: msg });
  }
});

// ─── Route 3: Get History ─────────────────────────────────────────────────────
app.get('/api/documents', async (req, res) => {
  try {
    let dbDocs = [];
    if (mongoose.connection.readyState === 1) {
      dbDocs = await Document.find().sort({ createdAt: -1 }).select('-originalText');
    }
    const memDocs = Object.values(memoryStore).map(({ originalText, ...rest }) => rest);
    const combined = [...dbDocs, ...memDocs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

// ─── Route 4: Delete a Document ──────────────────────────────────────────────
app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (id.startsWith('mem_')) {
      if (!memoryStore[id]) return res.status(404).json({ error: 'Document not found.' });
      delete memoryStore[id];
      return res.json({ message: 'Deleted.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: 'Database not connected.' });
    }
    await Document.findByIdAndDelete(id);
    res.json({ message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
