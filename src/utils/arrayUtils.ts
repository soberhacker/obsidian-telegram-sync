export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): void {
	if (toIndex < 0 || toIndex === arr.length) {
		return;
	}
	[arr[fromIndex], arr[toIndex]] = [arr[toIndex], arr[fromIndex]];
}
