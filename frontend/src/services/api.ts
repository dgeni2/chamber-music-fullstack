// API Service for Frontend-Backend Communication

// Use relative URL when served from same origin, fallback to localhost for dev
const API_URL = import.meta.env.VITE_API_URL || '';

export interface HarmonizeParams {
  file: File;
  instruments: string[];
  style?: string;
  difficulty?: string;
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
  metadata: {
    instruments: string[];
    style?: string;
    difficulty?: string;
    processingTime: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

export class ApiService {
  static async harmonize(params: HarmonizeParams): Promise<HarmonizeResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('instruments', params.instruments.join(','));
    
    if (params.style) {
      formData.append('style', params.style);
    }
    
    if (params.difficulty) {
      formData.append('difficulty', params.difficulty);
    }

    try {
      const response = await fetch(`${API_URL}/api/harmonize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to harmonize file');
    }
  }

  static async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error('Backend server is not responding');
    }
  }
}
