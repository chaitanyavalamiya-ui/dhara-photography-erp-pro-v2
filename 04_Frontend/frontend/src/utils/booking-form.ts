import { BookingItem, ServiceRate } from '@/services/bookings-service';

export function calculateItemAmount(
  unit: 'day' | 'piece',
  rate: number,
  quantity: number,
  days: number,
): number {
  const amount = unit === 'day' ? rate * days : rate * quantity;
  return Math.round(amount * 100) / 100;
}

export function calculateBookingTotals(
  items: BookingItem[],
  discount: number,
  advanceAmount: number,
) {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const totalAmount = Math.round(Math.max(subtotal - discount, 0) * 100) / 100;
  const balanceAmount = Math.round(Math.max(totalAmount - advanceAmount, 0) * 100) / 100;

  return { subtotal, totalAmount, balanceAmount };
}

export function createItemFromRate(rate: ServiceRate): BookingItem {
  const quantity = rate.unit === 'piece' ? 1 : 1;
  const days = rate.unit === 'day' ? 1 : 1;

  return {
    serviceRateId: rate.id,
    serviceName: rate.name,
    quantity,
    unit: rate.unit,
    rate: rate.defaultRate,
    days,
    amount: calculateItemAmount(rate.unit, rate.defaultRate, quantity, days),
  };
}

export function expandPackageToBookingItems(
  pkg: {
    items: Array<{
      serviceRateId: string;
      serviceName: string;
      unit: string;
      quantity: number;
      days: number;
    }>;
    offerPrice?: number | null;
  },
  serviceRates: ServiceRate[],
): { items: BookingItem[]; discount: number } {
  const items = pkg.items.map((entry) => {
    const rate = serviceRates.find((service) => service.id === entry.serviceRateId);
    const unit = (rate?.unit ?? entry.unit) as 'day' | 'piece';
    const serviceRate = rate?.defaultRate ?? 0;
    const quantity = entry.quantity ?? 1;
    const days = entry.days ?? 1;

    return {
      serviceRateId: entry.serviceRateId,
      serviceName: rate?.name ?? entry.serviceName,
      quantity: unit === 'day' ? 1 : quantity,
      unit,
      rate: serviceRate,
      days: unit === 'day' ? days : 1,
      amount: calculateItemAmount(unit, serviceRate, quantity, days),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount =
    pkg.offerPrice !== null && pkg.offerPrice !== undefined && pkg.offerPrice < subtotal
      ? Math.round((subtotal - pkg.offerPrice) * 100) / 100
      : 0;

  return { items, discount };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
