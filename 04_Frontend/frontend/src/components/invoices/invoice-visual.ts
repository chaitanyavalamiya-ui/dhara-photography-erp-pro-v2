export function invoiceStatusTone(status: string): string {
  switch (status) {
    case 'paid':
      return 'is-paid';
    case 'partially_paid':
      return 'is-partial';
    case 'overdue':
      return 'is-overdue';
    default:
      return 'is-unpaid';
  }
}
