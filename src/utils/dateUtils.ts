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

export function unixTime2Date(unixTime: number, offset = 0): Date {
	return new Date(unixTime * 1000 + new Date().getMilliseconds() + (offset % 1000));
}
