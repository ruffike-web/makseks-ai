"use client";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useLanguage } from "./language";

export function Pagination({ page, pages, total, start, end, onPage, label }: {
  page: number; pages: number; total: number; start: number; end: number;
  onPage: (page: number) => void; label: string;
}) {
  const { t } = useLanguage();
  const numbers = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === pages || Math.abs(number - page) <= 1);
  return <div className="pagination">
    <span className="pagination-summary" aria-live="polite">{t("{start}–{end} / {total} kirjet", { start, end, total })}</span>
    <nav aria-label={t(label)}>
      <button className="page-button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("Eelmine lehekülg")}><IconChevronLeft size={16} /></button>
      {numbers.map((number, index) => <span className="page-number" key={number}>
        {index > 0 && number > numbers[index - 1] + 1 && <span className="page-gap" aria-hidden="true">…</span>}
        <button className={`page-button${number === page ? " active" : ""}`} aria-current={number === page ? "page" : undefined} aria-label={t("Lehekülg {page}", { page: number })} onClick={() => onPage(number)}>{number}</button>
      </span>)}
      <button className="page-button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("Järgmine lehekülg")}><IconChevronRight size={16} /></button>
    </nav>
  </div>;
}
