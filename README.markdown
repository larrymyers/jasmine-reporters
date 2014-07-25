# Jasmine Reporters

Jasmine Reporters is a collection of javascript jasmine.Reporter classes that can be used with
the [JasmineBDD testing framework](http://pivotal.github.com/jasmine/).

Included reporters:

* JUnitXmlReporter - Report test results to a file in JUnit XML Report format.
* NUnitXmlReporter - Report test results to a file in NUnit XML Report format.
* TapReporter - Test Anything Protocol, report tests results to console.
* TeamcityReporter - Basic reporter that outputs spec results to for the Teamcity build system.
* TerminalReporter - Logs to a terminal (including colors) with variable verbosity.

### PhantomJS

Should work with all modern versions of Phantom JS, and has been tested with PhantomJS
1.4.6 through 1.9.6 on Mac OS X. If you find issues with a particular version, please
consider creating a pull request.

### Node.js

The reporters also work in Node.js, and most can be used in combination with
[jasmine-node](https://github.com/mhevery/jasmine-node). Make sure to use the correct
combination of jasmine-repoters and jasmine-node, as both projects have different versions
/ branches for Jasmine1.x vs Jasmine2.x support.

# Basic Usage

When used for in-browser tests, the reporters are registered on a `jasmineReporters` object in the
global scope (i.e. `window.jasmineReporters`).

    var junitReporter = new jasmineReporters.JUnitXmlReporter({
        savePath: '..',
        consolidateAll: false
    });
    jasmine.getEnv().addReporter(junitReporter);

### PhantomJS

In order to write files to the local filesystem for in-browser tests, the reporters will attempt
to use PhantomJS to create the files. A special method `__phantom_writeFile` is injected by the
included `phantomjs.runner.sh` script.

It is strongly recommended to use the provided script to run your test suite using PhantomJS. If
you want to use your own PhantomJS runner, you will need to inject a `__phantom_writeFile`
method, and also take care to correctly determine when all results have been reported.

You can use the included PhantomJS test runner to run any of the included examples.

    bin/phantomjs.runner.sh test/tap_reporter.html
    bin/phantomjs.runner.sh test/junit_xml_reporter.html

### NodeJS

In Node.js, jasmine-reporters exports an object with all the reporters which you can use
however you like.

    var reporters = require('jasmine-reporters');
    var junitReporter = new reporters.JUnitXmlReporter({
        savePath: __dirname,
        consolidateAll: false
    });

### More examples

An example for each reporter is available in the `test` directory.

# Changes in jasmine-reporters@2.0

jasmine-reporters is built for Jasmine 2.x. If you are still using Jasmine 1.x, please use
the correct tag / branch / npm version:

* bower: `bower install jasmine-reporters#~1.0.0`
* Node.js: `npm install jasmine-reporters@~1.0.0`
* git submodule: `git submodule add -b jasmine1.x git@github.com:larrymyers/jasmine-reporters.git jasmine-reporters`
* or use any of the `1.*` tags

## Migrating from Jasmine 1.x

* reporters are no longer registered on the global `jasmine` object
    * 1.x: `new jasmine.JUnitXmlReporter( /* ... */ );`
    * 2.x: `new jasmineReporters.JUnitXmlReporter( /* ... */ );`
* configurable reporters no longer use positional arguments
    * 1.x: `new jasmine.JUnitXmlReporter('testresults', true, true, 'junit-', true);`
    * 2.x: `new jasmineReporters.JUnitXmlReporter({savePath:'testresults', filePrefix: 'junit-', consolidateAll:true});`

## Protractor

If you are trying to use jasmine-reporters with Protractor, keep in mind that Protractor is built around
Jasmine 1.x. As such, you need to use a 1.x version of jasmine-reporters.

    npm install jasmine-reporters@~1.0.0

And inside your protractor.conf:

    onPrepare: function() {
        // The require statement must be down here, since jasmine-reporters@1.0
        // needs jasmine to be in the global and protractor does not guarantee
        // this until inside the onPrepare function.
        require('jasmine-reporters');
        jasmine.getEnv().addReporter(
            new jasmine.JUnitXmlReporter('xmloutput', true, true)
        );
    }
