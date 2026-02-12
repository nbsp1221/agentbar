import Table from "cli-table3";

type AsciiTableStyle = {
  head?: string[];
  border?: string[];
};

export function renderAsciiTable(params: { head: string[]; rows: string[][]; style?: AsciiTableStyle }): string {
  const t = new Table({
    head: params.head,
    style:
      params.style ??
      {
        head: [],
        border: []
      }
  });

  for (const row of params.rows) {
    t.push(row);
  }

  return t.toString().trimEnd();
}
