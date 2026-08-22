import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { bookingsService } from '@/services/bookings-service';
import { CreatePackagePayload, StudioPackage, UpdatePackagePayload } from '@/services/settings-service';
import { formatCurrency } from '@/utils/booking-form';
import '@/pages/settings/settings-page.css';

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

  const handleSubmit = (event: FormEvent) => {
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
    <div className="dhara-set-modal">
      <div className="dhara-set-modal-card is-profile">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2>{isEdit ? 'Edit Package' : 'Add Package'}</h2>
            <p className="dhara-set-modal-sub">Bundle services into a reusable booking package.</p>
          </div>
          <button type="button" onClick={onClose} className="dhara-set-icon-btn" aria-label="Close">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dhara-set-form">
          <div className="dhara-set-form-grid">
            <div>
              <label>Package Name</label>
              <input className="dhara-set-input" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label>Code</label>
              <input
                className="dhara-set-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEdit}
              />
            </div>
            <div className="dhara-set-span-2">
              <label>Description</label>
              <textarea
                rows={2}
                className="dhara-set-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label>Default Price (₹)</label>
              <input
                type="number"
                min="0"
                className="dhara-set-input"
                value={defaultPrice || estimatedSubtotal}
                onChange={(e) => setDefaultPrice(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label>Offer Price (₹)</label>
              <input
                type="number"
                min="0"
                className="dhara-set-input"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {isEdit && (
            <label className="dhara-set-check">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label>Included Services</label>
              <button
                type="button"
                className="dhara-set-btn"
                onClick={() => {
                  if (!serviceRates[0]) return;
                  setItems([...items, { serviceRateId: serviceRates[0].id, quantity: 1, days: 1 }]);
                }}
                disabled={serviceRates.length === 0}
              >
                <Plus />
                Add Service
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => {
                const rate = serviceRates.find((entry) => entry.id === item.serviceRateId);
                return (
                  <div key={`${item.serviceRateId}-${index}`} className="dhara-set-toolbar-row">
                    <select
                      className="dhara-set-input"
                      style={{ flex: '1 1 12rem' }}
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
                        className="dhara-set-input"
                        style={{ maxWidth: '6.5rem' }}
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
                        className="dhara-set-input"
                        style={{ maxWidth: '6.5rem' }}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...next[index], quantity: Number(e.target.value) || 1 };
                          setItems(next);
                        }}
                      />
                    )}
                    <span className="dhara-set-amt is-gold">
                      {rate ? formatCurrency(rate.defaultRate) : '—'}
                    </span>
                    <button
                      type="button"
                      className="dhara-set-icon-btn"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      disabled={items.length === 1}
                      aria-label="Remove service"
                    >
                      <Trash2 />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="dhara-set-note">
              Estimated subtotal from services: {formatCurrency(estimatedSubtotal)}
            </p>
          </div>

          <div className="dhara-set-form-actions">
            <button type="button" className="dhara-set-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dhara-set-btn is-gold" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
