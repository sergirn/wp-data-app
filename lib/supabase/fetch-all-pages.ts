type QueryError = { code?: string; message?: string };
type PageResult<T> = { data: T[] | null; error: QueryError | null };

const DEFAULT_PAGE_SIZE = 500;

export async function fetchAllPages<T>(requestPage: (from: number, to: number) => Promise<PageResult<T>>, pageSize = DEFAULT_PAGE_SIZE) {
	const rows: T[] = [];
	for (let from = 0; ; from += pageSize) {
		const { data, error } = await requestPage(from, from + pageSize - 1);
		if (error) return { data: null, error };
		const page = data ?? [];
		rows.push(...page);
		if (page.length < pageSize) return { data: rows, error: null };
	}
}

export async function fetchAllByIdBatches<T, TId>(ids: TId[], requestPage: (batch: TId[], from: number, to: number) => Promise<PageResult<T>>, batchSize = 100) {
	const rows: T[] = [];
	for (let index = 0; index < ids.length; index += batchSize) {
		const batch = ids.slice(index, index + batchSize);
		const result = await fetchAllPages<T>((from, to) => requestPage(batch, from, to));
		if (result.error) return { data: null, error: result.error };
		rows.push(...(result.data ?? []));
	}
	return { data: rows, error: null };
}
