/**
 * Vercel Serverless Function for Harmonization API
 * Handles file uploads and harmonization requests
 */

import { DOMParser } from '@xmldom/xmldom';

// Vercel serverless function config
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
  maxDuration: 60, // Maximum execution time: 60 seconds
};

/**
 * Main handler for the harmonization API
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: 'Only POST requests are accepted'
    });
  }

  const startTime = Date.now();

  try {
    // Parse multipart form data manually for Vercel
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Invalid content type',
        details: 'Expected multipart/form-data'
      });
    }

    // Parse the multipart form data
    const formData = await parseMultipartForm(req);

    if (!formData.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        details: 'Please upload a MusicXML file'
      });
    }

    if (!formData.instruments) {
      return res.status(400).json({
        error: 'Missing instruments parameter',
        details: 'Please specify instruments as comma-separated list'
      });
    }

    // Convert buffer to string
    const xmlContent = formData.file.toString('utf-8');

    // Parse instruments
    const instruments = formData.instruments
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);

    if (instruments.length === 0) {
      return res.status(400).json({
        error: 'No instruments specified',
        details: 'Please select at least one instrument'
      });
    }

    if (instruments.length > 4) {
      return res.status(400).json({
        error: 'Too many instruments',
        details: 'Maximum 4 instruments allowed'
      });
    }

    // Validate XML content
    if (!xmlContent || xmlContent.trim().length === 0) {
      return res.status(400).json({
        error: 'File is empty',
        details: 'The uploaded file contains no data'
      });
    }

    if (!xmlContent.includes("<score-partwise") && !xmlContent.includes("<score-timewise")) {
      return res.status(400).json({
        error: 'Invalid MusicXML format',
        details: 'File must be a valid MusicXML document'
      });
    }

    console.log(`[Harmonize] Processing file: ${formData.filename}`);
    console.log(`[Harmonize] Instruments: ${instruments.join(', ')}`);
    console.log(`[Harmonize] File size: ${(formData.file.length / 1024).toFixed(2)} KB`);

    // Import and call harmonization directly
    const { POST: harmonizeHandler } = await import('../backend/src/adapters/nextjs-adapter.js');
    
    // Create a minimal request object that works with the handler
    const mockRequest = {
      formData: async () => {
        return {
          get: (key) => {
            if (key === 'file') {
              return {
                name: formData.filename,
                text: async () => xmlContent
              };
            } else if (key === 'instruments') {
              return formData.instruments;
            }
            return null;
          }
        };
      }
    };

    // Call the harmonization handler
    const response = await harmonizeHandler(mockRequest);
    
    // Extract response data
    const responseData = await response.json();

    // Check if there was an error
    if (!response.ok) {
      return res.status(response.status).json(responseData);
    }

    // Add metadata
    const processingTime = Date.now() - startTime;

    const enrichedResponse = {
      ...responseData,
      metadata: {
        instruments: instruments,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        originalFilename: formData.filename
      }
    };

    console.log(`[Harmonize] Success in ${processingTime}ms`);

    res.status(200).json(enrichedResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('[Harmonize] Error:', error.message);
    console.error('[Harmonize] Stack:', error.stack);

    res.status(500).json({
      error: 'Harmonization failed',
      details: error.message,
      metadata: {
        processingTime: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Simple multipart/form-data parser for Vercel
 * Extracts file buffer and form fields
 */
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
        
        if (!boundaryMatch) {
          return reject(new Error('No boundary found in Content-Type'));
        }
        
        const boundary = boundaryMatch[1] || boundaryMatch[2];
        const parts = parseMultipartBuffer(buffer, boundary);
        
        resolve(parts);
      } catch (error) {
        reject(error);
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Parse multipart buffer into form fields and file
 */
function parseMultipartBuffer(buffer, boundary) {
  const result = {
    file: null,
    filename: null,
    instruments: null
  };
  
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;
  
  // Find all boundary positions
  while (true) {
    const pos = buffer.indexOf(boundaryBuffer, start);
    if (pos === -1) break;
    
    if (start > 0) {
      parts.push(buffer.slice(start, pos));
    }
    
    start = pos + boundaryBuffer.length;
  }
  
  // Parse each part
  for (const part of parts) {
    // Find the headers/content separator (double CRLF)
    const separatorPos = part.indexOf('\r\n\r\n');
    if (separatorPos === -1) continue;
    
    const headers = part.slice(0, separatorPos).toString('utf-8');
    const content = part.slice(separatorPos + 4, part.length - 2); // Remove trailing CRLF
    
    // Parse Content-Disposition header
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    
    const fieldName = nameMatch[1];
    
    if (fieldName === 'file') {
      // Extract filename
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      result.filename = filenameMatch ? filenameMatch[1] : 'uploaded-file.xml';
      result.file = content;
    } else if (fieldName === 'instruments') {
      result.instruments = content.toString('utf-8');
    }
  }
  
  return result;
}

