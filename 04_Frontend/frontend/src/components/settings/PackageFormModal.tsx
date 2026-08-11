import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { CreatePackagePayload, StudioPackage, UpdatePackagePayload } from '@/services/settings-service';
import { formatCurrency } from '@/utils/booking-form';

interface PackageFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  pkg?: StudioPackage | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePackagePayload | UpdatePackagePayload) => void;
}

function labelToCode(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function PackageFormModal({
  open,
  mode,
  pkg,
  isSubmitting,
  onClose,
  onSubmit,
}: PackageFormModalProps) {
  const isEdit = mode === 'edit';

  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<Array<{ serviceRateId: string; quantity: number; days: number }>>([]);

  const serviceRatesQuery = useQuery({
    queryKey: ['bookings', 'service-rates'],
    queryFn: bookingsService.getServiceRates,
    enabled: open,
  });

  const serviceRates = serviceRatesQuery.data ?? [];

  useEffect(() => {
    if (!open) return;

    if (isEdit && pkg) {
      setLabel(pkg.label);
      setCode(pkg.code);
      setDescription(pkg.description ?? '');
      setDefaultPrice(pkg.defaultPrice);
      setOfferPrice(pkg.offerPrice !== null ? String(pkg.offerPrice) : '');
      setIsActive(pkg.isActive);
      setItems(
        pkg.items.map((item) => ({
          serviceRateId: item.serviceRateId,
          quantity: item.quantity,
          days: item.days,
        })),
      );
      return;
    }

    setLabel('');
    setCode('');
    setDescription('');
    setDefaultPrice(0);
    setOfferPrice('');
    setIsActive(true);
    setItems(serviceRates[0] ? [{ serviceRateId: serviceRates[0].id, quantity: 1, days: 1 }] : []);
  }, [open, isEdit, pkg, serviceRates]);

  useEffect(() => {
    if (!isEdit && label) {
      setCode(labelToCode(label));
    }
  }, [label, isEdit]);

  const estimatedSubtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const rate = serviceRates.find((entry) => entry.id === item.serviceRateId);
      if (!rate) return sum;
      const amount =
        rate.unit === 'day'
          ? rate.defaultRate * (item.days || 1)
          : rate.defaultRate * (item.quantity || 1);
      return sum + amount;
    }, 0);
  }, [items, serviceRates]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim() || items.length === 0) return;

    const payload = {
      label: label.trim(),
      description: description.trim() || undefined,
      defaultPrice: defaultPrice || estimatedSubtotal,
      offerPrice: offerPrice ? Number(offerPrice) : undefined,
      items,
      ...(isEdit ? { isActive } : { code: code.trim() }),
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">
              {isEdit ? 'Edit Package' : 'Add Package'}
            </h2>
            <p className="mt-1 text-sm text-gray-400">Bundle services into a reusable booking package.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Package Name</label>
              <input className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Code</label>
              <input
                className="input-field font-mono text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEdit}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Description</label>
            <textarea
              rows={2}
              className="input-field resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Default Price (₹)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={defaultPrice || estimatedSubtotal}
                onChange={(e) => setDefaultPrice(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Offer Price (₹)</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                className="rounded border-surface-border"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-gray-300">Included Services</label>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  if (!serviceRates[0]) return;
                  setItems([...items, { serviceRateId: serviceRates[0].id, quantity: 1, days: 1 }]);
                }}
                disabled={serviceRates.length === 0}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Service
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => {
                const rate = serviceRates.find((entry) => entry.id === item.serviceRateId);
                return (
                  <div key={`${item.serviceRateId}-${index}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border p-3">
                    <select
                      className="input-field min-w-[180px] flex-1"
                      value={item.serviceRateId}
                      onChange={(e) => {
                        const next = [...items];
                        next[index] = { ...next[index], serviceRateId: e.target.value };
                        setItems(next);
                      }}
                    >
                      {serviceRates.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                    {rate?.unit === 'day' ? (
                      <input
                        type="number"
                        min="1"
                        className="input-field w-24"
                        value={item.days}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...next[index], days: Number(e.target.value) || 1 };
                          setItems(next);
                        }}
                      />
                    ) : (
                      <input
                        type="number"
                        min="1"
                        className="input-field w-24"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...next[index], quantity: Number(e.target.value) || 1 };
                          setItems(next);
                        }}
                      />
                    )}
                    <span className="text-xs text-gray-500">
                      {rate ? formatCurrency(rate.defaultRate) : '—'}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 hover:text-red-400"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Estimated subtotal from services: {formatCurrency(estimatedSubtotal)}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-surface-border pt-5">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
