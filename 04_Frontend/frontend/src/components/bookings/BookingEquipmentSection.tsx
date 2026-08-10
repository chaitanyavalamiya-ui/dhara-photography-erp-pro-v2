import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import {
  bookingOperationsService,
  BookingEquipmentItem,
} from '@/services/booking-operations-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { cn } from '@/utils/cn';

interface BookingEquipmentSectionProps {
  booking: Booking;
}

export function BookingEquipmentSection({ booking }: BookingEquipmentSectionProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('bookings.update'));
  const [name, setName] = useState('');
  const [activeItem, setActiveItem] = useState<BookingEquipmentItem | null>(null);
  const [checkoutQty, setCheckoutQty] = useState('1');
  const [issuedBy, setIssuedBy] = useState('');
  const [returnQty, setReturnQty] = useState('');

  const equipmentQuery = useQuery({
    queryKey: ['bookings', booking.id, 'equipment'],
    queryFn: () => bookingOperationsService.listEquipment(booking.id),
  });

  const createMutation = useMutation({
    mutationFn: () => bookingOperationsService.createEquipment(booking.id, { equipmentName: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'equipment'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] });
      setName('');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (item: BookingEquipmentItem) =>
      bookingOperationsService.checkoutEquipment(booking.id, item.id, {
        quantityIssued: Number(checkoutQty),
        issuedByName: issuedBy || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'equipment'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] });
      setActiveItem(null);
    },
  });

  const returnMutation = useMutation({
    mutationFn: (item: BookingEquipmentItem) =>
      bookingOperationsService.returnEquipment(booking.id, item.id, {
        quantityReturned: Number(returnQty),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'equipment'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] });
      setActiveItem(null);
    },
  });

  const items = equipmentQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canUpdate && (
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) createMutation.mutate();
          }}
        >
          <input
            className="input-field flex-1"
            placeholder="Equipment name (Camera, Lens, Tripod...)"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </button>
        </form>
      )}

      {equipmentQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading equipment...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No equipment items added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-surface-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-100">{item.equipmentName}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {item.quantityReturned}/{item.quantityIssued} returned
                    {item.issuedAt ? ` · Issued ${formatDate(item.issuedAt)}` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    item.status === 'returned'
                      ? 'bg-green-500/10 text-green-400'
                      : item.status === 'issued'
                        ? 'bg-gold/10 text-gold'
                        : 'bg-gray-500/10 text-gray-400',
                  )}
                >
                  {item.statusLabel}
                </span>
              </div>
              {canUpdate && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status === 'not_issued' && (
                    <button
                      type="button"
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={() => {
                        setActiveItem(item);
                        setCheckoutQty('1');
                        setReturnQty('1');
                      }}
                    >
                      Checkout
                    </button>
                  )}
                  {item.status !== 'not_issued' && item.status !== 'returned' && (
                    <button
                      type="button"
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={() => {
                        setActiveItem(item);
                        setReturnQty(String(item.quantityIssued - item.quantityReturned));
                      }}
                    >
                      Return
                    </button>
                  )}
                </div>
              )}
              {activeItem?.id === item.id && (
                <div className="mt-3 rounded border border-gold/20 bg-surface p-3">
                  {item.status === 'not_issued' ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        min="1"
                        className="input-field w-24"
                        value={checkoutQty}
                        onChange={(e) => setCheckoutQty(e.target.value)}
                      />
                      <input
                        className="input-field flex-1"
                        placeholder="Issued by"
                        value={issuedBy}
                        onChange={(e) => setIssuedBy(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-primary px-3 py-1 text-xs"
                        onClick={() => checkoutMutation.mutate(item)}
                      >
                        Confirm Checkout
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        min="0"
                        className="input-field w-24"
                        value={returnQty}
                        onChange={(e) => setReturnQty(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-primary px-3 py-1 text-xs"
                        onClick={() => returnMutation.mutate(item)}
                      >
                        Confirm Return
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
