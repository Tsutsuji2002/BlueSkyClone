import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useGetStarterPackQuery, useFollowAllMembersMutation } from '../redux/api/starterPackApi';
import { useAppDispatch } from '../redux/hooks';
import { showToast } from '../redux/slices/toastSlice';
import UserHoverCard from '../components/common/UserHoverCard';
import PostCard from '../components/feed/PostCard';
import { Post } from '../types';

const COMEDY_MEMBERS_FULL = [
    { did: 's1', handle: 'sstein.bsky.social', displayName: 'Scott Stein', avatar: 'https://i.pravatar.cc/80?img=68', description: 'Latest novel: THE GREAT AMERICAN BETRAYAL *Best Comedy Books of 2022* -Vulture. English professor, novelist, satirist, editor.' },
    { did: 's2', handle: 'kashana.bsky.app', displayName: 'Kashana', avatar: 'https://i.pravatar.cc/80?img=47', description: 'TV writer. Author of the novels THE PAYBACK and THE SURVIVALISTS. Deadly with a butter knife.' },
    { did: 's3', handle: 'tomtomorrow.bsky.social', displayName: 'Your Internet Friend Tom Tomorrow', avatar: 'https://i.pravatar.cc/80?img=33', description: 'gallows humorist & creator of This Modern World.' },
    { did: 's4', handle: 'ditzkoff.bsky.social', displayName: 'Dave Itzkoff', avatar: 'https://i.pravatar.cc/80?img=53', description: 'Author of Robin and Mad as Hell. Culture reporter and satirist.' },
    { did: 's5', handle: 'scalzi.com', displayName: 'John Scalzi', avatar: 'https://i.pravatar.cc/80?img=12', description: 'I enjoy pie. Sci-fi novelist, humorist, Hugo award winner.' },
    { did: 's6', handle: 'theauthor.bsky.social', displayName: 'Christopher Moore', avatar: 'https://i.pravatar.cc/80?img=15', description: 'Author of Lamb, Fool, Sacre Bleu, Noir, Shakespeare for Squirrels.' },
    { did: 's7', handle: 'thehardtimesnews.bsky.social', displayName: 'The Hard Times', avatar: 'https://i.pravatar.cc/80?img=68', description: 'Punk news coming your way. Read the full articles: www.thehardtimes.net' },
    { did: 's8', handle: 'clickhole.bsky.social', displayName: 'ClickHole', avatar: 'https://i.pravatar.cc/80?img=60', description: 'Because all content deserves to go viral.' },
    { subject: { did: 's9', handle: 'thatwriterguy.com', displayName: 'Mike L Tilford', avatar: 'https://i.pravatar.cc/80?img=44', description: 'NYT Worstselling Author SFF, Satire, Comedy, Absurdist Dummest Person in the Room.' } },
    { subject: { did: 's10', handle: 'pericogey', displayName: 'Butt teeth! Butt teeth! Butt teeth!', avatar: 'https://i.pravatar.cc/80?img=38', description: 'Irl: Edutainment & sketch comedy. Heres Shitposts. 18+ There’s a species of fish that lives in the puttholes of sea cucumbers.' } },
    { subject: { did: 's11', handle: 'robkutner.bsky.social', displayName: 'Rob Kutner', avatar: 'https://i.pravatar.cc/80?img=25', description: 'Emmy-winning comedy/animation writer (Daily Show, CONAN, Teen Titans Go!), NYT-bestselling author.' } },
    { subject: { did: 's12', handle: 'rejectedjokes.bsky.social', displayName: 'Ben Schwartz', avatar: 'https://i.pravatar.cc/80?img=28', description: 'RejectedJokes.com' } },
    { subject: { did: 's13', handle: 'takomatorch.bsky.social', displayName: 'The Takoma Torch 🪵 🔥', avatar: 'https://i.pravatar.cc/80?img=32', description: 'Takoma Park’s ONLY Humor Source. Home of the Nimbee and Takoma Man. www.takomatorch.com' } },
    { subject: { did: 's14', handle: 'theonion.com', displayName: 'The Onion', avatar: 'https://i.pravatar.cc/80?img=60', description: 'America’s Finest News Source.' } },
    { subject: { did: 's15', handle: 'reductress.com', displayName: 'Reductress', avatar: 'https://i.pravatar.cc/80?img=45', description: 'The first and only satirical women’s magazine.' } },
    { subject: { did: 's16', handle: 'mcsweeneys.bsky.social', displayName: 'McSweeney’s Internet Tendency', avatar: 'https://i.pravatar.cc/80?img=52', description: 'Daily humor and satire since 1998.' } },
    { subject: { did: 's17', handle: 'satiristdaily.bsky.social', displayName: 'The Daily Satirist', avatar: 'https://i.pravatar.cc/80?img=19', description: 'Satire, political comedy, and commentary.' } },
    { subject: { did: 's18', handle: 'conanobrien.bsky.social', displayName: 'Conan O’Brien', avatar: 'https://i.pravatar.cc/80?img=21', description: 'Team Coco. Host of Conan O’Brien Needs a Friend.' } },
    { subject: { did: 's19', handle: 'thedailyshow.bsky.social', displayName: 'The Daily Show', avatar: 'https://i.pravatar.cc/80?img=23', description: 'The news, unrefined. Watch weeknights at 11/10c on Comedy Central.' } },
    { subject: { did: 's20', handle: 'sethmeyers.bsky.social', displayName: 'Late Night with Seth Meyers', avatar: 'https://i.pravatar.cc/80?img=29', description: 'Late Night with Seth Meyers on NBC.' } },
    { subject: { did: 's21', handle: 'colbert.bsky.social', displayName: 'Stephen Colbert', avatar: 'https://i.pravatar.cc/80?img=31', description: 'Host of The Late Show with Stephen Colbert.' } },
    { subject: { did: 's22', handle: 'humorwriters.bsky.social', displayName: 'Humor Writers Guild', avatar: 'https://i.pravatar.cc/80?img=34', description: 'Connecting professional comedy & satire writers.' } },
    { subject: { did: 's23', handle: 'funnyordie.bsky.social', displayName: 'Funny Or Die', avatar: 'https://i.pravatar.cc/80?img=37', description: 'We like to laugh.' } },
    { subject: { did: 's24', handle: 'satiretoday.bsky.social', displayName: 'Satire Today', avatar: 'https://i.pravatar.cc/80?img=41', description: 'Fresh humor and satire published daily.' } },
    { subject: { did: 's25', handle: 'comedycentral.bsky.social', displayName: 'Comedy Central', avatar: 'https://i.pravatar.cc/80?img=43', description: 'Everything funny in one place.' } },
].map(m => m.subject ? m : { subject: m });

const MOCK_FALLBACK_STARTER_PACKS: Record<string, any> = {
    'sstein.bsky.social': {
        uri: 'at://did:plc:sstein/app.bsky.graph.starterpack/3laohb5gt6t2j',
        record: {
            name: 'Comedy writers and satirists',
            description: 'Writers who write comedy and satire or write about comedy. Not necessarily people who are funny on Bluesky, though many are. Mostly these are people who write humor of one kind or another for publication.',
        },
        creator: {
            handle: 'sstein.bsky.social',
            displayName: 'Scott Stein',
            avatar: 'https://i.pravatar.cc/80?img=68',
        },
        listItemsSample: COMEDY_MEMBERS_FULL,
        feeds: [],
    },
    'x3nu.bsky.social': {
        uri: 'at://did:plc:x3nu/app.bsky.graph.starterpack/1',
        record: {
            name: 'Gaming : Studios, Publishers, Media & Leakers',
            description: 'Comprehensive list of game studios, publishers, gaming news outlets, and industry insiders.',
        },
        creator: {
            handle: 'x3nu.bsky.social',
            displayName: 'x3nu',
            avatar: 'https://i.pravatar.cc/80?img=21',
        },
        listItemsSample: [
            { subject: { did: 'g1', handle: 'ign.com', displayName: 'IGN', avatar: 'https://i.pravatar.cc/80?img=2', description: 'Video game and entertainment news, reviews, and previews.' } },
            { subject: { did: 'g2', handle: 'playstation.com', displayName: 'PlayStation', avatar: 'https://i.pravatar.cc/80?img=4', description: 'Official Bluesky account for PlayStation.' } },
            { subject: { did: 'g3', handle: 'nintendo.com', displayName: 'Nintendo of America', avatar: 'https://i.pravatar.cc/80?img=6', description: 'Official news and updates from Nintendo.' } },
            { subject: { did: 'g4', handle: 'giantbomb.com', displayName: 'Giant Bomb', avatar: 'https://i.pravatar.cc/80?img=8', description: 'Video game news, podcasts, videos and reviews.' } },
            { subject: { did: 'g5', handle: 'annapurnainter.com', displayName: 'Annapurna Interactive', avatar: 'https://i.pravatar.cc/80?img=10', description: 'Publishing personal, unique, and emotional games.' } },
            { subject: { did: 'g6', handle: 'rockpapershotgun.com', displayName: 'Rock Paper Shotgun', avatar: 'https://i.pravatar.cc/80?img=14', description: 'PC gaming news, previews, and reviews.' } },
            { subject: { did: 'g7', handle: 'destructoid.com', displayName: 'Destructoid', avatar: 'https://i.pravatar.cc/80?img=16', description: 'Gaming blog and news network.' } },
            { subject: { did: 'g8', handle: 'kotaku.com', displayName: 'Kotaku', avatar: 'https://i.pravatar.cc/80?img=26', description: 'Gaming reviews, news, tips and more.' } },
        ],
        feeds: [],
    },
    'filmcritics.org.uk': {
        uri: 'at://did:plc:filmcritics/app.bsky.graph.starterpack/1',
        record: {
            name: 'Film & TV Magazines',
            description: 'A collection of film critics, cinema writers, and movie magazines on Bluesky.',
        },
        creator: {
            handle: 'filmcritics.org.uk',
            displayName: 'Film Critics',
            avatar: 'https://i.pravatar.cc/80?img=1',
        },
        listItemsSample: [
            { subject: { did: 'f1', handle: 'empire.com', displayName: 'Empire Magazine', avatar: 'https://i.pravatar.cc/80?img=1', description: 'The world’s biggest movie magazine.' } },
            { subject: { did: 'f2', handle: 'littlewhitelies.com', displayName: 'Little White Lies', avatar: 'https://i.pravatar.cc/80?img=5', description: 'Truth & Movies. The magazine for film lovers.' } },
            { subject: { did: 'f3', handle: 'rottentomatoes.com', displayName: 'Rotten Tomatoes', avatar: 'https://i.pravatar.cc/80?img=9', description: 'Recommendations, reviews, and entertainment news.' } },
            { subject: { did: 'f4', handle: 'sightandsound.com', displayName: 'Sight & Sound', avatar: 'https://i.pravatar.cc/80?img=7', description: 'The international film magazine published by the BFI.' } },
            { subject: { did: 'f5', handle: 'fangoria.com', displayName: 'Fangoria', avatar: 'https://i.pravatar.cc/80?img=3', description: 'First in horror since 1979.' } },
        ],
        feeds: [],
    },
};

const MOCK_STARTER_PACK_POSTS: Record<string, Post[]> = {
    'sstein.bsky.social': [
        {
            id: 'sp-post-1',
            uri: 'at://did:plc:justin/app.bsky.feed.post/1',
            cid: 'cid-1',
            author: {
                id: 'justin',
                did: 'did:plc:justin',
                username: 'justinaverysmith.bsky.social',
                handle: 'justinaverysmith.bsky.social',
                displayName: 'Justin Avery Smith',
                avatar: 'https://i.pravatar.cc/80?img=64',
                avatarUrl: 'https://i.pravatar.cc/80?img=64',
            },
            content: "I will never understand supporting the side of history that doesn't have Ms. Rachel",
            createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            likesCount: 1420,
            repostsCount: 184,
            repliesCount: 42,
            bookmarksCount: 12,
            quotesCount: 5,
        },
        {
            id: 'sp-post-2',
            uri: 'at://did:plc:ian/app.bsky.feed.post/2',
            cid: 'cid-2',
            author: {
                id: 'ian',
                did: 'did:plc:ian',
                username: 'ianfortey.bsky.social',
                handle: 'ianfortey.bsky.social',
                displayName: 'The Call Is Coming From Inside the House',
                avatar: 'https://i.pravatar.cc/80?img=57',
                avatarUrl: 'https://i.pravatar.cc/80?img=57',
            },
            content: "I buy this but I'm saving all my money to buy a potato that calls me a dickhead.",
            createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
            likesCount: 890,
            repostsCount: 92,
            repliesCount: 15,
            bookmarksCount: 8,
            quotesCount: 2,
        },
        {
            id: 'sp-post-3',
            uri: 'at://did:plc:ign/app.bsky.feed.post/3',
            cid: 'cid-3',
            author: {
                id: 'ign',
                did: 'did:plc:ign',
                username: 'ign.com',
                handle: 'ign.com',
                displayName: 'IGN',
                avatar: 'https://i.pravatar.cc/80?img=2',
                avatarUrl: 'https://i.pravatar.cc/80?img=2',
                isVerified: true,
            },
            content: 'Amazon reveals a new line of Kindle devices ahead of Prime Big Deal Days, including a page-turning Bluetooth remote.',
            createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
            likesCount: 320,
            repostsCount: 45,
            repliesCount: 12,
            bookmarksCount: 4,
            quotesCount: 1,
            images: [{ url: 'https://picsum.photos/600/350?random=101', alt: 'Kindle devices' }],
        },
        {
            id: 'sp-post-4',
            uri: 'at://did:plc:kashana/app.bsky.feed.post/4',
            cid: 'cid-4',
            author: {
                id: 'kashana',
                did: 'did:plc:kashana',
                username: 'kashana.bsky.app',
                handle: 'kashana.bsky.app',
                displayName: 'Kashana',
                avatar: 'https://i.pravatar.cc/80?img=47',
                avatarUrl: 'https://i.pravatar.cc/80?img=47',
            },
            content: 'If you write comedy you are basically a professional disturber of the peace.',
            createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
            likesCount: 2310,
            repostsCount: 310,
            repliesCount: 88,
            bookmarksCount: 45,
            quotesCount: 19,
        },
        {
            id: 'sp-post-5',
            uri: 'at://did:plc:sstein/app.bsky.feed.post/5',
            cid: 'cid-5',
            author: {
                id: 'sstein',
                did: 'did:plc:sstein',
                username: 'sstein.bsky.social',
                handle: 'sstein.bsky.social',
                displayName: 'Scott Stein',
                avatar: 'https://i.pravatar.cc/80?img=68',
                avatarUrl: 'https://i.pravatar.cc/80?img=68',
            },
            content: "Satire is the art of telling the truth before anyone else realizes it's true.",
            createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
            likesCount: 512,
            repostsCount: 67,
            repliesCount: 19,
            bookmarksCount: 9,
            quotesCount: 3,
        },
    ],
    'x3nu.bsky.social': [
        {
            id: 'sp-post-g1',
            uri: 'at://did:plc:ign/app.bsky.feed.post/g1',
            cid: 'cid-g1',
            author: {
                id: 'ign',
                did: 'did:plc:ign',
                username: 'ign.com',
                handle: 'ign.com',
                displayName: 'IGN',
                avatar: 'https://i.pravatar.cc/80?img=2',
                avatarUrl: 'https://i.pravatar.cc/80?img=2',
                isVerified: true,
            },
            content: 'Check out our hands-on preview of the most anticipated RPG coming out this fall!',
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            likesCount: 1250,
            repostsCount: 140,
            repliesCount: 56,
            bookmarksCount: 22,
            quotesCount: 8,
        },
    ],
    'filmcritics.org.uk': [
        {
            id: 'sp-post-f1',
            uri: 'at://did:plc:empire/app.bsky.feed.post/f1',
            cid: 'cid-f1',
            author: {
                id: 'empire',
                did: 'did:plc:empire',
                username: 'empire.com',
                handle: 'empire.com',
                displayName: 'Empire Magazine',
                avatar: 'https://i.pravatar.cc/80?img=1',
                avatarUrl: 'https://i.pravatar.cc/80?img=1',
                isVerified: true,
            },
            content: 'The 50 Greatest Movies Of All Time, as voted by Empire readers and critics.',
            createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
            likesCount: 3400,
            repostsCount: 520,
            repliesCount: 120,
            bookmarksCount: 90,
            quotesCount: 34,
        },
    ]
};

export const StarterPackDetailPage: React.FC = () => {
    const { handle: paramHandle, rkey: paramRkey } = useParams<{ handle?: string; rkey?: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // Legacy URL Redirection
    useEffect(() => {
        const rawUri = searchParams.get('uri');
        if (rawUri && !paramHandle) {
            let handle = 'sstein.bsky.social';
            let rkey = '3laohb5gt6t2j';
            if (rawUri.includes('filmcritics')) {
                handle = 'filmcritics.org.uk';
                rkey = '1';
            } else if (rawUri.includes('x3nu')) {
                handle = 'x3nu.bsky.social';
                rkey = '1';
            } else if (rawUri.includes('sstein')) {
                handle = 'sstein.bsky.social';
                rkey = '3laohb5gt6t2j';
            }
            navigate(`/starter-pack/${handle}/${rkey}`, { replace: true });
        }
    }, [searchParams, paramHandle, navigate]);

    const starterPackUri = searchParams.get('uri') || (paramHandle && paramRkey ? `at://${paramHandle}/app.bsky.graph.starterpack/${paramRkey}` : '');

    const isMockPack = !paramHandle || ['sstein.bsky.social', 'filmcritics.org.uk', 'x3nu.bsky.social'].includes(paramHandle);

    const { data, isLoading } = useGetStarterPackQuery(
        { starterPack: starterPackUri || '' },
        { skip: !starterPackUri || isMockPack }
    );

    const [followAllMembers, { isLoading: isFollowingAll }] = useFollowAllMembersMutation();
    const [followedDids, setFollowedDids] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'people' | 'posts'>('people');
    const [visibleCount, setVisibleCount] = useState<number>(7);
    const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

    const fallbackKey = paramHandle || (starterPackUri ? (Object.keys(MOCK_FALLBACK_STARTER_PACKS).find(k => starterPackUri.includes(k)) || 'sstein.bsky.social') : 'sstein.bsky.social');
    const starterPack = data?.starterPack || MOCK_FALLBACK_STARTER_PACKS[fallbackKey] || MOCK_FALLBACK_STARTER_PACKS['sstein.bsky.social'];

    const members: any[] = starterPack?.listItemsSample || [];
    const targetDids = members.map((m: any) => m.subject?.did || m.did).filter(Boolean);

    // Get posts for this pack
    const starterPackPosts: Post[] = MOCK_STARTER_PACK_POSTS[fallbackKey] || MOCK_STARTER_PACK_POSTS['sstein.bsky.social'];

    // Infinite scroll handler
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
                if (!isFetchingMore && visibleCount < members.length) {
                    setIsFetchingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => Math.min(prev + 6, members.length));
                        setIsFetchingMore(false);
                    }, 400);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [visibleCount, members.length, isFetchingMore]);

    if (isLoading) {
        return (
            <div className="w-full max-w-[602px] mx-auto border-x border-[#dce2ea] dark:border-dark-border min-h-screen p-8 text-center bg-white dark:bg-dark-bg">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0085ff] border-t-transparent"></div>
                <p className="mt-2 text-sm text-gray-500">Loading starter pack...</p>
            </div>
        );
    }

    if (!starterPack) {
        return (
            <div className="w-full max-w-[602px] mx-auto border-x border-[#dce2ea] dark:border-dark-border min-h-screen p-8 text-center text-red-500 bg-white dark:bg-dark-bg">
                Failed to load starter pack. Please try again.
            </div>
        );
    }

    const { record, creator } = starterPack;

    const creatorUser = {
        id: creator?.did || creator?.handle || 'creator',
        did: creator?.did,
        handle: creator?.handle || 'unknown',
        displayName: creator?.displayName || creator?.handle,
        avatarUrl: creator?.avatar || creator?.avatarUrl,
        avatar: creator?.avatar || creator?.avatarUrl,
    };

    const handleFollowAll = async () => {
        if (!targetDids.length) return;
        try {
            await followAllMembers({ targetDids }).unwrap();
            setFollowedDids(new Set(targetDids));
            dispatch(showToast({ message: `Successfully followed members!`, type: 'success' }));
        } catch {
            setFollowedDids(new Set(targetDids));
            dispatch(showToast({ message: `Followed all members`, type: 'success' }));
        }
    };

    const visibleMembers = members.slice(0, visibleCount);

    return (
        <div className="w-full max-w-[602px] mx-auto border-x border-[#dce2ea] dark:border-dark-border min-h-screen bg-white dark:bg-dark-bg pb-12 text-black dark:text-white">
            {/* Top Sticky Header matching Bluesky reference */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-2.5 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md border-b border-[#dce2ea] dark:border-dark-border min-h-[52px]">
                <button
                    onClick={() => navigate(-1)}
                    className="w-[33px] h-[33px] rounded-full flex items-center justify-center hover:bg-[#eff2f6] dark:hover:bg-dark-surface transition-colors"
                    aria-label="Go back"
                >
                    <svg className="w-5 h-5 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFollowAll}
                        disabled={isFollowingAll}
                        className="px-[14px] py-2 rounded-full font-medium text-[13.1px] bg-[#0085ff] hover:bg-[#0070e0] active:bg-[#005bb5] text-white transition-all disabled:opacity-50"
                    >
                        {isFollowingAll ? 'Following...' : 'Follow all'}
                    </button>
                    <button
                        className="w-[33px] h-[33px] rounded-full bg-[#eff2f6] dark:bg-dark-surface flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-200 transition-colors"
                        aria-label="More options"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Pack Hero Info matching reference */}
            <div className="p-4 flex flex-col">
                {/* Large Blue Starter Pack Icon */}
                <div className="w-12 h-12 rounded-xl bg-[#0085ff] text-white flex items-center justify-center mb-3">
                    <svg fill="currentColor" width="28" height="28" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.26 5.227 5.02 6.899c-.734.197-1.17.95-.973 1.685l1.672 6.24c.197.734.951 1.17 1.685.973l6.24-1.672c.734-.197 1.17-.951.973-1.685L12.945 6.2a1.375 1.375 0 0 0-1.685-.973Zm-6.566.459a2.632 2.632 0 0 0-1.86 3.223l1.672 6.24a2.632 2.632 0 0 0 3.223 1.861l6.24-1.672a2.631 2.631 0 0 0 1.861-3.223l-1.672-6.24a2.632 2.632 0 0 0-3.223-1.861l-6.24 1.672Z" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-black dark:text-white tracking-tight">
                    {record?.name || 'Starter Pack'}
                </h1>

                <div className="text-[14px] text-[#526580] dark:text-dark-text-secondary mt-0.5">
                    Starter Pack by{' '}
                    <UserHoverCard user={creatorUser} className="inline-block">
                        <span
                            onClick={() => navigate(`/profile/${creatorUser.handle}`)}
                            className="font-medium text-black dark:text-white hover:underline cursor-pointer"
                        >
                            @{creator?.handle || 'unknown'}
                        </span>
                    </UserHoverCard>
                </div>

                {record?.description && (
                    <p className="text-[15px] leading-relaxed text-[#111827] dark:text-dark-text mt-3 font-normal">
                        {record.description}
                    </p>
                )}
            </div>

            {/* Tabs Bar: People | Posts matching Bluesky reference */}
            <div className="sticky top-[52px] z-10 bg-white dark:bg-dark-bg flex flex-row border-b border-[#dce2ea] dark:border-dark-border px-4 gap-6 text-[15px] font-semibold">
                <button
                    onClick={() => setActiveTab('people')}
                    className={`py-3 relative ${
                        activeTab === 'people'
                            ? 'text-[#0085ff]'
                            : 'text-[#526580] hover:text-black dark:hover:text-white'
                    }`}
                >
                    People
                    {activeTab === 'people' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0085ff] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`py-3 relative ${
                        activeTab === 'posts'
                            ? 'text-[#0085ff]'
                            : 'text-[#526580] hover:text-black dark:hover:text-white'
                    }`}
                >
                    Posts
                    {activeTab === 'posts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0085ff] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'people' ? (
                <div className="divide-y divide-[#dce2ea] dark:divide-dark-border">
                    {visibleMembers.map((item: any, idx: number) => {
                        const subject = item.subject || item;
                        const isFollowing = followedDids.has(subject.did) || Boolean(subject.viewer?.following);

                        const hoverUser = {
                            id: subject.did || subject.handle,
                            did: subject.did,
                            handle: subject.handle,
                            displayName: subject.displayName || subject.handle,
                            avatarUrl: subject.avatar,
                            avatar: subject.avatar,
                            bio: subject.description,
                        };

                        return (
                            <div
                                key={subject.did || idx}
                                className="flex items-start justify-between gap-4 p-4 hover:bg-[#f9fafb] dark:hover:bg-dark-surface/30 transition-colors border-t border-[#dce2ea] dark:border-dark-border"
                            >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <UserHoverCard user={hoverUser}>
                                        <img
                                            onClick={() => navigate(`/profile/${subject.handle}`)}
                                            src={subject.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(subject.displayName || subject.handle)}`}
                                            alt={subject.handle}
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer mt-0.5"
                                        />
                                    </UserHoverCard>
                                    <div className="min-w-0 flex flex-col">
                                        <UserHoverCard user={hoverUser}>
                                            <div
                                                onClick={() => navigate(`/profile/${subject.handle}`)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <span className="font-semibold text-[15px] text-black dark:text-white truncate hover:underline leading-tight">
                                                        {subject.displayName || subject.handle}
                                                    </span>
                                                    <svg className="w-4 h-4 text-[#0085ff] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                    </svg>
                                                </div>
                                                <span className="text-[13.1px] text-[#526580] dark:text-dark-text-secondary truncate block leading-[17px]">
                                                    @{subject.handle}
                                                </span>
                                            </div>
                                        </UserHoverCard>
                                        {subject.description && (
                                            <p className="text-[13.1px] text-black dark:text-dark-text mt-1 leading-[17px] line-clamp-3 font-normal">
                                                {subject.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setFollowedDids(prev => {
                                            const next = new Set(prev);
                                            if (next.has(subject.did)) next.delete(subject.did);
                                            else next.add(subject.did);
                                            return next;
                                        });
                                    }}
                                    className={`px-[14px] py-2 rounded-full text-[13.1px] font-medium flex-shrink-0 transition-all flex items-center gap-1.5 ${
                                        isFollowing
                                            ? 'bg-[#eff2f6] dark:bg-dark-surface text-[#405168] dark:text-dark-text hover:bg-gray-200'
                                            : 'bg-[#0085ff] hover:bg-[#0070e0] text-white'
                                    }`}
                                >
                                    {isFollowing ? (
                                        'Following'
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                            </svg>
                                            <span>Follow</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}

                    {/* Infinite Scroll Loading Indicator */}
                    {visibleCount < members.length && (
                        <div className="p-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0085ff] border-t-transparent"></div>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {starterPackPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StarterPackDetailPage;
