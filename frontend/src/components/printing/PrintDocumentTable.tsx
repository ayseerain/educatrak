import type { ReactNode } from "react";

export function PrintDocumentTable({ title, headings, rows, rightAlignColumns = [] }: { title: string; headings: string[]; rows: ReactNode[][]; rightAlignColumns?: number[] }) {
  return <section className="print-report-section">
    <h2>{title}</h2>
    <table><thead><tr>{headings.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={rightAlignColumns.includes(cellIndex) ? "print-number" : undefined}>{cell}</td>)}</tr>) : <tr><td colSpan={headings.length}>No records for this report scope.</td></tr>}</tbody>
    </table>
  </section>;
}
