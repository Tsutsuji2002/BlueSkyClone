import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useGetStarterPackQuery, useFollowAllMembersMutation, useLazyGetListFeedQuery } from '../redux/api/starterPackApi';
import { useAppDispatch, useAppSelector } from '../redux/hooks';

import { RootState } from '../redux/store';
import { followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import { updateFollowStatus } from '../redux/slices/suggestionsSlice';
import { openAuthWall } from '../redux/slices/modalsSlice';
import { showToast } from '../redux/slices/toastSlice';
import { API_BASE_URL } from '../constants';
import UserHoverCard from '../components/common/UserHoverCard';
import PostCard from '../components/feed/PostCard';
import { Post } from '../types';

const STREET_PHOTOGRAPHERS_MEMBERS = [
    { subject: { did: 'sp1', handle: 'antonpodolsky.bsky.social', displayName: 'Anton Podolsky', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:wnt62siviv5qdnhslpz2jjmr/bafkreihe7idtboxjyg64g6rftx5hmlxm2pltcmda24ne2x52jhp6gw4ox4', description: '📷 Street and street portraits. 🇬🇧 London. www.exify.io www.antonpodolsky.com linktr.ee/antonpodolsky' } },
    { subject: { did: 'sp2', handle: 'lloydy110.bsky.social', displayName: 'lloydy110', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:fsythvb7bbtehra72norje3c/bafkreihhwfcyocvkpbe7wezctv56rdeiprvkk5bbaxev3g6zeztblcghyi', description: '𝙾𝚗𝚌𝚎 𝚕𝚒𝚟𝚎𝚍 𝚋𝚎𝚗𝚎𝚊𝚝𝚑 𝚝𝚑𝚎 𝚠𝚊𝚟𝚎𝚜. L𝚘𝚟𝚎 𝚝𝚛𝚊𝚟𝚎𝚕, 𝚕𝚒𝚟𝚎 m𝚞𝚜𝚒𝚌 & 𝚕𝚒𝚏𝚎 𝚒𝚗 𝚝𝚑𝚎 𝚂𝚘𝚞𝚝𝚑 𝚆𝚎𝚜𝚝 🇬🇧 Street Photography. linktr.ee/lloydy110' } },
    { subject: { did: 'sp3', handle: 'janonfilm.com', displayName: 'Jan Gottweiss | jan.onfilm', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:en44oehweusllxe22ksdfsib/bafkreihcyepydv4j4dli6rhckrpr2cm2ptxffb6wpjkot23cjdliednc5a', description: 'German Photographer based in London 🇩🇪🇬🇧 Contact: hello@janonfilm.com Website: janonfilm.com' } },
    { subject: { did: 'sp4', handle: 'marksugden.bsky.social', displayName: 'Mark Sugden', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:krp6v27c4rc7hkdqmu2vaal7/bafkreihxhm6y3ypidismtjggshecfhkl32ljyi26r2zjvfp5en5tatztga', description: 'Photographer and Business Architect from Lincoln.' } },
    { subject: { did: 'sp5', handle: 'danielgynn.bsky.social', displayName: 'Daniel Rao-Gynn', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:xleyplbxjdvlku2dyk3kjmg7/bafkreib5sfyurnp3qhnf5clpsoq3lw3sr3excqvuorlwmagehtxvgqdixa', description: 'Software engineer, designer, and street photographer based in London. danielgynn.me danielgynn.photos linktr.ee/danielgynn' } },
    { subject: { did: 'sp6', handle: 'shanetaylor.bsky.social', displayName: 'Shane Taylor', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:5czwv6jsfggxbvciyfemalf5/bafkreif43tsrkncqbkt65z6hwrnhbjx7s2xoxc5gwz4npchlfovwryqkiu', description: 'Photographer / Heroesforsale' } },
    { subject: { did: 'sp7', handle: 'leomelo-photos.bsky.social', displayName: 'leo melo - street photographer', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:kpoh5zzo6mx7rmbf3nqh63tc/bafkreiacrmq73vk4zoxkx3ax4pcjtz6blm2lel3vwjae7bpifzjcjubhj4', description: 'Cinematic Street Photographer Capturing stories hidden in everyday streets Lumix S9 • London New films weekly' } },
    { subject: { did: 'sp8', handle: 'niallmcdiarmid.bsky.social', displayName: 'Niall McDiarmid', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:6tpn3a2u4crkpldhjayxzjpu/bafkreieeoxbgrof3hss74dfoue7naogixesx3ghuvwooio6xsl3k7cnmuq', description: 'Photographer' } },
    { subject: { did: 'sp9', handle: 'marklukegrant.bsky.social', displayName: 'MLG', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:33dfcienzoegl3nbgbhn2jzs/bafkreibhmiqa77h32r2smt52kopmoaa5m3f5nwqmfzfyycjy72u3vnsng4', description: 'Street Photography shot (mostly) on film www.marklukegrant.co.uk' } },
    { subject: { did: 'sp10', handle: 'atikusphoto.bsky.social', displayName: 'Michael - @Atikusphoto', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:h3tllqknzlw3vttpugp6vtru/bafkreia52bx6zsxlmlssr555yqbo6hu7no6olzihdk6pkmngnniomaya2e', description: 'London based street photographer. 📷 Fuji X-T5 📷 Ricoh GRiiix www.instagram.com/atikusphoto/' } },
    { subject: { did: 'sp11', handle: 'sebhitchcock.bsky.social', displayName: 'Seb Hitchcock', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:orzzkznaretkpivuwjtyxs34/bafkreihpk6nrk6rbkck277qoij3etwbzjwp2sx5mxjrkoais37xcubfwmq', description: 'I enjoy street photography www.instagram.com/seb.hitchcock www.flickr.com/photos/sebhi...' } },
    { subject: { did: 'sp12', handle: 'josh-edgoose.bsky.social', displayName: 'Josh Edgoose | Photographer', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:bczxlewji6iloxfpx2hoi5uy/bafkreiemsch6cvhsjzeddkbfiars2k4uqkag5qvohf3hxf6iczolsdyziy', description: 'Order my New Zine - Secondhand News ⬇️ joshedgoose.com/shop/secondh...' } },
    { subject: { did: 'sp13', handle: '47photography.bsky.social', displayName: 'Martin 📷 47 Photography 📸', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:d5ym2gwu2mjnes4xktz2snlt/bafkreid2bgbudwwrlkxlruest7vtg7suukxzg6nmogz6soqeriaurvkfma', description: 'Photography, that’s all. Definitely no ranting! Mostly street, mostly London, mostly mono, mostly Fuji, occasionally some film/iPhone. 📷 Currently X-T5 plus a continuously growing collection of film cameras. All images are my own.' } },
    { subject: { did: 'sp14', handle: 'marcovinagre.bsky.social', displayName: 'Marco Vinagre', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:p5aj5u543hl3js33acrin7gn/bafkreibocnqtwofjn2dhbf2znqgw4uehamcz4c4rocaljxr4mp7uqhiqdy', description: 'Cinematic Street Photographer Capturing stories hidden in everyday streets Lumix S9 • London New films weekly' } },
    { subject: { did: 'sp15', handle: 'streetcolourgraphy.bsky.social', displayName: 'Nelson Rato', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:di3rp7shazbpzuhijgios3mw/bafkreiehhuhvgicid5pc3zq4w4byd2cvcn2bzscvpafelvliqszi6snv3e', description: 'Instagram.com/idocument_life Based in Edinburgh, Scotland. Documenting life in the streets. 📷Leica Q3 43 Ricoh GRiv' } },
    { subject: { did: 'sp16', handle: 'ollyheadey.com', displayName: 'Olly Headey 📷', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:vp2xu2eujez27cogarf4ieh3/bafkreifg2fxsyjlsrgp3lxh2zkrmx2zk3znfqcfbtcefgvmwwb377nkc4u', description: 'Photographer, Edinburgh. Dublin Street Photo Festival finalist 2026. Oslo Street Photo Fest finalist 2026. 📨 Subscribe to my street photography newsletter at ollyheadey.com/captured 📍 Edinburgh 📷 ollyheadey.com / instagram.com/ollyheadey' } },
    { subject: { did: 'sp17', handle: 'danlebrun.bsky.social', displayName: 'Dan Le Brun', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:ieooq5nkpombfo7knvqwhj4d/bafkreihje3gjur3eherfjmvdn7tctc4b4ct6kgoxpqk4wkktf64mdtblta', description: 'Cats, cameras, coffee and coding in South Wales' } },
    { subject: { did: 'sp18', handle: 'the-overexposed.bsky.social', displayName: 'Lee', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:uoemgeg4vke6h7g75f5ioerp/bafkreiddqdb6fltmit6q3rhu4sv2hugs6bbcmyvocni462jtjz32h5nq2a', description: 'Mainly street photography Film/digital 📍London IG - @thirty8frames' } },
    { subject: { did: 'sp19', handle: 'nicksolarz.bsky.social', displayName: 'Nick Solarz', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:rbgqqpox5yxk5nfwrtqekw52/bafkreicqkzsbo2auxdonbr3ryknc6ucxprv4ygdkp2aw5ubruq35mqcsoq', description: 'I take pictures. nicksolarz.com 📍Boston, MA.' } },
    { subject: { did: 'sp20', handle: 'markmoran.co.uk', displayName: 'Mark Moran', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:ygwzud5aue52lacsdk4ypj3p/bafkreidva4scnrtkddva3tkuncekaeg6r2neonptemwguhnwo4u2zv6f4q', description: 'Photography, darkroom, drawing, music, words, letterpress, analogue. www.markmoran.co.uk Prints available.' } },
    { subject: { did: 'sp21', handle: 'amateurriot.bsky.social', displayName: 'Patrick', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:tfuwyzm3tw5opezqnnaerqgu/bafkreiby6kau5ftysxwu77enhi5qgfkgm5lgfkoozocwsrdpcsufhlgh3y', description: 'Streetphotography from Zurich amateur mindset 35mm and digital Leica M6 // Fuji X-Pro3 amateurriot.com' } },
    { subject: { did: 'sp22', handle: 'lucyphoto.bsky.social', displayName: 'Lucy 📷', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:45tpuenyjoho76cktmquilma/bafkreihmna6pafqhboumtaddk4qgrfwt2cxs2amjkytdbvluwbghlc44rq', description: '35mm film photography mostly 🎞️ but also digital. Street photography, landscape. Scottish 🏴 linktr.ee/whaleonland' } },
];

const COMEDY_MEMBERS_FULL = [
    { did: 's1', handle: 'sstein.bsky.social', displayName: 'Scott Stein', avatar: 'https://i.pravatar.cc/80?img=68', description: 'Latest novel: THE GREAT AMERICAN BETRAYAL *Best Comedy Books of 2022* -Vulture. English professor, novelist, satirist, editor.' },
    { did: 's2', handle: 'kashana.blacksky.app', displayName: 'Kashana', avatar: 'https://i.pravatar.cc/80?img=47', description: 'TV writer. Author of the novels THE PAYBACK and THE SURVIVALISTS. Deadly with a butter knife.' },
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
    'lukeknox.me': {
        rkey: '3laxjbn5cni7u',
        uri: 'at://did:plc:lukeknox/app.bsky.graph.starterpack/3laxjbn5cni7u',
        record: {
            name: 'ESPN people',
            description: 'List of ESPN folks on Bluesky. Let me know who I\'m missing!',
        },
        creator: {
            handle: 'lukeknox.me',
            displayName: 'Luke Knox',
            avatar: 'https://i.pravatar.cc/80?img=60',
        },
        list: {
            uri: 'at://did:plc:lukeknox/app.bsky.graph.list/3laxjbn5cni7u',
        },
        listItemsSample: [
            { subject: { did: 'e1', handle: 'lukeknox.me', displayName: 'Luke Knox', avatar: 'https://i.pravatar.cc/80?img=60', description: 'Creative Director, ESPN Visual Storytelling' } },
            { subject: { did: 'e2', handle: 'minakimes.bsky.social', displayName: 'Mina Kimes', avatar: 'https://i.pravatar.cc/80?img=47', description: 'NFL analyst at ESPN.', viewer: { verified: true } } },
            { subject: { did: 'e3', handle: 'espnbillc.bsky.social', displayName: 'Bill Connelly', avatar: 'https://i.pravatar.cc/80?img=53', description: 'ESPN writer, professional nerd. SP+. Author of three books (Study Hall, 50 Best* and Forward Progress). College football, soccer, tennis. Puma addiction.' } },
            { subject: { did: 'e4', handle: 'kpelton.bsky.social', displayName: 'Kevin Pelton', avatar: 'https://i.pravatar.cc/80?img=12', description: 'Assistant GM for Connecticut Sun (future Houston Comets). Using numbers to learn about the game.' } },
            { subject: { did: 'e5', handle: 'sheacarlson.bsky.social', displayName: 'Shea', avatar: 'https://i.pravatar.cc/80?img=15', description: 'nba editor @ espn. writer. rascal.' } },
            { subject: { did: 'e6', handle: 'wyshynski.bsky.social', displayName: 'Greg Wyshynski', avatar: 'https://i.pravatar.cc/80?img=33', description: 'Senior NHL Writer at ESPN, ex-Puck Daddy and NJ native. Did I mention I love people? Email: greg.wyshynski@espn.dot.com' } },
        ],
        feeds: [],
    },
    'sstein.bsky.social': {
        rkey: '3laohb5gt6t2j',
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
        list: {
            uri: 'at://did:plc:rag7p65524h5chavuvujp6zy/app.bsky.graph.list/3laohb4ym5m2j',
        },
        listItemsSample: COMEDY_MEMBERS_FULL,
        feeds: [],
    },
    'x3nu.bsky.social': {
        rkey: '3lagamingrk1',
        uri: 'at://did:plc:x3nu/app.bsky.graph.starterpack/3lagamingrk1',
        record: {
            name: 'Gaming : Studios, Publishers, Media & Leakers',
            description: 'Comprehensive list of game studios, publishers, gaming news outlets, and industry insiders.',
        },
        creator: {
            handle: 'x3nu.bsky.social',
            displayName: 'x3nu',
            avatar: 'https://i.pravatar.cc/80?img=21',
        },
        list: {
            uri: 'at://did:plc:x3nu/app.bsky.graph.list/3lagamingrk1',
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
        {
            id: 'sp-post-6',
            uri: 'at://did:plc:tomtomorrow/app.bsky.feed.post/6',
            cid: 'cid-6',
            author: {
                id: 'tomtomorrow',
                did: 'did:plc:tomtomorrow',
                username: 'tomtomorrow.bsky.social',
                handle: 'tomtomorrow.bsky.social',
                displayName: 'Your Internet Friend Tom Tomorrow',
                avatar: 'https://i.pravatar.cc/80?img=33',
                avatarUrl: 'https://i.pravatar.cc/80?img=33',
            },
            content: "Modern politics is just arguing over which dystopian sci-fi trope we should implement next.",
            createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
            likesCount: 1840,
            repostsCount: 290,
            repliesCount: 64,
            bookmarksCount: 31,
            quotesCount: 11,
        },
        {
            id: 'sp-post-7',
            uri: 'at://did:plc:theonion/app.bsky.feed.post/7',
            cid: 'cid-7',
            author: {
                id: 'theonion',
                did: 'did:plc:theonion',
                username: 'theonion.com',
                handle: 'theonion.com',
                displayName: 'The Onion',
                avatar: 'https://i.pravatar.cc/80?img=60',
                avatarUrl: 'https://i.pravatar.cc/80?img=60',
                isVerified: true,
            },
            content: 'Man Who Thought He Was Sarcastic Realizes He Just Has Bad Personality.',
            createdAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
            likesCount: 4520,
            repostsCount: 910,
            repliesCount: 142,
            bookmarksCount: 115,
            quotesCount: 48,
        },
        {
            id: 'sp-post-8',
            uri: 'at://did:plc:ditzkoff/app.bsky.feed.post/8',
            cid: 'cid-8',
            author: {
                id: 'ditzkoff',
                did: 'did:plc:ditzkoff',
                username: 'ditzkoff.bsky.social',
                handle: 'ditzkoff.bsky.social',
                displayName: 'Dave Itzkoff',
                avatar: 'https://i.pravatar.cc/80?img=53',
                avatarUrl: 'https://i.pravatar.cc/80?img=53',
            },
            content: "Reminder that every documentary is actually just a horror film if you watch it carefully enough.",
            createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
            likesCount: 975,
            repostsCount: 120,
            repliesCount: 28,
            bookmarksCount: 14,
            quotesCount: 6,
        },
        {
            id: 'sp-post-9',
            uri: 'at://did:plc:reductress/app.bsky.feed.post/9',
            cid: 'cid-9',
            author: {
                id: 'reductress',
                did: 'did:plc:reductress',
                username: 'reductress.com',
                handle: 'reductress.com',
                displayName: 'Reductress',
                avatar: 'https://i.pravatar.cc/80?img=45',
                avatarUrl: 'https://i.pravatar.cc/80?img=45',
                isVerified: true,
            },
            content: 'How To Politely Tell Someone You Are Only Listening To Them Out Of Courtesy.',
            createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
            likesCount: 3110,
            repostsCount: 480,
            repliesCount: 82,
            bookmarksCount: 67,
            quotesCount: 23,
        },
        {
            id: 'sp-post-10',
            uri: 'at://did:plc:scalzi/app.bsky.feed.post/10',
            cid: 'cid-10',
            author: {
                id: 'scalzi',
                did: 'did:plc:scalzi',
                username: 'scalzi.com',
                handle: 'scalzi.com',
                displayName: 'John Scalzi',
                avatar: 'https://i.pravatar.cc/80?img=12',
                avatarUrl: 'https://i.pravatar.cc/80?img=12',
                isVerified: true,
            },
            content: "The cat has decided my keyboard is an ergonomic heat pad. My typing speed is down 95%.",
            createdAt: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
            likesCount: 2840,
            repostsCount: 230,
            repliesCount: 75,
            bookmarksCount: 42,
            quotesCount: 15,
        },
        {
            id: 'sp-post-11',
            uri: 'at://did:plc:conan/app.bsky.feed.post/11',
            cid: 'cid-11',
            author: {
                id: 'conan',
                did: 'did:plc:conan',
                username: 'conanobrien.bsky.social',
                handle: 'conanobrien.bsky.social',
                displayName: "Conan O'Brien",
                avatar: 'https://i.pravatar.cc/80?img=21',
                avatarUrl: 'https://i.pravatar.cc/80?img=21',
            },
            content: "If anyone needs me, I'll be in my room trying to fold a fitted sheet for the next three days.",
            createdAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
            likesCount: 6200,
            repostsCount: 1100,
            repliesCount: 340,
            bookmarksCount: 210,
            quotesCount: 95,
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

interface StarterPackMemberRowProps {
    subject: any;
    localFollowedDids: Set<string>;
    onToggleFollowLocal: (did: string) => void;
}

const StarterPackMemberRow: React.FC<StarterPackMemberRowProps> = ({
    subject,
    localFollowedDids,
    onToggleFollowLocal,
}) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const suggestionsByCategory = useAppSelector((state: RootState) => state.suggestions.suggestionsByCategory);

    const [liveProfile, setLiveProfile] = useState<any>(null);

    useEffect(() => {
        const key = subject.handle || subject.did;
        if (!key) return;

        let isMounted = true;
        fetch(`${API_BASE_URL}/users/profile/${key}`, { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (isMounted && data?.user) {
                    setLiveProfile({
                        displayName: data.user.displayName,
                        avatar: data.user.avatar || data.user.avatarUrl,
                        handle: data.user.handle,
                        description: data.user.bio || data.user.description,
                        isFollowing: data.isFollowing ?? data.user.isFollowing,
                        followingReference: data.user.followingReference,
                        verified: data.user.isVerified || data.isVerified,
                    });
                }
            })
            .catch(() => {});

        return () => { isMounted = false; };
    }, [subject.handle, subject.did]);

    const reduxSuggestion = subject.did
        ? Object.values(suggestionsByCategory).flat().find(u => u.did === subject.did)
        : null;

    const isFollowing = localFollowedDids.has(subject.did) ||
        Boolean(
            liveProfile?.isFollowing ??
            reduxSuggestion?.viewer?.following ??
            (typeof subject.viewer?.following === 'string' || Boolean(subject.viewer?.following)) ??
            false
        );

    const avatarSrc = liveProfile?.avatar ||
        subject.avatar ||
        subject.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(subject.displayName || subject.handle || 'user')}`;

    const displayName = liveProfile?.displayName || subject.displayName || subject.handle;
    const description = liveProfile?.description || subject.description;
    const isVerified = liveProfile?.verified || subject.viewer?.verified || subject.isVerified;

    const hoverUser = {
        id: subject.did || subject.handle,
        did: subject.did,
        handle: liveProfile?.handle || subject.handle,
        displayName: displayName,
        avatarUrl: avatarSrc,
        avatar: avatarSrc,
        bio: description,
        isFollowing: isFollowing,
        followingReference: liveProfile?.followingReference || subject.viewer?.following,
        isVerified: isVerified,
    };

    const handleFollowClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }

        const followActor = subject.did || subject.handle;
        if (isFollowing) {
            if (liveProfile?.followingReference || subject.viewer?.following) {
                dispatch(unfollowUserAsync({
                    userId: followActor,
                    followUri: liveProfile?.followingReference || subject.viewer?.following
                }));
            }
            onToggleFollowLocal(subject.did);
            dispatch(updateFollowStatus({ did: subject.did || '', isFollowing: false }));
            if (liveProfile) setLiveProfile({ ...liveProfile, isFollowing: false });
        } else {
            dispatch(followUserAsync(followActor));
            onToggleFollowLocal(subject.did);
            dispatch(updateFollowStatus({ did: subject.did || '', isFollowing: true }));
            if (liveProfile) setLiveProfile({ ...liveProfile, isFollowing: true });
        }
    };

    return (
        <div className="flex flex-col gap-1 p-4 hover:bg-[#f9fafb]/50 dark:hover:bg-dark-surface/30 transition-colors border-t border-[#dce2ea] dark:border-dark-border">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserHoverCard user={hoverUser}>
                        <img
                            onClick={() => navigate(`/profile/${hoverUser.handle}`)}
                            src={avatarSrc}
                            alt={hoverUser.handle}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
                        />
                    </UserHoverCard>
                    <div className="min-w-0 flex flex-col">
                        <UserHoverCard user={hoverUser}>
                            <div
                                onClick={() => navigate(`/profile/${hoverUser.handle}`)}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-[15px] text-black dark:text-white truncate hover:underline block leading-[20px]">
                                        {displayName}
                                    </span>
                                    {isVerified && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#006aff" className="flex-shrink-0 inline-block">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary truncate block leading-[17px]">
                                    @{hoverUser.handle}
                                </span>
                            </div>
                        </UserHoverCard>
                    </div>
                </div>

                <button
                    onClick={handleFollowClick}
                    className={`px-[14px] py-[8px] rounded-full text-[13.1px] font-medium flex-shrink-0 transition-all flex items-center justify-center gap-[5px] ${
                        isFollowing
                            ? 'bg-[#eff2f6] dark:bg-dark-surface text-[#405168] dark:text-dark-text hover:bg-gray-200'
                            : 'bg-[#006aff] hover:bg-[#005cd6] text-white'
                    }`}
                >
                    <div className="w-[17px] h-[17px] -mx-[2px] flex items-center justify-center relative">
                        {isFollowing ? (
                            <svg fill="none" width="16" height="16" viewBox="0 0 24 24" className="text-[#405168] dark:text-dark-text pointer-events-none">
                                <path fill="#405168" fillRule="evenodd" clipRule="evenodd" d="M21.59 3.193a1 1 0 0 1 .217 1.397l-11.706 16a1 1 0 0 1-1.429.193l-6.294-5a1 1 0 1 1 1.244-1.566l5.48 4.353 11.09-15.16a1 1 0 0 1 1.398-.217Z" />
                            </svg>
                        ) : (
                            <svg fill="none" width="16" height="16" viewBox="0 0 24 24" className="text-white pointer-events-none">
                                <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M12 3a1 1 0 0 1 1 1v7h7a1 1 0 1 1 0 2h-7v7a1 1 0 1 1-2 0v-7H4a1 1 0 1 1 0-2h7V4a1 1 0 0 1 1-1Z" />
                            </svg>
                        )}
                    </div>
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
            </div>

            {description && (
                <p className="text-[13.1px] text-black dark:text-dark-text mt-1 leading-[17px] line-clamp-3 font-normal">
                    {description}
                </p>
            )}
        </div>
    );
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
            let handle = 'lukeknox.me';
            let rkey = '3laxjbn5cni7u';
            if (rawUri.includes('lukeknox')) {
                handle = 'lukeknox.me';
                rkey = '3laxjbn5cni7u';
            } else if (rawUri.includes('antonpodolsky')) {
                handle = 'antonpodolsky.bsky.social';
                rkey = '3k4ignapzy7';
            } else if (rawUri.includes('x3nu')) {
                handle = 'x3nu.bsky.social';
                rkey = '3lagamingrk1';
            } else if (rawUri.includes('sstein')) {
                handle = 'sstein.bsky.social';
                rkey = '3laohb5gt6t2j';
            }
            navigate(`/starter-pack/${handle}/${rkey}`, { replace: true });
        }
    }, [searchParams, paramHandle, navigate]);

    const starterPackUri = searchParams.get('uri') || (paramHandle && paramRkey ? `at://${paramHandle}/app.bsky.graph.starterpack/${paramRkey}` : '');

    const isMockPack = !paramHandle || Object.keys(MOCK_FALLBACK_STARTER_PACKS).includes(paramHandle);

    const { data, isLoading } = useGetStarterPackQuery(
        { starterPack: starterPackUri || '' },
        { skip: !starterPackUri }
    );

    const [triggerGetListFeed, { isLoading: isLoadingLiveFeed }] = useLazyGetListFeedQuery();

    const [followAllMembers, { isLoading: isFollowingAll }] = useFollowAllMembersMutation();
    const [followedDids, setFollowedDids] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'people' | 'posts'>('people');
    const [visibleCount, setVisibleCount] = useState<number>(7);
    const [visiblePostsCount, setVisiblePostsCount] = useState<number>(3);
    const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

    // Live ATProto list posts state
    const [livePosts, setLivePosts] = useState<Post[]>([]);
    const [liveCursor, setLiveCursor] = useState<string | undefined>(undefined);
    const [hasLoadedLiveFeed, setHasLoadedLiveFeed] = useState<boolean>(false);
    const [hasMoreLivePosts, setHasMoreLivePosts] = useState<boolean>(true);

    // Resolve starter pack:
    // If handle matches a mock entry, strictly validate that rkey matches mock pack's expected rkey!
    let starterPack: any = null;
    let fallbackKey = 'lukeknox.me';

    if (data?.starterPack) {
        starterPack = data.starterPack;
    } else if (paramHandle && MOCK_FALLBACK_STARTER_PACKS[paramHandle]) {
        const mockEntry = MOCK_FALLBACK_STARTER_PACKS[paramHandle];
        // Strictly check if paramRkey matches expected rkey
        if (!paramRkey || mockEntry.rkey === paramRkey) {
            starterPack = mockEntry;
            fallbackKey = paramHandle;
        }
    }

    const members: any[] = starterPack?.listItemsSample || [];
    const targetDids = members.map((m: any) => m.subject?.did || m.did).filter(Boolean);

    // List AT-URI for fetching real ATProto list feed
    const listUri: string = starterPack?.list?.uri || starterPack?.record?.list || '';

    // Get fallback mock posts for this pack
    const starterPackPosts: Post[] = MOCK_STARTER_PACK_POSTS[fallbackKey] || MOCK_STARTER_PACK_POSTS['sstein.bsky.social'];

    // Helper to map ATProto FeedViewPost to local Post interface
    const mapFeedViewPostToPost = (item: any): Post => {
        const p = item.post || {};
        const author = p.author || {};
        const rec = p.record || {};
        const images: any[] = [];

        if (p.embed?.$type === 'app.bsky.embed.images#view' && Array.isArray(p.embed.images)) {
            p.embed.images.forEach((img: any) => {
                images.push({ url: img.fullsize || img.thumb, alt: img.alt || '' });
            });
        }

        return {
            id: p.cid || p.uri || Math.random().toString(),
            uri: p.uri || '',
            cid: p.cid || '',
            author: {
                id: author.did || author.handle || 'unknown',
                did: author.did,
                username: author.handle || 'unknown',
                handle: author.handle || 'unknown',
                displayName: author.displayName || author.handle || 'User',
                avatar: author.avatar,
                avatarUrl: author.avatar,
                isVerified: !!author.associated?.labeler,
            },
            content: rec.text || '',
            createdAt: rec.createdAt || p.indexedAt || new Date().toISOString(),
            likesCount: p.likeCount || 0,
            repostsCount: p.repostCount || 0,
            repliesCount: p.replyCount || 0,
            quotesCount: p.quoteCount || 0,
            bookmarksCount: 0,
            images: images.length > 0 ? images : undefined,
            linkPreview: p.embed?.external ? {
                url: p.embed.external.uri,
                title: p.embed.external.title,
                description: p.embed.external.description,
                image: p.embed.external.thumb,
                domain: p.embed.external.uri ? new URL(p.embed.external.uri).hostname.replace('www.', '') : '',
            } : undefined,
        };
    };

    // Initial fetch for real ATProto list feed (fetches eagerly when listUri is resolved)
    useEffect(() => {
        if (listUri && !hasLoadedLiveFeed) {
            triggerGetListFeed({ list: listUri, limit: 30 })
                .unwrap()
                .then((res: any) => {
                    if (res?.feed && Array.isArray(res.feed)) {
                        const mapped = res.feed.map(mapFeedViewPostToPost);
                        setLivePosts(mapped);
                        setLiveCursor(res.cursor);
                        setHasMoreLivePosts(!!res.cursor && res.feed.length > 0);
                    }
                    setHasLoadedLiveFeed(true);
                })
                .catch(() => {
                    setHasLoadedLiveFeed(true);
                });
        }
    }, [listUri, hasLoadedLiveFeed, triggerGetListFeed]);

    // Infinite scroll handler for People & Posts (500px threshold for early seamless loading)
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                if (isFetchingMore || isLoadingLiveFeed) return;

                if (activeTab === 'people' && visibleCount < members.length) {
                    setIsFetchingMore(true);
                    setTimeout(() => {
                        setVisibleCount(prev => Math.min(prev + 6, members.length));
                        setIsFetchingMore(false);
                    }, 400);
                } else if (activeTab === 'posts') {
                    if (listUri && hasMoreLivePosts && liveCursor) {
                        setIsFetchingMore(true);
                        triggerGetListFeed({ list: listUri, limit: 20, cursor: liveCursor })
                            .unwrap()
                            .then((res: any) => {
                                if (res?.feed && Array.isArray(res.feed)) {
                                    const nextMapped = res.feed.map(mapFeedViewPostToPost);
                                    setLivePosts(prev => [...prev, ...nextMapped]);
                                    setLiveCursor(res.cursor);
                                    setHasMoreLivePosts(!!res.cursor && res.feed.length > 0);
                                } else {
                                    setHasMoreLivePosts(false);
                                }
                                setIsFetchingMore(false);
                            })
                            .catch(() => {
                                setIsFetchingMore(false);
                            });
                    } else if (!listUri && visiblePostsCount < starterPackPosts.length) {
                        setIsFetchingMore(true);
                        setTimeout(() => {
                            setVisiblePostsCount(prev => Math.min(prev + 3, starterPackPosts.length));
                            setIsFetchingMore(false);
                        }, 400);
                    }
                }
            }
        };



        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isFetchingMore, isLoadingLiveFeed, activeTab, visibleCount, members.length, listUri, hasMoreLivePosts, liveCursor, visiblePostsCount, starterPackPosts.length, triggerGetListFeed]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006aff]"></div>
            </div>
        );
    }

    // 404 screen if pack is invalid or paramRkey mismatched
    if (!starterPack) {
        return (
            <div className="min-h-screen bg-white dark:bg-dark-bg text-black dark:text-white flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 bg-[#f1f5f9] dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h1 className="text-[22px] font-bold mb-2 text-center">Oops! That Starter Pack could not be found.</h1>
                <p className="text-[15px] text-[#64748b] dark:text-dark-text-secondary mb-6 text-center max-w-md">
                    The link you followed may be broken, or the starter pack may have been removed.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-[#006aff] hover:bg-[#005cd6] text-white font-semibold text-[15px] rounded-full transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const record = starterPack.record;
    const creator = starterPack.creator;
    const visibleMembers = members.slice(0, visibleCount);

    const creatorUser = {
        id: creator?.did || creator?.handle || 'creator',
        did: creator?.did,
        handle: creator?.handle,
        displayName: creator?.displayName || creator?.handle,
        avatarUrl: creator?.avatar,
        avatar: creator?.avatar,
        bio: creator?.description,
    };

    const handleFollowAll = async () => {
        try {
            await followAllMembers({ targetDids }).unwrap();
            setFollowedDids(new Set(targetDids));
            dispatch(showToast({ message: `Followed all members of ${record?.name || 'starter pack'}`, type: 'success' }));
        } catch (err: any) {
            dispatch(showToast({ message: err?.data?.message || 'Failed to follow members', type: 'error' }));
        }
    };

    return (
        <div className="max-w-[600px] w-full mx-auto min-h-screen bg-white dark:bg-dark-bg border-x border-[#dce2ea] dark:border-dark-border">
            {/* Header with Sticky Back Button & Follow All */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md border-b border-[#dce2ea] dark:border-dark-border px-4 py-2.5 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleFollowAll}
                        disabled={isFollowingAll}
                        className="px-4 py-1.5 bg-[#006aff] hover:bg-[#005cd6] text-white text-[14px] font-semibold rounded-full transition-colors disabled:opacity-50"
                    >
                        {isFollowingAll ? 'Following...' : 'Follow all'}
                    </button>
                    <button
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        aria-label="More options"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Pack Hero Info matching exact Bluesky reference HTML */}
            <div className="p-[14px] flex flex-row items-start gap-[10px]">
                {/* 58px Bluesky Gradient Starter Pack Hero Icon */}
                <div className="w-[58px] h-[58px] flex-shrink-0">
                    <svg fill="none" width="58" viewBox="0 0 24 24" height="58">
                        <defs>
                            <linearGradient x1="0" y1="0" x2="100%" y2="0" gradientTransform="rotate(45)" id="sky_sp_hero_gradient">
                                <stop offset="0" stopColor="#0A7AFF"></stop>
                                <stop offset="1" stopColor="#59B9FF"></stop>
                            </linearGradient>
                        </defs>
                        <path fill="url(#sky_sp_hero_gradient)" fillRule="evenodd" clipRule="evenodd" d="M11.26 5.227 5.02 6.899c-.734.197-1.17.95-.973 1.685l1.672 6.24c.197.734.951 1.17 1.685.973l6.24-1.672c.734-.197 1.17-.951.973-1.685L12.945 6.2a1.375 1.375 0 0 0-1.685-.973Zm-6.566.459a2.632 2.632 0 0 0-1.86 3.223l1.672 6.24a2.632 2.632 0 0 0 3.223 1.861l6.24-1.672a2.631 2.631 0 0 0 1.861-3.223l-1.672-6.24a2.632 2.632 0 0 0-3.223-1.861l-6.24 1.672Z"></path>
                        <path fill="url(#sky_sp_hero_gradient)" fillRule="evenodd" clipRule="evenodd" d="M15.138 18.411a4.606 4.606 0 1 0 0-9.211 4.606 4.606 0 0 0 0 9.211Zm0 1.257a5.862 5.862 0 1 0 0-11.724 5.862 5.862 0 0 0 0 11.724Z"></path>
                    </svg>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <h1 className="text-[28px] leading-[34px] font-semibold text-black dark:text-white tracking-tight line-clamp-4">
                        {record?.name || 'Starter Pack'}
                    </h1>

                    <div className="text-[16px] leading-[22px] text-[#405168] dark:text-dark-text-secondary">
                        Starter Pack by{' '}
                        <UserHoverCard user={creatorUser} className="inline-block">
                            <span
                                onClick={() => navigate(`/profile/${creatorUser.handle}`)}
                                className="font-normal text-[#405168] dark:text-dark-text-secondary hover:underline cursor-pointer"
                            >
                                @{creator?.handle || 'unknown'}
                            </span>
                        </UserHoverCard>
                    </div>
                </div>
            </div>

            {record?.description && (
                <div className="p-[12px_16px_8px] text-[15px] leading-[20px] font-normal text-black dark:text-white">
                    {record.description}
                </div>
            )}

            {/* Tabs Bar: People | Posts matching Bluesky reference (flex-1 equal width) */}
            <div className="sticky top-[52px] z-10 bg-white dark:bg-dark-bg flex flex-row border-b border-[#dce2ea] dark:border-dark-border text-[15px] font-semibold">
                <button
                    onClick={() => setActiveTab('people')}
                    className={`flex-1 py-3 text-center relative flex items-center justify-center ${
                        activeTab === 'people'
                            ? 'text-black dark:text-white font-semibold'
                            : 'text-[#405168] dark:text-dark-text-secondary font-medium hover:text-black dark:hover:text-white'
                    }`}
                >
                    People
                    {activeTab === 'people' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#006aff] rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex-1 py-3 text-center relative flex items-center justify-center ${
                        activeTab === 'posts'
                            ? 'text-black dark:text-white font-semibold'
                            : 'text-[#405168] dark:text-dark-text-secondary font-medium hover:text-black dark:hover:text-white'
                    }`}
                >
                    Posts
                    {activeTab === 'posts' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#006aff] rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'people' ? (
                <div className="divide-y divide-[#dce2ea] dark:divide-dark-border">
                    {visibleMembers.map((item: any, idx: number) => {
                        const subject = item.subject || item;
                        return (
                            <StarterPackMemberRow
                                key={subject.did || subject.handle || idx}
                                subject={subject}
                                localFollowedDids={followedDids}
                                onToggleFollowLocal={(did) => {
                                    setFollowedDids(prev => {
                                        const next = new Set(prev);
                                        if (next.has(did)) next.delete(did);
                                        else next.add(did);
                                        return next;
                                    });
                                }}
                            />
                        );
                    })}

                    {/* Infinite Scroll Loading Indicator */}
                    {visibleCount < members.length && (
                        <div className="p-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#006aff] border-t-transparent"></div>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {isLoadingLiveFeed && livePosts.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#006aff] border-t-transparent"></div>
                            <span className="text-[14px] text-[#64748b] dark:text-dark-text-secondary">Loading latest posts...</span>
                        </div>
                    ) : livePosts.length > 0 ? (
                        livePosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        starterPackPosts.slice(0, visiblePostsCount).map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    )}

                    {/* Posts Infinite Scroll Loading Indicator */}
                    {((listUri && hasMoreLivePosts) || (!listUri && visiblePostsCount < starterPackPosts.length) || isFetchingMore) && (
                        <div className="p-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#006aff] border-t-transparent"></div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default StarterPackDetailPage;
