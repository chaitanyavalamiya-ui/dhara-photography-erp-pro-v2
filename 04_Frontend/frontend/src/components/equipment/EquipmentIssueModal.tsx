import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import {
  EQUIPMENT_CONDITIONS,
  EquipmentItem,
  equipmentService,
} from '@/services/equipment-service';
import { staffService } from '@/services/staff-service';
import { getApiErrorMessage } from '@/utils/api-error';

interface EquipmentIssueModalProps {
  open: boolean;
  bookingId: string;
  defaultStaffId?: string;
  onClose: () => void;
  onIssued: () => void;
}

export function EquipmentIssueModal({
  open,
  bookingId,
  defaultStaffId,
  onClose,
  onIssued,
}: EquipmentIssueModalProps) {
  const [staffId, setStaffId] = useState(defaultStaffId ?? '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<
    Record<string, { quantity: string; conditionOut: string; notes: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['equipment', 'catalog', search],
    queryFn: () => equipmentService.list({ search: search || undefined, limit: 100, status: 'AVAILABLE' }),
    enabled: open,
  });

  const staffQuery = useQuery({
    queryKey: ['staff', 'issue-modal'],
    queryFn: () => staffService.list({ limit: 100, status: 'active' }),
    enabled: open,
  });

  const items = catalogQuery.data?.items ?? [];

  const selectable = useMemo(
    () =>
      items.filter((item) => {
        if (item.trackingType === 'serialized') {
          return item.status === 'AVAILABLE' && item.availableQuantity > 0;
        }
        return item.availableQuantity > 0;
      }),
    [items],
  );

  const issueMutation = useMutation({
    mutationFn: async () => {
      const lines = Object.entries(selected)
        .filter(([, draft]) => Number(draft.quantity) > 0)
        .map(([equipmentId, draft]) => ({
          equipmentId,
          quantityIssued: Number(draft.quantity),
          conditionOut: draft.conditionOut,
          notes: draft.notes.trim() || undefined,
        }));
      if (!staffId) throw new Error('Select the staff member taking the equipment.');
      if (lines.length === 0) throw new Error('Select at least one available equipment item.');
      for (const line of lines) {
        const item = selectable.find((row) => row.id === line.equipmentId);
        if (!item) throw new Error('One or more selected items are no longer available.');
        if (line.quantityIssued > item.availableQuantity) {
          throw new Error(`Cannot issue more than ${item.availableQuantity} of ${item.name}.`);
        }
      }
      return equipmentService.createIssue({ bookingId, staffId, items: lines });
    },
    onSuccess: () => {
      setSelected({});
      onIssued();
      onClose();
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Failed to issue equipment.')),
  });

  if (!open) return null;

  const toggle = (item: EquipmentItem) => {
    setSelected((current) => {
      if (current[item.id]) {
        const next = { ...current };
        delete next[item.id];
        return next;
      }
      return {
        ...current,
        [item.id]: {
          quantity: item.trackingType === 'serialized' ? '1' : '1',
          conditionOut: item.condition || 'GOOD',
          notes: '',
        },
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Issue Equipment / Shoot Checklist</h2>
            <p className="text-sm text-gray-400">Record exactly what is leaving for the shoot.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Staff member</label>
            <select
              className="input-field"
              aria-label="Staff member"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Select staff</option>
              {(staffQuery.data?.items ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-500">Search inventory</label>
            <input
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, code, or serial"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-2 py-2">Take</th>
                <th className="px-2 py-2">Equipment</th>
                <th className="px-2 py-2">Available</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Condition Out</th>
              </tr>
            </thead>
            <tbody>
              {selectable.map((item) => {
                const draft = selected[item.id];
                return (
                  <tr key={item.id} className="border-t border-surface-border/60">
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={Boolean(draft)} onChange={() => toggle(item)} />
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.code}
                        {item.serialNumber ? ` · ${item.serialNumber}` : ''} · {item.category}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-gray-300">{item.availableQuantity}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        max={item.availableQuantity}
                        className="input-field w-20"
                        disabled={!draft || item.trackingType === 'serialized'}
                        value={draft?.quantity ?? '1'}
                        onChange={(e) =>
                          setSelected((current) => ({
                            ...current,
                            [item.id]: { ...current[item.id], quantity: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="input-field"
                        disabled={!draft}
                        value={draft?.conditionOut ?? 'GOOD'}
                        onChange={(e) =>
                          setSelected((current) => ({
                            ...current,
                            [item.id]: { ...current[item.id], conditionOut: e.target.value },
                          }))
                        }
                      >
                        {EQUIPMENT_CONDITIONS.map((condition) => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {selectable.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">No available equipment to issue.</p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={issueMutation.isPending}
            onClick={() => {
              setError(null);
              issueMutation.mutate();
            }}
          >
            Issue Equipment
          </button>
        </div>
      </div>
    </div>
  );
}
