import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { exchangeOAuthCode } from '../../redux/slices/authSlice';
import LoadingScreen from '../../components/common/LoadingScreen';
import { toast } from 'react-hot-toast';

const OAuthCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('OAuth Callback Params:', { code, state, error, errorDescription });

        if (error) {
            console.error('OAuth Error:', error, errorDescription);
            toast.error(errorDescription || 'OAuth failed');
            navigate('/login');
            return;
        }

        if (code) {
            const verifier = sessionStorage.getItem('oauth_verifier');
            const pdsUrl = sessionStorage.getItem('oauth_pds_url') || 'https://bsky.social';

            console.log('Session State:', { verifier: !!verifier, pdsUrl });
            console.log('Exchanging OAuth code:', code);

            dispatch(exchangeOAuthCode({
                code,
                verifier: verifier || '',
                pdsUrl,
                redirectUri: window.location.origin + '/oauth-callback'
            }))
                .unwrap()
                .then(() => {
                    toast.success('Successfully signed in!');
                    navigate('/');
                })
                .catch((err) => {
                    console.error('OAuth exchange error:', err);
                    toast.error(`Login failed: ${err || 'Unknown error'}`);
                    // Only navigate away after a short delay so the user can see the error
                    setTimeout(() => navigate('/login'), 2000);
                });

            // Clear verification data
            sessionStorage.removeItem('oauth_verifier');
        }
    }, [searchParams, dispatch, navigate]);

    return <LoadingScreen message="Syncing with Bluesky..." />;
};

export default OAuthCallbackPage;
