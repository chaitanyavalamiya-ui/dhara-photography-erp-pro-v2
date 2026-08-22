import { QueryClient } from '@tanstack/react-query';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  invalidateAfterAccountsExpense,
  invalidateAfterAccountsPayment,
} from './invalidate-financial-queries';

function clientWithCache() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['reports', 'overview', { preset: 'this_month' }], { total: 1 });
  queryClient.setQueryData(['reports', 'dashboard', 'this_month'], { total: 1 });
  queryClient.setQueryData(['accounts', 'dashboard'], { total: 1 });
  queryClient.setQueryData(['payments'], { items: [] });
  queryClient.setQueryData(['invoices'], { items: [] });
  queryClient.setQueryData(['expenses'], { items: [] });
  queryClient.setQueryData(['bookings'], { items: [] });
  queryClient.setQueryData(['clients'], { items: [] });
  queryClient.setQueryData(['gallery'], { items: [] });
  queryClient.setQueryData(['albums'], { items: [] });
  return queryClient;
}

describe('invalidateAfterAccountsPayment', () => {
  it('invalidates payment-derived Accounts and Reports caches after a successful create', () => {
    const queryClient = clientWithCache();
    invalidateAfterAccountsPayment(queryClient);

    expect(queryClient.getQueryState(['reports', 'overview', { preset: 'this_month' }])?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(['accounts', 'dashboard'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['payments'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['invoices'])?.isInvalidated).toBe(true);
  });

  it('does not invalidate unrelated modules', () => {
    const queryClient = clientWithCache();
    invalidateAfterAccountsPayment(queryClient);

    expect(queryClient.getQueryState(['bookings'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['clients'])?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(['gallery'])?.isInvalidated).toBe(false);
  });
});

describe('invalidateAfterAccountsExpense', () => {
  it('invalidates expenses, accounts, and reports prefixes used by Dashboard KPIs', () => {
    const queryClient = clientWithCache();
    invalidateAfterAccountsExpense(queryClient);

    expect(queryClient.getQueryState(['reports', 'overview', { preset: 'this_month' }])?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(['reports', 'dashboard', 'this_month'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['accounts', 'dashboard'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['expenses'])?.isInvalidated).toBe(true);
  });
});

describe('financial mutation wiring', () => {
  const accounts = readFileSync(join(__dirname, '../pages/AccountsPage.tsx'), 'utf8');
  const expenses = readFileSync(join(__dirname, '../pages/ExpensesPage.tsx'), 'utf8');
  const albums = readFileSync(join(__dirname, '../pages/AlbumsPage.tsx'), 'utf8');
  const albumDetail = readFileSync(
    join(__dirname, '../components/albums/AlbumDetailModal.tsx'),
    'utf8',
  );
  const staffPayments = readFileSync(
    join(__dirname, '../components/bookings/BookingStaffPaymentsSection.tsx'),
    'utf8',
  );

  it('refreshes Reports from Accounts payment and expense success handlers only', () => {
    expect(accounts).toContain('invalidateAfterAccountsPayment(queryClient)');
    expect(accounts).toContain('invalidateAfterAccountsExpense(queryClient)');
    expect(accounts).not.toMatch(
      /onError:\s*\([^)]*\)\s*=>[\s\S]{0,80}invalidateAfterAccounts(Payment|Expense)/,
    );
  });

  it('invalidates expenses, accounts, and reports after Expense create/update/archive success', () => {
    expect(expenses).toContain('invalidateAfterAccountsExpense(queryClient)');
    expect(expenses.match(/invalidateAfterAccountsExpense\(queryClient\)/g)?.length).toBe(3);
    expect(expenses).not.toMatch(
      /onError:\s*\([^)]*\)\s*=>[\s\S]{0,80}invalidateAfterAccountsExpense/,
    );
  });

  it('invalidates album keys plus financial totals after album cost mutations, not photo selection', () => {
    expect(albums).toContain("invalidateQueries({ queryKey: ['albums'] })");
    expect(albums).toContain('invalidateAfterAccountsExpense(queryClient)');
    expect(albums.match(/invalidateAfterAccountsExpense\(queryClient\)/g)?.length).toBe(3);
    expect(albums).not.toMatch(
      /onError:\s*\([^)]*\)\s*=>[\s\S]{0,80}invalidateAfterAccountsExpense/,
    );
    expect(albumDetail).not.toContain('invalidateAfterAccountsExpense');
    expect(albumDetail).not.toContain("queryKey: ['reports']");
  });

  it('invalidates financial totals only for paid booking staff payments', () => {
    expect(staffPayments).toContain("queryKey: ['bookings', booking.id, 'staff-payments']");
    expect(staffPayments).toContain("queryKey: ['bookings', booking.id, 'activities']");
    expect(staffPayments).toContain("payment.status === 'paid'");
    expect(staffPayments).toContain('invalidateAfterAccountsExpense(queryClient)');
    expect(staffPayments).not.toMatch(
      /onError:\s*\([^)]*\)\s*=>[\s\S]{0,120}invalidateAfterAccountsExpense/,
    );
  });
});
