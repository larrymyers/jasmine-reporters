(function() {
    
    if (! jasmine) {
        return;
    }
    
    var ConsoleReporter = function() {
        
    };
    
    ConsoleReporter.prototype = {
        reportRunnerResults: function(runner) {
            
        },

        reportRunnerStarting: function(runner) {
            
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
}))();