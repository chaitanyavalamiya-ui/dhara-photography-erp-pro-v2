import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import { EQUIPMENT_CONDITIONS, EquipmentIssue, equipmentService } from '@/services/equipment-service';
import { getApiErrorMessage } from '@/utils/api-error';

interface EquipmentReturnModalProps {
  open: boolean;
  issue: EquipmentIssue | null;
  onClose: () => void;
  onReturned: () => void;
}

export function EquipmentReturnModal({ open, issue, onClose, onReturned }: EquipmentReturnModalProps) {
  const [drafts, setDrafts] = useState<Record<string, { quantityReturned: string; conditionIn: string; notes: string }>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issue) return;
    const next: Record<string, { quantityReturned: string; conditionIn: string; notes: string }> = {};
    for (const item of issue.items) {
      const outstanding = item.quantityIssued - item.quantityReturned - item.missingQuantity;
      next[item.id] = {
        quantityReturned: String(Math.max(outstanding, 0)),
        conditionIn: item.conditionOut || 'GOOD',
        notes: '',
      };
    }
    setDrafts(next);
  }, [issue]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!issue) throw new Error('Issue checklist not found.');
      const items = issue.items.map((item) => {
        const draft = drafts[item.id];
        const outstanding = item.quantityIssued - item.quantityReturned - item.missingQuantity;
        const quantityReturned = Number(draft?.quantityReturned ?? 0);
        if (quantityReturned > outstanding) {
          throw new Error(`Returned quantity cannot exceed issued quantity for ${item.equipmentName}.`);
        }
        return {
          issueItemId: item.id,
          quantityReturned,
          conditionIn: draft?.conditionIn ?? 'GOOD',
          notes: draft?.notes.trim() || undefined,
        };
      });
      return equipmentService.returnIssue(issue.id, { items });
    },
    onSuccess: () => {
      onReturned();
      onClose();
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Failed to return equipment.')),
  });

  if (!open || !issue) return null;

  const previewMissing = issue.items.reduce((sum, item) => {
    const outstanding = item.quantityIssued - item.quantityReturned - item.missingQuantity;
    const returned = Number(drafts[item.id]?.quantityReturned ?? 0);
    return sum + Math.max(outstanding - returned, 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gold">Return Equipment</h2>
            <p className="text-sm text-gray-400">
              {issue.issueNumber} · {issue.bookingNumber} · {issue.staffName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-gray-500">
                <th className="px-2 py-2">Equipment</th>
                <th className="px-2 py-2">Issued</th>
                <th className="px-2 py-2">Returned</th>
                <th className="px-2 py-2">Missing</th>
                <th className="px-2 py-2">Condition In</th>
              </tr>
            </thead>
            <tbody>
              {issue.items.map((item) => {
                const outstanding = item.quantityIssued - item.quantityReturned - item.missingQuantity;
                const returned = Number(drafts[item.id]?.quantityReturned ?? 0);
                const missing = Math.max(outstanding - returned, 0);
                return (
                  <tr key={item.id} className="border-t border-surface-border/60">
                    <td className="px-2 py-2">
                      {item.equipmentName}
                      <p className="text-xs text-gray-500">{item.serialNumber ?? item.equipmentCode}</p>
                    </td>
                    <td className="px-2 py-2">{item.quantityIssued}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={outstanding}
                        className="input-field w-20"
                        value={drafts[item.id]?.quantityReturned ?? '0'}
                        onChange={(e) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: { ...current[item.id], quantityReturned: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-orange-400">{missing}</td>
                    <td className="px-2 py-2">
                      <select
                        className="input-field"
                        value={drafts[item.id]?.conditionIn ?? 'GOOD'}
                        onChange={(e) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: { ...current[item.id], conditionIn: e.target.value },
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
        </div>

        {previewMissing > 0 && (
          <p className="mt-4 flex items-center gap-2 text-sm text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            WARNING: {previewMissing} ITEM{previewMissing === 1 ? '' : 'S'} MISSING
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            Save Return
          </button>
        </div>
      </div>
    </div>
  );
}
