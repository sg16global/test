const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { headers, ...options });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  auth: {
    register: (data: any) =>
      api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) =>
      api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  },

  chat: (data: any) =>
    api.request('/chat', { method: 'POST', body: JSON.stringify(data) }),

  safety: (data: any) =>
    api.request('/safety/scan', { method: 'POST', body: JSON.stringify(data) }),

  student: {
    verify: (data: any) =>
      api.request('/student/verify', { method: 'POST', body: JSON.stringify(data) }),
    status: () => api.request('/student/status'),
  },
};
