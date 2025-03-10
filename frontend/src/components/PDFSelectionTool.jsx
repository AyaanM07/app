import { useState, useRef, useEffect } from "react";

const PDFSelectionTool = ({ pageData, onSelectionComplete, existingSelections = [] }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [selections, setSelections] = useState(existingSelections);
  const containerRef = useRef(null);

  // Handle mouse events for selection
  const handleMouseDown = (e) => {
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
      rect.height
    );
    
    // Ignore very small selections (likely clicks)
    const MIN_SIZE = 10; // minimum 10px
    if (Math.abs(selectionEnd.x - selectionStart.x) > MIN_SIZE && 
        Math.abs(selectionEnd.y - selectionStart.y) > MIN_SIZE) {
      
      // Add new selection
      const newSelections = [...selections, {
        id: Date.now().toString(),
        ...selection,
        pageNumber: pageData.pageNumber
      }];
      
      setSelections(newSelections);
      
      // Notify parent component
      onSelectionComplete(newSelections);
    }
    
    setIsSelecting(false);
  };

  // Normalize selection coordinates (x, y, width, height) to be relative to the image size (0-1)
  const normalizeSelection = (x1, y1, x2, y2, containerWidth, containerHeight) => {
    const left = Math.min(x1, x2) / containerWidth;
    const top = Math.min(y1, y2) / containerHeight;
    const right = Math.max(x1, x2) / containerWidth;
    const bottom = Math.max(y1, y2) / containerHeight;
    
    return { 
      left, 
      top, 
      width: right - left, 
      height: bottom - top 
    };
  };

  // Remove a selection
  const handleSelectionRemove = (id) => {
    const newSelections = selections.filter(s => s.id !== id);
    setSelections(newSelections);
    onSelectionComplete(newSelections);
  };

  // Draw selections on the canvas
  const renderSelections = () => {
    if (!containerRef.current) return [];
    
    const rect = containerRef.current.getBoundingClientRect();
    return selections.map(selection => {
      const style = {
        position: 'absolute',
        left: `${selection.left * 100}%`,
        top: `${selection.top * 100}%`,
        width: `${selection.width * 100}%`,
        height: `${selection.height * 100}%`,
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        border: '2px dashed red',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end'
      };
      
      return (
        <div key={selection.id} style={style}>
          <button 
            onClick={() => handleSelectionRemove(selection.id)}
            className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center 
                       text-xs font-bold transform -translate-y-2 translate-x-2"
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
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
          border: '2px dashed blue'
        }}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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