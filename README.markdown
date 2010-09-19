# Jasmine Reporters

Jasmine Reporters is a collection of javascript jasmine.Reporter classes that can be used with
the [jasmine testing framework](http://pivotal.github.com/jasmine/).

Right now the project is focused on two new reporters:</p>

* ConsoleReporter - Report test results to the browser console.
* JUnitXmlReporter - Report test results to a file (using Rhino) in JUnit XML Report format.

Usage:

Examples are included in the test directory that show how to use the reporters, as well as a basic
runner script for envjs, which could be used in a Continuous Integration project for running
headless and generating JUnit XML output.
