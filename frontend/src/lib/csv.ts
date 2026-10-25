export type CsvCell = string | number | null | undefined;

export function serializeCsv(headers: CsvCell[], rows: CsvCell[][]): string {
  const encodeCell = (cell: CsvCell): string => {
    const value = cell == null ? "" : String(cell);
    const safeValue = typeof cell === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(value)
      ? `'${value}`
      : value;

    return `"${safeValue.replace(/"/g, '""')}"`;
  };

  return `\uFEFF${[headers, ...rows].map((row) => row.map(encodeCell).join(",")).join("\r\n")}`;
}

export function downloadCsv(filename: string, headers: CsvCell[], rows: CsvCell[][]): void {
  const blob = new Blob([serializeCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
