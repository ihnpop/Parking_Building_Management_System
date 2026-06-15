const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Reusable HTTP Client Wrapper supporting automatic token injections
 */
class ApiClient {
  async request(path, options = {}) {
    const url = `${API_URL}${path}`;
    
    // Prepare headers with dynamic auth tokens
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const savedUser = localStorage.getItem('pbms_user');
    if (savedUser) {
      try {
        const { token } = JSON.parse(savedUser);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Failed to parse saved user token from localStorage');
      }
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.message || 'An error occurred during backend API fetch.');
      }

      return json;
    } catch (error) {
      console.error(`API Error on ${url}:`, error.message);
      throw error;
    }
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  put(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PUT', body });
  }

  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: 'PATCH', body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();

/**
 * Authentication Service Module
 */
export const authService = {
  login: async (email, password) => {
    return api.post('/auth/login', { email, password });
  },
  getProfile: async () => {
    return api.get('/auth/profile');
  }
};

/**
 * Slots Management Service Module
 */
export const slotService = {
  list: async (filters = {}) => {
    const cleaned = {};
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'ALL') cleaned[key] = filters[key];
    });
    const params = new URLSearchParams(cleaned).toString();
    return api.get(`/slots?${params}`);
  },
  get: async (id) => {
    return api.get(`/slots/${id}`);
  },
  updateStatus: async (id, status) => {
    return api.patch(`/slots/${id}/status`, { status });
  }
};

/**
 * Parking Session Gate Entry/Exit Service Module
 */
export const sessionService = {
  create: async (data) => {
    return api.post('/sessions', data);
  },
  close: async (id, paymentDetails) => {
    return api.post(`/sessions/${id}/close`, paymentDetails);
  },
  list: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return api.get(`/sessions?${params}`);
  }
};

/**
 * Analytics and Reporting Summary Service Module
 */
export const reportService = {
  getSummary: async (rangeDays = 30) => {
    return api.get(`/reports/summary?days=${rangeDays}`);
  },
  getRevenue: async (rangeDays = 30) => {
    return api.get(`/reports/revenue?days=${rangeDays}`);
  }
};
