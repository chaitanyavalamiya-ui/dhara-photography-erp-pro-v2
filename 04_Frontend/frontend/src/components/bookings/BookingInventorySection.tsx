import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, Printer } from 'lucide-react';
import { Booking } from '@/services/bookings-service';
import { EquipmentIssue, equipmentService } from '@/services/equipment-service';
import { staffService } from '@/services/staff-service';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/utils/booking-form';
import { groupBookingEquipmentByStaff } from '@/utils/equipment-possession';
import { printEquipmentChecklist } from '@/utils/equipment-print';
import { downloadEquipmentChecklistPdf } from '@/utils/equipment-issue-pdf';
import { getApiErrorMessage } from '@/utils/api-error';
import { EquipmentIssueModal } from '@/components/equipment/EquipmentIssueModal';
import { EquipmentReturnModal } from '@/components/equipment/EquipmentReturnModal';
import {
  EquipmentIssueDocument,
  EquipmentReturnDocument,
} from '@/components/equipment/EquipmentChecklistDocuments';

interface BookingInventorySectionProps {
  booking: Booking;
}

export function BookingInventorySection({ booking }: BookingInventorySectionProps) {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canIssue = hasPermission('equipment.issue');
  const canReturn = hasPermission('equipment.return');
  const canExport = hasPermission('equipment.export') || hasPermission('equipment.read');
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnIssue, setReturnIssue] = useState<EquipmentIssue | null>(null);
  const [printIssue, setPrintIssue] = useState<EquipmentIssue | null>(null);
  const [printKind, setPrintKind] = useState<'issue' | 'return'>('issue');
  const [pdfError, setPdfError] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ['equipment', 'booking', booking.id],
    queryFn: () => equipmentService.getBookingOverview(booking.id),
    enabled: hasPermission('equipment.read'),
  });

  const teamQuery = useQuery({
    queryKey: ['bookings', booking.id, 'staff'],
    queryFn: () => staffService.listBookingTeam(booking.id),
    enabled: canIssue,
  });

  const overview = overviewQuery.data;
  const staffGroups = groupBookingEquipmentByStaff(overview?.issues ?? []);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const handlePdf = async () => {
    if (!printIssue) return;
    try {
      setPdfError(null);
      await downloadEquipmentChecklistPdf(
        printKind === 'issue' ? 'equipment-issue-print' : 'equipment-return-print',
        printKind,
        printIssue.issueNumber,
      );
    } catch (error) {
      setPdfError(getApiErrorMessage(error, 'Failed to generate PDF.'));
    }
  };

  if (!hasPermission('equipment.read')) {
    return <p className="text-sm text-gray-400">You do not have permission to view equipment inventory.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-gold">Studio Equipment Issue</h3>
          <p className="text-xs text-gray-500">
            Track studio stock and which staff member currently has each item.
          </p>
        </div>
        {canIssue && (
          <button type="button" className="btn-primary" onClick={() => setIssueOpen(true)}>
            <Camera className="mr-2 inline h-4 w-4" />
            Issue Equipment
          </button>
        )}
      </div>

      {overview && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Issued', overview.summary.totalIssued],
            ['Returned', overview.summary.totalReturned],
            ['Missing', overview.summary.totalMissing],
            ['Damaged', overview.summary.totalDamaged],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-surface-border bg-surface-elevated p-3">
              <p className="text-xs uppercase text-gray-500">{label}</p>
              <p className="mt-1 font-display text-xl text-gold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {staffGroups.length > 0 && (
        <div className="space-y-3">
          {staffGroups.map((group) => (
            <div key={group.staffId} className="rounded-lg border border-surface-border p-3 text-sm">
              <p className="font-semibold text-gold">{group.staffName}</p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item.key} className="text-gray-300">
                    {item.equipmentName} × {item.displayQuantity} — {item.state}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {(overview?.issues ?? []).map((issue) => (
        <div key={issue.id} className="rounded-lg border border-surface-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-gray-100">
                {issue.issueNumber} · {issue.staffName}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(issue.issuedAt)} · {issue.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReturn && issue.status !== 'COMPLETED' && (
                <button type="button" className="btn-secondary text-xs" onClick={() => setReturnIssue(issue)}>
                  Return Equipment
                </button>
              )}
              {canExport && (
                <>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setPrintKind('issue');
                      setPrintIssue(issue);
                    }}
                  >
                    Print Issue Sheet
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setPrintKind('return');
                      setPrintIssue(issue);
                    }}
                  >
                    Print Return Sheet
                  </button>
                </>
              )}
            </div>
          </div>
          {issue.summary.totalMissing > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              WARNING: {issue.summary.totalMissing} ITEM{issue.summary.totalMissing === 1 ? '' : 'S'} MISSING
            </p>
          )}
        </div>
      ))}

      {(overview?.issues.length ?? 0) === 0 && (
        <p className="text-sm text-gray-400">No inventory has been issued for this booking yet.</p>
      )}

      <EquipmentIssueModal
        open={issueOpen}
        bookingId={booking.id}
        defaultStaffId={teamQuery.data?.[0]?.staffId}
        onClose={() => setIssueOpen(false)}
        onIssued={refresh}
      />
      <EquipmentReturnModal
        open={Boolean(returnIssue)}
        issue={returnIssue}
        onClose={() => setReturnIssue(null)}
        onReturned={refresh}
      />

      {printIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4">
            <div className="mb-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary text-xs text-gray-800"
                onClick={() =>
                  printEquipmentChecklist(
                    printKind === 'issue' ? 'equipment-issue-print' : 'equipment-return-print',
                    printIssue.issueNumber,
                  )
                }
              >
                <Printer className="mr-1 inline h-3.5 w-3.5" />
                PRINT
              </button>
              <button type="button" className="btn-primary text-xs" onClick={() => void handlePdf()}>
                PDF
              </button>
              <button type="button" className="btn-secondary text-xs text-gray-800" onClick={() => setPrintIssue(null)}>
                Close
              </button>
            </div>
            {pdfError && <p className="mb-2 text-sm text-red-600">{pdfError}</p>}
            <div id={printKind === 'issue' ? 'equipment-issue-print' : 'equipment-return-print'}>
              {printKind === 'issue' ? (
                <EquipmentIssueDocument issue={printIssue} />
              ) : (
                <EquipmentReturnDocument issue={printIssue} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
