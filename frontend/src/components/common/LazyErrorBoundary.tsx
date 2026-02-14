import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class LazyErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Lazy loading error caught:', error, errorInfo);

        // Handle ChunkLoadError with a limited number of automatic reloads
        if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
            const reloadCount = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10);
            if (reloadCount < 3) {
                sessionStorage.setItem('chunk_reload_count', (reloadCount + 1).toString());
                window.location.reload();
            } else {
                console.warn('Max reload attempts reached for ChunkLoadError.');
                sessionStorage.removeItem('chunk_reload_count');
            }
        }
    }

    public render() {
        if (this.state.hasError) {
            // Fallback UI or it might have already reloaded
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white dark:bg-dark-bg">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">Something went wrong.</h2>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default LazyErrorBoundary;
