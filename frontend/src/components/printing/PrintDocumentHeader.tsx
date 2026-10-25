import { useMemo } from "react";

export function PrintDocumentHeader({ title, subtitle, generatedAt = new Date() }: { title: string; subtitle?: string; generatedAt?: Date }) {
  const generatedLabel = useMemo(() => new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
  }).format(generatedAt), [generatedAt]);

  return <header className="print-document-header">
    <img src="/mendez-christian-academy-seal.png" alt="Mendez Christian Academy seal" />
    <div className="print-document-heading">
      <p className="print-school-name">MENDEZ CHRISTIAN ACADEMY</p>
      <h1>{title}</h1>
      {subtitle && <p className="print-document-subtitle">{subtitle}</p>}
    </div>
    <p className="print-generated">Generated {generatedLabel}</p>
  </header>;
}
