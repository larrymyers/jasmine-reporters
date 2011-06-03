(function() {
    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }

    /**
     * Basic reporter that outputs spec results to the browser console.
     * Useful if you need to test an html page and don't want the TrivialReporter
     * markup mucking things up.
     *
     * Usage:
     *
     * jasmine.getEnv().addReporter(new jasmine.ConsoleReporter());
     * jasmine.getEnv().execute();
     */
    var ConsoleReporter = function() {
        this.started = false;
        this.finished = false;
    };

    ConsoleReporter.prototype = {
        reportRunnerResults: function(runner) {
            if (this.hasConsole()) {
                this.reportToConsole(runner.suites());
            }
            this.finished = true;
        },

        hasConsole: function() {
            return window['console'] && console['info'] && console['warn'] && console['group'] && console['groupEnd'] && console['groupCollapsed'];
        },

        reportToConsole: function (suites) {
            for (var i in suites) {
                suiteResults(suites[i]);
            }
        }
    };

    function suiteResults(suite) {
        console.group(suite.description);
        var specs = suite.specs();
        for (var j in specs) {
            specResults(specs[j]);
        }
        console.groupEnd();
    }

    function specResults(spec) {
        var results = spec.results();
        if (results.passed() && console.groupCollapsed) {
            console.groupCollapsed(spec.description);
        } else {
            console.group(spec.description);
        }
        var items = results.getItems();
        for (var k in items) {
            itemResults(items[k]);
        }
        console.groupEnd();
    }

    function itemResults(item) {
        if (item.passed && !item.passed()) {
            console.warn({actual:item.actual,expected: item.expected});
            item.trace.message = item.matcherName;
            console.error(item.trace);
        } else {
            console.info('Passed');
        }
    }

    // export public
    jasmine.ConsoleReporter = ConsoleReporter;
})();