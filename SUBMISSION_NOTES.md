# Submission Notes: Document Summary Assistant

**Architecture Choices:**
The application was built as a full MERN stack (MongoDB, Express, React, Node.js). The frontend uses Vite + React with Tailwind CSS for rapid, responsive UI development. The backend is a modular Express server. We chose Mongoose for reliable interaction with MongoDB, allowing us to persist documents and generated summaries for a historical view.

**How it Works:**
1. **Extraction:** Uploads are handled in-memory using `multer`. For PDFs, we use `pdf-parse`; for images, `tesseract.js` performs OCR. The original text is immediately saved to MongoDB.
2. **Summarization:** We use the `@google/generative-ai` SDK (Gemini 1.5 Flash). The backend sends a structured prompt with the requested summary length, parsing the JSON response to extract a summary paragraph and key bullet points.
3. **Database:** Both the original extraction and the final summary are saved to a `Document` collection in MongoDB, which powers the frontend's History view.

**Future Improvements:**
With more time, I would implement WebSocket or Server-Sent Events (SSE) to provide real-time streaming of the Gemini API response, improving perceived performance for long documents. I would also add user authentication to scope document history by user.
