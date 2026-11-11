/**
 * Keeps the user's export choices across refreshes. Invoices that just became
 * ready are selected by default; invoices that were already ready keep the
 * user's tick state; invoices that are no longer ready are dropped.
 */
export function nextExportSelection(
  selected: readonly string[],
  previousReady: readonly string[],
  nextReady: readonly string[],
): string[] {
  const chosen = new Set(selected),
    known = new Set(previousReady);
  return nextReady.filter((id) => !known.has(id) || chosen.has(id));
}
