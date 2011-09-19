(function() {
    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }

    /**
     * Basic reporter that outputs spec results to for the Teamcity build system
     *
     * Usage:
     *
     * jasmine.getEnv().addReporter(new jasmine.TeamcityReporter());
     * jasmine.getEnv().execute();
     */
    var TeamcityReporter = function() {
        this.started = false;
        this.finished = false;
    };

    TeamcityReporter.prototype = {
        reportRunnerResults: function(runner) { },

        reportRunnerStarting: function(runner) { },

        reportSpecResults: function(spec) { },

        reportSpecStarting: function(spec) { },

        reportSuiteResults: function(suite) {
          var results = suite.results();
          var path = [];
          while(suite) {
            path.unshift(suite.description);
            suite = suite.parentSuite;
          }
          var description = path.join(' ');

          this.log("##teamcity[testSuiteStarted name='" + this.escapeTeamcityString(description) + "']");

          outerThis = this;
          results.items_.forEach(function(spec){
            if (spec.description) {
              outerThis.log("##teamcity[testStarted name='" +  this.escapeTeamcityString(spec.description) + "' captureStandardOutput='true']");

              spec.items_.forEach(function(result){
                if (!result.passed_) {
                    outerThis.log("##teamcity[testFailed name='" +  this.escapeTeamcityString(spec.description) + "' message='[FAILED]' details='" + this.escapeTeamcityString(result.trace.stack) + "']");
                }
              });

              outerThis.log("##teamcity[testFinished name='" +  this.escapeTeamcityString(spec.description) + "']");
            }
          });

          this.log("##teamcity[testSuiteFinished name='" +  this.escapeTeamcityString(description) + "]");
        },

        log: function(str) {
            var console = jasmine.getGlobal().console;
            if (console && console.log) {
                console.log(str);
            }
        },

        hasGroupedConsole: function() {
            var console = jasmine.getGlobal().console;
            return console && console.info && console.warn && console.group && console.groupEnd && console.groupCollapsed;
        },

        escapeTeamcityString: function(message) {
          return message.replace(/\|/g, "||")
                        .replace(/\'/g, "|'")
                        .replace(/\n/g, "|n")
                        .replace(/\r/g, "|r")
                        .replace(/\u0085/g, "|x")
                        .replace(/\u2028/g, "|l")
                        .replace(/\u2029/g, "|p")
                        .replace(/\[/g, "|[")
                        .replace(/]/g, "|]");
        }
    };

    function suiteResults(suite) {
        console.group(suite.description);
        var specs = suite.specs();
        for (var i in specs) {
            specResults(specs[i]);
        }
        var suites = suite.suites();
        for (var j in suites) {
            suiteResults(suites[j]);
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
    jasmine.TeamcityReporter = TeamcityReporter;
})();

