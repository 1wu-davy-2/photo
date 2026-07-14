import { ListFilter, Search, X } from "lucide-react";
import type { Translator } from "../i18n";

interface FilterBarProps {
  search: string;
  sort: "newest" | "oldest";
  onSearchChange: (value: string) => void;
  onSortChange: (value: "newest" | "oldest") => void;
  t: Translator;
}

export function FilterBar({ search, sort, onSearchChange, onSortChange, t }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">{t("gallery.search")}</span>
        <input
          type="search"
          aria-label={`${t("gallery.search")} / Search photos`}
          placeholder={t("gallery.searchPlaceholder")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <button type="button" className="icon-button subtle" title="Clear search" aria-label="Clear search" onClick={() => onSearchChange("")}>
            <X size={16} />
          </button>
        )}
      </label>
      <label className="sort-field">
        <ListFilter size={16} aria-hidden="true" />
        <span className="sr-only">Sort photos</span>
        <select aria-label={`${t("gallery.sort")} / Sort photos`} value={sort} onChange={(event) => onSortChange(event.target.value as "newest" | "oldest")}>
            <option value="newest">{t("gallery.newest")}</option>
            <option value="oldest">{t("gallery.oldest")}</option>
        </select>
      </label>
    </div>
  );
}
