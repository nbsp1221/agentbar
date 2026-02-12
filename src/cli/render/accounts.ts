import type { AccountRow } from "../../services/accounts-list";
import { renderAsciiTable } from "./ascii-table";
import { formatNoteCell } from "./text";

const ACCOUNTS_TABLE_STYLE = {
  head: ["cyan"],
  border: ["grey"]
};

export function formatAccounts(rows: AccountRow[]): string {
  const head = ["active", "provider", "email", "plan", "id", "note"];
  const body = rows.map((row) => [
    row.active ? "*" : "",
    row.provider,
    row.email,
    row.planType ?? "-",
    row.id.length > 8 ? row.id.slice(0, 8) : row.id,
    formatNoteCell(row.note, 28)
  ]);

  return renderAsciiTable({ head, rows: body, style: ACCOUNTS_TABLE_STYLE });
}
