import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardCheck, Plus, Printer, RotateCcw, Send } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import {
  bookingOperationsService,
  BookingEquipmentItem,
} from '@/services/booking-operations-service';
import { staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import {
  areAllEquipmentItemsAccounted,
  EQUIPMENT_PRESETS,
  getEquipmentStatusBadgeClass,
  getDamagedQuantity,
  getInventoryStatusLabel,
  getRepairQuantity,
  isEquipmentFullyAccounted,
  isEquipmentIssued,
  mergeEquipmentRows,
} from '@/utils/equipment-checklist';
import { printEquipmentChecklist } from '@/utils/equipment-print';
import { EquipmentChecklistDocument } from './EquipmentChecklistDocument';
import { cn } from '@/utils/cn';

interface BookingEquipmentSectionProps {
  booking: Booking;
}

type SectionMode = 'checklist' | 'issue' | 'return';

interface ChecklistDraft {
  selected: boolean;
  quantity: string;
  notes: string;
}

interface ReturnDraft {
  quantityReturned: string;
  missingQuantity: string;
  damagedQuantity: string;
  repairQuantity: string;
  conditionRemark: string;
}

function createDraft(selected = false, quantity = '1', notes = ''): ChecklistDraft {
  return { selected, quantity, notes };
}

function createReturnDraft(item?: BookingEquipmentItem): ReturnDraft {
  if (!item) {
    return {
      quantityReturned: '0',
      missingQuantity: '0',
      damagedQuantity: '0',
      repairQuantity: '0',
      conditionRemark: '',
    };
  }

  const outstanding = Math.max(
    item.quantityIssued -
      item.quantityReturned -
      item.missingQuantity -
      getDamagedQuantity(item) -
      getRepairQuantity(item),
    0,
  );

  return {
    quantityReturned: String(outstanding),
    missingQuantity: '0',
    damagedQuantity: '0',
    repairQuantity: '0',
    conditionRemark: item.returnNotes ?? '',
  };
}

export function BookingEquipmentSection({ booking }: BookingEquipmentSectionProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('bookings.update'));
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<SectionMode>('checklist');
  const [customName, setCustomName] = useState('');
  const [issuedByName, setIssuedByName] = useState(user?.fullName ?? '');
  const [drafts, setDrafts] = useState<Record<string, ChecklistDraft>>({});
  const [returnDrafts, setReturnDrafts] = useState<Record<string, ReturnDraft>>({});
  const [printMode, setPrintMode] = useState<'issue' | 'return' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const equipmentQuery = useQuery({
    queryKey: ['bookings', booking.id, 'equipment'],
    queryFn: () => bookingOperationsService.listEquipment(booking.id),
  });

  const teamQuery = useQuery({
    queryKey: ['bookings', booking.id, 'staff'],
    queryFn: () => staffService.listBookingTeam(booking.id),
    initialData: booking.team,
  });

  const items = equipmentQuery.data ?? [];
  const team = teamQuery.data ?? [];

  const rows = useMemo(() => {
    const selectedNames = new Set(
      Object.entries(drafts)
        .filter(([, draft]) => draft.selected)
        .map(([name]) => name),
    );
    return mergeEquipmentRows(items, selectedNames);
  }, [items, drafts]);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const row of mergeEquipmentRows(items, new Set())) {
        if (!next[row.name]) {
          next[row.name] = createDraft(Boolean(row.item), String(row.item?.quantityIssued || 1), row.item?.checkoutNotes ?? '');
        }
      }
      return next;
    });

    setReturnDrafts((current) => {
      const next = { ...current };
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = createReturnDraft(item);
        }
      }
      return next;
    });
  }, [items]);

  const invalidateEquipment = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'progress'] }),
    ]);
  };

  const issueMutation = useMutation({
    mutationFn: async () => {
      const selectedRows = rows.filter((row) => drafts[row.name]?.selected);
      if (selectedRows.length === 0) {
        throw new Error('Select at least one equipment item to issue.');
      }

      for (const row of selectedRows) {
        const draft = drafts[row.name];
        const quantity = Number(draft.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`Enter a valid quantity for ${row.name}.`);
        }

        let item = row.item;
        if (!item) {
          item = await bookingOperationsService.createEquipment(booking.id, {
            equipmentName: row.name,
          });
        }

        if (item.status === 'not_issued' || item.quantityIssued <= 0) {
          await bookingOperationsService.checkoutEquipment(booking.id, item.id, {
            quantityIssued: quantity,
            issuedByName: issuedByName || undefined,
            checkoutNotes: draft.notes || undefined,
          });
        }
      }

      await bookingOperationsService.updateProgress(booking.id, 'equipment_issued');
    },
    onSuccess: async () => {
      setError(null);
      setMode('checklist');
      await invalidateEquipment();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to issue equipment.');
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const issuedItems = items.filter(isEquipmentIssued);
      const pendingItems = issuedItems.filter((item) => !isEquipmentFullyAccounted(item));

      if (pendingItems.length === 0) {
        throw new Error('All issued equipment is already accounted for.');
      }

      for (const item of pendingItems) {
        const draft = returnDrafts[item.id] ?? createReturnDraft(item);
        const quantityReturned = Number(draft.quantityReturned);
        const missingQuantity = Number(draft.missingQuantity);
        const damagedQuantity = Number(draft.damagedQuantity);
        const repairQuantity = Number(draft.repairQuantity);
        const accounted =
          quantityReturned + missingQuantity + damagedQuantity + repairQuantity;

        if (accounted <= 0) continue;

        if (accounted > item.quantityIssued) {
          throw new Error(`${item.equipmentName}: quantities exceed issued amount.`);
        }

        await bookingOperationsService.returnEquipment(booking.id, item.id, {
          quantityReturned,
          missingQuantity,
          damagedQuantity,
          repairQuantity,
          returnNotes: draft.conditionRemark || undefined,
        });
      }
    },
    onSuccess: async () => {
      setError(null);
      setMode('checklist');
      await invalidateEquipment();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to return equipment.');
    },
  });

  const addCustomMutation = useMutation({
    mutationFn: async () => {
      const name = customName.trim();
      if (!name) throw new Error('Enter an equipment name.');
      await bookingOperationsService.createEquipment(booking.id, { equipmentName: name });
    },
    onSuccess: async () => {
      setCustomName('');
      setError(null);
      await invalidateEquipment();
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to add equipment item.');
    },
  });

  const allAccounted = areAllEquipmentItemsAccounted(items);
  const issuedCount = items.filter(isEquipmentIssued).length;
  const printableItems = items.length > 0 ? items : rows.map((row, index) => ({
    id: `draft-${index}`,
    equipmentName: row.name,
    quantityIssued: Number(drafts[row.name]?.quantity || 0),
    quantityReturned: 0,
    status: 'not_issued',
    statusLabel: 'Not Issued',
    missingQuantity: 0,
    damagedQuantity: 0,
    repairQuantity: 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canUpdate && (
          <>
            <button
              type="button"
              className={cn('btn-primary px-3 py-1.5 text-xs', mode === 'issue' && 'ring-2 ring-gold/40')}
              onClick={() => setMode(mode === 'issue' ? 'checklist' : 'issue')}
            >
              <Send className="mr-1 inline h-3.5 w-3.5" />
              Issue Equipment
            </button>
            <button
              type="button"
              className={cn('btn-secondary px-3 py-1.5 text-xs', mode === 'return' && 'ring-2 ring-gold/40')}
              onClick={() => setMode(mode === 'return' ? 'checklist' : 'return')}
              disabled={issuedCount === 0}
            >
              <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
              Return Equipment
            </button>
          </>
        )}
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => setPrintMode('issue')}
        >
          <Printer className="mr-1 inline h-3.5 w-3.5" />
          Print Issue List
        </button>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => setPrintMode('return')}
          disabled={issuedCount === 0}
        >
          <Printer className="mr-1 inline h-3.5 w-3.5" />
          Print Return List
        </button>
      </div>

      {!allAccounted && issuedCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Equipment workflow is incomplete. All issued items must be fully returned, missing,
            damaged, or sent for repair before the booking equipment process is complete.
          </p>
        </div>
      )}

      {mode === 'issue' && canUpdate && (
        <div className="rounded-lg border border-gold/20 bg-surface p-3">
          <label className="text-xs text-gray-400">Issued by</label>
          <input
            className="input-field mt-1"
            value={issuedByName}
            onChange={(event) => setIssuedByName(event.target.value)}
            placeholder="Staff / photographer name"
          />
        </div>
      )}

      {canUpdate && (
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            addCustomMutation.mutate();
          }}
        >
          <input
            className="input-field flex-1"
            placeholder="Add other equipment from master list..."
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            list="equipment-preset-options"
          />
          <datalist id="equipment-preset-options">
            {EQUIPMENT_PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
          <button type="submit" className="btn-secondary" disabled={addCustomMutation.isPending}>
            <Plus className="mr-1 h-4 w-4" />
            Add Item
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {equipmentQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading equipment checklist...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-elevated text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {mode !== 'return' && <th className="px-3 py-2">✓</th>}
                <th className="px-3 py-2">Equipment</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Inventory</th>
                {mode === 'return' && (
                  <>
                    <th className="px-3 py-2">Returned</th>
                    <th className="px-3 py-2">Missing</th>
                    <th className="px-3 py-2">Damaged</th>
                    <th className="px-3 py-2">Repair</th>
                    <th className="px-3 py-2">Remark</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const item = row.item;
                const draft = drafts[row.name] ?? createDraft();
                const returnDraft = item ? returnDrafts[item.id] ?? createReturnDraft(item) : null;
                const disabledIssue = item ? isEquipmentIssued(item) : false;

                return (
                  <tr key={row.name} className="border-t border-surface-border">
                    {mode !== 'return' && (
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          disabled={!canUpdate || (mode === 'issue' && disabledIssue)}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.name]: { ...draft, selected: event.target.checked },
                            }))
                          }
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 align-top font-medium text-gray-100">{row.name}</td>
                    <td className="px-3 py-3 align-top">
                      {mode === 'return' && item ? (
                        <span>{item.quantityIssued}</span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          className="input-field w-20"
                          value={draft.quantity}
                          disabled={!canUpdate || disabledIssue}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.name]: { ...draft, quantity: event.target.value },
                            }))
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {mode === 'return' && item ? (
                        <span className="text-gray-400">{item.checkoutNotes || '—'}</span>
                      ) : (
                        <input
                          className="input-field min-w-[160px]"
                          value={draft.notes}
                          disabled={!canUpdate || disabledIssue}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [row.name]: { ...draft, notes: event.target.value },
                            }))
                          }
                          placeholder="Notes"
                        />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {item ? (
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            getEquipmentStatusBadgeClass(item.status),
                          )}
                        >
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Not added</span>
                      )}
                      {item?.issuedAt && (
                        <p className="mt-1 text-xs text-gray-500">Issued {formatDate(item.issuedAt)}</p>
                      )}
                      {item?.returnedAt && (
                        <p className="mt-1 text-xs text-gray-500">Returned {formatDate(item.returnedAt)}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-gray-400">
                      {item ? getInventoryStatusLabel(item) : '—'}
                    </td>
                    {mode === 'return' && item && returnDraft && (
                      <>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="number"
                            min="0"
                            className="input-field w-20"
                            value={returnDraft.quantityReturned}
                            disabled={!canUpdate || isEquipmentFullyAccounted(item)}
                            onChange={(event) =>
                              setReturnDrafts((current) => ({
                                ...current,
                                [item.id]: { ...returnDraft, quantityReturned: event.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="number"
                            min="0"
                            className="input-field w-20"
                            value={returnDraft.missingQuantity}
                            disabled={!canUpdate || isEquipmentFullyAccounted(item)}
                            onChange={(event) =>
                              setReturnDrafts((current) => ({
                                ...current,
                                [item.id]: { ...returnDraft, missingQuantity: event.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="number"
                            min="0"
                            className="input-field w-20"
                            value={returnDraft.damagedQuantity}
                            disabled={!canUpdate || isEquipmentFullyAccounted(item)}
                            onChange={(event) =>
                              setReturnDrafts((current) => ({
                                ...current,
                                [item.id]: { ...returnDraft, damagedQuantity: event.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            type="number"
                            min="0"
                            className="input-field w-20"
                            value={returnDraft.repairQuantity}
                            disabled={!canUpdate || isEquipmentFullyAccounted(item)}
                            onChange={(event) =>
                              setReturnDrafts((current) => ({
                                ...current,
                                [item.id]: { ...returnDraft, repairQuantity: event.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            className="input-field min-w-[160px]"
                            value={returnDraft.conditionRemark}
                            disabled={!canUpdate || isEquipmentFullyAccounted(item)}
                            onChange={(event) =>
                              setReturnDrafts((current) => ({
                                ...current,
                                [item.id]: { ...returnDraft, conditionRemark: event.target.value },
                              }))
                            }
                            placeholder="Condition / remark"
                          />
                        </td>
                      </>
                    )}
                    {mode === 'return' && !item && (
                      <>
                        <td className="px-3 py-3" colSpan={5}>
                          <span className="text-xs text-gray-500">Not issued</span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'issue' && canUpdate && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={issueMutation.isPending}
            onClick={() => issueMutation.mutate()}
          >
            <ClipboardCheck className="mr-1 h-4 w-4" />
            {issueMutation.isPending ? 'Issuing...' : 'Confirm Issue'}
          </button>
        </div>
      )}

      {mode === 'return' && canUpdate && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={returnMutation.isPending}
            onClick={() => returnMutation.mutate()}
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            {returnMutation.isPending ? 'Saving returns...' : 'Confirm Return'}
          </button>
        </div>
      )}

      {printMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <p className="font-medium text-gray-800">
                {printMode === 'issue' ? 'Print Issue Checklist' : 'Print Return Checklist'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() =>
                    printEquipmentChecklist(
                      'equipment-checklist-document',
                      printMode === 'issue' ? 'Equipment Issue Checklist' : 'Equipment Return Checklist',
                    )
                  }
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => setPrintMode(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <EquipmentChecklistDocument
              booking={booking}
              items={printableItems as BookingEquipmentItem[]}
              team={team}
              mode={printMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
