import { readStore } from "../store/store";
import type { Provider } from "../store/types";

export type AccountRow = {
  id: string;
  provider: Provider;
  email: string;
  accountType?: string;
  note?: string;
  active: boolean;
};

export async function listAccounts(options?: {
  provider?: Provider;
}): Promise<AccountRow[]> {
  const store = await readStore();
  const all = store.profiles
    .filter((p) => (options?.provider ? p.provider === options.provider : true))
    .map((p) => ({
      id: p.id,
      provider: p.provider,
      email: p.email,
      accountType: p.accountType,
      note: p.note,
      active: store.active[p.provider] === p.id
    }));

  all.sort((a, b) => a.provider.localeCompare(b.provider) || a.email.localeCompare(b.email));
  return all;
}
