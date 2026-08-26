import type { HistoryItem } from "@/routes/history";
export function filterHistory(
	items: HistoryItem[],
	query: string,
	stepFilter: string | null,
): HistoryItem[] {
	let r = items;
	if (query.trim()) {
		const q = query.toLowerCase();
		r = r.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				(i.preview ?? "").toLowerCase().includes(q),
		);
	}
	if (stepFilter) r = r.filter((i) => (i.step ?? "prd") === stepFilter);
	return r;
}
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}
