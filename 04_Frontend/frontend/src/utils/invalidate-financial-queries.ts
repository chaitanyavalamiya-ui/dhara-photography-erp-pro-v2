import type { QueryClient } from '@tanstack/react-query';

/** After an Accounts-recorded client payment (invoice receipt). */
export function invalidateAfterAccountsPayment(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['expenses'] });
  queryClient.invalidateQueries({ queryKey: ['invoices'] });
  queryClient.invalidateQueries({ queryKey: ['invoices', 'payment-select'] });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
}

/** After expense or paid staff-payment mutations that change cash totals. */
export function invalidateAfterAccountsExpense(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['expenses'] });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['reports'] });
}
