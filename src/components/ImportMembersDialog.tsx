"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, branchesApi, membersApi, type ImportMembersResult } from "@/lib/api";
import { mapCsvRows, parseCsv } from "@/lib/csv";
import { Button, Field, Modal, Select } from "@/components/ui";
import type { Branch } from "@/types/api";

const SAMPLE_CSV = `First name,Last name,Phone,Email,Gender,DOB,Plan,Start date,Amount paid,Discount,Mode
Asha,Verma,9820011234,asha@example.com,female,1992-04-10,Quarterly,2026-01-01,4500,0,cash
Ravi,Shah,9820011235,,male,,Monthly,,,,upi`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members-import-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportMembersDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [unrecognizedHeaders, setUnrecognizedHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportMembersResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    branchesApi.list().then((res) => {
      setBranches(res.branches);
      setBranchId((prev) => prev || res.branches[0]?._id || "");
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFileName(null);
      setRows([]);
      setUnrecognizedHeaders([]);
      setParseError(null);
      setResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function handleFile(file: File) {
    setResult(null);
    setParseError(null);
    setFileName(file.name);
    file.text().then((text) => {
      const table = parseCsv(text);
      const { rows: parsed, unrecognizedHeaders: unrecognized } = mapCsvRows(table);
      if (parsed.length === 0) {
        setParseError("No data rows found in that file.");
        setRows([]);
        return;
      }
      setRows(parsed);
      setUnrecognizedHeaders(unrecognized);
    });
  }

  async function submit() {
    setBusy(true);
    setParseError(null);
    try {
      const res = await membersApi.import({ branchId, rows });
      setResult(res);
      if (res.imported > 0) onImported();
    } catch (err) {
      setParseError(err instanceof ApiError ? err.message : "Couldn't import these members.");
    } finally {
      setBusy(false);
    }
  }

  const preview = rows.slice(0, 5);
  const failures = result?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Import members from CSV" wide>
      <p className="text-sm text-muted">
        Columns recognized: first name, last name, phone, email, gender, DOB, plan, start date, amount paid, discount, mode. Phone and plan
        (matching an existing plan name) are required for every row.{" "}
        <button type="button" onClick={downloadSampleCsv} className="text-link underline">
          Download a sample CSV
        </button>
        .
      </p>

      <Field label="Branch to import into">
        <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="CSV file">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
      </Field>

      {unrecognizedHeaders.length > 0 && (
        <p className="text-xs text-muted">Ignored unrecognized columns: {unrecognizedHeaders.join(", ")}</p>
      )}

      {rows.length > 0 && !result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{fileName} — {rows.length} row{rows.length === 1 ? "" : "s"} detected</p>
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 bg-line2">Name</th>
                  <th className="text-left p-2 bg-line2">Phone</th>
                  <th className="text-left p-2 bg-line2">Plan</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-line2">
                    <td className="p-2">{r.firstName} {r.lastName ?? ""}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.planName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > preview.length && <p className="text-xs text-muted">…and {rows.length - preview.length} more.</p>}
        </div>
      )}

      {parseError && <p className="text-sm font-semibold text-warn">{parseError}</p>}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">
            {result.imported} imported, {result.failed} failed.
          </p>
          {failures.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-warn max-h-48 overflow-y-auto">
              {failures.map((f) => (
                <li key={f.row}>Row {f.row}: {f.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {result ? (
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Button variant="primary" disabled={!branchId || rows.length === 0 || busy} onClick={submit}>
            {busy ? "Importing…" : `Import ${rows.length || ""} member${rows.length === 1 ? "" : "s"}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}
