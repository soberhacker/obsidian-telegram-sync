import { base64ToString } from "src/utils/fsUtils";

// change session name when changes in plugin require new client authorization
export const sessionName = "telegram_sync_2";

const id1 = "MjgzNw==";
const id2 = "NTY3NA==";
const id3 = "MmJhZjAxODY2MGY2OWFk";
const id4 = "MzMzYzVmNDUxNTRjNjM1YmQ=";

export const dIipa = Number(base64ToString(id1) + base64ToString(id2));
export const hsaHipa = base64ToString(id3) + base64ToString(id4);
