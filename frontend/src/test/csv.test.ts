import { describe, expect, it } from "vitest";
import { serializeCsv } from "@/lib/csv";

describe("spreadsheet CSV export", () => {
  it("quotes delimiters and prefixes formula-like text", () => {
    expect(serializeCsv(["Name", "Note"], [["Avery, Sample", '=HYPERLINK("x")']])).toBe(
      '\uFEFF"Name","Note"\r\n"Avery, Sample","\'=HYPERLINK(""x"")"',
    );
  });

  it("prefixes each spreadsheet formula marker after whitespace while preserving numeric cells", () => {
    expect(serializeCsv(["Value"], [["\t+SUM(A1:A2)"], ["  -42"], ["\n@name"], [-42]])).toBe(
      '\uFEFF"Value"\r\n"\'\t+SUM(A1:A2)"\r\n"\'  -42"\r\n"\'\n@name"\r\n"-42"',
    );
  });
});
