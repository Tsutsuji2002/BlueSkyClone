// Simple memory cache for token expiration
let cachedToken: string | null = null;
let cachedExpirationTime: number | null = null;

/**
 * Checks if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
    if (!token) return true;

    // Use cached expiration if token hasn't changed
    if (token === cachedToken && cachedExpirationTime !== null) {
        const currentTime = Math.floor(Date.now() / 1000);
        return cachedExpirationTime < currentTime;
    }

    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        if (!payload || !payload.exp) return true;

        // Cache the result
        cachedToken = token;
        cachedExpirationTime = payload.exp;

        // exp is in seconds, convert now to seconds
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    } catch (e) {
        console.error('Error parsing token:', e);
        return true; // If invalid format, treat as expired
    }
}

/**
 * Manually logs out the user by clearing local storage and redirecting
 */
function logout() {
    cachedToken = null;
    cachedExpirationTime = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
}

export { isTokenExpired, logout };
