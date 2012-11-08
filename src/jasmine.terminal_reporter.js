// Source:
// https://github.com/larrymyers/jasmine-reporters

(function() {
    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }

    var realConsole = console || window.console;

    var LoggingProxy = function() {
        this.deep = 0;
        this.skip = false;
    }

    LoggingProxy.prototype = {

        log: function() {
            this._log(arguments);
        },

        info: function() {
            this._log(arguments, '[i]');
        },

        error: function(err) {
            this._rlog(err.message, '[E]');
            if (realConsole.error) realConsole.error(err.message);
        },

        warn: function() {
            this._log(arguments, '[!]');
        },

        group: function() {
            this.deep++;
            this._flog(arguments, '[-]');
        },

        groupCollapsed: function() {
            this.deep++;
            this._flog(arguments, '[+]');
            this.skip = true;
        },

        groupEnd: function() {
            this.deep--;
            this.skip = false;
        },

        _log: function(args, marker) {
            if (this.skip) return;
            this._flog(args, marker);
        },

        // forced log
        _flog: function(args, marker) {
            var argsArr = this.__argsToArray(args);
            if (marker) argsArr = [marker].concat(argsArr);
            realConsole.log(this._prefix() + this._format(argsArr));
        },

        // raw log
        _rlog: function(str, marker) {
            realConsole.log(this._prefix() + (marker || '') + ' ' + str);
        },

        _format: function(params) {
            return params.join(' ');
        },

        _prefix: function() {
            var prefix = '';
            var count = this.deep;
            if (count === 0) return '';
            while (--count) {
                prefix += '--';
            }
            return prefix + ' ';
        },

        __argsToArray: function(args) {
            return Array.prototype.slice.call(args);
        }

    };
    var console = new LoggingProxy();

    /**
     * Basic reporter that outputs spec results to the terminal console.
     * Useful if you need to test an html page in headless environment
     * and don't want the TrivialReporter markup mucking things up.
     *
     * Usage:
     *
     * jasmine.getEnv().addReporter(new jasmine.TerminalReporter());
     * jasmine.getEnv().execute();
     */
    var TerminalReporter = function(conf) {
        this.started = false;
        this.finished = false;
        this.logInProgress = conf ? conf.logInProgress : false;
    };

    TerminalReporter.prototype = {

        reportRunnerStarting: function(runner) {
            this.started = true;
            this.start_time = (new Date()).getTime();
            this.executed_specs = 0;
            this.passed_specs = 0;
            this.log("Runner Started.");
        },

        reportRunnerResults: function(runner) {
            console.log('------------------------------');
            var suites = runner.suites();
            startGroup(runner.results(), 'tests');
            for (var i=0; i<suites.length; i++) {
                if (!suites[i].parentSuite) {
                    suiteResults(suites[i]);
                }
            }
            console.groupEnd();
            console.log('------------------------------');

            var dur = (new Date()).getTime() - this.start_time;
            var failed = this.executed_specs - this.passed_specs;
            var spec_str = this.executed_specs + (this.executed_specs === 1 ? " spec, " : " specs, ");
            var fail_str = failed + (failed === 1 ? " failure in " : " failures in ");

            this.log("Runner Finished.");
            this.log(spec_str + fail_str + (dur/1000) + "s.");

            this.finished = true;
        },

        hasGroupedConsole: function() {
            //var console = jasmine.getGlobal().console;
            return console && console.info && console.warn && console.group && console.groupEnd && console.groupCollapsed;
        },

        reportSpecResults: function(spec) {
            var resultText = this._elispis(spec.description, 70) + " : FAIL.";

            if (spec.results().passed()) {
                this.passed_specs++;
                resultText = this._elispis(spec.description, 70) + " : OK.";
            }

            if (this.logInProgress) this.log('    ' + resultText);
        },

        reportSpecStarting: function(spec) {
            this.executed_specs++;
            if (this.logInProgress) this.log('    ' + this.executed_specs + '.');
        },

        reportSuiteResults: function(suite) {
            var results = suite.results();
            if (this.logInProgress) this.log('::> ' + this._elispis(suite.description, 70) + " -> " + results.passedCount + " of " + results.totalCount + " passed.");
        },

        log: function(str) {
            var console = jasmine.getGlobal().console;
            if (console && console.log) {
                console.log(str);
            }
        },

        _elispis: function(str, max) {
            var half = Math.round((max - 5) / 2);
            return (str.length < max) ? str : str.substr(0, half) + ' ... ' + str.substr(str.length - half, half);
        }
    };

    function suiteResults(suite) {
        var results = suite.results();
        startGroup(results, suite.description);
        var specs = suite.specs();
        for (var i in specs) {
            if (specs.hasOwnProperty(i)) {
                specResults(specs[i]);
            }
        }
        var suites = suite.suites();
        for (var j in suites) {
            if (suites.hasOwnProperty(j)) {
                suiteResults(suites[j]);
            }
        }
        console.groupEnd();
    }

    function specResults(spec) {
        var results = spec.results();
        startGroup(results, spec.description);
        var items = results.getItems();
        for (var k in items) {
            if (items.hasOwnProperty(k)) {
                itemResults(items[k]);
            }
        }
        console.groupEnd();
    }

    function itemResults(item) {
        if (item.passed && !item.passed()) {
            console.warn('actual: ' + item.actual + '; expected: ' + item.expected);
            item.trace.message = item.trace.message || item.message || item.matcherName;
            console.error(item.trace);
        } else {
            console.info('OK.');
        }
    }

    function startGroup(results, description) {
        var consoleFunc = (results.passed() && console.groupCollapsed) ? 'groupCollapsed' : 'group';
        console[consoleFunc](description + ' (' + results.passedCount + '/' + results.totalCount + ' passed, ' + results.failedCount + ' failures)');
    }

    // export public
    jasmine.TerminalReporter = TerminalReporter;
})();