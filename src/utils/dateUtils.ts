import { moment } from "obsidian";

export function formatDateTime(date: Date, format: string): string {
	return moment(date).format(format);
}

export function date2DateString(date: Date): string {
	return moment(date).format("YYYYMMDD");
}

export function date2TimeString(date: Date): string {
	return moment(date).format("HHmmssSSS");
}
