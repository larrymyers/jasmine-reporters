(function() {
    
    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }
    
    var JUnitXmlReporter = function() {
        this.output = [];
    };
    
    JUnitXmlReporter.prototype = {
        reportRunnerResults: function(runner) {
            this.log("Runner Finished.");
        },
        
        reportRunnerStarting: function(runner) {
            this.log("Runner Started.");
        },
        
        reportSpecResults: function(spec) {
            var resultText = "Failed.";
            
            if (spec.results().passed()) {
                resultText = "Passed.";
            }
            
            this.log(resultText);
        },
        
        reportSpecStarting: function(spec) {
            this.log(spec.suite.description + ' : ' + spec.description + ' ... ');
        },
        
        reportSuiteResults: function(suite) {
            var results = suite.results();
            
            this.log(suite.description + ": " + results.passedCount + " of " + results.totalCount + " passed.");
        },
        
        log: function(str) {
            var console = jasmine.getGlobal().console;
            
            if (console && console.log) {
                console.log(str);
            }
        }
    };
    
    // export public
    jasmine.JUnitXmlReporter = JUnitXmlReporter;
})();