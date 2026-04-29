/**
 * Since tokens are now HttpOnly cookies managed by the backend,
 * we can no longer check expiration via JS. We rely on API 401s.
 */
function isTokenExpired(): boolean {
    return false;
}

/**
 * Manually logs out the user by clearing local storage and redirecting.
 * The server handles actual token clearing via the /auth/logout endpoint 
 * or by issuing expired cookies.
 */
function logout() {
    localStorage.removeItem('home_active_tab');
    window.location.href = '/login';
}

export { isTokenExpired, logout };
