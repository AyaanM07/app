import { useState, useRef, useEffect } from "react";

const PDFSelectionTool = ({
  pageData,
  onSelectionComplete,
  existingSelections = [],
  isCopyMode = false,
  onCopyContent = null,
  allowDrop = false,
  onDropContent = null,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [selections, setSelections] = useState(existingSelections);
  const containerRef = useRef(null);

  // Update selections when existingSelections prop changes
  useEffect(() => {
    setSelections(existingSelections);
  }, [existingSelections]);

  // Handle mouse events for selection
  const handleMouseDown = (e) => {
    // Don't start selection if clicking on a button
    if (e.target.tagName === "BUTTON") return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;

    // Calculate the selection rectangle in normalized coordinates (0-1)
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const selection = normalizeSelection(
      selectionStart.x,
      selectionStart.y,
      selectionEnd.x,
      selectionEnd.y,
      rect.width,
      rect.height,
    );

    // Ignore very small selections (likely clicks)
    const MIN_SIZE = 10; // minimum 10px
    if (
      Math.abs(selectionEnd.x - selectionStart.x) > MIN_SIZE &&
      Math.abs(selectionEnd.y - selectionStart.y) > MIN_SIZE
    ) {
      // If in copy mode, trigger the onCopyContent callback instead of adding to selections
      if (isCopyMode && onCopyContent) {
        onCopyContent({
          id: Date.now().toString(),
          ...selection,
          pageNumber: pageData.pageNumber,
        });
      } else {
        // Add new selection for masking
        const newSelections = [
          ...selections,
          {
            id: Date.now().toString(),
            ...selection,
            pageNumber: pageData.pageNumber,
          },
        ];

        setSelections(newSelections);

        // Notify parent component
        onSelectionComplete(newSelections);
      }
    }

    setIsSelecting(false);
  };

  // Handle drag events for drop target
  const handleDragOver = (e) => {
    if (allowDrop) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    if (!allowDrop || !onDropContent) return;

    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // Normalize to 0-1
    const y = (e.clientY - rect.top) / rect.height; // Normalize to 0-1

    // Get the data from dataTransfer
    try {
      const contentData = JSON.parse(
        e.dataTransfer.getData("application/json"),
      );

      // Notify parent about the drop with position and content data
      onDropContent({
        x,
        y,
        pageNumber: pageData.pageNumber,
        ...contentData,
      });
    } catch (err) {
      console.error("Error parsing drag data:", err);
    }
  };

  // Normalize selection coordinates (x, y, width, height) to be relative to the image size (0-1)
  const normalizeSelection = (
    x1,
    y1,
    x2,
    y2,
    containerWidth,
    containerHeight,
  ) => {
    const left = Math.min(x1, x2) / containerWidth;
    const top = Math.min(y1, y2) / containerHeight;
    const right = Math.max(x1, x2) / containerWidth;
    const bottom = Math.max(y1, y2) / containerHeight;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  };

  // Update the handleSelectionRemove function
  const handleSelectionRemove = (id) => {
    console.log("Removing selection:", id);
    
    // First update the local state
    const newSelections = selections.filter((s) => s.id !== id);
    setSelections(newSelections);
    
    // Then ensure we call onSelectionComplete with the updated selections
    // This is critical - we need to make sure the parent component knows about the change
    if (onSelectionComplete) {
      // Important: Include the pageNumber so the parent can track which page this belongs to
      onSelectionComplete(newSelections.map(sel => ({
        ...sel,
        pageNumber: pageData.pageNumber
      })));
    }
  };

  // Draw selections on the canvas
  const renderSelections = () => {
    if (!containerRef.current) return [];

    return selections.map((selection) => {
      const style = {
        position: "absolute",
        left: `${selection.left * 100}%`,
        top: `${selection.top * 100}%`,
        width: `${selection.width * 100}%`,
        height: `${selection.height * 100}%`,
        backgroundColor: "rgba(255, 0, 0, 0.3)",
        border: "2px dashed red",
        pointerEvents: "none", // Container won't receive pointer events
      };

      const buttonStyle = {
        position: "absolute",
        right: "-10px",
        top: "-10px",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: "red",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "14px",
        pointerEvents: "auto", // Make sure button WILL receive pointer events
        zIndex: 1000, // Ensure button is on top
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      };

      return (
        <div key={selection.id} style={style}>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectionRemove(selection.id);
            }}
          >
            ×
          </button>
        </div>
      );
    });
  };

  // Draw the current selection rectangle while selecting
  const renderCurrentSelection = () => {
    if (!isSelecting) return null;

    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    return (
      <div
        style={{
          position: "absolute",
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: isCopyMode
            ? "rgba(0, 255, 0, 0.2)"
            : "rgba(0, 0, 255, 0.2)",
          border: `2px dashed ${isCopyMode ? "green" : "blue"}`,
        }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isCopyMode ? "cursor-copy" : "cursor-crosshair"} ${allowDrop ? "drop-target" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <img
        src={pageData.dataUrl}
        alt={`Page ${pageData.pageNumber}`}
        className="w-full h-auto"
        draggable={false}
      />

      {renderSelections()}
      {renderCurrentSelection()}
    </div>
  );
};

export default PDFSelectionTool;
