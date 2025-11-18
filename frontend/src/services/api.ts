/**
 * API Service for HarmonyForge Backend
 * Handles all communication with the harmonization API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface HarmonizeParams {
  file: File;
  instruments: string[];
}

export interface HarmonizeResponse {
  harmonyOnly: {
    content: string;
    filename: string;
  };
  combined: {
    content: string;
    filename: string;
  };
  metadata?: {
    instruments: string[];
    processingTime: number;
    timestamp: string;
    originalFilename: string;
  };
}

export interface ApiError {
  error: string;
  details?: string;
  metadata?: {
    processingTime: number;
    timestamp: string;
  };
}

export class ApiService {
  /**
   * Harmonize a melody with selected instruments
   */
  static async harmonize(params: HarmonizeParams): Promise<HarmonizeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('instruments', params.instruments.join(','));

    console.log('[API] Sending harmonization request:', {
      filename: params.file.name,
      instruments: params.instruments,
      fileSize: `${(params.file.size / 1024).toFixed(2)} KB`
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/harmonize`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        console.error('[API] Harmonization failed:', error);
        throw new Error(error.details || error.error || `Server error: ${response.status}`);
      }

      console.log('[API] Harmonization successful:', data.metadata);
      return data as HarmonizeResponse;

    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a network error
        if (error.message === 'Failed to fetch') {
          throw new Error(
            `Cannot connect to backend server at ${API_BASE_URL}. ` +
            'Please ensure the backend server is running.'
          );
        }
        throw error;
      }
      throw new Error('Unknown error occurred during harmonization');
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] Health check failed:', error);
      throw error;
    }
  }
}

// Export a convenience function for checking API connection
export async function checkApiConnection(): Promise<boolean> {
  try {
    await ApiService.healthCheck();
    return true;
  } catch {
    return false;
  }
}
