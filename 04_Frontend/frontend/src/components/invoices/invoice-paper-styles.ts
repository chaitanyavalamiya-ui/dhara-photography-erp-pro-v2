/** Print/PDF-safe invoice paper CSS. Hex only — no oklch/color-mix. Embedded in the document so print innerHTML keeps styles. */
export const INVOICE_PAPER_CSS = `
.dhara-inv-paper,
.dhara-inv-paper * {
  box-sizing: border-box;
  color-scheme: light;
}
.dhara-inv-paper {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  padding: 11mm 11mm 9mm;
  background: #fbf6ee;
  background-image: linear-gradient(180deg, #fffdf8 0%, #fbf6ee 42%, #f4ead9 100%);
  color: #2c211c;
  font-family: Georgia, 'Times New Roman', serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.dhara-inv-paper-frame {
  border: 1.5px solid #6b1d3a;
  padding: 5px;
  background: #fffcf7;
}
.dhara-inv-paper-inner {
  border: 1px solid #c4a35a;
  padding: 7.5mm 8mm 6.5mm;
  background: #fffcf7;
}
.dhara-inv-paper-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 2.5px solid #6b1d3a;
}
.dhara-inv-paper-brand {
  min-width: 0;
  flex: 1;
}
.dhara-inv-paper-title {
  margin: 0;
  line-height: 0.92;
  color: #6b1d3a;
}
.dhara-inv-paper-dhara {
  display: block;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #6b1d3a;
}
.dhara-inv-paper-photography {
  display: block;
  margin-top: 1px;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #2c211c;
}
.dhara-inv-paper-patan {
  margin: 8px 0 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 16px;
  font-weight: 600;
  font-style: italic;
  color: #8a6a2f;
}
.dhara-inv-paper-contact {
  margin: 8px 0 0;
  max-width: 280px;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.55;
  color: #3d342e;
}
.dhara-inv-paper-meta {
  flex: 0 0 210px;
  max-width: 46%;
  padding: 10px 12px 12px;
  border: 1px solid #d7c39a;
  background: #faf4e8;
  text-align: right;
}
.dhara-inv-paper-tax {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6b1d3a;
}
.dhara-inv-paper-number {
  margin: 6px 0 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: #6b1d3a;
  word-break: break-word;
}
.dhara-inv-paper-date {
  margin: 8px 0 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #3d342e;
}
.dhara-inv-paper-date b {
  font-weight: 700;
  color: #2c211c;
}
.dhara-inv-paper-status {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 10px;
  border: 1px solid #6b1d3a;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b1d3a;
  background: #f3e6d4;
}
.dhara-inv-paper-status.is-paid {
  border-color: #3f6b45;
  color: #234a2c;
  background: #e4f0e2;
}
.dhara-inv-paper-status.is-unpaid,
.dhara-inv-paper-status.is-overdue {
  border-color: #6b1d3a;
  color: #fffdf8;
  background: #6b1d3a;
}
.dhara-inv-paper-status.is-partially_paid {
  border-color: #8a6a2f;
  color: #5c4518;
  background: #f1e2c0;
}
.dhara-inv-paper-goldline {
  height: 3px;
  margin: 0 0 16px;
  background: linear-gradient(90deg, #6b1d3a 0%, #c4a35a 50%, #6b1d3a 100%);
}
.dhara-inv-paper-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid #e2d3b6;
  background: #fffaf2;
}
.dhara-inv-paper-party {
  min-width: 0;
  padding: 12px 14px 14px;
}
.dhara-inv-paper-party + .dhara-inv-paper-party {
  border-left: 1px solid #e2d3b6;
}
.dhara-inv-paper-label {
  margin: 0 0 6px;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6b1d3a;
}
.dhara-inv-paper-client {
  margin: 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
  color: #2c211c;
  overflow-wrap: anywhere;
}
.dhara-inv-paper-event-name {
  margin: 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: #2c211c;
  overflow-wrap: anywhere;
}
.dhara-inv-paper-detail {
  margin: 5px 0 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
  color: #3d342e;
}
.dhara-inv-paper-kv {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: 2px 8px;
  margin-top: 8px;
}
.dhara-inv-paper-kv dt {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a6a2f;
}
.dhara-inv-paper-kv dd {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #2c211c;
  overflow-wrap: anywhere;
}
.dhara-inv-paper-table-wrap {
  margin: 0 0 14px;
}
.dhara-inv-paper-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Source Sans 3', Georgia, sans-serif;
}
.dhara-inv-paper-table th {
  padding: 8px 10px;
  background: #6b1d3a;
  color: #faf4e8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-bottom: 2px solid #c4a35a;
}
.dhara-inv-paper-table th:first-child {
  width: 28px;
  text-align: left;
}
.dhara-inv-paper-table th.is-num,
.dhara-inv-paper-table td.is-num {
  text-align: center;
  white-space: nowrap;
}
.dhara-inv-paper-table th.is-amt,
.dhara-inv-paper-table td.is-amt {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dhara-inv-paper-table td {
  padding: 9px 10px;
  border-bottom: 1px solid #e6d9c2;
  font-size: 12.5px;
  font-weight: 600;
  color: #2c211c;
  vertical-align: top;
}
.dhara-inv-paper-table tbody tr:nth-child(even) td {
  background: #f7f0e4;
}
.dhara-inv-paper-table .is-idx {
  color: #6b1d3a;
  font-weight: 700;
}
.dhara-inv-paper-table .is-service {
  font-weight: 700;
  overflow-wrap: anywhere;
}
.dhara-inv-paper-table .is-amt {
  font-weight: 800;
  color: #6b1d3a;
}
.dhara-inv-paper-summary {
  display: flex;
  justify-content: flex-end;
  margin: 0 0 16px;
}
.dhara-inv-paper-totals {
  width: 268px;
  border: 1px solid #d7c39a;
  background: #fffaf2;
}
.dhara-inv-paper-total-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 12px;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  color: #3d342e;
}
.dhara-inv-paper-total-row span:last-child {
  font-variant-numeric: tabular-nums;
  color: #2c211c;
}
.dhara-inv-paper-total-row.is-discount span:last-child {
  color: #8b2e2e;
}
.dhara-inv-paper-total-row.is-grand {
  border-top: 1px solid #c4a35a;
  background: #f4ead9;
  font-size: 14px;
  font-weight: 800;
  color: #6b1d3a;
}
.dhara-inv-paper-total-row.is-grand span:last-child {
  color: #6b1d3a;
}
.dhara-inv-paper-total-row.is-balance {
  border-top: 2.5px solid #6b1d3a;
  background: #6b1d3a;
  font-size: 14.5px;
  font-weight: 800;
  color: #faf4e8;
}
.dhara-inv-paper-total-row.is-balance span:last-child {
  color: #faf4e8;
}
.dhara-inv-paper-pay {
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid #e2d3b6;
  background: #fffaf2;
}
.dhara-inv-paper-pay-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 18px;
  margin-top: 8px;
}
.dhara-inv-paper-pay-item dt {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a6a2f;
}
.dhara-inv-paper-pay-item dd {
  margin: 3px 0 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #2c211c;
}
.dhara-inv-paper-pay-item.is-due dd {
  color: #6b1d3a;
}
.dhara-inv-paper-box {
  margin: 0 0 12px;
  padding: 12px 14px;
  border: 1px solid #e2d3b6;
  background: #fffaf2;
}
.dhara-inv-paper-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
}
.dhara-inv-paper-list li,
.dhara-inv-paper-notes {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.45;
  color: #2c211c;
  white-space: pre-wrap;
}
.dhara-inv-paper-bottom {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 20px;
  align-items: end;
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid #d7c39a;
}
.dhara-inv-paper-terms ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.dhara-inv-paper-terms li {
  position: relative;
  margin: 0 0 5px;
  padding-left: 12px;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  color: #3d342e;
}
.dhara-inv-paper-terms li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 1.5px;
  background: #8a6a2f;
}
.dhara-inv-paper-sign {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 168px;
}
.dhara-inv-paper-stamp {
  width: 96px;
  height: 96px;
  padding: 5px;
  border: 2px solid #8a6a2f;
  border-radius: 50%;
}
.dhara-inv-paper-stamp-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #6b1d3a;
  border-radius: 50%;
  text-align: center;
}
.dhara-inv-paper-stamp-inner span {
  display: block;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b1d3a;
}
.dhara-inv-paper-stamp-inner .is-studio {
  font-size: 8px;
  color: #8a6a2f;
}
.dhara-inv-paper-stamp-inner .is-name {
  margin-top: 3px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 11px;
  letter-spacing: 0.12em;
}
.dhara-inv-paper-stamp-inner .is-place {
  margin-top: 1px;
  font-size: 8px;
}
.dhara-inv-paper-sign-line {
  width: 168px;
  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid #2c211c;
  text-align: center;
}
.dhara-inv-paper-sign-line p {
  margin: 0;
  font-family: 'Source Sans 3', Georgia, sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #3d342e;
}
.dhara-inv-paper-sign-line .is-studio-name {
  margin-top: 3px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 13px;
  font-weight: 700;
  color: #6b1d3a;
}
.dhara-inv-paper-footer {
  margin-top: 16px;
  padding-top: 10px;
  border-top: 2px solid #6b1d3a;
  text-align: center;
}
.dhara-inv-paper-footer-rule {
  width: 120px;
  height: 2px;
  margin: 0 auto 8px;
  background: linear-gradient(90deg, #6b1d3a, #c4a35a, #6b1d3a);
}
.dhara-inv-paper-tagline {
  margin: 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 14px;
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #6b1d3a;
}
@media (max-width: 640px) {
  .dhara-inv-paper-header,
  .dhara-inv-paper-parties,
  .dhara-inv-paper-pay-grid,
  .dhara-inv-paper-list,
  .dhara-inv-paper-bottom {
    display: block;
  }
  .dhara-inv-paper-meta {
    max-width: none;
    flex: none;
    margin-top: 12px;
    text-align: left;
  }
  .dhara-inv-paper-party + .dhara-inv-paper-party {
    border-left: 0;
    border-top: 1px solid #e2d3b6;
  }
  .dhara-inv-paper-sign {
    margin-top: 16px;
    align-items: flex-start;
  }
}
`;
