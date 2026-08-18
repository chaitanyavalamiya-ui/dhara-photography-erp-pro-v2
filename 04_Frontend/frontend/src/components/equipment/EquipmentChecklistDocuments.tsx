import { EquipmentIssue } from '@/services/equipment-service';
import { formatDate } from '@/utils/booking-form';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EquipmentIssueDocument({ issue }: { issue: EquipmentIssue }) {
  const totalItems = issue.items.length;
  const totalQty = issue.summary.totalIssued;

  return (
    <div className="space-y-5 bg-white p-8 text-[#1a1a1a]">
      <div className="border-b-4 border-[#6b1d3a] pb-3">
        <h1 className="text-2xl font-bold text-[#6b1d3a]">Dhara Photography</h1>
        <p className="text-sm text-[#b8860b]">Equipment Issue / Shoot Checklist</p>
        <p className="mt-1 text-xs">{issue.issueNumber}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><strong>Booking No.:</strong> {issue.bookingNumber}</p>
        <p><strong>Client Name:</strong> {issue.clientName}</p>
        <p><strong>Shoot/Event:</strong> {issue.eventType ?? '—'}</p>
        <p><strong>Shoot Date:</strong> {formatDate(issue.eventDate)}</p>
        <p><strong>Staff Name:</strong> {issue.staffName}</p>
        <p><strong>Issue Date:</strong> {formatDateTime(issue.issuedAt)}</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#f4eee8] text-left">
            {['Equipment', 'Category', 'Qty', 'Serial/ID', 'Condition Out', 'Notes'].map((h) => (
              <th key={h} className="border border-[#d6c7b8] px-2 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issue.items.map((item) => (
            <tr key={item.id}>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.equipmentName}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.category}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.quantityIssued}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.serialNumber ?? item.equipmentCode}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.conditionOut}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm"><strong>Total Items:</strong> {totalItems} &nbsp; <strong>Total Quantity:</strong> {totalQty}</p>
      <div className="grid grid-cols-2 gap-6 pt-8 text-sm">
        <p>Staff Signature: __________________</p>
        <p>Manager/Owner Signature: __________________</p>
        <p>Issued By: __________________</p>
        <p>Issued Date/Time: __________________</p>
      </div>
    </div>
  );
}

export function EquipmentReturnDocument({ issue }: { issue: EquipmentIssue }) {
  return (
    <div className="space-y-5 bg-white p-8 text-[#1a1a1a]">
      <div className="border-b-4 border-[#6b1d3a] pb-3">
        <h1 className="text-2xl font-bold text-[#6b1d3a]">Dhara Photography</h1>
        <p className="text-sm text-[#b8860b]">Equipment Return Checklist</p>
        <p className="mt-1 text-xs">{issue.issueNumber}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><strong>Booking:</strong> {issue.bookingNumber}</p>
        <p><strong>Client:</strong> {issue.clientName}</p>
        <p><strong>Staff:</strong> {issue.staffName}</p>
        <p><strong>Shoot Date:</strong> {formatDate(issue.eventDate)}</p>
        <p><strong>Return Date:</strong> {formatDateTime(new Date().toISOString())}</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#f4eee8] text-left">
            {['Equipment', 'Qty Issued', 'Qty Returned', 'Missing', 'Condition Out', 'Condition In', 'Status', 'Notes'].map((h) => (
              <th key={h} className="border border-[#d6c7b8] px-2 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issue.items.map((item) => (
            <tr key={item.id}>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.equipmentName}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.quantityIssued}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.quantityReturned}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.missingQuantity}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.conditionOut}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.conditionIn ?? '—'}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.returnStatus}</td>
              <td className="border border-[#d6c7b8] px-2 py-1">{item.notes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm">
        <strong>Total Issued:</strong> {issue.summary.totalIssued} &nbsp;
        <strong>Total Returned:</strong> {issue.summary.totalReturned} &nbsp;
        <strong>Total Missing:</strong> {issue.summary.totalMissing} &nbsp;
        <strong>Total Damaged:</strong> {issue.summary.totalDamaged}
      </p>
      <div className="grid grid-cols-2 gap-6 pt-8 text-sm">
        <p>Staff Signature: __________________</p>
        <p>Manager Signature: __________________</p>
      </div>
    </div>
  );
}
