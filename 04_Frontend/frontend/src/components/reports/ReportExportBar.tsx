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
        className="btn-secondary px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={() => void handlePdf()}
      >
        <Download className="mr-1.5 inline h-3.5 w-3.5" />
        Export PDF
      </button>
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={handleExcel}
      >
        <FileSpreadsheet className="mr-1.5 inline h-3.5 w-3.5" />
        Export Excel
      </button>
    </div>
  );
}
