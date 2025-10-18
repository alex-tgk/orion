import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * API Service
 *
 * Centralized API client for all HTTP requests.
 */
class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/admin/login';
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  /**
   * Load token from storage
   */
  loadToken(): string | null {
    const token = localStorage.getItem('admin_token');
    if (token) {
      this.token = token;
    }
    return token;
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.post<{ token: string; user: any }>('/api/auth/login', {
      email,
      password,
    });
    this.setToken(response.token);
    return response;
  }

  async logout() {
    await this.post('/api/auth/logout');
    this.clearToken();
  }

  async refreshToken() {
    const response = await this.post<{ token: string }>('/api/auth/refresh');
    this.setToken(response.token);
    return response;
  }

  // System endpoints
  getSystemStatus() {
    return this.get('/api/system/status');
  }

  getSystemStats() {
    return this.get('/api/system/stats');
  }

  getSystemHealth() {
    return this.get('/api/system/health/summary');
  }

  // Services endpoints
  getServices() {
    return this.get('/api/services');
  }

  getService(name: string) {
    return this.get(`/api/services/${name}`);
  }

  getServiceHealth(name: string) {
    return this.get(`/api/services/${name}/health`);
  }

  getServiceMetrics(name: string, timeRange?: { start: Date; end: Date }) {
    const params = timeRange
      ? { start: timeRange.start.toISOString(), end: timeRange.end.toISOString() }
      : {};
    return this.get(`/api/services/${name}/metrics`, { params });
  }

  // Events endpoints
  getEvents(filters?: {
    type?: string;
    service?: string;
    severity?: string;
    limit?: number;
  }) {
    return this.get('/api/events', { params: filters });
  }

  getRecentEvents(limit = 50) {
    return this.get('/api/events/recent', { params: { limit } });
  }

  getCriticalEvents() {
    return this.get('/api/events/critical');
  }

  // Users endpoints
  getUsers(params?: { page?: number; limit?: number; search?: string }) {
    return this.get('/api/users', { params });
  }

  getUser(id: string) {
    return this.get(`/api/users/${id}`);
  }

  createUser(data: any) {
    return this.post('/api/users', data);
  }

  updateUser(id: string, data: any) {
    return this.patch(`/api/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.delete(`/api/users/${id}`);
  }

  // Roles endpoints
  getRoles() {
    return this.get('/api/roles');
  }

  getRole(id: string) {
    return this.get(`/api/roles/${id}`);
  }

  createRole(data: any) {
    return this.post('/api/roles', data);
  }

  updateRole(id: string, data: any) {
    return this.patch(`/api/roles/${id}`, data);
  }

  deleteRole(id: string) {
    return this.delete(`/api/roles/${id}`);
  }

  // Configuration endpoints
  getConfig(key?: string) {
    return key ? this.get(`/api/config/${key}`) : this.get('/api/config');
  }

  updateConfig(key: string, value: any) {
    return this.put(`/api/config/${key}`, { value });
  }

  // Settings endpoints
  getSettings() {
    return this.get('/api/settings');
  }

  updateSettings(settings: any) {
    return this.put('/api/settings', settings);
  }

  // Logs endpoints
  getLogs(filters?: {
    service?: string;
    level?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.get('/api/logs', { params: filters });
  }

  streamLogs(service?: string) {
    const params = service ? { service } : {};
    return this.get('/api/logs/stream', { params });
  }

  // Metrics endpoints
  getMetrics(metric: string, timeRange?: { start: Date; end: Date }) {
    const params = timeRange
      ? { start: timeRange.start.toISOString(), end: timeRange.end.toISOString() }
      : {};
    return this.get(`/api/metrics/${metric}`, { params });
  }

  getMetricsList() {
    return this.get('/api/metrics');
  }
}

// Export singleton instance
export const api = new ApiService();

// Also export the class for testing
export default ApiService;