const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

export interface DailyTrendPoint {
	date: string;
	label: string;
	revenue: number;
	newUsers: number;
}

export function formatDateKey(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function formatDateLabel(d: Date): string {
	const day = d.getDate();
	const month = MONTH_NAMES[d.getMonth()];
	return `${day} ${month}`;
}

export function buildDateRangeSeries(days: number): {
	date: string;
	label: string;
}[] {
	const series: { date: string; label: string }[] = [];
	const now = new Date();

	for (let i = days - 1; i >= 0; i--) {
		const target = new Date(now);
		target.setDate(target.getDate() - i);
		series.push({
			date: formatDateKey(target),
			label: formatDateLabel(target),
		});
	}

	return series;
}

export function mergeTrendData(
	dateSeries: { date: string; label: string }[],
	revenueRows: { day: string; total: number }[],
	userRows: { day: string; count: number }[],
): DailyTrendPoint[] {
	const revMap = new Map<string, number>();
	for (const r of revenueRows) {
		revMap.set(r.day, Number(r.total) || 0);
	}

	const userMap = new Map<string, number>();
	for (const u of userRows) {
		userMap.set(u.day, Number(u.count) || 0);
	}

	return dateSeries.map((s) => ({
		date: s.date,
		label: s.label,
		revenue: revMap.get(s.date) ?? 0,
		newUsers: userMap.get(s.date) ?? 0,
	}));
}
