const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const getHeaders = () => {
    return {
        'Content-Type': 'application/json'
    };
};

const handleResponse = async (response: Response) => {
    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.message || 'Something went wrong');
    }
    return { data };
};

// Throttling guard to prevent rapid redundant requests (Infinite Loops)
const lastGets = new Map<string, number>();
const RECENT_WINDOW_MS = 500;

const api = {
    get: async <T>(url: string) => {
        const now = Date.now();
        const last = lastGets.get(url) || 0;
        
        if (now - last < RECENT_WINDOW_MS) {
            console.warn(`[API] Throttling redundant request to: ${url}`);
            // Return a dummy promise or try to wait? 
            // For now, we wait to break the loop's tight cycle
            await new Promise(resolve => setTimeout(resolve, RECENT_WINDOW_MS));
        }
        lastGets.set(url, Date.now());

        const response = await fetch(`${API_URL}${url}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        return handleResponse(response) as Promise<{ data: T }>;
    },
    post: async <T>(url: string, body?: any) => {
        const response = await fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        return handleResponse(response) as Promise<{ data: T }>;
    },
    put: async <T>(url: string, body?: any) => {
        const response = await fetch(`${API_URL}${url}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        return handleResponse(response) as Promise<{ data: T }>;
    },
    delete: async <T>(url: string) => {
        const response = await fetch(`${API_URL}${url}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response) as Promise<{ data: T }>;
    },
    search: {
        posts: async (query: string, skip: number = 0, take: number = 20) => {
            const response = await fetch(`${API_URL}/search/posts?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                method: 'GET',
                headers: getHeaders(),
            });
            return handleResponse(response) as Promise<{ data: any[] }>;
        },
        users: async (query: string, skip: number = 0, take: number = 20) => {
            const response = await fetch(`${API_URL}/search/users?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                method: 'GET',
                headers: getHeaders(),
            });
            return handleResponse(response) as Promise<{ data: any[] }>;
        },
        feeds: async (query: string, skip: number = 0, take: number = 20) => {
            const response = await fetch(`${API_URL}/feeds/search?query=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                method: 'GET',
                headers: getHeaders(),
            });
            return handleResponse(response) as Promise<{ data: any[] }>;
        }
    },
    pageContent: {
        get: (slug: string) => api.get<{ title: string; htmlContent: string }>(`/PageContent/${slug}`).then(res => res.data),
        update: (slug: string, body: { title: string; htmlContent: string }) => api.put<void>(`/PageContent/${slug}`, body)
    }
};

export default api;
