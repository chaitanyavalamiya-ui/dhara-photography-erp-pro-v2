/**
 * LOCKED APPROVED BASELINE:
 * Do not modify this Invoice module without an explicit user request.
 * Protects the approved premium invoice document/template exactly as-is.
 */
import { Invoice } from '@/services/invoices-service';
import { formatCurrency, formatDate } from '@/utils/booking-form';
import { formatItemQty, formatItemRate, getInvoiceStatusLabel } from '@/utils/invoice';
import {
  INVOICE_TAGLINE,
  getInvoiceDeliverableLabels,
  parseInvoiceDeliverables,
  stripInvoiceDeliverableMarker,
} from '@/utils/invoice-deliverables';
import { INVOICE_PAPER_CSS } from '@/components/invoices/invoice-paper-styles';

interface InvoiceDocumentProps {
  invoice: Invoice;
  id?: string;
}

export function InvoiceDocument({ invoice, id = 'invoice-document' }: InvoiceDocumentProps) {
  const deliverableLabels = getInvoiceDeliverableLabels(
    invoice.deliverables
      ? {
          items: invoice.deliverables.items as never,
          videoMedia:
            invoice.deliverables.videoMedia === 'pendrive' ||
            invoice.deliverables.videoMedia === 'hard_disk'
              ? invoice.deliverables.videoMedia
              : '',
        }
      : parseInvoiceDeliverables(invoice.notes),
  );
  const visibleNotes =
    (invoice.deliverables ? invoice.notes : stripInvoiceDeliverableMarker(invoice.notes)) ||
    invoice.booking.notes;
  const statusLabel = getInvoiceStatusLabel(invoice.status);

  return (
    <div id={id} className="dhara-inv-paper">
      <style>{INVOICE_PAPER_CSS}</style>
      <div className="dhara-inv-paper-frame">
        <div className="dhara-inv-paper-inner">
          <header className="dhara-inv-paper-header">
            <div className="dhara-inv-paper-brand">
              <h1 className="dhara-inv-paper-title">
                <span className="dhara-inv-paper-dhara">Dhara</span>
                <span className="dhara-inv-paper-photography">Photography</span>
              </h1>
              <p className="dhara-inv-paper-patan">Patan</p>
              <p className="dhara-inv-paper-contact">
                Premium Wedding Photography &amp; Cinematography
                <br />
                Patan, Gujarat
                <br />
                +91 98765 43210 | info@dharaphotography.local
              </p>
            </div>
            <aside className="dhara-inv-paper-meta">
              <p className="dhara-inv-paper-tax">Tax Invoice</p>
              <p className="dhara-inv-paper-number">{invoice.invoiceNumber}</p>
              <p className="dhara-inv-paper-date">
                Date: <b>{formatDate(invoice.invoiceDate)}</b>
              </p>
              {invoice.dueDate && (
                <p className="dhara-inv-paper-date">
                  Due: <b>{formatDate(invoice.dueDate)}</b>
                </p>
              )}
              <span className={`dhara-inv-paper-status is-${invoice.status}`}>{statusLabel}</span>
            </aside>
          </header>
          <div className="dhara-inv-paper-goldline" />

          <section className="dhara-inv-paper-parties">
            <div className="dhara-inv-paper-party">
              <p className="dhara-inv-paper-label">Bill To</p>
              <p className="dhara-inv-paper-client">{invoice.client.fullName}</p>
              <p className="dhara-inv-paper-detail">{invoice.client.mobile}</p>
              {invoice.client.email && (
                <p className="dhara-inv-paper-detail">{invoice.client.email}</p>
              )}
              {(invoice.client.address || invoice.client.city) && (
                <p className="dhara-inv-paper-detail">
                  {[invoice.client.address, invoice.client.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="dhara-inv-paper-party">
              <p className="dhara-inv-paper-label">Event Details</p>
              <p className="dhara-inv-paper-event-name">{invoice.booking.eventType}</p>
              <dl className="dhara-inv-paper-kv">
                <dt>Booking</dt>
                <dd>{invoice.booking.bookingNumber}</dd>
                <dt>Date</dt>
                <dd>
                  {formatDate(invoice.booking.eventDate)}
                  {invoice.booking.eventEndDate && ` — ${formatDate(invoice.booking.eventEndDate)}`}
                </dd>
                {(invoice.booking.venue || invoice.booking.city) && (
                  <>
                    <dt>Venue</dt>
                    <dd>{[invoice.booking.venue, invoice.booking.city].filter(Boolean).join(', ')}</dd>
                  </>
                )}
              </dl>
            </div>
          </section>

          <div className="dhara-inv-paper-table-wrap">
            <table className="dhara-inv-paper-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service</th>
                  <th className="is-num">Qty / Days</th>
                  <th className="is-amt">Rate</th>
                  <th className="is-amt">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.booking.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="is-idx">{index + 1}</td>
                    <td className="is-service">{item.serviceName}</td>
                    <td className="is-num">{formatItemQty(item)}</td>
                    <td className="is-amt">{formatItemRate(item)}</td>
                    <td className="is-amt">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dhara-inv-paper-summary">
            <div className="dhara-inv-paper-totals">
              <div className="dhara-inv-paper-total-row">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="dhara-inv-paper-total-row is-discount">
                  <span>Discount</span>
                  <span>− {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="dhara-inv-paper-total-row is-grand">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="dhara-inv-paper-total-row">
                <span>Advance Paid</span>
                <span>{formatCurrency(invoice.advanceAmount)}</span>
              </div>
              <div className="dhara-inv-paper-total-row is-balance">
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balanceAmount)}</span>
              </div>
            </div>
          </div>

          <section className="dhara-inv-paper-pay">
            <p className="dhara-inv-paper-label">Payment Information</p>
            <dl className="dhara-inv-paper-pay-grid">
              <div className="dhara-inv-paper-pay-item">
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
              </div>
              <div className="dhara-inv-paper-pay-item">
                <dt>Currency</dt>
                <dd>INR</dd>
              </div>
              <div className="dhara-inv-paper-pay-item">
                <dt>Amount Paid</dt>
                <dd>{formatCurrency(invoice.advanceAmount)}</dd>
              </div>
              <div className="dhara-inv-paper-pay-item is-due">
                <dt>Balance Due</dt>
                <dd>{formatCurrency(invoice.balanceAmount)}</dd>
              </div>
            </dl>
          </section>

          {deliverableLabels.length > 0 && (
            <section className="dhara-inv-paper-box">
              <p className="dhara-inv-paper-label">Deliverables</p>
              <ul className="dhara-inv-paper-list">
                {deliverableLabels.map((label) => (
                  <li key={label}>• {label}</li>
                ))}
              </ul>
            </section>
          )}

          {visibleNotes && (
            <section className="dhara-inv-paper-box">
              <p className="dhara-inv-paper-label">Notes</p>
              <p className="dhara-inv-paper-notes">{visibleNotes}</p>
            </section>
          )}

          <div className="dhara-inv-paper-bottom">
            <section className="dhara-inv-paper-terms">
              <p className="dhara-inv-paper-label">Terms &amp; Conditions</p>
              <ul>
                <li>Payment due as per agreed schedule.</li>
                <li>Balance payable before final delivery.</li>
                <li>All amounts in Indian Rupees (INR).</li>
              </ul>
            </section>
            <div className="dhara-inv-paper-sign">
              <div className="dhara-inv-paper-stamp" aria-label="Studio Stamp">
                <div className="dhara-inv-paper-stamp-inner">
                  <span className="is-studio">Studio Stamp</span>
                  <span className="is-name">Dhara</span>
                  <span className="is-place">Patan</span>
                </div>
              </div>
              <div className="dhara-inv-paper-sign-line">
                <p>Authorized Signature</p>
                <p className="is-studio-name">Dhara Photography Patan</p>
              </div>
            </div>
          </div>

          <footer className="dhara-inv-paper-footer" style={{ pageBreakInside: 'avoid' }}>
            <div className="dhara-inv-paper-footer-rule" />
            <p className="dhara-inv-paper-tagline">{INVOICE_TAGLINE}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
