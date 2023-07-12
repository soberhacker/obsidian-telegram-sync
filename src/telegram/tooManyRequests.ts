import { _5sec } from "src/utils/logUtils";

export let isTooManyRequests = false;
// reset isTooManyRequests
setInterval(() => {
	isTooManyRequests = false;
}, _5sec);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function checkIfTooManyRequests(error: any): boolean {
	try {
		const errorCode = error.response.body.error_code;
		isTooManyRequests = errorCode == 429;
		return isTooManyRequests;
	} catch {
		return false;
	}
}
