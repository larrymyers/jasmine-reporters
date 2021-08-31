/* globals jasmine, describe, afterEach, beforeEach, it, expect */
var jasmineReporters = require("../index");
var DOMParser = require("@xmldom/xmldom").DOMParser;

var env, suite,
    reporter, writeCalls, suiteId=0, specId=0, noop=function(){};
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
    reporter = new jasmineReporters.JUnitXmlReporter(options);
    reporter.writeFile = jasmine.createSpy();
}

// make sure reporter is set before calling this
function triggerRunnerEvents(callback) {
    reporter.jasmineStarted();
    for (var i=0; i<env._suites.length; i++) {
        var s = env._suites[i];
        if(callback && typeof(callback) === "function") {
            callback();
        }
        triggerSuiteEvents(s);
    }
    reporter.jasmineDone();

    // pre-parse some data to be used by various specs
    writeCalls = reporter.writeFile.calls.all();
    for (i=0; i<writeCalls.length; i++) {
        writeCalls[i].output = writeCalls[i].args[1];
        writeCalls[i].xmldoc = xmlDocumentFromString(writeCalls[i].output);
    }
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

function xmlDocumentFromString(str) {
    return (new DOMParser()).parseFromString(str, "text/xml");
}

describe("JUnitXmlReporter", function(){
    beforeEach(function(){
        env = new jasmine.Env();
        suite = fakeSuite("ParentSuite");
        fakeSpec(suite, "should be a dummy with invalid characters: & < > \" '");
        setupReporterWithOptions();
    });

    describe("constructor", function(){
        it("should default path to an empty string", function(){
            expect(reporter.savePath).toEqual("");
        });
        it("should default consolidateAll to true", function(){
            expect(reporter.consolidateAll).toBe(true);
        });
        it("should default consolidate to true", function(){
            expect(reporter.consolidate).toBe(true);
        });
        it("should default useDotNotation to true", function(){
            expect(reporter.useDotNotation).toBe(true);
        });

        describe("file prefix", function(){
            it("should default output file prefix to 'junitresults'", function () {
                expect(reporter.filePrefix).toBe("junitresults");
            });
            it("should default output file prefix to 'junitresults-' if consolidateAll is false", function () {
                setupReporterWithOptions({
                    consolidateAll: false
                });
                expect(reporter.filePrefix).toBe("junitresults-");
            });
            it("should prefix suite names if consolidateAll is false", function () {
                setupReporterWithOptions({
                    consolidateAll: false,
                    filePrefix: "alt-prefix-"
                });
                triggerRunnerEvents();
                expect(reporter.writeFile).toHaveBeenCalledWith("alt-prefix-ParentSuite.xml", jasmine.any(String));
            });
        });

        describe("package", function () {
            it("should default output package to undefined", function () {
                expect(reporter.package).toBeUndefined();
            });
            it("should not set output package if a non-string is provided", function() {
                setupReporterWithOptions({package:true});
                expect(reporter.package).toBeUndefined();

                setupReporterWithOptions({package:["test"]});
                expect(reporter.package).toBeUndefined();
            });
            it("should set output package to the provided string", function () {
                setupReporterWithOptions({package:"testPackage"});
                expect(reporter.package).toBe("testPackage");
            });
        });

        describe("stylesheetPath", function () {
            it("should default stylesheetPath to undefined", function () {
                expect(reporter.stylesheetPath).toBeUndefined();
            });
            it("should not set stylesheetPath if an empty or non-string is provided", function() {
                setupReporterWithOptions({stylesheetPath:true});
                expect(reporter.stylesheetPath).toBeUndefined();

                setupReporterWithOptions({stylesheetPath:""});
                expect(reporter.stylesheetPath).toBeUndefined();
            });
            it("should set output stylesheetPath to the provided string", function () {
                setupReporterWithOptions({stylesheetPath:"mystyle.xslt"});
                expect(reporter.stylesheetPath).toBe("mystyle.xslt");
            });
            it("should include the stylesheet in all generated output files", function () {
                setupReporterWithOptions({consolidate: false, stylesheetPath:"mystyle.xslt"});
                triggerRunnerEvents();
                writeCalls.forEach(call => {
                    expect(call.output.indexOf('<?xml-stylesheet type="text/xsl" href="mystyle.xslt"')).toBeGreaterThan(-1);
                });
            });
        });
    });

    function assertTestsuitesTagAttributes(testSuitesTag, {disabled, errors, failures, tests} = {}) {
        if (disabled === void 0) {
            expect(testSuitesTag.hasAttribute("disabled")).toBe(false);
        } else {
            expect(testSuitesTag.getAttribute("disabled")).toBe(disabled);
        }
        expect(testSuitesTag.getAttribute("errors")).toBe(errors);
        expect(testSuitesTag.getAttribute("failures")).toBe(failures);
        expect(testSuitesTag.getAttribute("tests")).toBe(tests);
    }


    it("the testsuites tags should include a time attribute", function() {
        var testSuitesTags = writeCalls[0].xmldoc.getElementsByTagName("testsuites");
        expect(testSuitesTags.length).toBe(1);
        var testSuitesTag =  testSuitesTags[0];
        expect(testSuitesTag.getAttribute("time")).not.toBe("");
    });

    describe("no xml output generation", function() {
        beforeEach(function() {
            setupReporterWithOptions({consolidateAll:true});
            triggerRunnerEvents();
        });

        it("testsuites tags should default disabled, errors, failures to 0 when undefined", function() {
            assertTestsuitesTagAttributes(
                writeCalls[0].xmldoc.getElementsByTagName("testsuites")[0],
                {disabled: "0", errors: "0", failures: "0", tests: "1"});
        });
    });

    describe("generated xml output", function(){
        var subSuite, subSubSuite, siblingSuite;
        function itShouldIncludeXmlPreambleInAllFiles() {
            it("should include xml preamble once in all files", function() {
                for (var i=0; i<writeCalls.length; i++) {
                    expect(writeCalls[i].output.indexOf("<?xml")).toBe(0);
                    expect(writeCalls[i].output.lastIndexOf("<?xml")).toBe(0);
                }
            });
        }
        function itShouldHaveOneTestsuitesElementPerFile() {
            it("should include xml preamble once in all files", function() {
                for (var i=0; i<writeCalls.length; i++) {
                    expect(writeCalls[i].xmldoc.getElementsByTagName("testsuites").length).toBe(1);
                }
            });
        }

        beforeEach(function(){
            subSuite = fakeSuite("SubSuite", suite);
            subSubSuite = fakeSuite("SubSubSuite", subSuite);
            siblingSuite = fakeSuite("SiblingSuite With Invalid Chars < & > \" ' | : \\ /");
            fakeSpec(subSuite, "should be one level down");
            fakeSpec(subSubSuite, "should be two levels down");
            var skipped = fakeSpec(subSubSuite, "should be skipped two levels down");
            var disabled = fakeSpec(subSubSuite, "should be disabled two levels down");
            var failed = fakeSpec(subSubSuite, "should be failed two levels down");
            fakeSpec(siblingSuite, "should be a sibling of Parent");
            skipped.result.status = "pending";
            disabled.result.status = "disabled";
            failed.result.status = "failed";
            failed.result.failedExpectations.push({
                passed: false,
                message: "Expected true to be false.",
                expected: false,
                actual: true,
                matcherName: "toBe",
                stack: 'Stack trace! Stack trackes are cool & can have "special" characters <3\n\n Neat: yes.'
            });
        });

        describe("consolidateAll=true", function() {
            beforeEach(function() {
                setupReporterWithOptions({consolidateAll:true, filePrefix:"results"});
                triggerRunnerEvents();
            });
            it("should only write a single file", function() {
                expect(writeCalls.length).toBe(1);
            });
            it("should include results for all test suites", function() {
                expect(writeCalls[0].xmldoc.getElementsByTagName("testsuite").length).toBe(4);
            });
            it("should write a single file using filePrefix as the filename", function() {
                expect(writeCalls[0].args[0]).toBe("results.xml");
            });
            it("testsuites tags should include disabled, errors, failures, and tests (count) when defined", function() {
                assertTestsuitesTagAttributes(
                    writeCalls[0].xmldoc.getElementsByTagName("testsuites")[0],
                    {disabled: "1", errors: "0", failures: "1", tests: "7"});
            });
            itShouldHaveOneTestsuitesElementPerFile();
            itShouldIncludeXmlPreambleInAllFiles();
        });
        describe("consolidatedAll=false, consolidate=true", function(){
            beforeEach(function(){
                setupReporterWithOptions({consolidateAll:false, consolidate:true, filePrefix:"results-"});
                triggerRunnerEvents();
            });
            it("should write one file per parent suite", function(){
                expect(writeCalls.length).toEqual(2);
            });
            it("should include results for top-level suite and its descendents", function() {
                expect(writeCalls[0].xmldoc.getElementsByTagName("testsuite").length).toBe(3);
                expect(writeCalls[1].xmldoc.getElementsByTagName("testsuite").length).toBe(1);
            });
            it("should construct filenames using filePrefix and suite description, removing bad characters", function() {
                expect(writeCalls[0].args[0]).toBe("results-ParentSuite.xml");
                expect(writeCalls[1].args[0]).toBe("results-SiblingSuiteWithInvalidChars.xml");
            });
            it("testsuites tags should include disabled, errors, failures, and tests (count) when defined", function() {
                assertTestsuitesTagAttributes(writeCalls[0].xmldoc.getElementsByTagName("testsuites")[0],
                    {disabled: "1", errors: "0", failures: "1", tests: "6"});
                assertTestsuitesTagAttributes(writeCalls[1].xmldoc.getElementsByTagName("testsuites")[0],
                    {disabled: "0", errors: "0", failures: "0", tests: "1"});
            });
            itShouldHaveOneTestsuitesElementPerFile();
            itShouldIncludeXmlPreambleInAllFiles();
        });
        describe("consolidated=false", function(){
            beforeEach(function(){
                // consolidateAll becomes a noop, we include it specifically to passively test that
                setupReporterWithOptions({consolidateAll:true, consolidate:false, filePrefix:"results-"});
                triggerRunnerEvents();
            });
            it("should write one file per suite", function(){
                expect(writeCalls.length).toEqual(4);
            });
            it("should include results for a single suite", function() {
                for (var i=0; i<writeCalls.length; i++) {
                    expect(writeCalls[i].xmldoc.getElementsByTagName("testsuite").length).toBe(1);
                }
            });
            it("should construct filenames using filePrefix and suite description, always using dot notation for filenames", function() {
                expect(writeCalls[0].args[0]).toBe("results-ParentSuite.SubSuite.SubSubSuite.xml");
                expect(writeCalls[1].args[0]).toBe("results-ParentSuite.SubSuite.xml");
                expect(writeCalls[2].args[0]).toBe("results-ParentSuite.xml");
            });
            itShouldHaveOneTestsuitesElementPerFile();
            itShouldIncludeXmlPreambleInAllFiles();
        });

        describe("classname generation", function() {
            it("should remove invalid xml chars from the classname", function() {
                setupReporterWithOptions({consolidateAll:true, consolidate:true});
                triggerRunnerEvents();
                expect(writeCalls[0].output).toContain("SiblingSuite With Invalid Chars &lt; &amp; &gt; &quot; &apos; | : \\ /");
            });
            describe("useDotNotation=true", function() {
                beforeEach(function() {
                    setupReporterWithOptions({consolidateAll:true, consolidate:true, useDotNotation:true});
                    triggerRunnerEvents();
                });
                it("should use suite descriptions separated by periods", function() {
                    expect(writeCalls[0].xmldoc.getElementsByTagName("testsuite")[2].getAttribute("name")).toBe("ParentSuite.SubSuite.SubSubSuite");
                    expect(writeCalls[0].xmldoc.getElementsByTagName("testcase")[2].getAttribute("classname")).toBe("ParentSuite.SubSuite.SubSubSuite");
                });
            });
            describe("useDotNotation=false", function() {
                beforeEach(function() {
                    setupReporterWithOptions({consolidateAll:true, consolidate:true, useDotNotation:false});
                    triggerRunnerEvents();
                });
                it("should use suite descriptions separated by spaces", function() {
                    expect(writeCalls[0].xmldoc.getElementsByTagName("testsuite")[2].getAttribute("name")).toBe("ParentSuite SubSuite SubSubSuite");
                    expect(writeCalls[0].xmldoc.getElementsByTagName("testcase")[2].getAttribute("classname")).toBe("ParentSuite SubSuite SubSubSuite");
                });
            });
        });

        describe("suite result generation", function() {
            var suites;
            beforeEach(function() {
                setupReporterWithOptions({consolidateAll:true, consolidate:true});
                triggerRunnerEvents();
                suites = writeCalls[0].xmldoc.getElementsByTagName("testsuite");
            });
            it("should include test suites in order", function() {
                expect(suites[0].getAttribute("name")).toBe("ParentSuite");
                expect(suites[1].getAttribute("name")).toContain("SubSuite");
                expect(suites[2].getAttribute("name")).toContain("SubSubSuite");
                expect(suites[3].getAttribute("name")).toContain("SiblingSuite");
            });
            it("should include total / failed / skipped counts for each suite (ignoring descendent results)", function() {
                expect(suites[1].getAttribute("tests")).toBe("1");
                expect(suites[2].getAttribute("tests")).toBe("4");
                expect(suites[2].getAttribute("skipped")).toBe("1");
                expect(suites[2].getAttribute("failures")).toBe("1");
            });
            it("should calculate duration", function() {
                expect(Number(suites[0].getAttribute("time"))).not.toEqual(NaN);
            });
            it("should include timestamp as an ISO date string without timezone", function() {
                expect(suites[0].getAttribute("timestamp")).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            });
            it("should include hostname, simply because the JUnit XSD says it is required", function() {
                expect(suites[0].getAttribute("hostname")).toBe("localhost");
            });
            describe("package", function() {
                it("should not include the package attribute if it is not provided", function() {
                    setupReporterWithOptions({});
                    triggerRunnerEvents();
                    suites = writeCalls[0].xmldoc.getElementsByTagName("testsuite");
                    expect(suites[0].getAttribute("package")).toBe("");
                });
                it("should include the package attribute if a string is provided", function() {
                    setupReporterWithOptions({package:"testPackage"});
                    triggerRunnerEvents();
                    suites = writeCalls[0].xmldoc.getElementsByTagName("testsuite");
                    expect(suites[0].getAttribute("package")).toBe("testPackage");
                });
                it("should escape the string provided", function() {
                    setupReporterWithOptions({package:"testPackage <3"});
                    triggerRunnerEvents();
                    suites = writeCalls[0].xmldoc.getElementsByTagName("testsuite");
                    expect(suites[0].getAttribute("package")).toBe("testPackage <3");
                    expect(writeCalls[0].output).toContain('package="testPackage &lt;3"');
                });
            });
        });

        describe("spec result generation", function() {
            var specs;
            beforeEach(function() {
                setupReporterWithOptions({consolidateAll:true, consolidate:true});
                triggerRunnerEvents();
                specs = writeCalls[0].xmldoc.getElementsByTagName("testcase");
            });
            it("should include specs in order", function() {
                expect(specs[0].getAttribute("name")).toContain("should be a dummy");
                expect(specs[5].getAttribute("name")).toBe("should be failed two levels down");
            });
            it("should escape bad xml characters in spec description", function() {
                expect(writeCalls[0].output).toContain("&amp; &lt; &gt; &quot; &apos;");
            });
            it("should calculate duration", function() {
                expect(Number(specs[0].getAttribute("time"))).not.toEqual(NaN);
            });
            it("should include failed matcher name as the failure type", function() {
                var failure = specs[5].getElementsByTagName("failure")[0];
                expect(failure.getAttribute("type")).toBe("toBe");
            });
            it("should include failure messages", function() {
                var failure = specs[5].getElementsByTagName("failure")[0];
                expect(failure.getAttribute("message")).toBe("Expected true to be false.");
            });
            it("should include stack traces for failed specs (using CDATA to preserve special characters)", function() {
                var failure = specs[5].getElementsByTagName("failure")[0];
                expect(failure.textContent).toContain('cool & can have "special" characters <3');
            });
            it("should include <skipped/> for skipped specs", function() {
                expect(specs[3].getElementsByTagName("skipped").length).toBe(1);
            });
        });

        describe("modifySuiteName", function(){
            var suites, modification = "-modified";
            beforeEach(function(){
                // consolidateAll becomes a noop, we include it specifically to passively test that
                setupReporterWithOptions({
                    consolidateAll:true,
                    consolidate:true,
                    modifySuiteName:function(generatedName/*, suite*/) {
                        return generatedName + modification;
                    }
                });
                triggerRunnerEvents();
                suites = writeCalls[0].xmldoc.getElementsByTagName("testsuite");
            });
            it("should construct suitenames that contain modification", function() {
                for (var i = 0, suite; i < suites.length; i++) {
                    suite = suites[i];
                    expect(suite.getAttribute("name")).toContain(modification);
                }
            });
            itShouldHaveOneTestsuitesElementPerFile();
            itShouldIncludeXmlPreambleInAllFiles();
        });

        describe("modifyReportFileName", function(){
            var modification = "-modified";
            beforeEach(function(){
                // consolidateAll becomes a noop, we include it specifically to passively test that
                setupReporterWithOptions({
                    consolidateAll:false,
                    modifyReportFileName:function(generatedName/*, suite*/) {
                        return generatedName + modification;
                    }
                });
                triggerRunnerEvents();
            });
            it("should construct filenames that contain modification", function() {
                expect(writeCalls[0].args[0]).toContain(modification);
            });
            itShouldHaveOneTestsuitesElementPerFile();
            itShouldIncludeXmlPreambleInAllFiles();
        });

        describe("suppressDisabled=true", function() {
            beforeEach(function() {
                setupReporterWithOptions({suppressDisabled: true});
                triggerRunnerEvents();
            });
            it("testsuites tags should include errors, failures, and tests (count) when defined, but not disabled", function() {
                assertTestsuitesTagAttributes(
                    writeCalls[0].xmldoc.getElementsByTagName("testsuites")[0],
                    {disabled: void 0, errors: "0", failures: "1", tests: "7"});
            });
        });

        describe("captures stdout in <xml-output>", function(){
            var specOutputs;
            const testOutput = "I'm generating test output.";
            var _stdoutWrite;
            beforeEach(function(){
                _stdoutWrite = process.stdout.write;
                process.stdout.write = noop;
                setupReporterWithOptions( {consolidateAll:true, consolidate:true, captureStdout: true});
                triggerRunnerEvents(function() {
                    console.log(testOutput);
                });
                specOutputs = writeCalls[0].xmldoc.getElementsByTagName("system-out");
            });
            afterEach(function() {
                process.stdout.write = _stdoutWrite;
            });
            it("should record stdout", function() {
                expect(specOutputs[0].textContent).toContain(testOutput);
            });
            it("should discard any stdout for skipped tests", function() {
                expect(specOutputs[3].textContent).not.toContain(testOutput);
            });
        });
    });
});
