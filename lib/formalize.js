
function forIn(obj, fun) {
    var name;
    for (name in obj) {
        if (obj.hasOwnProperty(name)) {
            fun(name, obj[name]);
        }
    }
};

function runIfFun(me, fun, args) {
    var f = funViaString(fun);
    if (typeof f == "function") {
        return f.apply(me, args);
    } else {
        return fun;
    }
}

function funViaString(fun) {
    if (fun && fun.match && fun.match(/function/)) {
        eval("var f = "+fun);
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
};

/**
  Render a form based on its JSON specification
  @param {String} formMeta   Form specification JSON
**/
var formalize = exports.formalize = function(formMeta, options) {
    if (formMeta == undefined || formMeta == null || formMeta == "")
        throw new Error("Argument can not be null or empty: formMeta");)
    
    options = options || {};
    
    if (options.strategies)
        options.strategies = exports.formalize.strategies.concat(options.strategies);
    else
        options.strategies = exports.formalize.strategies;
    
    /*
     * Call with no arguments to get the strategies.
     * Call with one argument, an array of strategies, to set the strategies
     */
    this.strategies = function(val) {
        if (val == undefined)
            return options.strategies;
            
        options.strategies = val;
        return this;
    };
    
    this.formMeta = function() { return JSON.parse(formMeta); } // TODO: Memoize this function
    
    return this;
}

formalize.strategies = [];

formalize.prototype.formMeta = null;

formalize.prototype.html = function(opts) {
    var strategy;
    var result;
    for (var i=0;i<this.strategies.length;++i) {
        strategy = this.strategies[i];
        result = strategy(this.formMeta, { view: this });
        if (result != undefined || result != null)
            break;
    }
    
    if (typeof result == "undefined")
        throw new Error("No strategies found that would render this form");
    
    return result;
};

function Strategy(opts) {
    var strategy = Object.create(opts);
    return opts.render;
}

exports.strategy.formStrategy = new Strategy({
        template: "<form>{{#components}}{{{html}}}{{/components}}</form>",
        partials: {},
        view: {},
        render: function(component, opts) {
            if (component.type != ComponentType.FORM)
                return;
            
            opts = opts || {};
                
            return Mustache.to_html(opts.template || this.template, opts.view || this.view, opts.partials || this.partials);
        }
    });
    
exports.strategy.groupStrategy = new Strategy({
    template: "<div>{{#components}}{{{html}}}{{/components}}</div>",
    partials: {},
    view: {},
    render: function(component, opts) {
        if (component.type != ComponentType.GROUP)
            return;
            
        opts = opts || {};
        
        return Mustache.to_html(opts.template || this.template, opts.view || this.view, opts.partials || this.partials);
    }
});

exports.strategy.textboxFieldStrategy = new Strategy({
    template: "<p><label for='{{name}}'>{{nameAsTitle}}</label><input type='text' name='{{name}}' id='{{name}}' /></p>",
    partials: {},
    view: {},
    render: function(component, opts) {
        if (component.type != ComponentType.STRING)
            return;
            
        opts = opts || {};
        
        return Mustache.to_html(opts.template || this.template, opts.view || this.view, opts.partials || this.partials);
    }
});

exports.strategies = [ exports.strategy.formStrategy, exports.strategy.groupStrategy, exports.strategy.textboxFieldStrategy ];

var ComponentType = exports.ComponentType = {
    FORM: "form",
    GROUP: "group",
    STRING: "string",
    NUMBER: "number",
    DATE: "date"
};