import React from 'react';
import { render, screen } from '@testing-library/react';
import GroupAvatar from './GroupAvatar';
import { User } from '../../types';

const mockUser = (id: string, name: string, avatar?: string): User => ({
    id,
    username: name,
    displayName: name,
    handle: `${name}.bsky.social`,
    avatarUrl: avatar,
    avatar: avatar,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
});

describe('GroupAvatar Component', () => {
    it('returns null when empty users array is passed', () => {
        const { container } = render(<GroupAvatar users={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders a single avatar when 1 user is provided', () => {
        const users = [mockUser('1', 'Alice', 'https://example.com/alice.jpg')];
        render(<GroupAvatar users={users} size="md" />);
        const img = screen.getByRole('img', { name: 'Alice' });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg');
    });

    it('renders 2 avatars with diagonal top-left and bottom-right overlap for 2 users', () => {
        const users = [
            mockUser('1', 'UserOne', 'https://example.com/u1.jpg'),
            mockUser('2', 'UserTwo', 'https://example.com/u2.jpg'),
        ];
        render(<GroupAvatar users={users} size="md" />);
        const img1 = screen.getByRole('img', { name: 'UserOne' });
        const img2 = screen.getByRole('img', { name: 'UserTwo' });
        expect(img1).toBeInTheDocument();
        expect(img2).toBeInTheDocument();
        // Check container positioning
        const u1Wrapper = img1.closest('.absolute');
        const u2Wrapper = img2.closest('.absolute');
        expect(u1Wrapper).toHaveClass('top-0', 'left-0');
        expect(u2Wrapper).toHaveClass('bottom-0', 'right-0');
    });

    it('renders 3 avatars in triangle formation for 3 users', () => {
        const users = [
            mockUser('1', 'UserOne', 'https://example.com/u1.jpg'),
            mockUser('2', 'UserTwo', 'https://example.com/u2.jpg'),
            mockUser('3', 'UserThree', 'https://example.com/u3.jpg'),
        ];
        render(<GroupAvatar users={users} size="md" />);
        expect(screen.getByRole('img', { name: 'UserOne' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'UserTwo' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'UserThree' })).toBeInTheDocument();
    });

    it('renders 4 avatars in 2x2 grid for 4 users', () => {
        const users = [
            mockUser('1', 'U1', 'https://example.com/1.jpg'),
            mockUser('2', 'U2', 'https://example.com/2.jpg'),
            mockUser('3', 'U3', 'https://example.com/3.jpg'),
            mockUser('4', 'U4', 'https://example.com/4.jpg'),
        ];
        render(<GroupAvatar users={users} size="md" />);
        expect(screen.getByRole('img', { name: 'U1' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'U2' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'U3' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'U4' })).toBeInTheDocument();
        expect(screen.queryByText(/\+/)).toBeNull();
    });

    it('renders +N count badge when users length > 4', () => {
        const users = [
            mockUser('1', 'U1', 'https://example.com/1.jpg'),
            mockUser('2', 'U2', 'https://example.com/2.jpg'),
            mockUser('3', 'U3', 'https://example.com/3.jpg'),
            mockUser('4', 'U4', 'https://example.com/4.jpg'),
            mockUser('5', 'U5', 'https://example.com/5.jpg'),
        ];
        render(<GroupAvatar users={users} size="md" />);
        expect(screen.getByText('+2')).toBeInTheDocument();
    });
});
