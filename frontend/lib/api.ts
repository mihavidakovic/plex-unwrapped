const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API client class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Public API
  async getWrappedStats(token: string) {
    return this.request(`/api/wrapped/${token}`);
  }

  async trackView(token: string) {
    return this.request(`/api/wrapped/${token}/view`, { method: 'POST' });
  }

  // Auth API
  async login(username: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(response.token);
    return response;
  }

  logout() {
    this.setToken(null);
  }

  // Admin API
  async getDashboardStats() {
    return this.request('/api/admin/dashboard');
  }

  async syncUsers() {
    return this.request('/api/admin/users/sync', { method: 'POST' });
  }

  async getUsers() {
    return this.request('/api/admin/users');
  }

  async getUser(id: number) {
    return this.request(`/api/admin/users/${id}`);
  }

  async previewUser(userId: number, year: number) {
    return this.request(`/api/admin/preview/${userId}/${year}`);
  }

  async generateWrapped(year?: number, userIds?: number[]) {
    return this.request('/api/admin/generate', {
      method: 'POST',
      body: JSON.stringify({ year, userIds }),
    });
  }

  async getGenerations() {
    return this.request('/api/admin/generations');
  }

  async getGeneration(id: number) {
    return this.request(`/api/admin/generations/${id}`);
  }

  async sendEmails(generationId: number, userIds?: number[], testMode?: boolean) {
    return this.request('/api/admin/emails/send', {
      method: 'POST',
      body: JSON.stringify({ generationId, userIds, testMode }),
    });
  }

  async getEmails(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request(`/api/admin/emails${query}`);
  }

  async getEmailsByGeneration(generationId: number) {
    return this.request(`/api/admin/emails/${generationId}`);
  }

  async sendUserEmail(userId: number) {
    return this.request(`/api/admin/users/${userId}/send-email`, {
      method: 'POST',
    });
  }

  async updateUserLanguage(userId: number, language: string) {
    return this.request(`/api/admin/users/${userId}/language`, {
      method: 'PATCH',
      body: JSON.stringify({ preferred_language: language }),
    });
  }

  // Health API
  async getHealth() {
    return this.request('/api/health');
  }

  async getDetailedHealth() {
    return this.request('/api/health/detailed');
  }

  // Logs API
  async getEmailLogs(limit?: number, status?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/admin/logs/email${query}`);
  }

  async getApplicationLogs(limit?: number, level?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (level) params.append('level', level);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/admin/logs/application${query}`);
  }

  async getLogFiles() {
    return this.request('/api/admin/logs/files');
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);
export default api;
