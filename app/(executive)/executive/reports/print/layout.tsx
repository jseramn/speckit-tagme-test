export default function ReportPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="report-print-root -m-5 bg-white p-8 lg:-m-8 lg:p-10 xl:-m-10">
      <style>{`
        @media print {
          aside, nav, .report-print-root { margin: 0 !important; padding: 1rem !important; }
          aside { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
      {children}
    </div>
  );
}