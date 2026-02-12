import Table from "cli-table3";

export function renderAsciiTable(params: { head: string[]; rows: string[][] }): string {
  const t = new Table({
    head: params.head,
    style: {
      head: [],
      border: []
    }
  });

  for (const row of params.rows) {
    t.push(row);
  }

  return t.toString().trimEnd();
}

