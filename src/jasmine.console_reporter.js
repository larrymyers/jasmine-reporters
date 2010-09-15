(function() {
    
    if (! jasmine) {
        return;
    }
    
    var ConsoleReporter = function() {
        
    };
    
    ConsoleReporter.prototype = jasmine.JsApiReporter;
    
    
    
    // export public
    jasmine.ConsoleReporter = ConsoleReporter;
}))();