/** Parses CSV text (RFC4180-ish: quoted fields, embedded commas/newlines, doubled quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  firstname: "firstName",
  first: "firstName",
  name: "firstName",
  lastname: "lastName",
  last: "lastName",
  phone: "phone",
  mobile: "phone",
  phonenumber: "phone",
  mobilenumber: "phone",
  email: "email",
  emailaddress: "email",
  gender: "gender",
  dob: "dob",
  dateofbirth: "dob",
  plan: "planName",
  planname: "planName",
  membershipplan: "planName",
  startdate: "startDate",
  joiningdate: "startDate",
  amountpaid: "amountPaidRupees",
  amount: "amountPaidRupees",
  paid: "amountPaidRupees",
  discount: "discountRupees",
  mode: "mode",
  paymentmode: "mode",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface ParsedCsvRows {
  rows: Record<string, string>[];
  unrecognizedHeaders: string[];
}

/** Reads a CSV's header row and maps each recognized column to its canonical field name. */
export function mapCsvRows(table: string[][]): ParsedCsvRows {
  if (table.length === 0) return { rows: [], unrecognizedHeaders: [] };

  const [headerRow, ...dataRows] = table;
  const unrecognizedHeaders: string[] = [];
  const keys = headerRow.map((h) => {
    const canonical = HEADER_ALIASES[normalizeHeader(h)];
    if (!canonical) unrecognizedHeaders.push(h);
    return canonical;
  });

  const rows = dataRows.map((cells) => {
    const row: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (key) row[key] = (cells[i] ?? "").trim();
    });
    return row;
  });

  return { rows, unrecognizedHeaders };
}
