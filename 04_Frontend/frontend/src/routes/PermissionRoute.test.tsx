import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PermissionRoute } from './PermissionRoute';
import { useAuthStore } from '@/stores/auth-store';

describe('PermissionRoute', () => {
  it('renders children when the permission is present', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'c1',
        permissions: ['expenses.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <Routes>
          <Route
            path="/expenses"
            element={
              <PermissionRoute permission="expenses.read">
                <p>Expense ledger</p>
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Expense ledger')).toBeInTheDocument();
  });

  it('redirects to dashboard when the permission is missing', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Viewer',
        email: 'v@example.com',
        companyId: 'c1',
        permissions: ['clients.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <Routes>
          <Route path="/dashboard" element={<p>Dashboard</p>} />
          <Route
            path="/expenses"
            element={
              <PermissionRoute permission="expenses.read">
                <p>Expense ledger</p>
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Expense ledger')).not.toBeInTheDocument();
  });

  it('shows access denied instead of looping when dashboard.read is missing', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        fullName: 'Restricted',
        email: 'r@example.com',
        companyId: 'c1',
        permissions: ['clients.read'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <PermissionRoute permission="dashboard.read">
                <p>Dashboard home</p>
              </PermissionRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard home')).not.toBeInTheDocument();
  });
});
