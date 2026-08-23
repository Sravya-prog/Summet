const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  originalText: {
    type: String,
    required: true,
  },
  summaryLength: {
    type: String,
    enum: ['Short', 'Medium', 'Long'],
  },
  summaryParagraph: {
    type: String,
  },
  keyPoints: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Document', documentSchema);
