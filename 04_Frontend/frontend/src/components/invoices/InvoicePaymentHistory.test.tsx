import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvoicePaymentHistory } from './InvoicePaymentHistory';
import { Payment } from '@/services/payments-service';
import { formatCurrency } from '@/utils/booking-form';

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-1',
    bookingId: 'bk-1',
    bookingNumber: 'BK-1',
    clientId: 'cl-1',
    clientName: 'Asha',
    clientMobile: '9876543210',
    amount: 5000,
    paymentDate: '2026-08-10',
    paymentModeCode: 'cash',
    paymentModeLabel: 'Cash',
    createdAt: '2026-08-10T00:00:00.000Z',
    isVoided: false,
    ...overrides,
  };
}

describe('InvoicePaymentHistory', () => {
  it('counts only active payments toward total paid', () => {
    render(
      <InvoicePaymentHistory
        payments={[
          payment({ id: 'a', amount: 5000 }),
          payment({ id: 'b', amount: 2000, isVoided: true, receiptNumber: 'RCPT-2' }),
        ]}
      />,
    );

    expect(screen.getByText(formatCurrency(5000), { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Voided')).toBeInTheDocument();
  });

  it('shows void action for active payments when allowed', () => {
    const onVoid = vi.fn();
    render(
      <InvoicePaymentHistory
        canVoid
        payments={[payment({ receiptNumber: 'RCPT-1' })]}
        onVoid={onVoid}
      />,
    );

    screen.getByRole('button', { name: 'Void' }).click();
    expect(onVoid).toHaveBeenCalled();
  });

  it('hides void action when payments.update is not granted', () => {
    render(
      <InvoicePaymentHistory
        canVoid={false}
        payments={[payment({ receiptNumber: 'RCPT-1' })]}
        onVoid={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });

  it('hides void action on already voided payments', () => {
    render(
      <InvoicePaymentHistory
        canVoid
        payments={[payment({ isVoided: true, receiptNumber: 'RCPT-2' })]}
        onVoid={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });
});
