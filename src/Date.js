/** @extends Date */
export default class Datejs extends Date {

    /**
     * @return {Datejs}
     */
    constructor() {
        super(...arguments);

        // Neither Babel or Bublé handle classes properly, so we have to do this ourselves
        // http://2ality.com/2013/03/subclassing-builtins-es6.html
        /** @type {Date|Datejs} */
        const inst = new Date(...arguments);
        Object.setPrototypeOf(inst, Datejs.prototype);
        return inst;
    }

    /**
     * Resets the time of this object to 12:00 AM (00:00), which is the start of the day.
     * @param  {Boolean=} clone - .clone() this date instance before clearing Time
     * @return {Datejs}  this
     */
    clearTime(clone = false) {
        if (clone) return this.clone().clearTime(false);
        this.setHours(0);
        this.setMinutes(0);
        this.setSeconds(0);
        this.setMilliseconds(0);
        return this;
    }

    /**
     * Resets the time of this object to the current time ('now').
     * @return {Datejs} this
     */
    setTimeToNow() {
        const n = new this.constructor();
        this.setHours(n.getHours());
        this.setMinutes(n.getMinutes());
        this.setSeconds(n.getSeconds());
        this.setMilliseconds(n.getMilliseconds());
        return this;
    }

    /**
     * Gets a date that is set to the current date. The time is set to the start of the day (00:00 or 12:00 AM).
     * @return {Datejs} The current date.
     */
    static today() {
        return new this.constructor().clearTime();
    }

    /**
     * Compares the first date to the second date and returns an number indication of their relative values.
     * @param  {Date}   date1 - First Date object to compare [Required].
     * @param  {Date}   date2 - Second Date object to compare to [Required].
     * @return {Number} -1: date1 is less than date2, 0: values are equal, 1: date1 is greater than date2.
     * @throws {Error}
     * @throws {TypeError}
     */
    static compare(date1, date2) {
        if (isNaN(date1.valueOf()) || isNaN(date2.valueOf())) {
            throw new Error(`${date1} - ${date2}`);
        }

        if (date1 instanceof Date && date2 instanceof Date) {
            if (date1 < date2) return -1;
            if (date1 > date2) return 1;
            return 0;
        }

        throw new TypeError(`${date1} - ${date2}`);
    }

    /**
     * Compares the first Date object to the second Date object and returns true if they are equal.
     * @param  {Datejs}  date1 - First Date object to compare [Required]
     * @param  {Date}    date2 - Second Date object to compare to [Required]
     * @return {Boolean} true: dates are equal, false: dates are not equal.
     */
    static equals(date1, date2) {
        return (date1.compareTo(date2) === 0);
    }

    /**
     * Gets the day number (0-6) if given a CultureInfo specific string which is a valid dayName, abbreviatedDayName or shortestDayName (two char).
     * @param  {String} name - The name of the day (eg. "Monday, "Mon", "tuesday", "tue", "We", "we").
     * @return {Number} The day number
     */
    static getDayNumberFromName(name) {
        name    = name.toLowerCase();
        const n = $C.dayNames;
        const m = $C.abbreviatedDayNames;
        const o = $C.shortestDayNames;
        for (let i = 0; i < n.length; i++) {
            if (n[i].toLowerCase() === name || m[i].toLowerCase() === name || o[i].toLowerCase() === name) return i;
        }
        return -1;
    }

    /**
     * Gets the month number (0-11) if given a Culture Info specific string which is a valid monthName or abbreviatedMonthName.
     * @param  {String} name - The name of the month (eg. "February, "Feb", "october", "oct").
     * @return {Number} The day number
     */
    static getMonthNumberFromName(name) {
        name    = name.toLowerCase();
        const n = $C.monthNames, m = $C.abbreviatedMonthNames;
        for (let i = 0; i < n.length; i++) {
            if (n[i].toLowerCase() === name || m[i].toLowerCase() === name) return i;
        }
        return -1;
    }

    /**
     * Determines if the current date instance is within a LeapYear.
     * @param  {Number}  year - The year.
     * @return {Boolean} true if date is within a LeapYear, otherwise false.
     */
    static isLeapYear(year) {
        return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
    }

    /**
     * Gets the number of days in the month, given a year and month value. Automatically corrects for LeapYear.
     * @param  {Number} year - The year.
     * @param  {Number} month - The month (0-11).
     * @return {Number} The number of days in the month.
     */
    static getDaysInMonth(year, month) {
        return [31, (this.constructor.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    }

    static getTimezoneAbbreviation(offset) {
        const timeZones = $C.timezones;
        for (let timeZone of timeZones) {
            if (timeZone.offset === offset) {
                return timeZone.name;
            }
        }
        return null;
    }

    static getTimezoneOffset(name) {
        const timeZones = $C.timezones;
        for (let timeZone of timeZones) {
            if (timeZone.name === name.toUpperCase()) return timeZone.offset;
        }
        return null;
    }

    /**
     * Returns a new object that is an exact date and time copy of the original instance.
     * @return {Datejs} A new Date instance
     */
    clone() {
        return new this.constructor(this);
    }

    /**
     * Compares this instance to a Date object and returns an number indication of their relative values.
     * @param  {Date}   date - Date object to compare [Required]
     * @return {Number} -1: this is less than date, 0: values are equal, 1: this is greater than date.
     */
    compareTo(date) {
        return Date.compare(this, date);
    }

    /**
     * Compares this instance to another Date object and returns true if they are equal.
     * @param  {Date=}   date - Date object to compare. If no date to compare, new Date() [now] is used.
     * @return {Boolean} true if dates are equal. false if they are not equal.
     */
    equals(date = new this.constructor()) {
        return Date.equals(this, date);
    }

    /**
     * Determines if this instance is between a range of two dates or equal to either the start or end dates.
     * @param  {Date}    start - Start of range [Required]
     * @param  {Date}    end - End of range [Required]
     * @return {Boolean} true if this is between or equal to the start and end dates, else false
     */
    between(start, end) {
        return this.getTime() >= start.getTime() && this.getTime() <= end.getTime();
    }

    /**
     * Determines if this date occurs after the date to compare to.
     * @param  {Date=}    date - Date object to compare. If no date to compare, new Date() ("now") is used.
     * @return {Boolean} true if this date instance is greater than the date to compare to (or "now"), otherwise false.
     */
    isAfter(date = new this.constructor()) {
        return this.compareTo(date) === 1;
    }

    /**
     * Determines if this date occurs before the date to compare to.
     * @param  {Date=}   date - Date object to compare. If no date to compare, new Date() ("now") is used.
     * @return {Boolean} true if this date instance is less than the date to compare to (or "now").
     */
    isBefore(date = new this.constructor()) {
        return this.compareTo(date) === -1;
    }

    /**
     * Determines if the current Date instance occurs today.
     * @return {Boolean} true if this date instance is 'today', otherwise false.
     */
    isToday() {
        return this.isSameDay();
    }

    /**
     * Determines if the current Date instance occurs on the same Date as the supplied 'date'.
     * If no 'date' to compare to is provided, the current Date instance is compared to 'today'.
     * @param  {Datejs=} date - Date object to compare. If no date to compare, the current Date ("now") is used.
     * @return {Boolean} true if this Date instance occurs on the same Day as the supplied 'date'.
     */
    isSameDay(date = new this.constructor()) {
        return this.clearTime(true).equals(date.clearTime(true));
    }

    /**
     * Adds the specified number of milliseconds to this instance.
     * @param  {Number} value - The number of milliseconds to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addMilliseconds(value) {
        this.setMilliseconds(this.getMilliseconds() + (value << 0));
        return this;
    }

    /**
     * Adds the specified number of seconds to this instance.
     * @param  {Number} value - The number of seconds to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addSeconds(value) {
        return this.addMilliseconds(value * 1000);
    }

    /**
     * Adds the specified number of minutes to this instance.
     * @param  {Number} value - The number of minutes to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addMinutes(value) {
        return this.addSeconds(value * 60);
    }

    /**
     * Adds the specified number of hours to this instance.
     * @param  {Number} value - The number of hours to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addHours(value) {
        return this.addMinutes(value * 60);
    }

    /**
     * Adds the specified number of days to this instance.
     * @param  {Number} value - The number of days to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addDays(value) {
        this.setDate(this.getDate() + (value << 0));
        return this;
    }

    /**
     * Adds the specified number of weeks to this instance.
     * @param  {Number} value - The number of weeks to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addWeeks(value) {
        return this.addDays(value * 7);
    }

    /**
     * Adds the specified number of months to this instance.
     * @param  {Number} value - The number of months to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addMonths(value) {
        this.setDate(1);
        this.setMonth(this.getMonth() + (value << 0));
        this.setDate(Math.min(this.getDate(), this.constructor.getDaysInMonth(this.getFullYear(), this.getMonth())));
        return this;
    }

    /**
     * Adds the specified number of years to this instance.
     * @param  {Number} value - The number of years to add. The number can be positive or negative [Required]
     * @return {Datejs} this
     */
    addYears(value) {
        return this.addMonths(value * 12);
    }

    /**
     * Adds (or subtracts) to the value of the years, months, weeks, days, hours, minutes, seconds, milliseconds of the date instance using given configuration object. Positive and Negative values allowed.
     * Example:
     <pre><code>
     Date.today().add({ days: 1, months: 1 })
     new Date().add({ years: -1 })
     </code></pre>
     * @param  {Object.<Number>} config - Configuration object containing attributes (months, days, etc.)
     * @return {Datejs}          this
     */
    add(config) {
        if (typeof config === "number") {
            this._orient = config;
            return this;
        }

        if (config.milliseconds) this.addMilliseconds(config.milliseconds);
        if (config.seconds) this.addSeconds(config.seconds);
        if (config.minutes) this.addMinutes(config.minutes);
        if (config.hours) this.addHours(config.hours);
        if (config.weeks) this.addWeeks(config.weeks);
        if (config.months) this.addMonths(config.months);
        if (config.years) this.addYears(config.years);
        if (config.days) this.addDays(config.days);

        return this;
    }

}
