import { X } from 'lucide-react';
import { Client } from '@/services/clients-service';
import { formatCurrency, formatDate } from '@/utils/client-form';

interface ClientViewModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientViewModal({ open, client, onClose, onEdit }: ClientViewModalProps) {
  if (!open || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{client.clientNumber}</p>
            <h2 className="font-display text-2xl font-semibold text-gold">{client.fullName}</h2>
            <p className="mt-1 text-sm text-gray-400">{client.status}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-gold"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Mobile', client.mobile],
            ['WhatsApp', client.whatsapp || '—'],
            ['Email', client.email || '—'],
            ['City', client.city || '—'],
            ['Address', client.address || '—'],
            ['Birthday', formatDate(client.dateOfBirth)],
            ['Anniversary', formatDate(client.anniversaryDate)],
            ['Total Bookings', String(client.totalBookings)],
            ['Total Amount', formatCurrency(client.totalAmount)],
            ['Outstanding Balance', formatCurrency(client.outstandingBalance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-surface-border bg-surface-elevated p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
              <p className="mt-1 text-sm text-gray-100">{value}</p>
            </div>
          ))}
        </div>

        {client.notes && (
          <div className="mt-4 rounded-lg border border-surface-border bg-surface-elevated p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">{client.notes}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-surface-border pt-5">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => onEdit(client)}>
            Edit Client
          </button>
        </div>
      </div>
    </div>
  );
}
