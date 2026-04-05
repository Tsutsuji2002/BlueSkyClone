import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../constants';
import { User } from '../types';
import { useAppSelector } from './useAppSelector';
import { RootState } from '../redux/store';

type VerifiedFollowStatus = {
    isFollowing: boolean;
    followingReference?: string;
};

const PROFILE_STATUS_CONCURRENCY = 6;

const getStatusKey = (user: Pick<User, 'id' | 'did'>) => user.did || user.id;
const getStatusActor = (user: Pick<User, 'id' | 'did' | 'handle'>) => user.handle || user.did || user.id;

const buildStatusFromUser = (user: User): VerifiedFollowStatus => ({
    isFollowing: Boolean(user.isFollowing ?? user.viewer?.following),
    followingReference: user.followingReference || user.viewer?.following || undefined,
});

export const useVerifiedFollowStatuses = (users: User[], ownerKey?: string) => {
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [verifiedStatuses, setVerifiedStatuses] = useState<Record<string, VerifiedFollowStatus>>({});
    const [loadingStatuses, setLoadingStatuses] = useState<Record<string, boolean>>({});
    const requestGeneration = useRef(0);
    const inFlightKeys = useRef<Set<string>>(new Set());
    const verifiedStatusesRef = useRef<Record<string, VerifiedFollowStatus>>({});
    const viewerKey = currentUser?.did || currentUser?.id || '';

    useEffect(() => {
        requestGeneration.current += 1;
        inFlightKeys.current.clear();
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

            return !isCurrentUser && !!actor && !verifiedStatusesRef.current[statusKey] && !inFlightKeys.current.has(statusKey);
        });
    }, [currentUser, users]);

    useEffect(() => {
        if (!currentUser || verificationTargets.length === 0) {
            return;
        }

        const generation = requestGeneration.current;
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};

        if (token && token !== 'null') {
            headers.Authorization = `Bearer ${token}`;
        }

        const queue = [...verificationTargets];
        const workerCount = Math.min(PROFILE_STATUS_CONCURRENCY, queue.length);

        const worker = async () => {
            while (queue.length > 0) {
                const user = queue.shift();
                if (!user) {
                    return;
                }

                const statusKey = getStatusKey(user);
                const actor = getStatusActor(user);

                inFlightKeys.current.add(statusKey);
                setLoadingStatuses((prev) => prev[statusKey] ? prev : { ...prev, [statusKey]: true });

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/users/profile/${encodeURIComponent(actor)}`,
                        { headers }
                    );

                    const data = await response.json();
                    if (!response.ok || generation !== requestGeneration.current) {
                        continue;
                    }

                    const profileUser = data?.user || {};
                    const nextStatus: VerifiedFollowStatus = {
                        isFollowing: Boolean(data?.isFollowing ?? profileUser?.isFollowing ?? profileUser?.viewer?.following),
                        followingReference: profileUser?.followingReference || profileUser?.viewer?.following || undefined,
                    };

                    setVerifiedStatuses((prev) => {
                        const next = {
                            ...prev,
                            [statusKey]: nextStatus,
                        };
                        verifiedStatusesRef.current = next;
                        return next;
                    });
                } catch {
                    if (generation === requestGeneration.current) {
                        const fallbackStatus = buildStatusFromUser(user);
                        setVerifiedStatuses((prev) => {
                            const next = {
                                ...prev,
                                [statusKey]: fallbackStatus,
                            };
                            verifiedStatusesRef.current = next;
                            return next;
                        });
                    }
                } finally {
                    inFlightKeys.current.delete(statusKey);
                    setLoadingStatuses((prev) => {
                        if (!prev[statusKey]) {
                            return prev;
                        }

                        const next = { ...prev };
                        delete next[statusKey];
                        return next;
                    });
                }
            }
        };

        void Promise.all(Array.from({ length: workerCount }, () => worker()));
    }, [currentUser, verificationTargets]);

    const resolveIsFollowing = (user: User) => {
        const statusKey = getStatusKey(user);
        return verifiedStatuses[statusKey]?.isFollowing ?? !!user.isFollowing;
    };

    const resolveFollowingReference = (user: User) => {
        const statusKey = getStatusKey(user);
        return verifiedStatuses[statusKey]?.followingReference ?? user.followingReference;
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
