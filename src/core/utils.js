/**
 * Get the week number. Week one (1) is the week which contains the first Thursday of the year. Monday is considered the first day of the week.
 *
 * This algorithm is a JavaScript port of the work presented by Claus Tøndering at http://www.tondering.dk/claus/cal/week.php#calcweekno
 * .getWeek() Algorithm Copyright (c) 2008 Claus Tondering.
 *
 * @param  {Number} year
 * @param  {Number} month
 * @param  {Number} date
 * @return {Number} 1 to 53
 */
export function getWeek(year, month, date) {
    let a, b, c, d, e, f, g, n, s, week;

    if (month <= 2) {
        a = year - 1;
        b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
        c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
        s = b - c;
        e = 0;
        f = date - 1 + (31 * (month - 1));
    } else {
        a = year;
        b = (a / 4 | 0) - (a / 100 | 0) + (a / 400 | 0);
        c = ((a - 1) / 4 | 0) - ((a - 1) / 100 | 0) + ((a - 1) / 400 | 0);
        s = b - c;
        e = s + 1;
        f = date + ((153 * (month - 3) + 2) / 5) + 58 + s;
    }

    g = (a + b) % 7;
    d = (f + g - e) % 7; // Indicates the day of the week (0=Monday, 1=Tuesday, etc.)
    n = (f + 3 - d) | 0;

    if (n < 0) {
        week = 53 - ((g - s) / 5 | 0);
    } else if (n > 364 + s) {
        week = 1;
    } else {
        week = (n / 7 | 0) + 1;
    }

    return week;
}

/**
 * Pad the start of 'string' with zeros up to 'length'.
 * Example:
 * zeroPad(1) === '01';
 * zeroPad(16, 4) === '0016';
 * zeroPad(3458, 3) === '3458';
 * @param {String|Number}  string - The string to pad
 * @param {Number=}        length - How long to pad 'string' to, up to 4 longer than 'string'
 */
export function zeroPad(string, length = 2) {
    string = String(string);
    length -= string.length;
    if (length <= 0) return string;
    // TODO: use a proper padding function like String.prototype.padStart()
    if (length > 4) throw new Error('Length must be <= (string.length + 4)');
    return "0000".slice(0, length) + string;
}
