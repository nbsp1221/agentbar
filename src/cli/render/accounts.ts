import type { AccountRow } from "../../services/accounts-list";
import { renderAsciiTable } from "./ascii-table";

export function formatAccounts(rows: AccountRow[]): string {
  const head = ["active", "provider", "email", "account", "id"];
  const body = rows.map((row) => [
    row.active ? "*" : "",
    row.provider,
    row.email,
    row.accountType ?? "-",
    row.id
  ]);

  return renderAsciiTable({ head, rows: body });
}
