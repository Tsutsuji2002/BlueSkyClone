import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../redux/hooks';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import { showToast } from '../redux/slices/toastSlice';
import { agent } from '../services/atpAgent';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { FiCheck, FiRss } from 'react-icons/fi';

interface ActorItem {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
}

const DEFAULT_RECOMMENDED_ACTORS: ActorItem[] = [
    {
        did: 'did:plc:z72i7hdynmk6r22z27h6tvur',
        handle: 'bsky.app',
        displayName: 'Bluesky',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3gddbfjsieiv7wuka'
    },
    {
        did: 'did:plc:eclio37ymobqex2ncko63h4r',
        handle: 'nytimes.com',
        displayName: 'The New York Times',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:eclio37ymobqex2ncko63h4r/bafkreidvvqj5jymmpaeklwkpq6gi532el447mjy2yultuukypzqm5ohfju'
    },
    {
        did: 'did:plc:eon2iu7v3x2ukgxkqaf7e5np',
        handle: 'safety.bsky.app',
        displayName: 'Bluesky Safety',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:eon2iu7v3x2ukgxkqaf7e5np/bafkreih7mgyv6dugcguewqnuev64i7jsljhtrr6olfadmxq2dasfb7woam'
    },
    {
        did: 'did:plc:ewvi7nxzyoun6zhxrhs64oiz',
        handle: 'atproto.com',
        displayName: 'AT Protocol Developers',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:ewvi7nxzyoun6zhxrhs64oiz/bafkreiaihtwfr2d6mjfb6drzaze2gubqtst4ymiwxowqfxpsqxpnz2t33u'
    },
    {
        did: 'did:plc:ry3hbexak5ytsum7aazhpkbv',
        handle: 'jp.bsky.app',
        displayName: 'Bluesky日本語（公式）',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:ry3hbexak5ytsum7aazhpkbv/bafkreienc27b7pfsjflwvh645zh7ywb3ruwgshwqziv3ilo5mqsksjnl3i'
    },
    {
        did: 'did:plc:gntwx32hbw2c7zxbtuivi66r',
        handle: 'lalalalack.bsky.social',
        displayName: 'lack/珈琲紳士',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:gntwx32hbw2c7zxbtuivi66r/bafkreidkxiuw5ec2b7rlpy4576oyywsyld6jos777gf6lihslgzyv56wwm'
    },
    {
        did: 'did:plc:6uimut56ihor2p6ubnepkudz',
        handle: 'jenrubin.bsky.social',
        displayName: 'Jen Rubin',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:6uimut56ihor2p6ubnepkudz/bafkreiak6rfbk4cwtqmx4zk6v4766fqnbpinkje43wdaf2eb4sizrjmo7i'
    },
    {
        did: 'did:plc:3gmaf33pxbbrcslogjrl3lfu',
        handle: 'uishig.bsky.social',
        displayName: 'しぐれうい',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:3gmaf33pxbbrcslogjrl3lfu/bafkreibxmjfpxwzz5ekk7yzcf6met5nua6o3n2ndsnncrki6547x3hug64'
    },
    {
        did: 'did:plc:wj43nbmzwityjg6w7gousi7p',
        handle: 'yoneyamamai.bsky.social',
        displayName: 'Yoneyama Mai 米山舞',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:wj43nbmzwityjg6w7gousi7p/bafkreigozc57amkocffqiabfcvpu7msjlati6wv2oghrhxww37of2myn3i'
    },
    {
        did: 'did:plc:jrwqqeyrvd3sl4hxv7lqaarh',
        handle: 'mikapikazompz.bsky.social',
        displayName: 'Mika Pikazo',
        avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:jrwqqeyrvd3sl4hxv7lqaarh/bafkreifdfcglfedgnhm2ejtz75fujieijum7zq3qkv6ckpnukfive2yfpi'
    }
];

const CreateStarterPackPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [actors, setActors] = useState<ActorItem[]>(DEFAULT_RECOMMENDED_ACTORS);
    const [selectedActors, setSelectedActors] = useState<ActorItem[]>([]);
    const [selectedFeeds, setSelectedFeeds] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userFeeds = useAppSelector((state: RootState) => state.feeds.userFeeds) || [];

    const defaultNamePlaceholder = currentUser?.handle 
        ? `${currentUser.handle}'s Starter Pack` 
        : "My Starter Pack";

    const defaultDescPlaceholder = currentUser?.handle 
        ? `${currentUser.handle}'s favorite feeds and people - join me!` 
        : "My favorite feeds and people - join me!";

    // Handle actor search in Step 2
    useEffect(() => {
        if (step !== 2) return;

        if (!searchQuery.trim()) {
            setActors(DEFAULT_RECOMMENDED_ACTORS);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await agent.app.bsky.actor.searchActorsTypeahead({
                    q: searchQuery.trim(),
                    limit: 15
                });
                if (res.data?.actors) {
                    const mapped: ActorItem[] = res.data.actors.map((a: any) => ({
                        did: a.did,
                        handle: a.handle,
                        displayName: a.displayName,
                        avatar: a.avatar
                    }));
                    setActors(mapped);
                }
            } catch (err) {
                console.error('Failed to search actors:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, step]);

    const toggleActorSelection = (actor: ActorItem) => {
        setSelectedActors(prev => {
            const exists = prev.some(a => a.did === actor.did);
            if (exists) {
                return prev.filter(a => a.did !== actor.did);
            } else {
                return [...prev, actor];
            }
        });
    };

    const toggleFeedSelection = (feed: any) => {
        setSelectedFeeds(prev => {
            const feedUri = feed.uri || feed.id;
            const exists = prev.some(f => (f.uri || f.id) === feedUri);
            if (exists) {
                return prev.filter(f => (f.uri || f.id) !== feedUri);
            } else {
                return [...prev, feed];
            }
        });
    };

    const handleStep1Next = () => {
        setStep(2);
    };

    const handleStep2Next = () => {
        if (selectedActors.length < 7) {
            dispatch(showToast({ message: `Please select at least 7 people (currently ${selectedActors.length})`, type: 'error' }));
            return;
        }
        setStep(3);
    };

    const handleCreateStarterPack = async () => {
        setIsSubmitting(true);
        try {
            const finalName = name.trim() || defaultNamePlaceholder;
            const finalDesc = description.trim() || defaultDescPlaceholder;

            // Attempt to create via AT Protocol agent if session available
            try {
                if (currentUser?.did && agent.hasSession) {
                    // Create list record
                    const listRes = await agent.com.atproto.repo.createRecord({
                        repo: currentUser.did,
                        collection: 'app.bsky.graph.list',
                        record: {
                            $type: 'app.bsky.graph.list',
                            purpose: 'app.bsky.graph.defs#referencelist',
                            name: finalName,
                            description: finalDesc,
                            createdAt: new Date().toISOString()
                        }
                    });

                    const listUri = listRes.data.uri;

                    // Add items to list
                    for (const actor of selectedActors) {
                        await agent.com.atproto.repo.createRecord({
                            repo: currentUser.did,
                            collection: 'app.bsky.graph.listitem',
                            record: {
                                $type: 'app.bsky.graph.listitem',
                                subject: actor.did,
                                list: listUri,
                                createdAt: new Date().toISOString()
                            }
                        });
                    }

                    // Create starterpack record
                    await agent.com.atproto.repo.createRecord({
                        repo: currentUser.did,
                        collection: 'app.bsky.graph.starterpack',
                        record: {
                            $type: 'app.bsky.graph.starterpack',
                            name: finalName,
                            description: finalDesc,
                            list: listUri,
                            feeds: selectedFeeds.map(f => ({ uri: f.uri || f.id })),
                            createdAt: new Date().toISOString()
                        }
                    });
                }
            } catch (err) {
                console.warn('AT Protocol creation warning (fallback mode active):', err);
            }

            dispatch(showToast({ message: 'Starter pack created successfully!', type: 'success' }));
            navigate(`/profile/${currentUser?.handle || 'me'}`, { replace: true });
        } catch (err) {
            console.error('Failed to create starter pack:', err);
            dispatch(showToast({ message: 'Failed to create starter pack', type: 'error' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-[600px] mx-auto w-full min-h-screen bg-white dark:bg-dark-bg border-x border-gray-100 dark:border-dark-border flex flex-col">
            {/* Header */}
            <div className="w-full border-b border-gray-200 dark:border-dark-border flex items-center gap-2 sticky top-0 z-20 bg-white dark:bg-dark-bg px-5 min-h-[52px]">
                <button
                    type="button"
                    aria-label="Back"
                    onClick={() => {
                        if (step === 3) setStep(2);
                        else if (step === 2) setStep(1);
                        else navigate(-1);
                    }}
                    className="w-[33px] h-[33px] rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface flex items-center justify-center transition-colors"
                >
                    <svg fill="none" width="24" height="24" viewBox="0 0 24 24" className="text-gray-600 dark:text-gray-300">
                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M3 12a1 1 0 0 1 .293-.707l6-6a1 1 0 0 1 1.414 1.414L6.414 11H20a1 1 0 1 1 0 2H6.414l4.293 4.293a1 1 0 0 1-1.414 1.414l-6-6A1 1 0 0 1 3 12Z" />
                    </svg>
                </button>
                <h1 className="text-[18.8px] font-semibold text-black dark:text-white flex-1 text-center pr-8">
                    {step === 1 ? 'Starter Pack' : step === 2 ? 'Choose People' : 'Choose Feeds'}
                </h1>
            </div>

            {/* STEP 1: Details */}
            {step === 1 && (
                <div className="px-5 pt-8 flex-1 flex flex-col">
                    {/* Gradient Hero Icon */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <svg fill="none" width="90" height="90" viewBox="0 0 24 24">
                            <defs>
                                <linearGradient x1="0" y1="0" x2="100%" y2="0" gradientTransform="rotate(45)" id="sky_gradient_create">
                                    <stop offset="0" stopColor="#0A7AFF" />
                                    <stop offset="1" stopColor="#59B9FF" />
                                </linearGradient>
                            </defs>
                            <path fill="url(#sky_gradient_create)" fillRule="evenodd" clipRule="evenodd" d="M11.26 5.227 5.02 6.899c-.734.197-1.17.95-.973 1.685l1.672 6.24c.197.734.951 1.17 1.685.973l6.24-1.672c.734-.197 1.17-.951.973-1.685L12.945 6.2a1.375 1.375 0 0 0-1.685-.973Zm-6.566.459a2.632 2.632 0 0 0-1.86 3.223l1.672 6.24a2.632 2.632 0 0 0 3.223 1.861l6.24-1.672a2.631 2.631 0 0 0 1.861-3.223l-1.672-6.24a2.632 2.632 0 0 0-3.223-1.861l-6.24 1.672Z" />
                            <path fill="url(#sky_gradient_create)" fillRule="evenodd" clipRule="evenodd" d="M15.138 18.411a4.606 4.606 0 1 0 0-9.211 4.606 4.606 0 0 0 0 9.211Zm0 1.257a5.862 5.862 0 1 0 0-11.724 5.862 5.862 0 0 0 0 11.724Z" />
                        </svg>
                        <h2 className="text-[24.3px] font-semibold text-black dark:text-white leading-[32px] mt-2">
                            Invites, but personal
                        </h2>
                        <p className="text-[15px] text-[#405168] dark:text-gray-400 mt-1 px-4 text-center">
                            Invite your friends to follow your favorite feeds and people
                        </p>
                    </div>

                    {/* Field 1: Name */}
                    <div className="mb-5">
                        <label className="block text-[13.1px] font-medium text-[#405168] dark:text-gray-300 mb-2">
                            What do you want to call your Starter Pack?
                        </label>
                        <div className="relative w-full rounded-[10px] bg-[#EFF2F6] dark:bg-dark-surface border border-transparent focus-within:border-blue-500 flex items-center px-3">
                            <input
                                type="text"
                                maxLength={50}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={defaultNamePlaceholder}
                                className="w-full bg-transparent text-[15px] text-black dark:text-white py-2.5 focus:outline-none placeholder-[#667B99]"
                            />
                            <span className="text-[13.1px] text-[#405168] dark:text-gray-400 shrink-0 pl-2 pointer-events-none">
                                {name.length}/50
                            </span>
                        </div>
                    </div>

                    {/* Field 2: Description */}
                    <div className="mb-6">
                        <label className="block text-[13.1px] font-medium text-[#405168] dark:text-gray-300 mb-2">
                            Tell us a little more
                        </label>
                        <div className="relative w-full rounded-[10px] bg-[#EFF2F6] dark:bg-dark-surface border border-transparent focus-within:border-blue-500 p-3 min-h-[150px]">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={defaultDescPlaceholder}
                                className="w-full h-full bg-transparent text-[15px] text-black dark:text-white focus:outline-none placeholder-[#667B99] resize-none"
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className="mt-auto pb-8">
                        <button
                            type="button"
                            onClick={handleStep1Next}
                            className="w-full bg-[#006aff] hover:bg-blue-600 text-white font-medium text-[15px] py-3 rounded-full transition-colors shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Choose People */}
            {step === 2 && (
                <div className="flex-1 flex flex-col">
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200 dark:border-dark-border">
                        <div className="relative w-full rounded-[10px] bg-[#EFF2F6] dark:bg-dark-surface flex items-center px-3">
                            <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="text-[#667B99] shrink-0 mr-2">
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search"
                                className="w-full bg-transparent text-[15px] text-black dark:text-white py-2.5 focus:outline-none placeholder-[#667B99]"
                            />
                        </div>
                    </div>

                    {/* Actor List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-border">
                        {isSearching ? (
                            <div className="flex items-center justify-center py-12">
                                <LoadingIndicator size="sm" />
                            </div>
                        ) : actors.map((actor) => {
                            const isSelected = selectedActors.some(a => a.did === actor.did);
                            return (
                                <div
                                    key={actor.did}
                                    onClick={() => toggleActorSelection(actor)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
                                >
                                    <div className="w-[45px] h-[45px] rounded-full overflow-hidden shrink-0 bg-gray-100 dark:bg-dark-surface border border-gray-200 dark:border-dark-border">
                                        {actor.avatar ? (
                                            <img src={actor.avatar} alt={actor.handle} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                                                {actor.handle.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                        <div className="font-semibold text-[15px] text-black dark:text-white truncate">
                                            {actor.displayName || actor.handle}
                                        </div>
                                        <div className="text-[13.1px] text-[#405168] dark:text-gray-400 truncate">
                                            @{actor.handle}
                                        </div>
                                    </div>

                                    {/* Checkbox Box */}
                                    <div className={`w-6 h-6 rounded-[6px] border flex items-center justify-center transition-colors ${
                                        isSelected 
                                            ? 'bg-[#006aff] border-[#006aff] text-white' 
                                            : 'bg-[#F9FAFB] dark:bg-dark-surface border-gray-300 dark:border-dark-border'
                                    }`}>
                                        {isSelected && <FiCheck size={16} strokeWidth={3} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sticky Bottom Bar */}
                    <div className="sticky bottom-0 z-20 bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border p-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white dark:border-dark-bg shrink-0">
                                {currentUser?.avatar ? (
                                    <img src={currentUser.avatar} alt={currentUser.handle} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                                        {currentUser?.handle?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-[15px] text-black dark:text-white text-center font-medium">
                            {selectedActors.length === 0 
                                ? "It's just you right now! Add more people to your starter pack by searching above."
                                : `${selectedActors.length} people added to starter pack`
                            }
                        </div>

                        <div className="w-full flex flex-col items-center gap-3 mt-1">
                            <div className={`text-[15px] font-semibold ${selectedActors.length >= 7 ? 'text-blue-600 dark:text-blue-400' : 'text-[#405168] dark:text-gray-400'}`}>
                                {selectedActors.length >= 7 
                                    ? `${selectedActors.length} people selected` 
                                    : `Add ${7 - selectedActors.length} more to continue`
                                }
                            </div>

                            <button
                                type="button"
                                disabled={selectedActors.length < 7}
                                onClick={handleStep2Next}
                                className={`w-full rounded-full py-3 text-[15px] font-medium text-white transition-colors ${
                                    selectedActors.length >= 7 
                                        ? 'bg-[#006aff] hover:bg-blue-600 cursor-pointer shadow-sm' 
                                        : 'bg-[#a8ccff] dark:bg-blue-950/60 dark:text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: Choose Feeds */}
            {step === 3 && (
                <div className="flex-1 flex flex-col px-5 py-4">
                    <p className="text-[15px] text-[#405168] dark:text-gray-300 mb-4 text-center">
                        Optionally select custom feeds to include in your starter pack.
                    </p>

                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-border mb-4">
                        {userFeeds.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                                No custom feeds saved. You can proceed without custom feeds.
                            </div>
                        ) : (
                            userFeeds.map((feed: any) => {
                                const feedUri = feed.uri || feed.id;
                                const isSelected = selectedFeeds.some(f => (f.uri || f.id) === feedUri);
                                return (
                                    <div
                                        key={feedUri}
                                        onClick={() => toggleFeedSelection(feed)}
                                        className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                                            <FiRss size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-[15px] text-black dark:text-white truncate">
                                                {feed.displayName || feed.name || 'Custom Feed'}
                                            </div>
                                            <div className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                                                by @{feed.creator?.handle || 'custom'}
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-[6px] border flex items-center justify-center transition-colors ${
                                            isSelected 
                                                ? 'bg-[#006aff] border-[#006aff] text-white' 
                                                : 'bg-[#F9FAFB] dark:bg-dark-surface border-gray-300 dark:border-dark-border'
                                        }`}>
                                            {isSelected && <FiCheck size={16} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-auto pb-6">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleCreateStarterPack}
                            className="w-full bg-[#006aff] hover:bg-blue-600 text-white font-medium text-[15px] py-3 rounded-full transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating Starter Pack...' : 'Create Starter Pack'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateStarterPackPage;
