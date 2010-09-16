(function() {
    
    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }
    
    function writeFile(filename, text) {
       try {
            var out = new java.io.BufferedWriter(new java.io.FileWriter(filename));
            out.write(text);
            out.close();
        } catch (e) {
        }
    }
    
    /**
     * 
     */
    var JUnitXmlReporter = function(savePath) {
        this.savePath = savePath || '';
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
            var output = [],
                fileName = 'TEST-' + suite.description.replace(/\s/g, '') + '.xml',
                results = suite.results(),
                items = results.getItems(),
                item,
                expectedResults,
                trace,
                i,
                j;
            
            output.push('<?xml version="1.0" encoding="UTF-8" ?>');
            output.push('<testsuite name="' + suite.description + '" errors="0" failures="' 
                + results.failedCount + '" tests="' + results.totalCount + '" time="0.064" timestamp="2010-09-15T20:41:40">');
            
            for (i = 0; i < items.length; i++) {
                item = items[i];
                
                output.push(' <testcase classname="' + suite.description + '" name="' + item.description + '" time="0.0080">');
                
                if (!item.passed()) {
                    expectedResults = item.getItems();
                    
                    for (j = 0; j < expectedResults.length; j++) {
                        trace = expectedResults[j].trace;
                        
                        if (trace instanceof Error) {
                            output.push('<failure>' + trace.message + '</failure>');
                            break;
                        }
                    }
                }
                
                output.push('</testcase>');
            }
            
            output.push('</testsuite>');
            
            writeFile(this.savePath + fileName, output.join(''));
            
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