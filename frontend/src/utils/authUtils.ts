export const checkIsAdmin = (user: any): boolean => {
    return user && user.role === 'admin';
};
