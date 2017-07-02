import Datejs from '../Date';

function validate(n, min, max, name) {
    if (n == null) return false;
    if (typeof n != "number") throw new TypeError(n + " is not a Number.");
    if (n < min || n > max) throw new RangeError(n + " is not a valid value for " + name + ".");
    return true;
}

export default {
    /**
     * Validates the number is within an acceptable range for milliseconds [0-999].
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    millisecond(value) {
        return validate(value, 0, 999, "millisecond");
    },

    /**
     * Validates the number is within an acceptable range for seconds [0-59].
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    second(value) {
        return validate(value, 0, 59, "second");
    },

    /**
     * Validates the number is within an acceptable range for minutes [0-59].
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    minute(value) {
        return validate(value, 0, 59, "minute");
    },

    /**
     * Validates the number is within an acceptable range for hours [0-23].
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    hour(value) {
        return validate(value, 0, 23, "hour");
    },

    /**
     * Validates the number is within an acceptable range for the days in a month [0-MaxDaysInMonth].
     * @param  {Number}  value - The number to check if within range.
     * @param  {Number}  year
     * @param  {Number}  month
     * @return {Boolean} true if within range, otherwise false.
     */
    day(value, year, month) {
        return validate(value, 1, Datejs.getDaysInMonth(year, month), "day");
    },

    /**
     * Validates the number is within an acceptable range for months [0-11].
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    month(value) {
        return validate(value, 0, 11, "month");
    },

    /**
     * Validates the number is within an acceptable range for years.
     * @param  {Number}  value - The number to check if within range.
     * @return {Boolean} true if within range, otherwise false.
     */
    year(value) {
        return validate(value, 0, 9999, "year");
    },
};
