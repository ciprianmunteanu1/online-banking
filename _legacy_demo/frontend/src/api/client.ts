import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const { data } = await api.post('/auth/refresh');
                    localStorage.setItem('accessToken', data.accessToken);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                    return api(originalRequest);
                }
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    },
);

// ─── Auth API ────────────────────────────────────────────────────

export const authApi = {
    register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
        api.post('/auth/register', data),

    login: (data: { email: string; password: string; mfaCode?: string; deviceInfo?: string }) =>
        api.post('/auth/login', data),

    mfaLogin: (data: { tempToken: string; mfaCode: string; deviceInfo?: string }) =>
        api.post('/auth/mfa/login', data),

    setupMfa: () => api.post('/auth/mfa/setup'),
    enableMfa: (code: string) => api.post('/auth/mfa/enable', { code }),
    disableMfa: (code: string) => api.post('/auth/mfa/disable', { code }),
    verifyStepUp: (code: string) => api.post('/auth/mfa/verify-step-up', { code }),

    getProfile: () => api.get('/auth/profile'),
    getSessions: () => api.get('/auth/sessions'),
    revokeSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),
    revokeAllSessions: () => api.delete('/auth/sessions'),
    refreshToken: () => api.post('/auth/refresh'),
};

// ─── Accounts API ────────────────────────────────────────────────

export const accountsApi = {
    getAccounts: () => api.get('/accounts'),
    getAccount: (id: string) => api.get(`/accounts/${id}`),
    createAccount: (data: { currency: string; accountType: string }) =>
        api.post('/accounts', data),
};

// ─── Transactions API ────────────────────────────────────────────

export const transactionsApi = {
    createTransfer: (data: {
        sourceAccountId: string;
        destinationIban: string;
        amount: number;
        currency: string;
        idempotencyKey: string;
        description?: string;
    }) => api.post('/transactions/transfer', data),

    createMerchantPayment: (data: {
        sourceAccountId: string;
        merchantName: string;
        amount: number;
        currency: string;
        idempotencyKey: string;
    }) => api.post('/transactions/merchant-payment', data),

    getTransactions: (page?: number, limit?: number) =>
        api.get('/transactions', { params: { page, limit } }),

    getTransaction: (id: string) => api.get(`/transactions/${id}`),
};

// ─── Cards API ───────────────────────────────────────────────────

export const cardsApi = {
    getAllCards: () => api.get('/cards'),
    getCardsByAccount: (accountId: string) => api.get(`/cards/account/${accountId}`),
    createCard: (accountId: string) => api.post(`/cards/account/${accountId}`),
    blockCard: (cardId: string) => api.patch(`/cards/${cardId}/block`),
    reactivateCard: (cardId: string) => api.patch(`/cards/${cardId}/reactivate`),
};

// ─── Statements API ─────────────────────────────────────────────

export const statementsApi = {
    getStatement: (accountId: string, from: string, to: string) =>
        api.get('/statements', { params: { accountId, from, to } }),
};

// ─── Admin API ──────────────────────────────────────────────────

export const adminApi = {
    getAuditLogs: (params?: { page?: number; limit?: number; severity?: string }) =>
        api.get('/admin/audit-logs', { params }),

    getSuspiciousTransactions: (params?: { page?: number; limit?: number }) =>
        api.get('/admin/suspicious-transactions', { params }),
};

export default api;
