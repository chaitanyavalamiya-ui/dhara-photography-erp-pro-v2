export function formatCurrencyForActivity(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
