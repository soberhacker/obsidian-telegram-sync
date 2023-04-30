export function formatDateTime(date: Date, format: string): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
  
    const replacements: Record<string, () => string> = {
      YYYY: () => date.getFullYear().toString(),
      YY: () => date.getFullYear().toString().slice(-2),
      MM: () => pad(date.getMonth() + 1),
      DD: () => pad(date.getDate()),
      HH: () => pad(date.getHours()),      
      mm: () => pad(date.getMinutes()),
      ss: () => pad(date.getSeconds()),
      SSS: () => pad(date.getMilliseconds()),      
    };
  
    return format.replace(/YYYY|YY|MM|DD|HH|mm|ss|SSS|day/g, (matched) => replacements[matched]());
  }
  

export function date2DateString(date: Date) : string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

export function date2TimeString(date: Date) : string {
    date.setMilliseconds((new Date()).getMilliseconds());
    return date.toISOString().split('T')[1]
        .replace(/:/g, '').replace('.', '').replace('Z', '').substring(0, 12);
}