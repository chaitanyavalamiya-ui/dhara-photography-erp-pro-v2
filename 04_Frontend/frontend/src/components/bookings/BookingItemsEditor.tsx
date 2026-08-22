import { Check, Plus, Trash2 } from 'lucide-react';
import { BookingItem, ServiceRate } from '@/services/bookings-service';
import { calculateItemAmount, formatBookingCurrency } from '@/utils/booking-form';
import '@/pages/bookings/bookings-page.css';

interface BookingItemsEditorProps {
  items: BookingItem[];
  serviceRates: ServiceRate[];
  onChange: (items: BookingItem[]) => void;
}

export function BookingItemsEditor({ items, serviceRates, onChange }: BookingItemsEditorProps) {
  const updateItem = (index: number, patch: Partial<BookingItem>) => {
    const next = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      const updated = { ...item, ...patch };
      updated.amount = calculateItemAmount(
        updated.unit,
        Number(updated.rate) || 0,
        Number(updated.quantity) || 0,
        Number(updated.days) || 0,
      );

      return updated;
    });

    onChange(next);
  };

  const addService = (serviceRateId: string) => {
    const rate = serviceRates.find((entry) => entry.id === serviceRateId);
    if (!rate) return;

    const quantity = rate.unit === 'piece' ? 1 : 1;
    const days = rate.unit === 'day' ? 1 : 1;

    onChange([
      ...items,
      {
        serviceRateId: rate.id,
        serviceName: rate.name,
        quantity,
        unit: rate.unit,
        rate: rate.defaultRate,
        days,
        amount: calculateItemAmount(rate.unit, rate.defaultRate, quantity, days),
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="dhara-bookings-section space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3>Services</h3>
          <p className="text-[1.02rem] text-[#ffe7b8]">
            Add each service once. Use days or quantity to calculate the line amount.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field min-w-[220px]"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                addService(event.target.value);
                event.target.value = '';
              }
            }}
          >
            <option value="">Add service...</option>
            {serviceRates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name} ({formatBookingCurrency(rate.defaultRate)}
                {rate.unit === 'day' ? '/day' : ''})
              </option>
            ))}
          </select>
        </div>
      </div>

      {serviceRates.length > 0 && (
        <div className="dhara-bookings-chips">
          {serviceRates.map((rate) => {
            const selected = items.some((item) => item.serviceRateId === rate.id);
            return (
              <button
                key={rate.id}
                type="button"
                className={selected ? 'dhara-bookings-chip is-on' : 'dhara-bookings-chip'}
                onClick={() => addService(rate.id)}
              >
                <span>
                  <strong>{rate.name}</strong>
                  <small>
                    {formatBookingCurrency(rate.defaultRate)}
                    {rate.unit === 'day' ? ' / day' : ''}
                  </small>
                </span>
                {selected ? <Check className="h-5 w-5 text-[#ffd45a]" /> : null}
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border px-4 py-8 text-center text-sm text-gray-500">
          Add at least one service to create a booking.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-elevated text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">
                  {items.some((item) => item.unit === 'piece') ? 'Qty / Days' : 'Days'}
                </th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.serviceRateId ?? item.serviceName}-${index}`} className="border-t border-surface-border">
                  <td className="px-4 py-3 font-medium text-gray-100">{item.serviceName}</td>
                  <td className="px-4 py-3">
                    {item.unit === 'day' ? (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input-field w-24"
                        value={item.days}
                        onChange={(event) =>
                          updateItem(index, { days: Number(event.target.value) || 0 })
                        }
                      />
                    ) : (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input-field w-24"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: Number(event.target.value) || 0 })
                        }
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input-field w-32"
                      value={item.rate}
                      onChange={(event) =>
                        updateItem(index, { rate: Number(event.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gold">{formatBookingCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                      onClick={() => removeItem(index)}
                      aria-label="Remove service"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="dhara-bookings-ghost"
        onClick={() => {
          const firstRate = serviceRates[0];
          if (firstRate) {
            addService(firstRate.id);
            return;
          }

          onChange([
            ...items,
            {
              serviceName: 'Photography',
              quantity: 1,
              unit: 'day',
              rate: 0,
              days: 1,
              amount: 0,
            },
          ]);
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Quick Add First Service
      </button>
    </div>
  );
}
