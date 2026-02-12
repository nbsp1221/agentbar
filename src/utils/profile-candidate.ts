export type ProfileCandidateHint = {
  id: string;
  planType?: string;
};

export function formatProfileCandidateHint(candidate: ProfileCandidateHint): string {
  return `${candidate.id}${candidate.planType ? ` (${candidate.planType})` : ""}`;
}

export function formatAmbiguousProfileCandidates(candidates: ProfileCandidateHint[]): string {
  return candidates.map(formatProfileCandidateHint).join(", ");
}
