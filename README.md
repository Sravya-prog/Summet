# Summet - AI Document Summary Assistant

![Summet](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

Summet is a minimalist, AI-powered web application that extracts text from documents (PDFs and Images) and generates intelligent, structured summaries using the **Google Gemini API**. 

Designed with a sleek, monochromatic user interface, Summet handles both text-based PDFs and scanned images effortlessly, providing users with quick insights and a persistent history of their documents.

## ✨ Features

- **Intelligent Summarization:** Choose between Short, Medium, or Long summaries. The app generates a summary paragraph alongside key bullet points.
- **Universal Extraction:** 
  - Fast local extraction for text-based PDFs.
  - Seamless fallback to **Gemini Vision OCR** for scanned PDFs and images (PNG, JPEG).
- **Persistent History:** All extractions and summaries are saved to MongoDB, allowing you to revisit past documents.
- **Sleek UI/UX:** A professional, responsive black-and-white theme built with Tailwind CSS.
- **MERN Stack:** Built on a robust MongoDB, Express, React, and Node.js architecture.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, Multer (for memory-based file uploads)
- **Database:** MongoDB (via Mongoose)
- **AI Integration:** `@google/generative-ai` (Gemini 3.6 Flash)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally on default port `27017`)
- A [Google Gemini API Key](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sravya-prog/Summet.git
   cd Summet
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Configuration

Create a `.env` file inside the `server` directory and add your Gemini API key:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/doc-summary
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Application

You will need two terminal windows to run the frontend and backend simultaneously.

**Terminal 1 (Backend):**
```bash
cd server
node index.js
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Navigate to `http://localhost:5173` in your browser to use the application!

## 📁 Architecture Notes

- **Extraction Pipeline:** Uploads are processed in-memory. If a PDF contains raw text, it is extracted locally. If the text is sparse (indicating a scanned document) or if the file is an image, the buffer is sent directly to the Gemini Vision API for highly accurate Optical Character Recognition (OCR).
- **Database Fallback:** The backend is designed with a fallback in-memory store. If MongoDB is not running, the application will still function smoothly for the duration of the server session.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Sravya-prog/Summet/issues).

---
*Developed by Sravya.*
