(function() {
    
    if (! jasmine) {
        return;
    }
    
    var ConsoleReporter = function() {
        this.started = false;
        this.finished = false;
    };
    
    ConsoleReporter.prototype = {
        reportRunnerResults: function(runner) {
            this.finished = true;
        },

        reportRunnerStarting: function(runner) {
            this.started = true;
            this.log("Starting");
        },

        reportSpecResults: function(spec) {
            
        },

        reportSpecStarting: function(spec) {
            
        },

        reportSuiteResults: function(suite) {
            
        },
        
        log: function(str) {
            var console = jasmine.getGlobal().console;
            
            if (console && console.log) {
                console.log(str)
            }
        }
    };
    
    
    
    // export public
    jasmine.ConsoleReporter = ConsoleReporter;
})();