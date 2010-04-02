var ComponentType = exports.ComponentType = {
    FORM: "form",
    GROUP: "group",
    STRING: "string",
    NUMBER: "number",
    DATE: "date"
};

var mustache = $.mustache;

function forIn(obj, fun) {
    var name;
    for (name in obj) {
        if (obj.hasOwnProperty(name)) {
            fun(name, obj[name]);
        }
    }
}

function funViaString(fun) {
    if (fun && fun.match && fun.match(/function/)) {
        eval("var f = " + fun);
        if (typeof f == "function") {
            return function() {
            try {
                return f.apply(this, arguments);
                } catch(e) {
                    // IF YOU SEE AN ERROR HERE IT HAPPENED WHEN WE TRIED TO RUN YOUR FUNCTION
                    // $.log({"message": "Error in evently function.", "error": e, "src" : fun});
                    throw(e);
                }
            };
        }
    }
    return fun;
}

function runIfFun(me, fun, args) {
    var f = funViaString(fun);
    if (typeof f == "function") {
        $.log("applying function in runIfFun");
        return f.apply(me, args);
    } else {
        return fun;
    }
}

/**
  Render a form based on its JSON specification
  @param {String} formMeta   Form specification JSON
**/
var formalize = exports.formalize = function(formMeta, options) {
    if (formMeta === undefined || formMeta === null || formMeta === "") {
        throw new Error("Argument can not be null or empty: formMeta");
    }
    
    options = options || {};
    
    if (options.strategies) {
        options.strategies = exports.strategies.concat(options.strategies);
    } else {
        options.strategies = exports.strategies;
    }
    
    console.log("strategies: " + options.strategies);
    
    var formalizer = new Formalizer(formMeta, options);
    return formalizer;
};

var Formalizer = function(formMeta, opts) {
    this.formMeta = formMeta;
    formMeta.type = ComponentType.FORM;
    
    opts = opts || {};
    this.strategies = function(val) {
        if (val === undefined) {
            return opts.strategies;
        }
        
        opts.strategies = val;
        return this;
    };
}

Formalizer.prototype.formMeta = function() { return JSON.parse(formMeta); }; // TODO: Memoize this function

Formalizer.prototype.html = function(opts) {
    var strategy;
    var result;
    var self = this;
    
    $.log("Formalizer#html");
    
    return html(this.formMeta, this.strategies);
};

function html(component, strategies) {
    $.log("_html");
    var result;
    
    strategies = runIfFun(this, strategies);
    
    if (typeof strategies == "undefined")
        throw new Error("Strategies must be defined");
    
    if (component.components && component.components.length > 0) {
        component.components.forEach(function(component) {
            component.html = html(component, strategies);
        });
    }
    
    for (var i=0;i<strategies.length;++i) {
        strategy = strategies[i];
        result = strategy(component, { view: component });
        if (result !== undefined && result !== null) {
            $.log("html result: " + result);
            break; 
        }
    }
    
    if (typeof result == "undefined") {
        throw new Error("No strategies found that would render this component: " + JSON.stringify(component));
    }
    
    return result;
}

var Strategy = exports.Strategy = function(opts) {
    return function(component, args) {
        return opts.render.call(opts, component, args);
    }
}

exports.strategy = {
    formStrategy: Strategy({
        template: "<form>{{#components}}{{{html}}}{{/components}}</form>",
        partials: {},
        view: {},
        render: function(component, opts) {
            console.log("formStrategy render");
            if (component.type != ComponentType.FORM) {
                $.log(JSON.stringify(component));
                return;
            }
            
            opts = opts || {};
                
            return mustache(this.template, opts.view || this.view, opts.partials || this.partials);
        }
    }),
    groupStrategy: Strategy({
        template: "<div>{{#components}}{{{html}}}{{/components}}</div>",
        partials: {},
        view: {},
        render: function(component, opts) {
            $.log("groupStrategy render");
            if (component.type != ComponentType.GROUP) {
                return;
            }
                
            opts = opts || {};
            
            return mustache(opts.template || this.template, opts.view || this.view, opts.partials || this.partials);
        }
    }),
    textboxFieldStrategy: Strategy({
        template: "<p><label for='{{name}}'>{{title}}</label><input type='text' name='{{name}}' id='{{name}}' /></p>",
        partials: {},
        view: {},
        render: function(component, opts) {
            $.log("textboxFieldStrategy render");
            if (component.type != ComponentType.STRING) {
                return;
            }
                
            opts = opts || {};
            
            return mustache(opts.template || this.template, opts.view || this.view, opts.partials || this.partials);
        }
    })
};

exports.strategies = [ exports.strategy.formStrategy, exports.strategy.groupStrategy, exports.strategy.textboxFieldStrategy ];