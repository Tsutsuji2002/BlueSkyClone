const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

const api = {
    get: async <T>(url: string) => {
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
        }
    },
    pageContent: {
        get: (slug: string) => api.get<any>(`/PageContent/${slug}`),
        update: (slug: string, body: any) => api.put<void>(`/PageContent/${slug}`, body)
    }
};

export default api;
