# Post Content and Avatar Issues

## 1. Missing Avatars (Showing Initials)
- **Problem**: Avatars for authors like "Marie" and "ProPublica" are showing as initial circles ("M", "P") instead of images.
- **Hypothesis**: The `AvatarUrl` in the backend DTO might be pointing to a URL that the browser is failing to load (CORS, privacy settings, or broken proxy). Or the mapping logic is missing the field.
- **Evidence**: `PostService.cs` maps `author.avatar` to `AvatarUrl`. Bluesky's `cdn.bsky.app` usually requires no special auth, but if the app is trying to proxy them through the local backend and it's failing, they won't show.

## 2. Missing Post Content (Empty Text)
- **Problem**: The "Marie" post shows no text.
- **Investigation**: Inspected the live Bluesky API for "Marie" (`mhsty.bsky.social`). Found that the post with ~8.6K likes (`3mk47qwqm7c2y`) has an empty `text` field and contains only an **image embed**.
- **Missing Link**: The screenshot shows NO image either. This indicates that `post.images` or `post.media` is not being correctly hydrated in the `PostDto`.

## 3. Plan
1. [ ] Check `MapEmbedToDto` in `PostService.cs` to see if it correctly handles `app.bsky.embed.images#view`.
2. [ ] Check `AuthorDto` and `Avatar` component props consistency.
3. [ ] Verify if `app.bsky.embed.images#view` vs `app.bsky.embed.images` (raw) is handled correctly.
4. [ ] Check if the frontend `MediaGrid` has any issues rendering the mapped images.
