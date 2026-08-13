import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnlockUserDialog } from './UnlockUserDialog';
import { AppUser } from '@/services/users-service';

const user: AppUser = {
  id: 'user-2',
  fullName: 'Studio Staff',
  email: 'staff@example.com',
  isActive: true,
  roles: [],
  lastLoginAt: null,
  isLocked: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('UnlockUserDialog', () => {
  it('confirms unlock without exposing credentials', () => {
    const onConfirm = vi.fn();

    render(<UnlockUserDialog open user={user} onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole('heading', { name: 'Unlock User' })).toBeInTheDocument();
    expect(screen.getByText(/Studio Staff/)).toBeInTheDocument();
    expect(screen.queryByText(/passwordHash|password:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unlock User' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
