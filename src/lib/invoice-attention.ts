import { validDate } from "./domain";

export function invoiceDueAttention(
  invoice: { status: string; data: { dueDate: string | null } },
  today: string,
): "today" | "overdue" | null {
  const dueDate = invoice.data.dueDate;
  if (invoice.status !== "READY" || !dueDate || !validDate(dueDate)) return null;
  if (dueDate === today) return "today";
  return dueDate < today ? "overdue" : null;
}
