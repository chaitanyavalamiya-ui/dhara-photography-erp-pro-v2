import { Booking } from '@/services/bookings-service';
import { BookingEquipmentItem } from '@/services/booking-operations-service';
import { BookingTeamMember } from '@/services/staff-service';
import { formatDate } from '@/utils/booking-form';
import {
  getDamagedQuantity,
  getRepairQuantity,
} from '@/utils/equipment-checklist';

interface EquipmentChecklistDocumentProps {
  booking: Booking;
  items: BookingEquipmentItem[];
  team: BookingTeamMember[];
  mode: 'issue' | 'return';
  id?: string;
}

function getPhotographerNames(team: BookingTeamMember[]): string {
  const photographers = team
    .filter((member) => member.role === 'photographer' || member.role === 'videographer')
    .map((member) => member.staffName);

  if (photographers.length > 0) return photographers.join(', ');
  if (team.length > 0) return team.map((member) => member.staffName).join(', ');
  return '—';
}

export function EquipmentChecklistDocument({
  booking,
  items,
  team,
  mode,
  id = 'equipment-checklist-document',
}: EquipmentChecklistDocumentProps) {
  const title = mode === 'issue' ? 'Equipment Issue Checklist' : 'Equipment Return Checklist';
  const issuedItems = items.filter((item) => item.quantityIssued > 0 || item.status !== 'not_issued');
  const rows = issuedItems.length > 0 ? issuedItems : items;

  return (
    <div
      id={id}
      className="mx-auto w-full max-w-[180mm] bg-white p-8 text-[#1a1a1a]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="border-b-4 border-[#6b1d3a] pb-4">
        <h1 className="text-xl font-bold text-[#6b1d3a]">Dhara Photography Patan</h1>
        <p className="text-sm text-[#b8860b]">{title}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Client</p>
          <p className="font-semibold">{booking.client.fullName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Booking No.</p>
          <p className="font-semibold">{booking.bookingNumber}</p>
        </div>
        <div>
          <p className="text-gray-500">Shoot Date</p>
          <p className="font-semibold">{booking.eventDate ? formatDate(booking.eventDate) : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Photographer / Staff</p>
          <p className="font-semibold">{getPhotographerNames(team)}</p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#6b1d3a] text-left">
            <th className="py-2 pr-2">✓</th>
            <th className="py-2 pr-2">Equipment</th>
            <th className="py-2 pr-2 text-center">Qty</th>
            {mode === 'return' && (
              <>
                <th className="py-2 pr-2 text-center">Issued</th>
                <th className="py-2 pr-2 text-center">Returned</th>
                <th className="py-2 pr-2 text-center">Missing</th>
                <th className="py-2 pr-2 text-center">Damaged</th>
                <th className="py-2 pr-2 text-center">Repair</th>
              </>
            )}
            <th className="py-2">Notes / Condition</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const repairQuantity = getRepairQuantity(item);
            const damagedQuantity = getDamagedQuantity(item);
            const notes =
              mode === 'issue'
                ? item.checkoutNotes ?? item.conditionCheckout ?? ''
                : item.returnNotes ?? item.conditionReturn ?? '';

            return (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2 pr-2 align-top">
                  <span className="inline-block h-4 w-4 border border-gray-500" />
                </td>
                <td className="py-2 pr-2 align-top font-medium">{item.equipmentName}</td>
                <td className="py-2 pr-2 text-center align-top">
                  {mode === 'issue' ? item.quantityIssued || '—' : item.quantityIssued}
                </td>
                {mode === 'return' && (
                  <>
                    <td className="py-2 pr-2 text-center align-top">{item.quantityIssued}</td>
                    <td className="py-2 pr-2 text-center align-top">{item.quantityReturned}</td>
                    <td className="py-2 pr-2 text-center align-top">{item.missingQuantity}</td>
                    <td className="py-2 pr-2 text-center align-top">{damagedQuantity}</td>
                    <td className="py-2 pr-2 text-center align-top">{repairQuantity}</td>
                  </>
                )}
                <td className="py-2 align-top text-gray-600">{notes || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {mode === 'return' && (
        <p className="mt-4 text-xs text-gray-500">
          Return date/time:{' '}
          {rows.find((item) => item.returnedAt)?.returnedAt
            ? formatDate(rows.find((item) => item.returnedAt)!.returnedAt!)
            : '________________'}
        </p>
      )}

      <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
        <div>
          <p className="mb-10 border-t border-gray-400 pt-2">Photographer Signature</p>
        </div>
        <div>
          <p className="mb-10 border-t border-gray-400 pt-2">Staff Signature</p>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
        Dhara Photography Patan — Equipment accountability checklist
      </div>
    </div>
  );
}
