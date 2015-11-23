This branch is for Jasmine 2.x.
[Switch to the 1.x branch.](https://github.com/larrymyers/jasmine-reporters/tree/jasmine1.x)

# Jasmine Reporters

Jasmine Reporters is a collection of javascript jasmine reporter classes that can be used with
the [JasmineBDD testing framework](http://jasmine.github.io/).

Included reporters:

* JUnitXmlReporter - Report test results to a file in JUnit XML Report format.
* NUnitXmlReporter - Report test results to a file in NUnit XML Report format.
* TapReporter - Test Anything Protocol, report tests results to console.
* TeamCityReporter - Basic reporter that outputs spec results to for the Teamcity build system.
* TerminalReporter - Logs to a terminal (including colors) with variable verbosity.

### PhantomJS

Should work with all modern versions of Phantom JS, and has been tested with PhantomJS
1.4.6 through 1.9.6 on Mac OS X. If you find issues with a particular version, please
consider creating a pull request.

### Node.js

The reporters also work in Node.js, and most can be used in combination with
[jasmine-node](https://github.com/mhevery/jasmine-node). Make sure to use the correct
combination of jasmine-reporters and jasmine-node, as both projects have different versions
/ branches for Jasmine1.x vs Jasmine2.x support.

# Basic Usage

When used for in-browser tests, the reporters are registered on a `jasmineReporters` object in the
global scope (i.e. `window.jasmineReporters`).

```javascript
var junitReporter = new jasmineReporters.JUnitXmlReporter({
    savePath: '..',
    consolidateAll: false
});
jasmine.getEnv().addReporter(junitReporter);
```

### PhantomJS

In order to write files to the local filesystem for in-browser tests, the reporters will attempt
to use PhantomJS to create the files. A special method `__phantom_writeFile` is injected by the
included `phantomjs.runner.sh` script.

It is strongly recommended to use the provided script to run your test suite using PhantomJS. If
you want to use your own PhantomJS runner, you will need to inject a `__phantom_writeFile`
method, and also take care to correctly determine when all results have been reported.

You can use the included PhantomJS test runner to run any of the included examples.
**NOTE:** you will need to install the Jasmine dependency via `bower` if you want to use the
included PhantomJS runner for any of the included examples--this is where the examples
look for the Jasmine core library.

```bash
# install jasmine via bower
bower install

# run any of the examples
bin/phantomjs.runner.sh test/tap_reporter.html
bin/phantomjs.runner.sh test/junit_xml_reporter.html
```

### NodeJS

In Node.js, jasmine-reporters exports an object with all the reporters which you can use
however you like.

```javascript
var reporters = require('jasmine-reporters');
var junitReporter = new reporters.JUnitXmlReporter({
    savePath: __dirname,
    consolidateAll: false
});
```

### More examples

An example for each reporter is available in the `test` directory.

# Changes in jasmine-reporters@2.0

jasmine-reporters is built for Jasmine 2.x. If you are still using Jasmine 1.x, please use
the correct tag / branch / npm version:

* bower: `bower install jasmine-reporters#^1.0.0`
* Node.js: `npm install jasmine-reporters@^1.0.0`
* git submodule: `git submodule add -b jasmine1.x git@github.com:larrymyers/jasmine-reporters.git jasmine-reporters`
* or use any of the `1.*` tags

## Migrating from jasmine-reporters@1.0

* reporters are no longer registered on the global `jasmine` object
    * 1.x: `new jasmine.JUnitXmlReporter( /* ... */ );`
    * 2.x: `new jasmineReporters.JUnitXmlReporter( /* ... */ );`
* configurable reporters no longer use positional arguments
    * 1.x: `new jasmine.JUnitXmlReporter('testresults', true, true, 'junit-', true);`
    * 2.x: `new jasmineReporters.JUnitXmlReporter({savePath:'testresults', filePrefix: 'junit-', consolidateAll:true});`

# Protractor

As of Protractor 1.6.0, protractor supports Jasmine 2 by specifying
`framework: "jasmine2"` in your protractor.conf file.

First, install a Jasmine 2.x-compatible of jasmine-reporters:

```bash
npm install --save-dev jasmine-reporters@^2.0.0
```

Then set everything up inside your protractor.conf:

```javascript
framework: 'jasmine2',
onPrepare: function() {
    var jasmineReporters = require('jasmine-reporters');
    jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
        consolidateAll: true,
        savePath: 'testresults',
        filePrefix: 'xmloutput'
    }));
}
```

### Multi Capabilities

If you run a `multiCapabilities` setup you can reflect this in your test results
by using the option `modifySuiteName`. This enables you to have distinct suite
names per capability.

```javascript
multiCapabilities: [
    {browserName: 'firefox'},
    {browserName: 'chrome'}
],
framework: 'jasmine2',
onPrepare: function() {
    var jasmineReporters = require('jasmine-reporters');

    // returning the promise makes protractor wait for the reporter config before executing tests
    return browser.getProcessedConfig().then(function(config) {
        // you could use other properties here if you want, such as platform and version
        var browserName = config.capabilities.browserName;

        var junitReporter = new jasmineReporters.JUnitXmlReporter({
            consolidateAll: true,
            savePath: 'testresults',
            // this will produce distinct xml files for each capability
            filePrefix: browserName + '-xmloutput',
            modifySuiteName: function(generatedSuiteName, suite) {
                // this will produce distinct suite names for each capability,
                // e.g. 'firefox.login tests' and 'chrome.login tests'
                return browserName + '.' + generatedSuiteName;
            }
        });
        jasmine.getEnv().addReporter(junitReporter);
    });
}
```
