import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import { Upload, File, Save, Eye, Copy, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import PDFSelectionTool from "../components/PDFSelectionTool";

const TestBuilder = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [sourcePdfFile, setSourcePdfFile] = useState(null);
  const [sourcePdfPages, setSourcePdfPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSourceLoading, setIsSourceLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [test, setTest] = useState({
    title: "",
    description: "",
    questions: [],
  });
  const fileInputRef = useRef(null);
  const sourceFileInputRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [customSelections, setCustomSelections] = useState([]);
  const [sourceSelections, setSourceSelections] = useState([]);
  const [copiedContent, setCopiedContent] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [pastedSelections, setPastedSelections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Load PDF.js scripts dynamically
  useEffect(() => {
    const loadScripts = async () => {
      // Add PDF.js script
      const pdfJsScript = document.createElement("script");
      pdfJsScript.src =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js";
      pdfJsScript.async = true;
      document.body.appendChild(pdfJsScript);

      // Add PDF.js worker
      pdfJsScript.onload = () => {
        const workerScript = document.createElement("script");
        workerScript.src =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
        workerScript.async = true;
        document.body.appendChild(workerScript);

        workerScript.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
        };
      };
    };

    loadScripts();
  }, []);

  // Add this effect to warn users before leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Only show warning if they've started working
      if (test.title || customSelections.length > 0 || pastedSelections.length > 0) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [test, customSelections, pastedSelections]);

  const processPdfFile = async (file, isSource = false) => {
    if (!file) return null;

    // Check if PDF.js is loaded
    if (!window.pdfjsLib) {
      toast.error("PDF.js is not loaded yet. Please try again in a moment.");
      return null;
    }

    // Read the file as an ArrayBuffer
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onload = async function () {
        try {
          const arrayBuffer = this.result;

          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
            .promise;
          // Process PDF pages
          const pages = [];
          const questions = [];
          const pageTextContent = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;

            // Add page to array
            pages.push({
              pageNumber: i,
              dataUrl: canvas.toDataURL(),
              width: viewport.width,
              height: viewport.height,
            });

            // Only process questions for the main PDF, not the source PDF
            if (!isSource) {
              // Extract text content for question detection
              const textContent = await page.getTextContent();
              pageTextContent.push({
                pageNumber: i,
                items: textContent.items,
              });

              // Process text content to find questions and subquestions
              const lines = [];
              let currentLine = "";
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
                  const questionContent = questionMatch[3] || "";

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
                    subQuestions: [],
                  };

                  // Look for sub-questions in subsequent lines
                  let k = j + 1;
                  let lastSubquestionY = line.y;

                  while (k < lines.length) {
                    const subLine = lines[k];

                    // Example: "(a) This is a subquestion"
                    const subMatch = subLine.text.match(
                      /^\(([a-z]+)\)(\s+(.*))?$/,
                    );

                    if (subMatch) {
                      const subType = subMatch[1]; // e.g., "a"
                      const subContent = subMatch[3] || "";
                      const subId = `q${questionNumber}_${subType}_p${i}`;

                      // Add sub-question
                      questionObj.subQuestions.push({
                        id: subId,
                        type: subType,
                        content: subContent,
                        fullText: subLine.text,
                        isSelected: true,
                        pageNumber: i,
                        y: subLine.y,
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
                  questionObj.endY =
                    questionObj.subQuestions.length > 0
                      ? lastSubquestionY + 20
                      : line.y + 20;

                  questions.push(questionObj);
                }
              }
            }
          }

          resolve({
            pages,
            questions,
          });
        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = () => reject(new Error("Failed to read file"));
      fileReader.readAsArrayBuffer(file);
    });
  };

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
      const result = await processPdfFile(file);

      setPdfPages(result.pages);

      // Update test with extracted questions
      setTest((prev) => ({
        ...prev,
        questions: result.questions,
      }));

      toast.success(`PDF loaded with ${result.pages.length} pages`);
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsSourceLoading(true);
    setSourcePdfFile(file);

    try {
      const result = await processPdfFile(file, true);
      setSourcePdfPages(result.pages);
      toast.success(`Source PDF loaded with ${result.pages.length} pages`);
    } catch (error) {
      console.error("Error processing source PDF:", error);
      toast.error("Failed to process source PDF: " + error.message);
    } finally {
      setIsSourceLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleSourceUploadClick = () => {
    sourceFileInputRef.current.click();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTest((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAreaSelections = (selections) => {
    // If selections array is empty, it means all selections for this page were removed
    // We need to get the page number from the event or context
    
    // Get current page number - either from first selection or from a different source
    let currentPageNumber;
    
    if (selections.length > 0) {
      currentPageNumber = selections[0]?.pageNumber;
    } else {
      // If no selections left, we need to know which page they were deleted from
      // This should be available in the selections parameter from PDFSelectionTool
      currentPageNumber = selections.pageNumber;
    }
    
    if (!currentPageNumber) {
      console.error("Could not determine page number for selection update");
      return;
    }
    
    // Keep all selections from other pages, and update only the current page's selections
    setCustomSelections((prevSelections) => {
      // Remove previous selections for this page
      const otherPageSelections = prevSelections.filter(
        (sel) => sel.pageNumber !== currentPageNumber
      );
      
      // Add the new selections for the current page (which might be an empty array)
      return [...otherPageSelections, ...selections];
    });
  };

  // Add a new component for the draggable copied content
  const DraggableCopiedContent = ({ content, onDragStart }) => {
    const handleDragStart = (e) => {
      // Store the content data as JSON with all required fields
      const contentData = {
        dataUrl: content.dataUrl,
        width: content.width,
        height: content.height,
        isPasteItem: false,
      };

      console.log("Setting drag data:", contentData);
      e.dataTransfer.setData("application/json", JSON.stringify(contentData));

      // Set the drag image for better UX
      if (content.dataUrl) {
        const img = new Image();
        img.src = content.dataUrl;
        e.dataTransfer.setDragImage(img, 20, 20);
      }

      if (onDragStart) onDragStart();
    };

    return (
      <div
        draggable={true}
        onDragStart={handleDragStart}
        className="relative cursor-move"
      >
        <img
          src={content.dataUrl}
          alt="Content to paste"
          className="border border-dashed border-blue-300 hover:border-blue-500"
          style={{
            maxWidth: "200px",
            maxHeight: "150px",
          }}
        />
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 hover:bg-opacity-0 flex items-center justify-center">
          <span className="bg-blue-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            Drag me to target
          </span>
        </div>
      </div>
    );
  };

  // Update the handleContentCopy function
  const handleContentCopy = (selection) => {
    // Find the corresponding page
    const sourcePage = sourcePdfPages.find(
      (p) => p.pageNumber === selection.pageNumber,
    );
    if (!sourcePage) return;

    // Create a canvas to crop the selection
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Load the page image
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to the selection size
      const selWidth = selection.width * sourcePage.width;
      const selHeight = selection.height * sourcePage.height;
      canvas.width = selWidth;
      canvas.height = selHeight;

      // Draw the selected portion of the image
      ctx.drawImage(
        img,
        selection.left * sourcePage.width, // sx
        selection.top * sourcePage.height, // sy
        selWidth, // sWidth
        selHeight, // sHeight
        0, // dx
        0, // dy
        selWidth, // dWidth
        selHeight, // dHeight
      );

      // Get the cropped image data
      const croppedDataUrl = canvas.toDataURL();

      // Set the copied content
      setCopiedContent({
        dataUrl: croppedDataUrl,
        width: selWidth,
        height: selHeight,
        originalSelection: selection,
      });

      toast.success("Content copied! Drag and drop to paste");
      setIsCopying(true);

      // Clear source selection after copying
      setSourceSelections([]);
    };
    img.src = sourcePage.dataUrl;
  };

  // Add a new handler for content drops that handles both new content and repositioned content
  const handleContentDrop = (dropData) => {
    // Extract the drop position and content data
    const { x, y, pageNumber } = dropData;
    const isPasteItem = dropData.isPasteItem;
    const pasteId = dropData.pasteId;

    console.log("Drop data received:", dropData); // Add debugging

    // Get the target page dimensions
    const targetPage = pdfPages.find((p) => p.pageNumber === pageNumber);
    if (!targetPage) {
      console.error("Target page not found:", pageNumber);
      return;
    }

    if (isPasteItem) {
      // This is a repositioning of an existing paste item
      setPastedSelections((prevSelections) =>
        prevSelections.map((paste) => {
          if (paste.id === pasteId) {
            // Update the position of the existing paste
            return {
              ...paste,
              pageNumber,
              left: x - paste.width / 2, // Center at drop position
              top: y - paste.height / 2, // Center at drop position
            };
          }
          return paste;
        }),
      );

      toast.success("Content repositioned successfully!");
    } else {
      // This is a new paste from the source PDF
      const { dataUrl, width, height } = dropData;

      if (!dataUrl || !width || !height) {
        console.error("Missing data in drop event:", dropData);
        toast.error("Invalid content data. Please try again.");
        return;
      }

      // Calculate the normalized dimensions
      const normalizedWidth = width / targetPage.width;
      const normalizedHeight = height / targetPage.height;

      // Create the new pasted selection
      const newPastedSelection = {
        id: `paste_${Date.now()}`,
        pageNumber,
        left: x - normalizedWidth / 2, // Center at drop position
        top: y - normalizedHeight / 2, // Center at drop position
        width: normalizedWidth,
        height: normalizedHeight,
        content: dataUrl,
      };

      // Use functional update form
      setPastedSelections((prev) => [...prev, newPastedSelection]);

      // Reset copying state
      setIsCopying(false);
      setCopiedContent(null);
      toast.success("Content pasted successfully!");
    }
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

      // Send both masking selections and paste operations
      const selectionData = JSON.stringify({
        customSelections,
        pastedSelections,
      });
      formData.append("selectionData", selectionData);

      // Send to backend for processing
      const response = await axios({
        method: "post",
        url: "/api/tests/preview",
        data: formData,
        responseType: "blob",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Check if we got a valid response
      if (response.data.size === 0) {
        throw new Error("Received empty PDF from server");
      }

      // Create a URL for the returned PDF
      const blob = new Blob([response.data], { type: "application/pdf" });

      // Check if we have a valid PDF (at least check for a minimum size)
      if (blob.size < 100) {
        // PDF files should be at least a few hundred bytes
        throw new Error("Invalid PDF received from server");
      }

      const previewUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(previewUrl);

      // Switch to preview mode
      setShowPreview(true);
      toast.success("Preview generated successfully!");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error(
        "Failed to generate preview: " +
          (error.response?.data?.message || error.message),
      );
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
        questions: test.questions,
      });

      if (response.data.success) {
        const testId = response.data.data._id;

        // If we have a PDF file, upload it along with selection and paste data
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);

          // Include both selection data and pasted content
          const selectionData = JSON.stringify({
            customSelections,
            pastedSelections,
          });
          formData.append("selectionData", selectionData);

          await axios.post(`/api/tests/${testId}/upload-pdf`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
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

  // Create a separate component for draggable pasted items
  const PastedContentItem = ({ paste, pdfPages, onRemove }) => {
    const [isDraggingThis, setIsDraggingThis] = useState(false);

    const handleDragStart = (e) => {
      // Store the paste item's ID and data
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          isPasteItem: true,
          pasteId: paste.id,
          dataUrl: paste.content,
          width:
            paste.width *
            (pdfPages.find((p) => p.pageNumber === paste.pageNumber)?.width ||
              800),
          height:
            paste.height *
            (pdfPages.find((p) => p.pageNumber === paste.pageNumber)?.height ||
              600),
        }),
      );

      // Update both local and global drag state
      setIsDraggingThis(true);
      setIsDragging(true); // Set the global state

      // Create a drag image for better visual feedback
      if (paste.content) {
        // Create a new image element for the drag operation
        const ghostImage = new Image();
        ghostImage.src = paste.content;

        // Style the ghost image
        ghostImage.style.position = "absolute";
        ghostImage.style.top = "0";
        ghostImage.style.left = "0";
        ghostImage.width = 100; // Set a fixed size for the drag image
        ghostImage.height = 100 * (paste.height / paste.width);
        ghostImage.style.opacity = "0.7";

        // Temporarily add to DOM
        document.body.appendChild(ghostImage);

        // Set as drag image with position offset at cursor center
        const offsetX = ghostImage.width / 2;
        const offsetY = ghostImage.height / 2;
        e.dataTransfer.setDragImage(ghostImage, offsetX, offsetY);

        // Remove ghost image after a delay
        setTimeout(() => {
          document.body.removeChild(ghostImage);
        }, 100);
      }
    };

    const handleDragEnd = () => {
      setIsDraggingThis(false);
      setIsDragging(false); // Reset the global state
    };

    return (
      <div
        className={`absolute border-2 cursor-move group transition-all ${
          isDraggingThis
            ? "border-blue-500 opacity-50"
            : "border-green-500 hover:border-blue-500 hover:shadow-lg"
        }`}
        style={{
          left: `${paste.left * 100}%`,
          top: `${paste.top * 100}%`,
          width: `${paste.width * 100}%`,
          height: `${paste.height * 100}%`,
          zIndex: isDraggingThis ? 1000 : 10,
        }}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-10 transition-all"></div>
        <img
          src={paste.content}
          alt="Pasted content"
          className="w-full h-full object-contain"
          draggable={false}
        />
        <div className="absolute -top-6 left-0 bg-blue-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Drag to reposition
        </div>
        <button
          className="absolute -top-3 -right-3 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(paste.id)}
        >
          ×
        </button>
      </div>
    );
  };

  // Then update renderPastedContent:
  const renderPastedContent = (pageNumber) => {
    const pagePastes = pastedSelections.filter(
      (p) => p.pageNumber === pageNumber,
    );

    return pagePastes.map((paste) => (
      <PastedContentItem
        key={paste.id}
        paste={paste}
        pdfPages={pdfPages}
        onRemove={(id) =>
          setPastedSelections((prev) => prev.filter((p) => p.id !== id))
        }
      />
    ));
  };

  // Update the render method for copied content preview
  // Replace the fixed content preview with the draggable version
  const renderCopiedContentPreview = () => {
    if (!isCopying || !copiedContent) return null;

    return (
      <div className="fixed bottom-4 right-4 p-2 bg-gray-800 border border-blue-500 rounded-lg shadow-lg z-50">
        <div className="text-sm text-white mb-1">Drag to paste:</div>
        <div className="relative">
          <DraggableCopiedContent
            content={copiedContent}
            onDragStart={() => setIsDragging(true)}
          />
          <button
            onClick={() => {
              setCopiedContent(null);
              setIsCopying(false);
            }}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // Add this useEffect to debug state changes
  useEffect(() => {
    console.log("pastedSelections updated:", pastedSelections);
  }, [pastedSelections]);

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
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Create New Test
          </h2>

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

          {/* Two upload areas side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target PDF Upload */}
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Target PDF (to edit)
              </h3>
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
                    <p className="mt-2 text-gray-300">
                      Click to upload target PDF
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      This is the PDF you want to modify
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Source PDF Upload */}
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-3">
                Source PDF (to copy from)
              </h3>
              <input
                type="file"
                ref={sourceFileInputRef}
                onChange={handleSourceFileChange}
                accept="application/pdf"
                className="hidden"
              />

              <div
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
                onClick={handleSourceUploadClick}
              >
                {isSourceLoading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-t-green-500 border-green-200 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-400">Processing PDF...</p>
                  </div>
                ) : sourcePdfFile ? (
                  <div className="flex flex-col items-center">
                    <File size={40} className="text-green-500" />
                    <p className="mt-2 text-gray-300">{sourcePdfFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click to upload a different source PDF
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Copy size={40} className="text-gray-400" />
                    <p className="mt-2 text-gray-300">
                      Click to upload source PDF
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      This is the PDF you will copy content from
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status indicator for copying mode */}
          {isCopying && (
            <div className="mt-4 py-2 px-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-500 flex items-center">
              <ArrowRight
                className="text-blue-400 animate-pulse mr-2"
                size={20}
              />
              <span className="text-blue-300">
                Content copied! Click on the target PDF to paste
              </span>
            </div>
          )}

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

        {/* PDF Content Sections */}
        {!showPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target PDF Content Section */}
            {pdfPages.length > 0 && (
              <motion.div
                className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-100">
                    Target PDF Content
                  </h2>
                  <div className="text-sm text-gray-300">
                    <span className="bg-red-500 bg-opacity-20 border border-red-500 rounded px-2 py-1">
                      Click and drag to mask areas
                    </span>
                  </div>
                </div>

                <div className="space-y-8">
                  {pdfPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-700 p-2 text-sm text-gray-300 flex justify-between items-center">
                        <span>Page {page.pageNumber}</span>
                        <span className="text-xs italic">
                          {isCopying
                            ? "Drag and drop copied content here"
                            : "Click and drag to mask areas"}
                        </span>
                      </div>
                      <div
                        className="p-4 bg-white relative"
                        style={{
                          outline: isCopying
                            ? "2px dashed rgba(59, 130, 246, 0.3)"
                            : "none",
                          transition: "all 0.2s ease",
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.outline =
                            "3px dashed rgba(59, 130, 246, 0.8)";
                          e.currentTarget.style.backgroundColor =
                            "rgba(59, 130, 246, 0.05)";
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.style.outline = isCopying
                            ? "2px dashed rgba(59, 130, 246, 0.3)"
                            : "none";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                        onDrop={(e) => {
                          e.currentTarget.style.outline = isCopying
                            ? "2px dashed rgba(59, 130, 246, 0.3)"
                            : "none";
                          e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        <PDFSelectionTool
                          pageData={page}
                          onSelectionComplete={handleAreaSelections}
                          existingSelections={customSelections.filter(
                            (s) => s.pageNumber === page.pageNumber,
                          )}
                          allowDrop={true}
                          onDropContent={handleContentDrop}
                        />
                        {/* Render pasted content */}
                        {renderPastedContent(page.pageNumber)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Source PDF Content Section */}
            {sourcePdfPages.length > 0 && (
              <motion.div
                className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-100">
                    Source PDF Content
                  </h2>
                  <div className="text-sm text-gray-300">
                    <span className="bg-green-500 bg-opacity-20 border border-green-500 rounded px-2 py-1">
                      Click and drag to copy content
                    </span>
                  </div>
                </div>

                <div className="space-y-8">
                  {sourcePdfPages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-700 p-2 text-sm text-gray-300 flex justify-between items-center">
                        <span>Page {page.pageNumber}</span>
                        <span className="text-xs italic">
                          Select content to copy
                        </span>
                      </div>
                      <div className="p-4 bg-white">
                        <PDFSelectionTool
                          pageData={page}
                          onSelectionComplete={() => {}} // Not used in copy mode
                          existingSelections={[]} // Don't show persistent selections in copy mode
                          isCopyMode={true}
                          onCopyContent={handleContentCopy}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
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
              <h2 className="text-xl font-semibold text-gray-100">Preview</h2>
            </div>

            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title="PDF Preview"
                className="w-full h-screen"
                style={{ minHeight: "800px" }}
              />
            </div>
          </motion.div>
        )}
      </main>
      {/* Render the draggable copied content */}
      {renderCopiedContentPreview()}
    </div>
  );
};

export default TestBuilder;
