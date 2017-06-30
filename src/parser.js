// TODO: Extract into separate modules
(function () {
    /**
     Generator Operators And Vector Operators

     Generators are operators that have a signature of F(R) => R,
     taking a given rule and returning another rule, such as
     ignore, which parses a given rule and throws away the result.

     Vector operators are those that have a signature of F(R1,R2,...) => R,
     take a list of rules and returning a new rule, such as each.

     Generator operators are converted (via the following generator
     function) into functions that can also take a list or array of rules
     and return an array of new rules as though the function had been
     called on each rule in turn (which is what actually happens).

     This allows generators to be used with vector operators more easily.
     Example:
     each(ignore(foo, bar)) instead of each(ignore(foo), ignore(bar))

     This also turns generators into vector operators, which allows
     constructs like:
     not(cache(foo, bar))
     */
    const transformers = {
        generator(op) {
            return function () {
                let args = null, rx = [];
                if (arguments.length > 1) {
                    args = Array.prototype.slice.call(arguments);
                } else if (arguments[0] instanceof Array) {
                    args = arguments[0];
                }
                if (args) {
                    // TODO: unclear how this works
                    //noinspection LoopStatementThatDoesntLoopJS TODO: remove
                    for (let i = 0, px = args.shift(); i < px.length; i++) {
                        args.unshift(px[i]);
                        rx.push(op.apply(null, args));
                        args.shift();
                        return rx;
                    }
                } else {
                    return op.apply(null, arguments);
                }
            };
        },

        vector(op) {
            return function () {
                if (arguments[0] instanceof Array) {
                    return op.apply(null, arguments[0]);
                } else {
                    return op.apply(null, arguments);
                }
            };
        },
    };

    Date.Parsing = {
        Exception(s) {
            this.message = "Parse error at '" + s.substring(0, 10) + " ...'";
        },

        Operators: {
            // Tokenizers
            regexToken(r) {
                return function (s) {
                    const mx = s.match(r);
                    if (mx) {
                        return ([mx[0], s.substring(mx[0].length)]);
                    } else {
                        throw new Date.Parsing.Exception(s);
                    }
                };
            },
            token(s) { // whitespace-eating token
                return function (s) {
                    return this.regexToken(new RegExp("^\s*" + s + "\s*"))(s);
                    // Removed .strip()
                    // return _.regexToken(new RegExp("^\s*" + s + "\s*"))(s).strip();
                };
            },
            stringToken(s) {
                return this.regexToken(new RegExp("^" + s));
            },

            // Atomic Operators
            until(p) {
                return function (s) {
                    const qx = [];
                    let rx   = null;
                    while (s.length) {
                        try {
                            rx = p.call(this, s);
                        } catch (e) {
                            qx.push(rx[0]);
                            s = rx[1];
                            continue;
                        }
                        break;
                    }
                    return [qx, s];
                };
            },
            many(p) {
                return function (s) {
                    const rx = [];
                    let r    = null;
                    while (s.length) {
                        try {
                            r = p.call(this, s);
                        } catch (e) {
                            return [rx, s];
                        }
                        rx.push(r[0]);
                        s = r[1];
                    }
                    return [rx, s];
                };
            },

            // generator operators -- see below
            optional(p) {
                return transformers.generator(function (s) {
                    let r = null;
                    try {
                        r = p.call(this, s);
                    } catch (e) {
                        return [null, s];
                    }
                    return [r[0], r[1]];
                });
            },
            not(p) {
                return transformers.generator(function (s) {
                    try {
                        p.call(this, s);
                    } catch (e) {
                        return [null, s];
                    }
                    throw new Date.Parsing.Exception(s);
                });
            },
            ignore(p) {
                return p ?
                    transformers.generator(function (s) {
                        let r = p.call(this, s);
                        return [null, r[1]];
                    }) : null;
            },
            product() {
                const px = arguments[0], qx = Array.prototype.slice.call(arguments, 1), rx = [];
                for (let i = 0; i < px.length; i++) {
                    rx.push(this.each(px[i], qx));
                }
                return rx;
            },
            cache(rule) {
                const cache = {};
                let r       = null;
                return transformers.generator(function (s) {
                    try {
                        r = cache[s] = (cache[s] || rule.call(this, s));
                    } catch (e) {
                        r = cache[s] = e;
                    }
                    if (r instanceof Date.Parsing.Exception) {
                        throw r;
                    } else {
                        return r;
                    }
                });
            },

            // vector operators -- see below
            any() {
                const px = arguments;
                return transformers.vector(function (s) {
                    let r = null;
                    for (let i = 0; i < px.length; i++) {
                        if (px[i] === null) {
                            continue;
                        }
                        try {
                            r = (px[i].call(this, s));
                        } catch (e) {
                            r = null;
                        }
                        if (r) {
                            return r;
                        }
                    }
                    throw new Date.Parsing.Exception(s);
                });
            },
            each() {
                const px = arguments;
                return transformers.vector(function (s) {
                    const rx = [];
                    let r    = null;
                    for (let i = 0; i < px.length; i++) {
                        if (px[i] == null) {
                            continue;
                        }
                        try {
                            r = (px[i].call(this, s));
                        } catch (e) {
                            throw new Date.Parsing.Exception(s);
                        }
                        rx.push(r[0]);
                        s = r[1];
                    }
                    return [rx, s];
                });
            },
            all() {
                return transformers.vector(this.each(this.optional(arguments)));
            },

            // delimited operators
            sequence(px, d, c) {
                d = d || this.regexToken(/^\s*/);
                c = c || null;

                if (px.length === 1) {
                    return px[0];
                }
                return function (s) {
                    let r    = null, q = null;
                    const rx = [];
                    for (let i = 0; i < px.length; i++) {
                        try {
                            r = px[i].call(this, s);
                        } catch (e) {
                            break;
                        }
                        rx.push(r[0]);
                        try {
                            q = d.call(this, r[1]);
                        } catch (ex) {
                            q = null;
                            break;
                        }
                        s = q[1];
                    }
                    if (!r) {
                        throw new Date.Parsing.Exception(s);
                    }
                    if (q) {
                        throw new Date.Parsing.Exception(q[1]);
                    }
                    if (c) {
                        try {
                            r = c.call(this, r[1]);
                        } catch (ey) {
                            throw new Date.Parsing.Exception(r[1]);
                        }
                    }
                    return [rx, (r ? r[1] : s)];
                };
            },

            // Composite Operators
            between(d1, p, d2) {
                d2        = d2 || d1;
                const _fn = this.each(this.ignore(d1), p, this.ignore(d2));
                return function (s) {
                    const rx = _fn.call(this, s);
                    return [[rx[0][0], r[0][2]], rx[1]];
                };
            },
            list(p, d, c) {
                d = d || this.regexToken(/^\s*/);
                c = c || null;
                return (p instanceof Array ?
                    this.each(this.product(p.slice(0, -1), this.ignore(d)), p.slice(-1), this.ignore(c)) :
                    this.each(this.many(this.each(p, this.ignore(d))), px, this.ignore(c)));
            },
            set(px, d, c) {
                d = d || this.regexToken(/^\s*/);
                c = c || null;
                return function (s) {
                    // r is the current match, best the current 'best' match
                    // which means it parsed the most amount of input
                    let r = null, p = null, q = null, rx = null, best = [[], s], last = false;

                    // go through the rules in the given set
                    for (let i = 0; i < px.length; i++) {

                        // last is a flag indicating whether this must be the last element
                        // if there is only 1 element, then it MUST be the last one
                        q    = null;
                        p    = null;
                        r    = null;
                        last = (px.length === 1);

                        // first, we try simply to match the current pattern
                        // if not, try the next pattern
                        try {
                            r = px[i].call(this, s);
                        } catch (e) {
                            continue;
                        }

                        // since we are matching against a set of elements, the first
                        // thing to do is to add r[0] to matched elements
                        rx = [[r[0]], r[1]];

                        // if we matched and there is still input to parse and
                        // we don't already know this is the last element,
                        // we're going to next check for the delimiter ...
                        // if there's none, or if there's no input left to parse
                        // than this must be the last element after all ...
                        if (r[1].length > 0 && !last) {
                            try {
                                q = d.call(this, r[1]);
                            } catch (ex) {
                                last = true;
                            }
                        } else {
                            last = true;
                        }

                        // if we parsed the delimiter and now there's no more input,
                        // that means we shouldn't have parsed the delimiter at all
                        // so don't update r and mark this as the last element ...
                        if (!last && q[1].length === 0) {
                            last = true;
                        }


                        // so, if this isn't the last element, we're going to see if
                        // we can get any more matches from the remaining (unmatched)
                        // elements ...
                        if (!last) {

                            // build a list of the remaining rules we can match against,
                            // i.e., all but the one we just matched against
                            const qx = [];
                            for (let j = 0; j < px.length; j++) {
                                if (i !== j) {
                                    qx.push(px[j]);
                                }
                            }

                            // now invoke recursively set with the remaining input
                            // note that we don't include the closing delimiter ...
                            // we'll check for that ourselves at the end
                            p = this.set(qx, d).call(this, q[1]);

                            // if we got a non-empty set as a result ...
                            // (otw rx already contains everything we want to match)
                            if (p[0].length > 0) {
                                // update current result, which is stored in rx ...
                                // basically, pick up the remaining text from p[1]
                                // and concat the result from p[0] so that we don't
                                // get endless nesting ...
                                rx[0] = rx[0].concat(p[0]);
                                rx[1] = p[1];
                            }
                        }

                        // at this point, rx either contains the last matched element
                        // or the entire matched set that starts with this element.

                        // now we just check to see if this variation is better than
                        // our best so far, in terms of how much of the input is parsed
                        if (rx[1].length < best[1].length) {
                            best = rx;
                        }

                        // if we've parsed all the input, then we're finished
                        if (best[1].length === 0) {
                            break;
                        }
                    }

                    // so now we've either gone through all the patterns trying them
                    // as the initial match; or we found one that parsed the entire
                    // input string ...

                    // if best has no matches, just return empty set ...
                    if (best[0].length === 0) {
                        return best;
                    }

                    // if a closing delimiter is provided, then we have to check it also
                    if (c) {
                        // we try this even if there is no remaining input because the pattern
                        // may well be optional or match empty input ...
                        try {
                            q = c.call(this, best[1]);
                        } catch (ey) {
                            throw new Date.Parsing.Exception(best[1]);
                        }

                        // it parsed ... be sure to update the best match remaining input
                        best[1] = q[1];
                    }

                    // if we're here, either there was no closing delimiter or we parsed it
                    // so now we have the best match; just return it!
                    return best;
                };
            },
            forward(gr, fname) {
                return function (s) {
                    return gr[fname].call(this, s);
                };
            },

            // Translation Operators
            replace(rule, repl) {
                return function (s) {
                    const r = rule.call(this, s);
                    return [repl, r[1]];
                };
            },
            process(rule, fn) {
                return function (s) {
                    const r = rule.call(this, s);
                    return [fn.call(this, r[0]), r[1]];
                };
            },
            min(min, rule) {
                return function (s) {
                    const rx = rule.call(this, s);
                    if (rx[0].length < min) {
                        throw new Date.Parsing.Exception(s);
                    }
                    return rx;
                };
            },
        },
    };

}());

(function () {
    const flattenAndCompact = function flattenAndCompact(ax) {
        let rx = [];
        for (let i = 0; i < ax.length; i++) {
            if (ax[i] instanceof Array) {
                rx = rx.concat(flattenAndCompact(ax[i]));
            } else if (ax[i]) {
                rx.push(ax[i]);
            }
        }
        return rx;
    };

    Date.Translator = {
        hour(s) {
            return function () {
                this.hour = Number(s);
            };
        },
        minute(s) {
            return function () {
                this.minute = Number(s);
            };
        },
        second(s) {
            return function () {
                this.second = Number(s);
            };
        },
        meridian(s) {
            return function () {
                this.meridian = s.slice(0, 1).toLowerCase();
            };
        },
        timezone(s) {
            return function () {
                const n = s.replace(/[^\d+\-]/g, "");
                if (n.length) {
                    this.timezoneOffset = Number(n);
                } else {
                    this.timezone = s.toLowerCase();
                }
            };
        },
        day(x) {
            const s = x[0];
            return function () {
                this.day = Number(s.match(/\d+/)[0]);
            };
        },
        month(s) {
            return function () {
                this.month = (s.length === 3) ? "jan feb mar apr may jun jul aug sep oct nov dec".indexOf(s) / 4 : Number(s) - 1;
            };
        },
        year(s) {
            return function () {
                const n   = Number(s);
                this.year = ((s.length > 2) ? n :
                    (n + (((n + 2000) < Date.CultureInfo.twoDigitYearMax) ? 2000 : 1900)));
            };
        },
        rday(s) {
            return function () {
                switch (s) {
                    case "yesterday":
                        this.days = -1;
                        break;
                    case "tomorrow":
                        this.days = 1;
                        break;
                    case "today":
                        this.days = 0;
                        break;
                    case "now":
                        this.days = 0;
                        this.now  = true;
                        break;
                }
            };
        },
        finishExact(x) {
            x = (x instanceof Array) ? x : [x];

            for (let i = 0; i < x.length; i++) {
                if (x[i]) {
                    x[i].call(this);
                }
            }

            const now = new Date();

            if ((this.hour || this.minute) && (!this.month && !this.year && !this.day)) {
                this.day = now.getDate();
            }

            if (!this.year) {
                this.year = now.getFullYear();
            }

            if (!this.month && this.month !== 0) {
                this.month = now.getMonth();
            }

            if (!this.day) {
                this.day = 1;
            }

            if (!this.hour) {
                this.hour = 0;
            }

            if (!this.minute) {
                this.minute = 0;
            }

            if (!this.second) {
                this.second = 0;
            }

            if (this.meridian && this.hour) {
                if (this.meridian === "p" && this.hour < 12) {
                    this.hour = this.hour + 12;
                } else if (this.meridian === "a" && this.hour === 12) {
                    this.hour = 0;
                }
            }

            if (this.day > Date.getDaysInMonth(this.year, this.month)) {
                throw new RangeError(this.day + " is not a valid value for days.");
            }

            const r = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second);

            if (this.timezone) {
                r.set({ timezone: this.timezone });
            } else if (this.timezoneOffset) {
                r.set({ timezoneOffset: this.timezoneOffset });
            }

            return r;
        },
        finish(x) {
            x = (x instanceof Array) ? flattenAndCompact(x) : [x];

            if (x.length === 0) {
                return null;
            }

            for (let i = 0; i < x.length; i++) {
                if (typeof x[i] === "function") {
                    x[i].call(this);
                }
            }

            let today = Date.today();

            if (this.now && !this.unit && !this.operator) {
                return new Date();
            } else if (this.now) {
                today = new Date();
            }

            let expression = !!(this.days && this.days !== null || this.orient || this.operator);

            let gap, mod, orient;
            orient = ((this.orient === "past" || this.operator === "subtract") ? -1 : 1);

            if (!this.now && "hour minute second".indexOf(this.unit) !== -1) {
                today.setTimeToNow();
            }

            if (this.month || this.month === 0) {
                if ("year day hour minute second".indexOf(this.unit) !== -1) {
                    this.value = this.month + 1;
                    this.month = null;
                    expression = true;
                }
            }

            if (!expression && this.weekday && !this.day && !this.days) {
                const temp = Date[this.weekday]();
                this.day   = temp.getDate();
                if (!this.month) {
                    this.month = temp.getMonth();
                }
                this.year = temp.getFullYear();
            }

            if (expression && this.weekday && this.unit !== "month") {
                this.unit = "day";
                gap       = (Date.getDayNumberFromName(this.weekday) - today.getDay());
                mod       = 7;
                this.days = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
            }

            if (this.month && this.unit === "day" && this.operator) {
                this.value = (this.month + 1);
                this.month = null;
            }

            if (this.value != null && this.month != null && this.year != null) {
                this.day = this.value * 1;
            }

            if (this.month && !this.day && this.value) {
                today.set({ day: this.value * 1 });
                if (!expression) {
                    this.day = this.value * 1;
                }
            }

            if (!this.month && this.value && this.unit === "month" && !this.now) {
                this.month = this.value;
                expression = true;
            }

            if (expression && (this.month || this.month === 0) && this.unit !== "year") {
                this.unit   = "month";
                gap         = (this.month - today.getMonth());
                mod         = 12;
                this.months = gap ? ((gap + (orient * mod)) % mod) : (orient * mod);
                this.month  = null;
            }

            if (!this.unit) {
                this.unit = "day";
            }

            if (!this.value && this.operator && this.operator !== null && this[this.unit + "s"] && this[this.unit + "s"] !== null) {
                this[this.unit + "s"] = this[this.unit + "s"] + ((this.operator === "add") ? 1 : -1) + (this.value || 0) * orient;
            } else if (this[this.unit + "s"] == null || this.operator != null) {
                if (!this.value) {
                    this.value = 1;
                }
                this[this.unit + "s"] = this.value * orient;
            }

            if (this.meridian && this.hour) {
                if (this.meridian === "p" && this.hour < 12) {
                    this.hour = this.hour + 12;
                } else if (this.meridian === "a" && this.hour === 12) {
                    this.hour = 0;
                }
            }

            if (this.weekday && !this.day && !this.days) {
                const temp = Date[this.weekday]();
                this.day   = temp.getDate();
                if (temp.getMonth() !== today.getMonth()) {
                    this.month = temp.getMonth();
                }
            }

            if ((this.month || this.month === 0) && !this.day) {
                this.day = 1;
            }

            if (!this.orient && !this.operator && this.unit === "week" && this.value && !this.day && !this.month) {
                return Date.today().setWeek(this.value);
            }

            if (expression && this.timezone && this.day && this.days) {
                this.day = this.days;
            }

            return (expression) ? today.add(this) : today.set(this);
        },
    };

    const _                   = Date.Parsing.Operators, t = Date.Translator;
    const singleGeneralRule   = function generalRule() {
        return _.each(_.any.apply(null, arguments), _.not(cultureToken2("timeContext")));
    };
    const multipleGeneralRule = function multipleGeneralRule() {
        return _.set(arguments, Date.Grammar.datePartDelimiter); // TODO: Fix reference
    };
    // TODO: meaningful name
    const _F                  = {};

    // TODO: Remove '.call' and '.apply' so these can be called with 'this'
    const cultureToken  = function cultureToken(keys) {
        const _C = {};
        let fn   = _C[keys];
        if (!fn) {
            const c  = Date.CultureInfo.regexPatterns;
            const kx = keys.split(/\s+/), px = [];
            for (let i = 0; i < kx.length; i++) {
                px.push(_.replace(_.regexToken(c[kx[i]]), kx[i]));
            }
            fn = _C[keys] = _.any.apply(null, px);
        }
        return fn;
    };
    const cultureToken2 = function cultureToken2(key) {
        return _.regexToken(Date.CultureInfo.regexPatterns[key]);
    };

    Date.Grammar = {
        datePartDelimiter: _.regexToken(/^([\s\-.,،\/\x27]+)/),
        timePartDelimiter: _.stringToken(":"),
        whiteSpace:        _.regexToken(/^\s*/),
        generalDelimiter:  _.regexToken(/^(([\s,]|at|@|on)+)/),

        // hour, minute, second
        h:   _.cache(_.process(_.regexToken(/^(0[0-9]|1[0-2]|[1-9])/), t.hour)),
        hh:  _.cache(_.process(_.regexToken(/^(0[0-9]|1[0-2])/), t.hour)),
        H:   _.cache(_.process(_.regexToken(/^([0-1][0-9]|2[0-3]|[0-9])/), t.hour)),
        HH:  _.cache(_.process(_.regexToken(/^([0-1][0-9]|2[0-3])/), t.hour)),
        m:   _.cache(_.process(_.regexToken(/^([0-5][0-9]|[0-9])/), t.minute)),
        mm:  _.cache(_.process(_.regexToken(/^[0-5][0-9]/), t.minute)),
        s:   _.cache(_.process(_.regexToken(/^([0-5][0-9]|[0-9])/), t.second)),
        ss:  _.cache(_.process(_.regexToken(/^[0-5][0-9]/), t.second)),
        get hms() { // TODO: These should all be getters
            return _.cache(_.sequence([this.H, this.m, this.s], this.timePartDelimiter))
        },

        // meridian
        t:  _.cache(_.process(cultureToken2("shortMeridian"), t.meridian)),
        tt: _.cache(_.process(cultureToken2("longMeridian"), t.meridian)),
        z:  _.cache(_.process(_.regexToken(/^(([+-])\s*\d\d\d\d)|(([+-])\d\d:?\d\d)/), t.timezone)),
        zz: _.cache(_.process(_.regexToken(/^(([+-])\s*\d\d\d\d)|(([+-])\d\d:?\d\d)/), t.timezone)),

        // timezone
        zzz:        _.cache(_.process(cultureToken2("timezone"), t.timezone)),
        get timeSuffix() {
            return _.each(_.ignore(this.whiteSpace), _.set([this.tt, this.zzz]))
        },
        get time() {
            return _.each(_.optional(_.ignore(_.stringToken("T"))), this.hms, this.timeSuffix)
        },

        // days, months, years
        d:    _.cache(_.process(_.each(_.regexToken(/^([0-2]\d|3[0-1]|\d)/), _.optional(cultureToken2("ordinalSuffix"))), t.day)),
        dd:   _.cache(_.process(_.each(_.regexToken(/^([0-2]\d|3[0-1])/), _.optional(cultureToken2("ordinalSuffix"))), t.day)),
        ddd:  _.cache(_.process(cultureToken("sun mon tue wed thu fri sat"),
            function (s) {
                return function () {
                    this.weekday = s;
                };
            },
        )),
        get dddd() {
            return this.ddd
        },

        M:    _.cache(_.process(_.regexToken(/^(1[0-2]|0\d|\d)/), t.month)),
        MM:   _.cache(_.process(_.regexToken(/^(1[0-2]|0\d)/), t.month)),
        MMM:  _.cache(_.process(cultureToken("jan feb mar apr may jun jul aug sep oct nov dec"), t.month)),
        MMMM: this.MMM,
        y:    _.cache(_.process(_.regexToken(/^(\d\d?)/), t.year)),
        yy:   _.cache(_.process(_.regexToken(/^(\d\d)/), t.year)),
        yyy:  _.cache(_.process(_.regexToken(/^(\d\d?\d?\d?)/), t.year)),
        yyyy: _.cache(_.process(_.regexToken(/^(\d\d\d\d)/), t.year)),

        day:   singleGeneralRule(this.d, this.dd),
        month: singleGeneralRule(this.M, this.MMM),
        year:  singleGeneralRule(this.yyyy, this.yy),

        // relative date / time expressions
        orientation: _.process(cultureToken("past future"),
            function (s) {
                return function () {
                    this.orient = s;
                };
            }
        ),
        operator:    _.process(cultureToken("add subtract"),
            function (s) {
                return function () {
                    this.operator = s;
                };
            }
        ),
        rday:        _.process(cultureToken("yesterday tomorrow today now"), t.rday),
        unit:        _.process(cultureToken("second minute hour day week month year"),
            function (s) {
                return function () {
                    this.unit = s;
                };
            }
        ),
        value:       _.process(_.regexToken(/^\d\d?(st|nd|rd|th)?/),
            function (s) {
                return function () {
                    this.value = s.replace(/\D/g, "");
                };
            }
        ),
        expression:  _.set([this.rday, this.operator, this.value, this.unit, this.orientation, this.ddd, this.MMM]),

        // pre-loaded rules for different date part order preferences
        mdy: multipleGeneralRule(this.ddd, this.month, this.day, this.year),
        ymd: multipleGeneralRule(this.ddd, this.year, this.month, this.day),
        dmy: multipleGeneralRule(this.ddd, this.day, this.month, this.year),
        date(s) {
            return ((this[Date.CultureInfo.dateElementOrder] || this.mdy).call(this, s));
        },

        // parsing date format specifiers - ex: "h:m:s tt"
        // this little guy will generate a custom parser based
        // on the format string, ex: g.format("h:m:s tt")
        format: _.process(_.many(
            _.any(
                // translate format specifiers into grammar rules
                _.process(_.regexToken(/^(dd?d?d?|MM?M?M?|yy?y?y?|hh?|HH?|mm?|ss?|tt?|zz?z?)/),
                    function (fmt) {
                        if (this[fmt]) {
                            return this[fmt];
                        } else {
                            throw Date.Parsing.Exception(fmt);
                        }
                    }),
                // translate separator tokens into token rules
                _.process(_.regexToken(/^[^dMyhHmstz]+/), // all legal separators
                    function (s) {
                        return _.ignore(_.stringToken(s));
                    })
            )),
            // construct the parser ...
            function (rules) {
                return _.process(_.each.apply(null, rules), t.finishExact);
            }
        ),

        formats(fx) {
            const get = function _get(f) {
                return _F[f] = (_F[f] || this.format(f)[0]);
            };

            if (fx instanceof Array) {
                const rx = [];
                for (let i = 0; i < fx.length; i++) {
                    rx.push(get(fx[i]));
                }
                return _.any.apply(null, rx);
            } else {
                return get(fx);
            }
        },

        // check for these formats first
        _formats: this.formats([
            "\"yyyy-MM-ddTHH:mm:ssZ\"",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ssz",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mmZ",
            "yyyy-MM-ddTHH:mmz",
            "yyyy-MM-ddTHH:mm",
            "ddd, MMM dd, yyyy H:mm:ss tt",
            "ddd MMM d yyyy HH:mm:ss zzz",
            "MMddyyyy",
            "ddMMyyyy",
            "Mddyyyy",
            "ddMyyyy",
            "Mdyyyy",
            "dMyyyy",
            "yyyy",
            "Mdyy",
            "dMyy",
            "d",
        ]),

        // starting rule for general purpose grammar
        _start: _.process(_.set([this.date, this.time, this.expression], this.generalDelimiter, this.whiteSpace), t.finish),

        // real starting rule: tries selected formats first,
        // then general purpose rule
        start(s) {
            try {
                const r = this._formats.call({}, s);
                if (r[1].length === 0) {
                    return r;
                }
            } catch (e) {
                // Ignore errors TODO: why?
            }
            return this._start.call({}, s);
        },
    };


    Date._parse = Date.parse;

    /**
     * Converts the specified string value into its JavaScript Date equivalent using CultureInfo specific format information.
     *
     * Example
     <pre><code>
     ///////////
     // Dates //
     ///////////

     // 15-Oct-2004
     var d1 = Date.parse("10/15/2004");

     // 15-Oct-2004
     var d1 = Date.parse("15-Oct-2004");

     // 15-Oct-2004
     var d1 = Date.parse("2004.10.15");

     //Fri Oct 15, 2004
     var d1 = Date.parse("Fri Oct 15, 2004");

     ///////////
     // Times //
     ///////////

     // Today at 10 PM.
     var d1 = Date.parse("10 PM");

     // Today at 10:30 PM.
     var d1 = Date.parse("10:30 P.M.");

     // Today at 6 AM.
     var d1 = Date.parse("06am");

     /////////////////////
     // Dates and Times //
     /////////////////////

     // 8-July-2004 @ 10:30 PM
     var d1 = Date.parse("July 8th, 2004, 10:30 PM");

     // 1-July-2004 @ 10:30 PM
     var d1 = Date.parse("2004-07-01T22:30:00");

     ////////////////////
     // Relative Dates //
     ////////////////////

     // Returns today's date. The string "today" is culture specific.
     var d1 = Date.parse("today");

     // Returns yesterday's date. The string "yesterday" is culture specific.
     var d1 = Date.parse("yesterday");

     // Returns the date of the next thursday.
     var d1 = Date.parse("Next thursday");

     // Returns the date of the most previous monday.
     var d1 = Date.parse("last monday");

     // Returns today's day + one year.
     var d1 = Date.parse("next year");

     ///////////////
     // Date Math //
     ///////////////

     // Today + 2 days
     var d1 = Date.parse("t+2");

     // Today + 2 days
     var d1 = Date.parse("today + 2 days");

     // Today + 3 months
     var d1 = Date.parse("t+3m");

     // Today - 1 year
     var d1 = Date.parse("today - 1 year");

     // Today - 1 year
     var d1 = Date.parse("t-1y");


     /////////////////////////////
     // Partial Dates and Times //
     /////////////////////////////

     // July 15th of this year.
     var d1 = Date.parse("July 15");

     // 15th day of current day and year.
     var d1 = Date.parse("15");

     // July 1st of current year at 10pm.
     var d1 = Date.parse("7/1 10pm");
     </code></pre>
     *
     * @param {Date|String} s - The string value to convert into a Date object [Required]
     * @return {Date|null}      A Date object or null if the string cannot be converted into a Date.
     */
    Date.parse = function (s) {
        let r = null;
        if (!s) {
            return null;
        }
        if (s instanceof Date) {
            return s;
        }
        try {
            r = Date.Grammar.start.call({}, s.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1"));
        } catch (e) {
            return null;
        }
        return ((r[1].length === 0) ? r[0] : null);
    };

    Date.getParseFunction = function (fx) {
        const fn = Date.Grammar.formats(fx);
        return function (s) {
            let r = null;
            try {
                r = fn.call({}, s);
            } catch (e) {
                return null;
            }
            return ((r[1].length === 0) ? r[0] : null);
        };
    };

    /**
     * Converts the specified string value into its JavaScript Date equivalent using the specified format {String} or formats {Array} and the CultureInfo specific format information.
     * The format of the string value must match one of the supplied formats exactly.
     *
     * Example
     <pre><code>
     // 15-Oct-2004
     var d1 = Date.parseExact("10/15/2004", "M/d/yyyy");

     // 15-Oct-2004
     var d1 = Date.parse("15-Oct-2004", "M-ddd-yyyy");

     // 15-Oct-2004
     var d1 = Date.parse("2004.10.15", "yyyy.MM.dd");

     // Multiple formats
     var d1 = Date.parseExact("10/15/2004", ["M/d/yyyy", "MMMM d, yyyy"]);
     </code></pre>
     *
     * @param {String}   s - The string value to convert into a Date object [Required].
     * @param {Object}   fx - The expected format {String} or an array of expected formats {Array} of the date string [Required].
     * @return {Date}    A Date object or null if the string cannot be converted into a Date.
     */
    Date.parseExact = function (s, fx) {
        return Date.getParseFunction(fx)(s);
    };
}());
