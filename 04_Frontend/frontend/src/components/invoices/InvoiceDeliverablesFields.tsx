import {
  INVOICE_DELIVERABLE_OPTIONS,
  InvoiceDeliverables,
  VIDEO_DELIVERY_OPTIONS,
} from '@/utils/invoice-deliverables';

interface InvoiceDeliverablesFieldsProps {
  value: InvoiceDeliverables;
  onChange: (value: InvoiceDeliverables) => void;
}

export function InvoiceDeliverablesFields({ value, onChange }: InvoiceDeliverablesFieldsProps) {
  const toggleItem = (itemValue: string) => {
    const nextItems = value.items.includes(itemValue)
      ? value.items.filter((item) => item !== itemValue)
      : [...value.items, itemValue];
    onChange({ ...value, items: nextItems });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-300">Deliverables</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INVOICE_DELIVERABLE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                className="rounded border-surface-border"
                checked={value.items.includes(option.value)}
                onChange={() => toggleItem(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="video-delivery-media" className="mb-1.5 block text-sm font-medium text-gray-300">
          Video Delivery: Pendrive / Hard Disk
        </label>
        <select
          id="video-delivery-media"
          className="input-field"
          value={value.videoMedia}
          onChange={(event) =>
            onChange({
              ...value,
              videoMedia: event.target.value as InvoiceDeliverables['videoMedia'],
            })
          }
        >
          {VIDEO_DELIVERY_OPTIONS.map((option) => (
            <option key={option.value || 'unspecified'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Choose Pendrive for a normal order or Hard Disk for a large order. This does not change
          the invoice amount.
        </p>
      </div>
    </div>
  );
}
