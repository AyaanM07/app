import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import { Upload, File, Save, Eye } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import PDFSelectionTool from "../components/PDFSelectionTool";

const TestBuilder = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [test, setTest] = useState({
    title: "",
    description: "",
    questions: []
  });
  const fileInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [customSelections, setCustomSelections] = useState([]);

  // Load PDF.js scripts dynamically
  useEffect(() => {
    const loadScripts = async () => {
      // Add PDF.js script
      const pdfJsScript = document.createElement('script');
      pdfJsScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
      pdfJsScript.async = true;
      document.body.appendChild(pdfJsScript);

      // Add PDF.js worker
      pdfJsScript.onload = () => {
        const workerScript = document.createElement('script');
        workerScript.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        workerScript.async = true;
        document.body.appendChild(workerScript);
        
        workerScript.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        };
      };
    };

    loadScripts();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsLoading(true);
    setPdfFile(file);
    setPreviewPdfUrl(null);

    try {
      // Check if PDF.js is loaded
      if (!window.pdfjsLib) {
        toast.error("PDF.js is not loaded yet. Please try again in a moment.");
        return;
      }

      // Read the file as an ArrayBuffer
      // Read the file as an ArrayBuffer
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        const arrayBuffer = this.result;
        
        const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
        // Process PDF pages
        const pages = [];
        const questions = [];
        const pageTextContent = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Add page to array
          pages.push({
            pageNumber: i,
            dataUrl: canvas.toDataURL(),
            width: viewport.width,
            height: viewport.height
          });
          
          // Extract text content for question detection
          const textContent = await page.getTextContent();
          pageTextContent.push({
            pageNumber: i,
            items: textContent.items
          });
          
          // Process text content to find questions and subquestions
          const lines = [];
          let currentLine = '';
          let lastY = null;
          let lineY = 0;
          
          for (const item of textContent.items) {
            const y = Math.round(item.transform[5]);
            
            if (lastY !== y) {
              if (currentLine.trim()) {
                lines.push({ text: currentLine.trim(), y: lineY });
              }
              currentLine = item.str;
              lastY = y;
              lineY = y;
            } else {
              currentLine += item.str;
            }
          }
          
          if (currentLine.trim()) {
            lines.push({ text: currentLine.trim(), y: lineY });
          }
          
          // Find questions using regex
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            
            // Main question regex: "1. Question text" or simply "1."
            const questionMatch = line.text.match(/^(\d+)\.(\s+(.*))?$/);
            if (questionMatch) {
              const questionNumber = parseInt(questionMatch[1]);
              const questionContent = questionMatch[3] || '';
              
              // Create question object
              const questionId = `q${questionNumber}`;
              const questionObj = {
                id: questionId,
                questionNumber,
                content: questionContent,
                fullText: line.text,
                isSelected: true,
                pageNumber: i,
                startY: line.y,
                endY: line.y + 20, // Estimate height
                subQuestions: []
              };
              
              // Look for sub-questions in subsequent lines
              let k = j + 1;
              let lastSubquestionY = line.y;
              
              while (k < lines.length) {
                const subLine = lines[k];
                
                // Example: "(a) This is a subquestion"
                const subMatch = subLine.text.match(/^\(([a-z]+)\)(\s+(.*))?$/);
                
                if (subMatch) {
                  const subType = subMatch[1]; // e.g., "a"
                  const subContent = subMatch[3] || '';
                  const subId = `q${questionNumber}_${subType}_p${i}`;
                  
                  // Add sub-question
                  questionObj.subQuestions.push({
                    id: subId,
                    type: subType,
                    content: subContent,
                    fullText: subLine.text,
                    isSelected: true,
                    pageNumber: i,
                    y: subLine.y
                  });
                  
                  lastSubquestionY = subLine.y;
                  k++;
                } else if (subLine.text.match(/^\d+\./)) {
                  // New question detected, stop processing subquestions
                  break;
                } else {
                  // Continue to next line
                  k++;
                }
              }
              
              // Update the end position based on last subquestion or estimate
              questionObj.endY = questionObj.subQuestions.length > 0 
                ? lastSubquestionY + 20 
                : line.y + 20;
              
              questions.push(questionObj);
            }
          }
        }
        
        setPdfPages(pages);
        
        // Update test with extracted questions
        setTest(prev => ({
          ...prev,
          questions
        }));
        
        toast.success(`PDF loaded with ${pdf.numPages} pages`);
      };
      
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTest(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAreaSelections = (selections) => {
    setCustomSelections(selections);
    setPreviewPdfUrl(null); // Clear preview when selections change
    setShowPreview(false);
  };

  const togglePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      
      // Only send custom selections
      const selectionData = JSON.stringify({
        customSelections
      });
      formData.append("selectionData", selectionData);
      
      // Send to backend for processing
      const response = await axios({
        method: 'post',
        url: '/api/tests/preview',
        data: formData,
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Check if we got a valid response
      if (response.data.size === 0) {
        throw new Error("Received empty PDF from server");
      }
      
      // Create a URL for the returned PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Check if we have a valid PDF (at least check for a minimum size)
      if (blob.size < 100) { // PDF files should be at least a few hundred bytes
        throw new Error("Invalid PDF received from server");
      }
      
      const previewUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(previewUrl);
      
      // Switch to preview mode
      setShowPreview(true);
      toast.success("Preview generated successfully!");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview: " + (error.response?.data?.message || error.message));
      
      // Log more details for debugging
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
        if (error.response.data instanceof Blob) {
          // Try to read the blob as text to see if it contains an error message
          const reader = new FileReader();
          reader.onload = () => {
            console.error("Response data as text:", reader.result);
          };
          reader.readAsText(error.response.data);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!test.title) {
      toast.error("Test title is required");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await axios.post("/api/tests", {
        title: test.title,
        description: test.description,
        questions: test.questions
      });
      
      if (response.data.success) {
        const testId = response.data.data._id;
        
        // If we have a PDF file, upload it
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);
          
          // Add custom selections for future reference
          const selectionData = JSON.stringify({
            customSelections
          });
          formData.append("selectionData", selectionData);
          
          await axios.post(`/api/tests/${testId}/upload-pdf`, formData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });
        }
        
        toast.success("Test created successfully!");
      }
    } catch (error) {
      console.error("Error saving test:", error);
      toast.error(error.response?.data?.message || "Failed to save test");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Test Builder" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* Test Information Section */}
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Create New Test</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test Title
              </label>
              <input
                type="text"
                name="title"
                value={test.title}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test title"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={test.description}
                onChange={handleInputChange}
                rows="2"
                className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test description"
              ></textarea>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />

          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={handleUploadClick}
          >
            {isLoading ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-400">Processing PDF...</p>
              </div>
            ) : pdfFile ? (
              <div className="flex flex-col items-center">
                <File size={40} className="text-blue-500" />
                <p className="mt-2 text-gray-300">{pdfFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click to upload a different PDF
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload size={40} className="text-gray-400" />
                <p className="mt-2 text-gray-300">Click to upload a PDF</p>
                <p className="text-xs text-gray-400 mt-1">
                  Or drag and drop a PDF file here
                </p>
              </div>
            )}
          </div>
          
          {/* Button bar */}
          <div className="mt-6 flex justify-end space-x-4">
            {pdfPages.length > 0 && (
              <>
                <button 
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                  onClick={togglePreview}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-white border-white border-opacity-50 rounded-full animate-spin mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye size={18} className="mr-2" />
                      {showPreview ? "Edit Questions" : "Preview Selected"}
                    </>
                  )}
                </button>
              </>
            )}
            
            <button 
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50"
              onClick={handleSave}
              disabled={isSaving || !test.title}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-white border-white border-opacity-50 rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Test
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* PDF Content Section */}
        {!showPreview && pdfPages.length > 0 && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-100">PDF Content</h2>
              <div className="text-sm text-gray-300">
                <span className="bg-red-500 bg-opacity-20 border border-red-500 rounded px-2 py-1">
                  Click and drag to select areas to mask
                </span>
              </div>
            </div>

            <div className="space-y-8">
              {pdfPages.map((page) => (
                <div key={page.pageNumber} className="border border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-700 p-2 text-sm text-gray-300 flex justify-between items-center">
                    <span>Page {page.pageNumber}</span>
                    <span className="text-xs italic">Click and drag to select areas to mask</span>
                  </div>
                  <div className="p-4 bg-white">
                    <PDFSelectionTool 
                      pageData={page}
                      onSelectionComplete={handleAreaSelections}
                      existingSelections={customSelections.filter(s => s.pageNumber === page.pageNumber)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Preview Section - shown when in preview mode */}
        {showPreview && previewPdfUrl && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-100">Preview (Selected Questions Only)</h2>
            </div>

            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="PDF Preview"
                className="w-full h-screen"
                style={{ minHeight: '800px' }}
              />
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TestBuilder;