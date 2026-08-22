export function bookingStatusClass(statusCode: string): string {
  switch (statusCode) {
    case 'confirmed':
      return 'is-gold';
    case 'completed':
      return 'is-ok';
    case 'cancelled':
      return 'is-off';
    case 'enquiry':
    default:
      return 'is-amber';
  }
}

export function bookingPaymentClass(status: string): string {
  if (status === 'Paid') return 'is-ok';
  if (status === 'Partial') return 'is-amber';
  return 'is-off';
}
