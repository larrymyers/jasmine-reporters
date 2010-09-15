(function() {
    
    if (! jasmine) {
        return;
    }
    
    var JUnitXmlReporter = function() {
        
    };
    
    JUnitXmlReporter.prototype = jasmine.JsApiReporter;
    
    
    
    // export public
    jasmine.JUnitXmlReporter = JUnitXmlReporter;
}))();