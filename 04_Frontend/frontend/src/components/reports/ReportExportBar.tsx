import { Download, FileSpreadsheet } from 'lucide-react';
import { downloadReportExcel, downloadReportPdf } from '@/utils/report-export';

interface ReportExportBarProps {
  reportId: string;
  reportTitle: string;
  headers: string[];
  rows: (string | number)[][];
  disabled?: boolean;
}

export function ReportExportBar({
  reportId,
  reportTitle,
  headers,
  rows,
  disabled,
}: ReportExportBarProps) {
  const handlePdf = async () => {
    await downloadReportPdf(reportId, reportTitle);
  };

  const handleExcel = () => {
    downloadReportExcel(reportTitle, headers, rows);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="dhara-rpt-btn"
        disabled={disabled}
        onClick={() => void handlePdf()}
      >
        <Download />
        Export PDF
      </button>
      <button
        type="button"
        className="dhara-rpt-btn is-gold"
        disabled={disabled}
        onClick={handleExcel}
      >
        <FileSpreadsheet />
        Export Excel
      </button>
    </div>
  );
}
