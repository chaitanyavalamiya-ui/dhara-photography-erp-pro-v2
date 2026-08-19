import { useEffect, useMemo, useState } from 'react';
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

type ReturnDraft = { quantityReturned: string; quantityMissing: string; conditionIn: string; notes: string };

function outstandingFor(item: { quantityIssued: number; quantityReturned: number; missingQuantity: number }) {
  return Math.max(item.quantityIssued - item.quantityReturned - item.missingQuantity, 0);
}

function parseQty(value: string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EquipmentReturnModal({ open, issue, onClose, onReturned }: EquipmentReturnModalProps) {
  const [drafts, setDrafts] = useState<Record<string, ReturnDraft>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!issue) return;
    const next: Record<string, ReturnDraft> = {};
    for (const item of issue.items) {
      const outstanding = outstandingFor(item);
      next[item.id] = {
        quantityReturned: String(outstanding),
        quantityMissing: '0',
        conditionIn: item.conditionOut || 'GOOD',
        notes: '',
      };
    }
    setDrafts(next);
  }, [issue]);

  const rowState = useMemo(() => {
    if (!issue) return [];
    return issue.items.map((item) => {
      const outstanding = outstandingFor(item);
      const quantityReturned = parseQty(drafts[item.id]?.quantityReturned);
      const quantityMissing = parseQty(drafts[item.id]?.quantityMissing);
      const overLimit = quantityReturned + quantityMissing > outstanding;
      const negative = quantityReturned < 0 || quantityMissing < 0;
      return {
        item,
        outstanding,
        quantityReturned,
        quantityMissing,
        overLimit,
        negative,
        invalid: overLimit || negative,
      };
    });
  }, [drafts, issue]);

  const previewMissing = rowState.reduce((sum, row) => sum + Math.max(row.quantityMissing, 0), 0);
  const hasInvalidRow = rowState.some((row) => row.invalid);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!issue) throw new Error('Issue checklist not found.');
      if (hasInvalidRow) {
        throw new Error('Returned plus missing quantity cannot exceed outstanding quantity.');
      }
      const items = rowState
        .filter((row) => row.quantityReturned + row.quantityMissing > 0)
        .map((row) => ({
          issueItemId: row.item.id,
          quantityReturned: row.quantityReturned,
          quantityMissing: row.quantityMissing,
          conditionIn: drafts[row.item.id]?.conditionIn ?? 'GOOD',
          notes: drafts[row.item.id]?.notes.trim() || undefined,
        }));
      if (items.length === 0) {
        throw new Error('Enter at least one returned or missing quantity.');
      }
      return equipmentService.returnIssue(issue.id, { items });
    },
    onSuccess: () => {
      onReturned();
      onClose();
    },
    onError: (err: unknown) => setError(getApiErrorMessage(err, 'Failed to return equipment.')),
  });

  if (!open || !issue) return null;

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
                <th className="px-2 py-2">Outstanding</th>
                <th className="px-2 py-2">Returned</th>
                <th className="px-2 py-2">Missing</th>
                <th className="px-2 py-2">Condition In</th>
              </tr>
            </thead>
            <tbody>
              {rowState.map((row) => {
                const remainingAfterThis = Math.max(row.outstanding - row.quantityReturned - row.quantityMissing, 0);
                return (
                  <tr key={row.item.id} className="border-t border-surface-border/60">
                    <td className="px-2 py-2">
                      {row.item.equipmentName}
                      <p className="text-xs text-gray-500">{row.item.serialNumber ?? row.item.equipmentCode}</p>
                    </td>
                    <td className="px-2 py-2">{row.item.quantityIssued}</td>
                    <td className="px-2 py-2">{row.outstanding}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={row.outstanding}
                        aria-label={`Returned quantity for ${row.item.equipmentName}`}
                        className="input-field w-20"
                        value={drafts[row.item.id]?.quantityReturned ?? '0'}
                        onChange={(e) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.item.id]: { ...current[row.item.id], quantityReturned: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        max={row.outstanding}
                        aria-label={`Missing quantity for ${row.item.equipmentName}`}
                        className="input-field w-20"
                        value={drafts[row.item.id]?.quantityMissing ?? '0'}
                        onChange={(e) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.item.id]: { ...current[row.item.id], quantityMissing: e.target.value },
                          }))
                        }
                      />
                      {row.invalid ? (
                        <p className="mt-1 text-xs text-red-400">Returned + missing cannot exceed outstanding.</p>
                      ) : remainingAfterThis > 0 && row.quantityReturned + row.quantityMissing > 0 ? (
                        <p className="mt-1 text-xs text-gray-500">{remainingAfterThis} still outstanding</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="input-field"
                        aria-label={`Condition in for ${row.item.equipmentName}`}
                        value={drafts[row.item.id]?.conditionIn ?? 'GOOD'}
                        onChange={(e) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.item.id]: { ...current[row.item.id], conditionIn: e.target.value },
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

        {previewMissing > 0 && !hasInvalidRow && (
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
            disabled={mutation.isPending || hasInvalidRow}
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
