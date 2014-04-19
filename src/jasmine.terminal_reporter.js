(function(global) {
    var exportObject;

    if (typeof module !== "undefined" && module.exports) {
        exportObject = exports;
    } else {
        exportObject = global.jasmineReporters = global.jasmineReporters || {};
    }

    function elapsed(start, end) { return (end - start)/1000; }
    function isFailed(obj) { return obj.status === "failed"; }
    function isSkipped(obj) { return obj.status === "pending"; }

    /**
     * Basic reporter that outputs spec results to the terminal.
     * Use this reporter in your build pipeline.
     *
     * Usage:
     *
     * jasmine.getEnv().addReporter(new jasmineReporters.TerminalReporter({
           verbosity: 2,
           color: true
       }));
     */
    var DEFAULT_VERBOSITY = 2,
        ATTRIBUTES_TO_ANSI = {
            "off": 0,
            "bold": 1,
            "red": 31,
            "green": 32
        };

    exportObject.TerminalReporter = function(params) {
        var self = this;
        params = params || {};

        if (params.verbosity === 0) {
            self.verbosity = 0;
        } else {
            self.verbosity = params.verbosity || DEFAULT_VERBOSITY;
        }
        self.color = params.color;

        self.started = false;
        self.finished = false;
        var current_suite_hierarchy = [],
            indent_string = '  ';

        var startTime,
            suites = [],
            currentSuite = null,
            totalSpecsExecuted = 0,
            totalSpecsSkipped = 0,
            totalSpecsFailed = 0,
            totalSpecsDefined;

        self.jasmineStarted = function(summary) {
            totalSpecsDefined = summary && summary.totalSpecsDefined || NaN;
            startTime = exportObject.startTime = new Date();
            self.started = true;
        };
        self.suiteStarted = function(suite) {
            suite._specs = 0;
            suite._failures = 0;
            suite._skipped = 0;
            suite._parent = currentSuite;
            currentSuite = suite;
        };
        self.specStarted = function(spec) {
            spec._suite = currentSuite;
            currentSuite._specs++;

            if (self.verbosity > 2) {
                logCurrentSuite(spec._suite);
                log(indentWithCurrentLevel(indent_string + spec.description + ' ...'));
            }
        };
        self.specDone = function(spec) {
            var failed = false,
                skipped = false,
                color = 'green',
                resultText;
            if (isSkipped(spec)) {
                skipped = true;
                color = '';
                spec._suite._skipped++;
                totalSpecsSkipped++;
            }
            if (isFailed(spec)) {
                failed = true;
                color = 'red';
                spec._suite._failures++;
                totalSpecsFailed++;
            }
            totalSpecsExecuted++;

            if (self.verbosity === 2) {
                resultText = failed ? 'F' : skipped ? 'S' : '.';
                log(inColor(resultText, color));
            } else if (self.verbosity > 2) {
                resultText = failed ? 'Failed' : skipped ? 'Skipped' : 'Passed';
                log(' ' + inColor(resultText, color));
            }

            if (failed) {
                if (self.verbosity === 1) {
                    log(spec.fullName);
                } else if (self.verbosity === 2) {
                    log(' ');
                    log(indentWithCurrentLevel(indent_string + spec.fullName));
                }

                for (var i = 0, failure; i < spec.failedExpectations.length; i++) {
                    log(inColor(indentWithCurrentLevel(indent_string + indent_string + spec.failedExpectations[i].message), color));
                }
            }
        };
        self.suiteDone = function(suite) {
            currentSuite = suite._parent;
            if (self.verbosity < 3) {
                return;
            }

            var total = suite._specs,
                failed = suite._failures,
                skipped = suite._skipped,
                passed = total - failed - skipped,
                color = failed ? 'red+bold' : 'green+bold',
                str = passed + ' of ' + total + ' passed (' + skipped + ' skipped)';
            logCurrentSuite(suite);
            log(indentWithCurrentLevel(inColor(str+'.', color)));
        };
        self.jasmineDone = function() {
            var now = new Date(),
                dur = elapsed(startTime, now),
                spec_str = totalSpecsExecuted + (totalSpecsExecuted === 1 ? " spec, " : " specs, "),
                fail_str = totalSpecsFailed + (totalSpecsFailed === 1 ? " failure, " : " failures, "),
                skip_str = totalSpecsSkipped + " skipped in ",
                summary_str = spec_str + fail_str + skip_str + dur + "s.",
                result_str = (totalSpecsFailed && "FAILURE: " || "SUCCESS: ") + summary_str,
                result_color = totalSpecsFailed && "red+bold" || "green+bold";

            if (self.verbosity === 2) {
                log("");
            }

            if (self.verbosity > 0) {
                log(inColor(result_str, result_color));
            }
            //console.log("Specs skipped but not reported (entire suite skipped)", totalSpecsDefined - totalSpecsExecuted);

            self.finished = true;
            // this is so phantomjs-testrunner.js can tell if we're done executing
            exportObject.endTime = now;
        };
        function indentWithCurrentLevel(string) {
            return new Array(current_suite_hierarchy.length).join(indent_string) + string;
        }
        function logCurrentSuite(suite) {
            var suite_path = recursivelyUpdateHierarchyUpToRootAndLogNewBranches(suite);
            // If we just popped down from a higher path, we need to update here
            current_suite_hierarchy = suite_path;
        }
        function recursivelyUpdateHierarchyUpToRootAndLogNewBranches(suite) {
            var suite_path = [],
                current_level;

            if (suite._parent) {
                suite_path = recursivelyUpdateHierarchyUpToRootAndLogNewBranches(suite._parent);
            }

            suite_path.push(suite);
            current_level = suite_path.length - 1;

            if (current_suite_hierarchy.length <= current_level ||
                current_suite_hierarchy[current_level] !== suite) {

                current_suite_hierarchy = suite_path.slice(0);
                log(indentWithCurrentLevel(inColor(suite.description, "bold")));
            }
            return suite_path;
        }

        function log(str) {
            var console = global.console;
            if (console && console.log) {
                console.log(str);
            }
        }
        function inColor(string, color) {
            var color_attributes = color && color.split("+"),
                ansi_string = "",
                i, attr;

            if (!self.color || !color_attributes) {
                return string;
            }

            for(i = 0; i < color_attributes.length; i++) {
                ansi_string += "\033[" + ATTRIBUTES_TO_ANSI[color_attributes[i]] + "m";
            }
            ansi_string += string + "\033[" + ATTRIBUTES_TO_ANSI["off"] + "m";

            return ansi_string;
        }
    };
})(this);
