/* globals jasmine, describe, beforeEach, it, expect */
var jasmineReporters = require("../index");
var DOMParser = require("@xmldom/xmldom").DOMParser;

var env, suite, subSuite, subSubSuite, siblingSuite,
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
    reporter = new jasmineReporters.NUnitXmlReporter(options);
    reporter.writeFile = jasmine.createSpy();
}

// make sure reporter is set before calling this
function triggerRunnerEvents() {
    reporter.jasmineStarted();
    for (var i=0; i<env._suites.length; i++) {
        var s = env._suites[i];
        triggerSuiteEvents(s);
    }
    reporter.jasmineDone();

    // pre-parse some data to be used by various specs
    writeCalls = reporter.writeFile.calls.all();
    for (i=0; i<writeCalls.length; i++) {
        writeCalls[i].output = writeCalls[i].args[0];
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

describe("NUnitXmlReporter", function(){

    beforeEach(function(){
        env = new jasmine.Env();
        suite = fakeSuite("ParentSuite");
        subSuite = fakeSuite("SubSuite", suite);
        subSubSuite = fakeSuite("SubSubSuite", subSuite);
        siblingSuite = fakeSuite("SiblingSuite With Invalid Chars & < > \" ' | : \\ /");
        fakeSpec(suite, "should be a dummy with invalid characters: & < >");
        var failedSpec = fakeSpec(subSubSuite, "should be failed");
        failedSpec.result.status = "failed";
        failedSpec.result.failedExpectations.push({
            passed: false,
            message: "Expected true to be false.",
            expected: false,
            actual: true,
            matcherName: "toBe",
            stack: 'Stack trace! Stack trackes are cool & can have "special" characters <3\n\n Neat: yes.'
        });
        fakeSpec(subSuite, "should be one level down");
        fakeSpec(subSubSuite, "(1) should be two levels down");
        fakeSpec(subSubSuite, "(2) should be two levels down");
        fakeSpec(subSubSuite, "(3) should be two levels down");
        fakeSpec(siblingSuite, "should be a sibling of Parent");
        setupReporterWithOptions({reportName: "<Bad Character Report>"});
    });

    describe("constructor", function(){
        beforeEach(function() {
            setupReporterWithOptions();
        });
        it("should default path to an empty string", function(){
            expect(reporter.savePath).toBe("");
        });
        it("should allow a custom path to be provided", function() {
            setupReporterWithOptions({savePath:"/tmp"});
            expect(reporter.savePath).toBe("/tmp");
        });
        it("should default filename to 'nunitresults.xml'", function(){
            expect(reporter.filename).toBe("nunitresults.xml");
        });
        it("should allow a custom filename to be provided", function() {
            setupReporterWithOptions({filename:"results.xml"});
            expect(reporter.filename).toBe("results.xml");
        });
        it("should default reportName to 'Jasmine Results'", function(){
            expect(reporter.reportName).toBe("Jasmine Results");
        });
        it("should allow a custom reportName to be provided", function() {
            setupReporterWithOptions({reportName:"Test Results"});
            expect(reporter.reportName).toBe("Test Results");
        });
    });

    describe("generated xml output", function(){
        var output, xmldoc;

        beforeEach(function(){
            triggerRunnerEvents();
            output = writeCalls[0].output;
            xmldoc = writeCalls[0].xmldoc;
        });
        it("should escape invalid xml chars from report name", function() {
            expect(output).toContain('name="&lt;Bad Character Report&gt;"');
        });
        it("should escape invalid xml chars from suite names", function() {
            expect(output).toContain('name="SiblingSuite With Invalid Chars &amp; &lt; &gt; &quot; &apos; | : \\ /"');
        });
        it("should escape invalid xml chars from spec names", function() {
            expect(output).toContain('name="should be a dummy with invalid characters: &amp; &lt; &gt;');
        });
        describe("xml structure", function() {
            var rootNode, suites, specs;
            beforeEach(function() {
                rootNode = xmldoc.getElementsByTagName("test-results")[0];
                suites = rootNode.getElementsByTagName("test-suite");
                specs = rootNode.getElementsByTagName("test-case");
            });
            it("should report the date / time that the tests were run", function() {
                expect(rootNode.getAttribute("date")).toMatch(/\d{4}-\d{2}-\d{2}/);
                expect(rootNode.getAttribute("time")).toMatch(/\d{2}:\d{2}:\d{2}/);
            });
            it("should report the appropriate number of suites", function() {
                expect(suites.length).toBe(4);
            });
            it("should order suites appropriately", function() {
                expect(suites[0].getAttribute("name")).toContain("ParentSuite");
                expect(suites[1].getAttribute("name")).toContain("SubSuite");
                expect(suites[2].getAttribute("name")).toContain("SubSubSuite");
                expect(suites[3].getAttribute("name")).toContain("SiblingSuite");
            });
            it("should nest suites appropriately", function() {
                expect(suites[0].parentNode).toBe(rootNode);
                expect(suites[1].parentNode).toBe(suites[0].getElementsByTagName("results")[0]);
                expect(suites[2].parentNode).toBe(suites[1].getElementsByTagName("results")[0]);
                expect(suites[3].parentNode).toBe(rootNode);
            });
            it("should report the execution time for test specs", function() {
                var time;
                for (var i = 0; i < specs.length; i++) {
                    time = specs[i].getAttribute("time");
                    expect(time.length).toBeGreaterThan(0);
                    expect(time).not.toContain(":"); // as partial seconds, not a timestamp
                }
            });
            it("should include a test-case for each spec and report the total number of specs on the root node", function() {
                expect(rootNode.getAttribute("total")).toBe(specs.length.toString());
            });
            describe("passed specs", function() {
                it("should indicate that the test case was successful", function() {
                    expect(specs[1].getAttribute("success")).toBe("true");
                });
            });
            describe("failed specs", function() {
                var failedSpec;
                beforeEach(function() {
                    failedSpec = rootNode.getElementsByTagName("message")[0].parentNode.parentNode;
                });
                it("should indicate that the test case was not successful", function() {
                    expect(failedSpec.getAttribute("success")).toBe("false");
                });
                it("should include the error for failed specs", function() {
                    expect(failedSpec.getElementsByTagName("message")[0].textContent).toBe("Expected true to be false.");
                });
                it("should include the stack trace for failed specs", function() {
                    expect(failedSpec.getElementsByTagName("stack-trace")[0].textContent).toContain('cool & can have "special" characters <3');
                });
                it("should report the failure on ancestor suite nodes", function() {
                    var parentSuite = failedSpec.parentNode.parentNode;
                    var grandparentSuite = parentSuite.parentNode.parentNode;
                    expect(parentSuite.getAttribute("success")).toBe("false");
                    expect(grandparentSuite.getAttribute("success")).toBe("false");
                });
                it("should report the number of failed specs on the root node", function() {
                    expect(rootNode.getAttribute("failures")).toBe("1");
                });
            });
        });
    });
});

