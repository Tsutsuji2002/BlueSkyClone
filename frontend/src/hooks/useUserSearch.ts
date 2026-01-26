import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../constants';
import { User } from '../types';

export const useUserSearch = (query: string, delay: number = 300) => {
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query || query.length < 1) {
            setResults([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/user/search?q=${encodeURIComponent(query)}&limit=5`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();
                console.log('User search results:', data);
                setResults(data);
            } catch (err: any) {
                console.error('User search error:', err);
                setError(err.message);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, delay);

        return () => clearTimeout(handler);
    }, [query, delay]);

    return { results, isLoading, error };
};
