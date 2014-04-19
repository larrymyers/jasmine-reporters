/* global java, __phantom_writeFile */
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
    function pad(n) { return n < 10 ? '0'+n : n; }
    function escapeInvalidXmlChars(str) {
        return str.replace(/</g, "&lt;")
            .replace(/\>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&apos;")
            .replace(/\&/g, "&amp;");
    }
    function dateString(date) {
        var year = date.getFullYear();
        var month = date.getMonth()+1; // 0-based
        var day = date.getDate();
        return year + "-" + pad(month) + "-" + pad(day);
    }
    function timeString(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
    }


    /**
     * Generates NUnit XML for the given spec run.
     * Allows the test results to be used in java based CI
     * systems like Jenkins.
     *
     * Originally from https://github.com/gmusick/jasmine-reporters. Adapted
     * to support file output via PhantomJS/Rhino/Node.js like JUnitXmlReporter.
     * Also fixed a couple minor bugs (ie month being reported incorrectly) and
     * added a few options to control how / where the file is generated.
     *
     * @param {object} [options]
     * @param {string} [options.savePath] directory to save the files (default: '')
     * @param {string} [options.filename] name of xml output file (default: 'nunitresults.xml')
     * @param {string} [options.reportName] name for parent test-results node (default: 'Jasmine Results')
     */
    exportObject.NUnitXmlReporter = function(options) {
        var self = this;
        options = options || {};
        self.savePath = options.savePath || '';
        self.filename = options.filename || 'nunitresults.xml';
        self.reportName = options.reportName || 'Jasmine Results';
        var suites = [],
            currentSuite = null,
            totalSpecsExecuted = 0,
            totalSpecsSkipped = 0,
            totalSpecsFailed = 0,
            totalSpecsDefined;

        self.jasmineStarted = function(summary) {
            totalSpecsDefined = summary && summary.totalSpecsDefined || NaN;
            exportObject.startTime = new Date();
        };
        self.suiteStarted = function(suite) {
            suite._startTime = new Date();
            suite._specs = [];
            suite._suites = [];
            suite._failures = 0;
            suite._nestedFailures = 0;
            suite._skipped = 0;
            suite._parent = currentSuite;
            if (!currentSuite) {
                suites.push(suite);
            } else {
                currentSuite._suites.push(suite);
            }
            currentSuite = suite;
        };
        self.specStarted = function(spec) {
            spec._startTime = new Date();
            spec._suite = currentSuite;
            currentSuite._specs.push(spec);
        };
        self.specDone = function(spec) {
            spec._endTime = new Date();
            if (isSkipped(spec)) {
                spec._suite._skipped++;
                totalSpecsSkipped++;
            }
            if (isFailed(spec)) {
                spec._suite._failures++;
                // NUnit wants to know nested failures, so add for parents too
                for (var parent=spec._suite._parent; parent; parent=parent._parent) {
                    parent._nestedFailures++;
                }
                totalSpecsFailed++;
            }
            totalSpecsExecuted++;
        };
        self.suiteDone = function(suite) {
            suite._endTime = new Date();
            currentSuite = suite._parent;
        };
        self.jasmineDone = function() {
            self.writeFile(resultsAsXml());
            //console.log("Specs skipped but not reported (entire suite skipped)", totalSpecsDefined - totalSpecsExecuted);

            // this is so phantomjs-testrunner.js can tell if we're done executing
            exportObject.endTime = new Date();
        };

        self.writeFile = function(text) {
            var path = self.savePath;
            var filename = self.filename;
            function getQualifiedFilename(separator) {
                if (path && path.substr(-1) !== separator && filename.substr(0) !== separator) {
                    path += separator;
                }
                return path + filename;
            }

            // Rhino
            try {
                // turn filename into a qualified path
                if (path) {
                    filename = getQualifiedFilename(java.lang.System.getProperty("file.separator"));
                    // create parent dir and ancestors if necessary
                    var file = java.io.File(filename);
                    var parentDir = file.getParentFile();
                    if (!parentDir.exists()) {
                        parentDir.mkdirs();
                    }
                }
                // finally write the file
                var out = new java.io.BufferedWriter(new java.io.FileWriter(filename));
                out.write(text);
                out.close();
                return;
            } catch (e) {}
            // PhantomJS, via a method injected by phantomjs-testrunner.js
            try {
                // turn filename into a qualified path
                filename = getQualifiedFilename(window.fs_path_separator);
                __phantom_writeFile(filename, text);
                return;
            } catch (f) {}
            // Node.js
            try {
                var fs = require("fs");
                var nodejs_path = require("path");
                // make sure the path exists
                require("mkdirp").sync(path);

                var xmlfile = fs.openSync(nodejs_path.join(path, filename), "w");
                fs.writeSync(xmlfile, text, 0);
                fs.closeSync(xmlfile);
                return;
            } catch (g) {}
        };

        /******** Helper functions with closure access for simplicity ********/
        function resultsAsXml() {
            var date = new Date(),
                totalSpecs = totalSpecsDefined || totalSpecsExecuted,
                disabledSpecCount = totalSpecs - totalSpecsExecuted;

            var xml = '<?xml version="1.0" encoding="utf-8" ?>';
            xml += '\n<test-results name="' + escapeInvalidXmlChars(self.reportName) + '"';
            xml += ' total="' + totalSpecs + '"';
            xml += ' failures="' + totalSpecsFailed + '"';
            xml += ' not-run="' + (totalSpecsSkipped + disabledSpecCount) + '"';
            xml += ' date="' + dateString(date) + '"';
            xml += ' time="' + timeString(date) + '"';
            xml += '>';

            for (var i=0; i<suites.length; i++) {
                xml += suiteAsXml(suites[i]);
            }
            xml += '</test-results>';
            return xml;
        }
    };

    function suiteAsXml(suite, indent) {
        indent = indent || '';
        var i, xml = '\n' + indent + '<test-suite';
        xml += ' name="' + escapeInvalidXmlChars(suite.description) + '"';
        xml += ' executed="true"'; // TODO: handle xdescribe
        xml += ' success="' + !(suite._failures || suite._nestedFailures) + '"';
        xml += ' time="' + elapsed(suite._startTime, suite._endTime) + '"';
        xml += '>';
        xml += '\n' + indent + ' <results>';

        for (i=0; i<suite._suites.length; i++) {
            xml += suiteAsXml(suite._suites[i], indent+"  ");
        }
        for (i=0; i<suite._specs.length; i++) {
            xml += specAsXml(suite._specs[i], indent+"  ");
        }
        xml += '\n' + indent + ' </results>';
        xml += '\n' + indent + '</test-suite>';
        return xml;
    }
    function specAsXml(spec, indent) {
        indent = indent || '';
        var xml = '\n' + indent + '<test-case';
        xml += ' name="' + escapeInvalidXmlChars(spec.description) + '"';
        xml += ' executed="' + !isSkipped(spec) + '"';
        xml += ' success="' + !isFailed(spec) + '"';
        xml += ' time="' + elapsed(spec._startTime, spec._endTime) + '"';
        xml += '>';
        for (var i = 0, failure; i < spec.failedExpectations.length; i++) {
            failure = spec.failedExpectations[i];
            xml += '\n' + indent + ' <failure>';
            xml += '\n' + indent + '  <message><![CDATA[' + failure.message + ']]></message>';
            xml += '\n' + indent + '  <stack-trace><![CDATA[' + failure.stack + ']]></stack-trace>';
            xml += '\n' + indent + ' </failure>';
        }
        xml += '\n' + indent + '</test-case>';
        return xml;
    }
})(this);
