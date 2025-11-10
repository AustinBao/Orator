import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SimplePDFViewer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPageNumber(1);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (file && numPages > 0) {
        if (event.key === 'ArrowLeft') {
          goToPreviousPage();
        } else if (event.key === 'ArrowRight') {
          goToNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [file, numPages, pageNumber]);

  return (
    <div className="w-full max-w-4xl">
      {/* Upload Button */}
      <div className="mb-4">
        <label
          htmlFor="pdf-upload"
          className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition-colors duration-200 font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {file ? `Change PDF: ${file.name}` : 'Upload Presentation (PDF)'}
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* PDF Display */}
      {file && (
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
          {/* PDF Viewer */}
          <div className="flex justify-center mb-4 bg-white rounded overflow-hidden">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="text-indigo-400 text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                  <p>Loading PDF...</p>
                </div>
              }
              error={
                <div className="text-red-400 text-center py-12">
                  <p className="font-semibold">Failed to load PDF</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={Math.min(800, window.innerWidth - 100)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>

          {/* Navigation Controls */}
          {numPages > 0 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={goToPreviousPage}
                disabled={pageNumber <= 1}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  pageNumber <= 1
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>

              <div className="bg-slate-700 px-4 py-2 rounded-lg">
                <span className="text-white font-semibold">
                  {pageNumber} / {numPages}
                </span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  pageNumber >= numPages
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                Next
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimplePDFViewer;

