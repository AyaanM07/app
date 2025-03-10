import { DataBookletMapping } from "../models/databooklet.mapping.js";
import pdfParse from "pdf-parse";
import { PDFDocument, rgb } from "pdf-lib";

// Regular expression patterns to find databooklet references
const DATA_BOOKLET_PATTERNS = [
  /(?:using|refer to|given in|from|in)\s+(?:section|sect\.)\s+(\d+(?:\.\d+)?)\s+(?:of|in)\s+(?:the|your|IB)\s+(?:data booklet|databooklet)/i,
  /(?:data booklet|databooklet)\s+(?:section|sect\.)\s+(\d+(?:\.\d+)?)/i,
  /(?:section|sect\.)\s+(\d+(?:\.\d+)?)\s+(?:of|in)\s+(?:the|your|IB)\s+(?:data booklet|databooklet)/i
];

// Main function to process PDF and find/replace data booklet references
export async function processDataBookletReferences(pdfBuffer) {
  try {
    // Parse the PDF text content
    const data = await pdfParse(pdfBuffer);
    const text = data.text;
    
    // Find all potential data booklet references
    const references = [];
    let match;
    
    for (const pattern of DATA_BOOKLET_PATTERNS) {
      const regex = new RegExp(pattern, 'gi');
      while ((match = regex.exec(text)) !== null) {
        const oldSectionNumber = match[1];
        const fullMatch = match[0];
        const position = match.index;
        
        references.push({
          oldSectionNumber,
          fullMatch,
          position,
          length: fullMatch.length
        });
      }
    }
    
    if (references.length === 0) {
      return {
        pdfBuffer,
        referencesFound: false,
        updates: []
      };
    }
    
    // Query database for each referenced section and map to new section number
    const updates = [];
    for (const ref of references) {
      // Find the mapping for this section number
      const mapping = await findMappingForSection(ref.oldSectionNumber);
      
      if (mapping) {
        // Get the section number from latest version
        const latestMapping = mapping.mappings.find(m => m.version === mapping.latestVersion);
        
        if (latestMapping && latestMapping.sectionNumber !== ref.oldSectionNumber) {
          updates.push({
            oldReference: ref.fullMatch,
            oldSectionNumber: ref.oldSectionNumber,
            newSectionNumber: latestMapping.sectionNumber,
            topic: mapping.topic,
            position: ref.position,
            status: 'updated'
          });
        }
      } else {
        // No mapping found, section might have been removed in newer versions
        updates.push({
          oldReference: ref.fullMatch,
          oldSectionNumber: ref.oldSectionNumber,
          newSectionNumber: null,
          topic: null,
          position: ref.position,
          status: 'not_found'
        });
      }
    }
    
    // If no updates needed, return original buffer
    if (updates.every(u => u.status !== 'updated')) {
      return {
        pdfBuffer,
        referencesFound: references.length > 0,
        updates
      };
    }
    
    // Create modified PDF with annotations for the updated references
    const modifiedPdfBuffer = await annotatePdfWithUpdates(pdfBuffer, updates);
    
    return {
      pdfBuffer: modifiedPdfBuffer,
      referencesFound: true,
      updates
    };
  } catch (error) {
    console.error("Error processing data booklet references:", error);
    throw error;
  }
}

// Find mapping for a given section number
async function findMappingForSection(sectionNumber) {
  // Try to find a mapping where this section number exists in any version
  return await DataBookletMapping.findOne({
    "mappings.sectionNumber": sectionNumber
  });
}

// Add annotations to PDF for updated references
async function annotatePdfWithUpdates(pdfBuffer, updates) {
  // Implementation will depend on exact PDF manipulation requirements
  // This is a placeholder that would highlight changes
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // For each update, we would:
  // 1. Find the page containing the reference
  // 2. Add an annotation or highlight
  // 3. Replace the text if possible
  
  // Return the modified PDF
  return await pdfDoc.save();
}

// Setup initial database with data booklet mappings
export async function setupInitialDataBookletMappings() {
  const count = await DataBookletMapping.countDocuments();
  
  if (count === 0) {
    console.log("Setting up initial data booklet mappings...");
    
    // Example mappings
    const initialMappings = [
      {
        topic: "Standard Electrode Potentials",
        mappings: [
          { version: "2016", sectionNumber: "24" },
          { version: "2020", sectionNumber: "29" },
          { version: "2022", sectionNumber: "31" }
        ],
        latestVersion: "2022"
      },
      // Add more mappings as needed
    ];
    
    await DataBookletMapping.insertMany(initialMappings);
    console.log("Initial data booklet mappings created");
  }
}