// Verify arguments
if (phantom.args.length === 0) {
    console.log("Simple JasmineBDD test runner for phantom.js");
    console.log("Usage: phantomjs-testrunner.js url_to_runner.html");
    console.log("Accepts http:// and file:// urls");
    console.log("");
    console.log("NOTE: This script depends on jasmine.TrivialReporter being used\non the page, for the DOM elements it creates.\n");
    phantom.exit(2);
}
else {
    var address = phantom.args[0];
    //console.log("Loading " + address);

    // get a WebPage object to work with
    var page = require("webpage").create();

    // When initialized, inject the reporting functions before the page is loaded
    // (and thus before it will try to utilize the functions)
    var resultsKey = "__jr" + Math.ceil(Math.random() * 1000000);
    page.onInitialized = function(){
        overloadPageEvaluate(page);
        setupWriteFileFunction(page, resultsKey);
    };

    page.open(address, function(status){
        if (status !== "success") {
            console.error("Unable to load resource: " + address);
            phantom.exit(1);
        }
        else {
            var isFinished = function() {
                return page.evaluate(function(){
                    // if there's a JUnitXmlReporter, return a boolean indicating if it is finished
                    if (jasmine.JUnitXmlReporter) {
                        return jasmine.JUnitXmlReporter.finished_at !== null;
                    }
                    // otherwise, see if there is anything in a "finished-at" element
                    return document.getElementsByClassName("finished-at").length &&
                           document.getElementsByClassName("finished-at")[0].innerHTML.length > 0;
                });
            };
            var getResults = function() {
                return page.evaluate(function(){
                    return document.getElementsByClassName("description").length &&
                           document.getElementsByClassName("description")[0].innerHTML.match(/(\d+) spec.* (\d+) failure.*/) ||
                           ["Unable to determine success or failure."];
                });
            };
            setInterval(function(){
                if (isFinished()) {
                    // get the results that need to be written to disk
                    var fs = require("fs"),
                        xml_results = getXmlResults(page, resultsKey),
                        output;
                    for (var filename in xml_results) {
                        if (xml_results.hasOwnProperty(filename) && (output = xml_results[filename]) && typeof(output) === "string") {
                            fs.write(filename, output, "w");
                        }
                    }

                    // print out a success / failure message of the results
                    var results = getResults();
                    var specs = Number(results[1]);
                    var failures = Number(results[2]);
                    if (failures > 0) {
                        console.error("FAILURE: " + results[0]);
                        phantom.exit(1);
                    }
                    else {
                        console.log("SUCCESS: " + results[0]);
                        phantom.exit(0);
                    }
                }
            }, 100);
        }
    });
}

// Thanks to hoisting, these helpers are still available when needed above
/**
 * Stringifies the function, replacing any %placeholders% with mapped values.
 *
 * @param {function} fn The function to replace occurrences within.
 * @param {object} replacements Key => Value object of string replacements.
 */
function replaceFunctionPlaceholders(fn, replacements) {
    if (replacements && typeof replacements === "object") {
        fn = fn.toString();
        for (var p in replacements) {
            if (replacements.hasOwnProperty(p)) {
                var match = new RegExp("%" + p + "%", "g");
                do {
                    fn = fn.replace(match, replacements[p]);
                } while(fn.indexOf(match) !== -1);
            }
        }
    }
    return fn;
}

/**
 * Replaces the "evaluate" method with one we can easily do substitution with.
 *
 * @param {phantomjs.WebPage} page The WebPage object to overload
 */
function overloadPageEvaluate(page) {
    page._evaluate = page.evaluate;
    page.evaluate = function(fn, replacements) { return page._evaluate(replaceFunctionPlaceholders(fn, replacements)); };
    return page;
}

/** Stubs a fake writeFile function into the test runner.
 *
 * @param {phantomjs.WebPage} page The WebPage object to inject functions into.
 * @param {string} key The name of the global object in which file data should
 *                     be stored for later retrieval.
 */
// TODO: not bothering with error checking for now (closed environment)
function setupWriteFileFunction(page, key) {
    page.evaluate(function(){
        window["%resultsObj%"] = {};
        window.__phantom_writeFile = function(filename, text) {
            window["%resultsObj%"][filename] = text;
        };
    }, {resultsObj: key});
}

/**
 * Returns the loaded page's filename => output object.
 *
 * @param {phantomjs.WebPage} page The WebPage object to retrieve data from.
 * @param {string} key The name of the global object to be returned. Should
 *                     be the same key provided to setupWriteFileFunction.
 */
function getXmlResults(page, key) {
    return page.evaluate(function(){
        return window["%resultsObj%"] || {};
    }, {resultsObj: key});
}
