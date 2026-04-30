import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../constants';
import { User } from '../types';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { RootState } from '../redux/store';
import { setVerifiedStatus } from '../redux/slices/suggestionsSlice';

type VerifiedFollowStatus = {
    isFollowing: boolean;
    followingReference?: string;
};

const getStatusKey = (user: Pick<User, 'id' | 'did'>) => user.did || user.id;
const getStatusActor = (user: Pick<User, 'id' | 'did' | 'handle'>) => user.handle || user.did || user.id;

const buildStatusFromUser = (user: User): VerifiedFollowStatus => ({
    isFollowing: Boolean(user.isFollowing ?? user.viewer?.following),
    followingReference: user.followingReference || user.viewer?.following || undefined,
});

export const useVerifiedFollowStatuses = (users: User[], ownerKey?: string) => {
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const reduxFollowStatuses = useAppSelector((state: RootState) => state.suggestions.followStatuses);
    const dispatch = useAppDispatch();
    const [verifiedStatuses, setVerifiedStatuses] = useState<Record<string, VerifiedFollowStatus>>({});
    const [loadingStatuses, setLoadingStatuses] = useState<Record<string, boolean>>({});
    const requestGeneration = useRef(0);
    const inFlightKeys = useRef<Set<string>>(new Set());
    const verifiedKeysRef = useRef<Set<string>>(new Set());
    const verifiedStatusesRef = useRef<Record<string, VerifiedFollowStatus>>({});
    const viewerKey = currentUser?.did || currentUser?.id || '';

    // Initialize/sync local state from props initially for immediate feedback
    useEffect(() => {
        const initial = { ...verifiedStatusesRef.current };
        users.forEach(user => {
            const key = getStatusKey(user);
            if (!initial[key]) {
                initial[key] = buildStatusFromUser(user);
            }
        });
        setVerifiedStatuses(initial);
        verifiedStatusesRef.current = initial;
    }, [users]);

    useEffect(() => {
        requestGeneration.current += 1;
        inFlightKeys.current.clear();
        verifiedKeysRef.current.clear();
        verifiedStatusesRef.current = {};
        setVerifiedStatuses({});
        setLoadingStatuses({});
    }, [ownerKey, viewerKey]);

    const verificationTargets = useMemo(() => {
        if (!currentUser) {
            return [];
        }

        return users.filter((user) => {
            const statusKey = getStatusKey(user);
            const actor = getStatusActor(user);
            const isCurrentUser = user.id === currentUser.id || (!!currentUser.did && user.did === currentUser.did);

            // Only verify if not already in flight or successfully verified in this session
            return !isCurrentUser && !!actor && !inFlightKeys.current.has(statusKey) && !verifiedKeysRef.current.has(statusKey);
        });
    }, [currentUser, users]);

    useEffect(() => {
        if (!currentUser || verificationTargets.length === 0) {
            return;
        }

        const generation = requestGeneration.current;
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (token && token !== 'null') {
            headers.Authorization = `Bearer ${token}`;
        }

        // Batch processing: Process users in groups of 25 (BSky standard batch size)
        const processBatch = async (batch: User[]) => {
            const batchKeys = batch.map(getStatusKey);
            const batchActors = batch.map(getStatusActor);
            
            batchKeys.forEach(k => inFlightKeys.current.add(k));
            setLoadingStatuses(prev => {
                const next = { ...prev };
                batchKeys.forEach(k => next[k] = true);
                return next;
            });

            try {
                const actorsQuery = batchActors.map(a => `actors=${encodeURIComponent(a)}`).join('&');
                const response = await fetch(
                    `${API_BASE_URL}/xrpc/app.bsky.actor.getProfiles?${actorsQuery}`,
                    { headers }
                );

                if (!response.ok || generation !== requestGeneration.current) {
                    return;
                }

                const data = await response.json();
                const profiles = data.profiles || [];
                const profileByActor = new Map();
                
                profiles.forEach((p: any) => {
                    if (p.did) profileByActor.set(p.did, p);
                    if (p.handle) profileByActor.set(p.handle, p);
                });

                const newStatuses: Record<string, VerifiedFollowStatus> = {};
                
                batch.forEach(user => {
                    const actor = getStatusActor(user);
                    const statusKey = getStatusKey(user);
                    const profile = profileByActor.get(actor);
                    
                    if (profile) {
                        const nextStatus: VerifiedFollowStatus = {
                            isFollowing: Boolean(profile.viewer?.following || profile.isFollowing),
                            followingReference: profile.viewer?.following || undefined,
                        };
                        newStatuses[statusKey] = nextStatus;
                        
                        // Sync with Redux
                        dispatch(setVerifiedStatus({
                            did: profile.did,
                            isFollowing: nextStatus.isFollowing,
                            followUri: nextStatus.followingReference
                        }));
                    }
                });

                setVerifiedStatuses((prev) => {
                    const next = { ...prev, ...newStatuses };
                    verifiedStatusesRef.current = next;
                    Object.keys(newStatuses).forEach(k => verifiedKeysRef.current.add(k));
                    return next;
                });
            } catch (err) {
                console.error("Batch verification failed", err);
            } finally {
                batchKeys.forEach(k => inFlightKeys.current.delete(k));
                setLoadingStatuses(prev => {
                    const next = { ...prev };
                    batchKeys.forEach(k => delete next[k]);
                    return next;
                });
            }
        };

        // Split targets into chunks of 25
        const CHUNK_SIZE = 25;
        const targetsToProcess = [...verificationTargets];
        for (let i = 0; i < targetsToProcess.length; i += CHUNK_SIZE) {
            const chunk = targetsToProcess.slice(i, i + CHUNK_SIZE);
            void processBatch(chunk);
        }
    }, [currentUser, verificationTargets, dispatch]);

    const resolveIsFollowing = (user: User) => {
        const statusKey = getStatusKey(user);
        // Prioritize Redux global state for synchronization between different lists/hovercards
        if (reduxFollowStatuses[statusKey] !== undefined) {
            return reduxFollowStatuses[statusKey].isFollowing;
        }
        return verifiedStatuses[statusKey]?.isFollowing ?? Boolean(user.isFollowing || user.viewer?.following);
    };

    const resolveFollowingReference = (user: User) => {
        const statusKey = getStatusKey(user);
        if (reduxFollowStatuses[statusKey]?.followUri !== undefined) {
            return reduxFollowStatuses[statusKey].followUri;
        }
        return verifiedStatuses[statusKey]?.followingReference ?? user.followingReference ?? user.viewer?.following;
    };

    const isVerifying = (user: User) => {
        const statusKey = getStatusKey(user);
        return !!loadingStatuses[statusKey];
    };

    const updateVerifiedStatus = (user: User, nextStatus: VerifiedFollowStatus) => {
        const statusKey = getStatusKey(user);
        inFlightKeys.current.delete(statusKey);
        setLoadingStatuses((prev) => {
            if (!prev[statusKey]) {
                return prev;
            }

            const next = { ...prev };
            delete next[statusKey];
            return next;
        });
        setVerifiedStatuses((prev) => {
            const next = {
                ...prev,
                [statusKey]: nextStatus,
            };
            verifiedStatusesRef.current = next;
            return next;
        });

        if (user.did) {
            dispatch(setVerifiedStatus({
                did: user.did,
                isFollowing: nextStatus.isFollowing,
                followUri: nextStatus.followingReference
            }));
        }
    };

    const hasVerifiedStatus = (user: User) => {
        const statusKey = getStatusKey(user);
        return !!verifiedStatuses[statusKey];
    };

    return {
        resolveIsFollowing,
        resolveFollowingReference,
        isVerifying,
        updateVerifiedStatus,
        hasVerifiedStatus,
    };
};
