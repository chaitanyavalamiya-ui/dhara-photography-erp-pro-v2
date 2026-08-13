import { Invoice } from '@/services/invoices-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { formatItemQty, formatItemRate, getInvoiceStatusLabel } from '@/utils/invoice';
import {
  INVOICE_TAGLINE,
  getInvoiceDeliverableLabels,
  parseInvoiceDeliverables,
  stripInvoiceDeliverableMarker,
} from '@/utils/invoice-deliverables';

interface InvoiceDocumentProps {
  invoice: Invoice;
  id?: string;
}

export function InvoiceDocument({ invoice, id = 'invoice-document' }: InvoiceDocumentProps) {
  const deliverableLabels = getInvoiceDeliverableLabels(parseInvoiceDeliverables(invoice.notes));
  const visibleNotes = stripInvoiceDeliverableMarker(invoice.notes) || invoice.booking.notes;

  return (
    <div
      id={id}
      className="mx-auto w-full max-w-[210mm] bg-white text-[#1a1a1a] shadow-2xl"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="border-b-4 border-[#6b1d3a] px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-[#6b1d3a]">Dhara Photography</h1>
            <p className="mt-1 text-sm font-semibold text-[#b8860b]">Patan</p>
            <p className="mt-3 text-xs leading-relaxed text-gray-600">
              Premium Wedding Photography &amp; Cinematography
              <br />
              Patan, Gujarat
              <br />
              +91 98765 43210 | info@dharaphotography.local
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Tax Invoice</p>
            <p className="mt-1 text-xl font-bold text-[#6b1d3a]">{invoice.invoiceNumber}</p>
            <p className="mt-2 text-xs text-gray-600">
              Date: <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
            </p>
            {invoice.dueDate && (
              <p className="text-xs text-gray-600">
                Due: <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </p>
            )}
            <p className="mt-2 inline-block rounded-full bg-[#6b1d3a]/10 px-3 py-1 text-xs font-semibold text-[#6b1d3a]">
              {getInvoiceStatusLabel(invoice.status)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 px-8 py-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">Bill To</p>
          <p className="mt-2 text-base font-semibold text-[#1a1a1a]">{invoice.client.fullName}</p>
          <p className="text-sm text-gray-600">{invoice.client.mobile}</p>
          {invoice.client.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
          {(invoice.client.address || invoice.client.city) && (
            <p className="mt-1 text-sm text-gray-600">
              {[invoice.client.address, invoice.client.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">
            Event Details
          </p>
          <p className="mt-2 text-sm">
            <span className="text-gray-500">Booking:</span>{' '}
            <span className="font-medium">{invoice.booking.bookingNumber}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Event:</span>{' '}
            <span className="font-medium">{invoice.booking.eventType}</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-500">Date:</span>{' '}
            <span className="font-medium">
              {formatDate(invoice.booking.eventDate)}
              {invoice.booking.eventEndDate && ` — ${formatDate(invoice.booking.eventEndDate)}`}
            </span>
          </p>
          {(invoice.booking.venue || invoice.booking.city) && (
            <p className="text-sm">
              <span className="text-gray-500">Venue:</span>{' '}
              <span className="font-medium">
                {[invoice.booking.venue, invoice.booking.city].filter(Boolean).join(', ')}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="px-8">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#6b1d3a] bg-[#6b1d3a]/5">
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#6b1d3a]">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#6b1d3a]">
                Service
              </th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-[#6b1d3a]">
                Qty / Days
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b1d3a]">
                Rate
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#6b1d3a]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.booking.items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="px-3 py-2.5 text-gray-500">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium">{item.serviceName}</td>
                <td className="px-3 py-2.5 text-center text-gray-600">{formatItemQty(item)}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{formatItemRate(item)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-[#6b1d3a]">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-8 py-6">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span className="text-red-600">− {formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#b8860b]/40 pt-2 text-base font-bold text-[#6b1d3a]">
            <span>Grand Total</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Advance Paid</span>
            <span>{formatCurrency(invoice.advanceAmount)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#6b1d3a] pt-2 text-lg font-bold text-[#6b1d3a]">
            <span>Balance Due</span>
            <span>{formatCurrency(invoice.balanceAmount)}</span>
          </div>
        </div>
      </div>

      <div className="px-8 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">
          Payment Information
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
          <p>
            Status:{' '}
            <span className="font-medium text-[#1a1a1a]">{getInvoiceStatusLabel(invoice.status)}</span>
          </p>
          <p>
            Currency: <span className="font-medium text-[#1a1a1a]">INR</span>
          </p>
          <p>
            Amount Paid:{' '}
            <span className="font-medium text-[#1a1a1a]">{formatCurrency(invoice.advanceAmount)}</span>
          </p>
          <p>
            Balance Due:{' '}
            <span className="font-medium text-[#6b1d3a]">{formatCurrency(invoice.balanceAmount)}</span>
          </p>
        </div>
      </div>

      {deliverableLabels.length > 0 && (
        <div className="mx-8 my-4 rounded border border-[#b8860b]/30 bg-[#b8860b]/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">
            Deliverables
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-[#1a1a1a] sm:grid-cols-2">
            {deliverableLabels.map((label) => (
              <li key={label}>• {label}</li>
            ))}
          </ul>
        </div>
      )}

      {visibleNotes && (
        <div className="mx-8 mb-6 rounded border border-gray-200 bg-gray-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8860b]">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{visibleNotes}</p>
        </div>
      )}

      <div className="border-t border-gray-200 px-8 py-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Terms &amp; Conditions
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-gray-500">
              <li>Payment due as per agreed schedule.</li>
              <li>Balance payable before final delivery.</li>
              <li>All amounts in Indian Rupees (INR).</li>
            </ul>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#b8860b]/50">
              <span className="text-[8px] font-bold uppercase tracking-wider text-[#b8860b]">
                Studio
                <br />
                Stamp
              </span>
            </div>
            <div className="mt-8 w-48 border-t border-gray-400 pt-2 text-center">
              <p className="text-xs text-gray-500">Authorized Signature</p>
              <p className="text-xs font-semibold text-[#6b1d3a]">Dhara Photography Patan</p>
            </div>
          </div>
        </div>
        <div
          className="mt-8 flex flex-col items-center pt-4"
          style={{ pageBreakInside: 'avoid' }}
        >
          <div
            className="mb-3 h-px w-40"
            style={{ background: 'linear-gradient(90deg, transparent, #b8860b, transparent)' }}
          />
          <p
            className="text-center italic"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              color: '#b8860b',
              fontSize: '13px',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            {INVOICE_TAGLINE}
          </p>
        </div>
      </div>
    </div>
  );
}
