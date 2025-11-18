/**
 * Express route adapter for harmonization API
 * Wraps the Next.js harmonization logic and adds metadata
 */

import { POST as nextJsHandler } from '../adapters/nextjs-adapter.js';

export async function harmonizeRoute(req, res) {
  const startTime = Date.now();

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        details: 'Please upload a MusicXML file'
      });
    }

    // Validate instruments parameter
    if (!req.body.instruments) {
      return res.status(400).json({
        error: 'Missing instruments parameter',
        details: 'Please specify instruments as comma-separated list'
      });
    }

    // Parse instruments
    const instruments = req.body.instruments
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

    // Convert Express request to Next.js compatible format
    const mockNextRequest = {
      formData: async () => {
        const formData = new FormData();

        // Create File object from buffer
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        const file = new File([blob], req.file.originalname, { type: req.file.mimetype });

        formData.append('file', file);
        formData.append('instruments', req.body.instruments);

        return formData;
      }
    };

    console.log(`[Harmonize] Processing file: ${req.file.originalname}`);
    console.log(`[Harmonize] Instruments: ${instruments.join(', ')}`);
    console.log(`[Harmonize] File size: ${(req.file.buffer.length / 1024).toFixed(2)} KB`);

    // Call the Next.js handler
    const nextResponse = await nextJsHandler(mockNextRequest);

    // Extract response data
    const responseData = await nextResponse.json();

    // Check if there was an error
    if (!nextResponse.ok) {
      return res.status(nextResponse.status).json(responseData);
    }

    // Add metadata to match frontend expectations
    const processingTime = Date.now() - startTime;

    const enrichedResponse = {
      ...responseData,
      metadata: {
        instruments: instruments,
        processingTime: processingTime,
        timestamp: new Date().toISOString(),
        originalFilename: req.file.originalname
      }
    };

    console.log(`[Harmonize] Success in ${processingTime}ms`);

    res.json(enrichedResponse);

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
