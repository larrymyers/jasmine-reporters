/* globals jasmine, describe, beforeEach, it, expect */
var jasmineReporters = require('../index');

var env, suite, subSuite, subSubSuite, siblingSuite,
    reporter, suiteId=0, specId=0, noop=function(){};
function fakeSpec(ste, name) {
    var s = new jasmine.Spec({
        env: env,
        id: specId++,
        description: name,
        queueableFn: {fn: noop},
    });
    ste.addChild(s);
    return s;
}
function fakeSuite(name, parentSuite) {
    var s = new jasmine.Suite({
        env: env,
        id: suiteId++,
        description: name,
        parentSuite: parentSuite || jasmine.createSpy("pretend top suite") // I'm sure there's a good reason Jasmine does this...
    });
    if (parentSuite) {
        parentSuite.addChild(s);
    }
    else {

        env._suites = env._suites || [];
        env._suites.push(s);
    }
    return s;
}

function setupReporterWithOptions(options) {
    reporter = new jasmineReporters.TeamCityReporter(options);
}

// make sure reporter is set before calling this
function triggerRunnerEvents() {
    var logs = [];
    var _stdoutWrite = process.stdout.write;
    process.stdout.write = function() {
        logs.push(arguments.length === 1 ? arguments[0] : arguments);
    };
    reporter.jasmineStarted();
    for (var i=0; i<env._suites.length; i++) {
        var s = env._suites[i];
        triggerSuiteEvents(s);
    }
    reporter.jasmineDone();
    process.stdout.write = _stdoutWrite;
    return logs;
}
function triggerSuiteEvents(ste) {
    reporter.suiteStarted(ste.result);
    var thing;
    for (var i=0; i<ste.children.length; i++) {
        thing = ste.children[i];
        if (thing instanceof jasmine.Suite) {
            triggerSuiteEvents(thing);
        } else {
            reporter.specStarted(thing.result);
            reporter.specDone(thing.result);
        }
    }
    reporter.suiteDone(ste.result);
}

describe("TeamCityReporter", function(){
    beforeEach(function(){
        env = new jasmine.Env();
        suite = fakeSuite("ParentSuite");
        subSuite = fakeSuite("SubSuite", suite);
        subSubSuite = fakeSuite("SubSubSuite", subSuite);
        siblingSuite = fakeSuite("SiblingSuite");
        var failedSpec = fakeSpec(subSubSuite, "should be failed");
        failedSpec.result.status = "failed";
        failedSpec.result.failedExpectations.push({
            passed: false,
            message: "Expected true to be false.",
            expected: false,
            actual: true,
            matcherName: 'toBe',
            stack: "Stack trace! Stack traces are cool & can have \"special\" characters <3\n\n Neat: yes."
        });
        fakeSpec(subSuite, "should be one level down");
        fakeSpec(subSubSuite, "(1) should be two levels down");
    });

    describe("General behavior", function() {
        beforeEach(function() {
            setupReporterWithOptions();
            this.logs = triggerRunnerEvents();
        });
        it('should log testSuiteStarted and testSuiteFinished events', function() {
            // we have 4 suites
            var started = this.logs.filter(l=>l.indexOf('testSuiteStarted') > -1);
            var finished = this.logs.filter(l=>l.indexOf('testSuiteStarted') > -1);
            expect(started.length).toBe(4);
            expect(finished.length).toBe(4);
            expect(started[0].indexOf("name='ParentSuite'")).toBeGreaterThan(-1);
        });
        it('should log testStarted and testFinished events', function() {
            // we have 3 specs
            var started = this.logs.filter(l=>l.indexOf('testStarted') > -1);
            var finished = this.logs.filter(l=>l.indexOf('testStarted') > -1);
            expect(started.length).toBe(3);
            expect(finished.length).toBe(3);
            expect(started[0].indexOf("name='should be failed'")).toBeGreaterThan(-1);
        });
        it('should log testFailed event including reason and stack trace', function() {
            // we have 1 failure
            var failed = this.logs.filter(l=>l.indexOf('testFailed') > -1);
            expect(failed.length).toBe(1);
            expect(failed[0].indexOf("name='should be failed'")).toBeGreaterThan(-1);
            expect(failed[0].indexOf("message='Expected true to be false.'")).toBeGreaterThan(-1);
            expect(failed[0].indexOf("details='Stack trace! Stack traces are cool")).toBeGreaterThan(-1);
        });
    });

    describe('modifySuiteName', function() {
        var modification = '-modified';
        beforeEach(function() {
            setupReporterWithOptions({modifySuiteName: function(name) { return name + modification; }});
            this.logs = triggerRunnerEvents();
        });
        it('should use the modification for suite names', function() {
            // we have 4 suites
            var started = this.logs.filter(l=>l.indexOf('testSuiteStarted') > -1);
            started.forEach(e=>expect(e.indexOf(modification)).toBeGreaterThan(-1));
            expect(started[0].indexOf("name='ParentSuite-modified'")).toBeGreaterThan(-1);
        });
        it('should *not* use the modification for spec names', function() {
            // we have 3 specs
            var started = this.logs.filter(l=>l.indexOf('testStarted') > -1);
            started.forEach(e=>expect(e.indexOf(modification)).toBe(-1));
        });
    });
});

// [ { '0': '##teamcity[progressStart \'Running Jasmine Tests\']\n' },
//   { '0': '##teamcity[testSuiteStarted name=\'ParentSuite\' timestamp=\'2016-06-17T06:50:35.687\']\n' },
//   { '0': '##teamcity[testSuiteStarted name=\'SubSuite\' timestamp=\'2016-06-17T06:50:35.687\']\n' },
//   { '0': '##teamcity[testSuiteStarted name=\'SubSubSuite\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testStarted name=\'should be failed\' captureStandardOutput=\'true\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testFailed name=\'should be failed\' message=\'Expected true to be false.\' details=\'Stack trace! Stack trackes are cool & can have "special" characters <3|n|n Neat: yes.\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testFinished name=\'should be failed\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testSuiteFinished name=\'SubSubSuite\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testSuiteFinished name=\'SubSuite\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testSuiteFinished name=\'ParentSuite\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testSuiteStarted name=\'SiblingSuite With Invalid Chars & < > " |\' || : \\ /\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[testSuiteFinished name=\'SiblingSuite With Invalid Chars & < > " |\' || : \\ /\' timestamp=\'2016-06-17T06:50:35.688\']\n' },
//   { '0': '##teamcity[progressFinish \'Running Jasmine Tests\']\n' } ]