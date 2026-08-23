import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

function App() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [documentId, setDocumentId] = useState(null);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const [summaryLength, setSummaryLength] = useState('Medium');
  const [summaryResult, setSummaryResult] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/documents');
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await fetch(`http://localhost:3001/api/documents/${id}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(d => d._id !== id));
    } catch (e) {
      console.error('Delete failed', e);
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    setError('');
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.');
        return;
      }
      setFile(selectedFile);
      setExtractedText('');
      setDocumentId(null);
      setSummaryResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError('');
    
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('http://localhost:3001/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract text.');
      }

      const data = await response.json();
      setExtractedText(data.text);
      setDocumentId(data.documentId);
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSummarize = async () => {
    if (!documentId) return;
    setIsSummarizing(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/api/summarize/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length: summaryLength })
      });

      if (!response.ok) {
        throw new Error('Failed to summarize text.');
      }

      const data = await response.json();
      setSummaryResult({
        paragraph: data.summaryParagraph,
        keyPoints: data.keyPoints
      });
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const copyToClipboard = () => {
    if (summaryResult) {
      const text = `${summaryResult.paragraph}\n\nKey Points:\n${summaryResult.keyPoints.map(k => '- ' + k).join('\n')}`;
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white pb-20">
      {/* Navbar / Header */}
      <header className="border-b border-black/10 py-6 px-6 lg:px-12 sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter uppercase">Summet.</h1>
          <span className="text-xs font-semibold tracking-widest uppercase border border-black px-3 py-1 rounded-full">AI Summarizer</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 space-y-12">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Extract & Summarize</h2>
          <p className="text-black/60 max-w-lg mx-auto text-lg leading-relaxed">
            Drop in your documents and let Summet instantly distil the core insights in crisp, professional formats.
          </p>
        </div>

        {/* Upload Area */}
        <div 
          {...getRootProps()} 
          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed transition-all cursor-pointer ${
            isDragActive ? 'border-black bg-black/5 scale-[1.01]' : 'border-black/20 hover:border-black bg-white hover:bg-black/5'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <div className="text-base font-semibold">
            {isDragActive ? 'Drop file here...' : 'Upload a document'}
          </div>
          <p className="mt-2 text-sm text-black/50 font-medium">Accepts PDF, PNG, JPG (Max 10MB)</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-black text-white p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-white/50 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* File Control Card */}
        {file && (
          <div className="border border-black p-5 flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              {file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="preview" className="h-12 w-12 object-cover border border-black" />
              ) : (
                <div className="h-12 w-12 bg-black text-white flex items-center justify-center text-xs font-bold tracking-wider">PDF</div>
              )}
              <div className="overflow-hidden">
                <p className="font-bold truncate text-sm">{file.name}</p>
                <p className="text-xs font-medium text-black/60 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={handleExtract}
              disabled={isExtracting || documentId}
              className="mt-6 sm:mt-0 flex-shrink-0 bg-black text-white px-6 py-3 text-sm font-bold tracking-wide uppercase hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExtracting ? 'Extracting...' : documentId ? 'Extracted' : 'Extract Text'}
            </button>
          </div>
        )}

        {/* Extracted Text Preview */}
        {extractedText && (
          <div className="border border-black">
            <div className="px-5 py-3 border-b border-black bg-black/5 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest">Extracted Text</h3>
            </div>
            <div className="px-5 py-4 text-sm h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed custom-scrollbar bg-[#fafafa]">
              {extractedText}
            </div>
          </div>
        )}

        {/* Summarization Section */}
        {documentId && !summaryResult && (
          <div className="border border-black p-8 space-y-6 bg-black/5">
            <div>
              <h3 className="text-lg font-bold">Configure Summary</h3>
              <p className="text-sm text-black/60 mt-1">Choose the depth of the AI summary.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {['Short', 'Medium', 'Long'].map(len => (
                <label key={len} className="flex items-center cursor-pointer group">
                  <div className={`w-5 h-5 border flex items-center justify-center mr-3 ${summaryLength === len ? 'border-black bg-black' : 'border-black/30 bg-white group-hover:border-black'}`}>
                    {summaryLength === len && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" fillRule="evenodd"></path></svg>}
                  </div>
                  <input 
                    type="radio" 
                    name="summaryLength" 
                    value={len} 
                    checked={summaryLength === len}
                    onChange={(e) => setSummaryLength(e.target.value)}
                    className="hidden"
                  />
                  <span className={`text-sm font-semibold uppercase tracking-wider ${summaryLength === len ? 'text-black' : 'text-black/50'}`}>{len}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="w-full bg-black text-white px-6 py-4 text-sm font-bold tracking-widest uppercase hover:bg-black/80 disabled:opacity-50 transition-colors"
            >
              {isSummarizing ? 'Processing...' : 'Generate Summary'}
            </button>
          </div>
        )}

        {/* Summary Results */}
        {summaryResult && (
          <div className="border-2 border-black">
            <div className="px-8 py-5 border-b-2 border-black flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black text-white">
              <h3 className="text-xl font-bold tracking-tight">AI Summary</h3>
              <button onClick={copyToClipboard} className="text-xs font-bold uppercase tracking-widest mt-2 sm:mt-0 hover:text-white/70 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy Text
              </button>
            </div>
            <div className="px-8 py-8 space-y-8 bg-white">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest mb-4 border-b border-black/10 pb-2">Overview</h4>
                <p className="text-base leading-relaxed font-medium">{summaryResult.paragraph}</p>
              </div>
              {summaryResult.keyPoints && summaryResult.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-4 border-b border-black/10 pb-2">Key Takeaways</h4>
                  <ul className="space-y-3">
                    {summaryResult.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start text-base font-medium">
                        <span className="w-6 h-6 shrink-0 bg-black text-white text-xs flex items-center justify-center rounded-full mr-4 mt-0.5">{idx + 1}</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="pt-16">
            <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
              <h2 className="text-2xl font-extrabold tracking-tight">History</h2>
              <span className="text-xs font-bold uppercase tracking-widest border border-black px-3 py-1">{history.length} Documents</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map(doc => (
                <div key={doc._id} className="border border-black p-6 hover:shadow-[4px_4px_0_0_#000] transition-shadow bg-white flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-sm line-clamp-1 flex-1 pr-4">{doc.filename}</h3>
                      <span className="text-xs font-semibold shrink-0">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                    {doc.summaryParagraph ? (
                      <p className="text-sm font-medium text-black/70 line-clamp-3 mb-6 leading-relaxed">{doc.summaryParagraph}</p>
                    ) : (
                      <p className="text-sm font-medium text-black/40 italic mb-6">No summary generated.</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    {doc.summaryParagraph ? (
                      <span className="inline-block border border-black text-xs font-bold uppercase tracking-widest px-2 py-1">
                        {doc.summaryLength}
                      </span>
                    ) : <span />}
                    <button
                      onClick={() => handleDelete(doc._id)}
                      disabled={deletingId === doc._id}
                      className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-red-600 hover:border-red-600 border border-black/20 hover:border-red-600 px-2 py-1 transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Global Custom Scrollbar style for the extracted text box */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #000; 
        }
      `}</style>
    </div>
  );
}

export default App;

