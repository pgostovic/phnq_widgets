var log = require("phnq_log").create(__filename);
var phnq_core = require("phnq_core");
var phnq_ejs = require("phnq_ejs");
var _path = require("path");
var _fs = require("fs");
var config = require("./config");
var _ = require("underscore");
var less = require("less");
var aggregator = require("./aggregator");
var cdn = require("./cdn");

var URL_REGEX = /url\(["']?([^)\"']*)["']?\)/g;
var EMPTY_TAGS = ["base", "basefont", "br", "col", "frame", "hr", "img", "input", "link", "meta", "param"];

Function.prototype.maxAge = function(seconds)
{
	this.maxAge = seconds;
	return this;
};

module.exports = phnq_core.clazz(
{
	init: function(type, dir)
	{
		this.type = type;
		this.dir = dir;
		this.i18nStrings = null;
		this.partials = {};
		this.tests = {};
		this.config = this.getConfig();

		// this.extConfig = require(_path.join(dir, "config.json"));
		log.debug("discovered widget: ", this.type);
	},
	
	getConfig: function()
	{
		if(!this.config)
		{
			this.config =
			{
				"wrapScript": true
			};
			
			try
			{
				var configOverride = require(_path.join(this.dir, "config.json"));
				for(var k in configOverride)
				{
					this.config[k] = configOverride[k];
				}
			}
			catch(ex)
			{
				// config override probably does not exist
			}
		}
		return this.config;
	},

	getRemoteHandlers: function()
	{
		if(this.remoteHandlers === undefined)
		{
			if(this.remoteHandlerFile && _fs.existsSync(this.remoteHandlerFile))
			{
				var handlersScript = "(function(){"+_fs.readFileSync(this.remoteHandlerFile, "UTF-8")+" return handler;})";
				var fn = eval(handlersScript);
				this.remoteHandlers = fn();
			}
			else
			{
				this.remoteHandlers = {};
			}
		}
		return this.remoteHandlers;
	},

	getScript: function()
	{
		if(this.script === undefined)
		{
			var _this = this;
			
			var jsFiles = this["jsFiles"] || [];
			var hasMult = jsFiles.length > 1;
			
			var buf = [];
			for(var i=0; i<jsFiles.length; i++)
			{
				if(hasMult)
					buf.push("(function(){")
				
				buf.push(_fs.readFileSync(jsFiles[i], "UTF-8"));
				
				if(hasMult)
					buf.push("})();")
			}
			
			var rawScript = buf.length == 0 ? null : buf.join("");
			var i18nStrings = this.getI18nStrings();
			var deps = this.getDependencies();

			if(!!rawScript || _.keys(i18nStrings).length > 0 || deps.length > 0)
			{
				var scriptWrapped = this.config.wrapScript ? rawScript : "";
				var scriptNotWrapped = !this.config.wrapScript ? rawScript : "";
				
				var widgetTmplt = config.includeTemplateWithScript ? JSON.stringify(this.getCompiledMarkup()) : null;
				
				var scriptTmplt = getCompiledScriptTemplate();
				this.script = phnq_core.trimLines(scriptTmplt(
				{
					type: _this.type,
					scriptWrapped: scriptWrapped,
					scriptNotWrapped: scriptNotWrapped,
					partialTemplates: JSON.stringify(_this.getCompiledPartials()),
					remoteMethodNames: JSON.stringify(_.keys(_this.getRemoteHandlers())),
					i18nStrings: JSON.stringify(i18nStrings),
					dependencies: JSON.stringify(deps),
					widgetTmplt: widgetTmplt
				}));
			}
			else
			{
				this.script = "";
			}
		}
		return this.script;
	},

	getStyle: function()
	{
		if(this.style === undefined)
		{
			this.style = phnq_core.trimLines((this.getFileData("css") || "").replace(/__CLASS__/g, this.type.replace(/\./g, "\\.")));

			var buf = [];
			var m;
			var idx = 0;
			while((m = URL_REGEX.exec(this.style)))
			{
				buf.push(this.style.substring(idx, m.index));
				var url = m[1];
				if(!url.match(/^(\/|data:|https?:)/))
				{
					url = (config.uriPrefixAggCss || config.uriPrefix) + "/" + this.type + "/" + url;
				}
				buf.push("url("+url+")");
				idx = URL_REGEX.lastIndex;
			}
			buf.push(this.style.substring(idx));
			this.style = buf.join("");
		}
		return this.style;
	},

	getMarkup: function(context)
	{
		var markupFn = this.getCompiledMarkupFn();
		return markupFn ? markupFn(context) : null;
	},

	getCompiledMarkupFn: function()
	{
		if(this.compiledMarkupFn === undefined)
		{
			if(this.getCompiledMarkup())
			{
				this.compiledMarkupFn = eval(this.getCompiledMarkup());
			}
			else
			{
				this.compiledMarkupFn = null;
			}
		}
		return this.compiledMarkupFn;
	},

	getCompiledMarkup: function()
	{
		if(this.compiledMarkup === undefined)
		{
			var ejs = this.getFileData("ejs");
			if(ejs)
			{
				this.compiledMarkup = this.compileTemplate(ejs, "<%=nextId()%>", ["widget", this.type]);					
				// log.debug("=================== %s ===================\n%s\n", this.type, this.compiledMarkup);
			}
			else
			{
				this.compiledMarkup = null;
			}
		}
		return this.compiledMarkup;
	},

	getCompiledPartials: function()
	{
		if(!this.compiledPartials)
		{
			this.compiledPartials = {};
			for(var k in this.partials)
			{
				var ejs = _fs.readFileSync(this.partials[k], "UTF-8");
				this.compiledPartials[k] = this.compileTemplate(ejs, null, [k]);
			}
		}
		return this.compiledPartials;
	},

	compileTemplate: function(ejs, id, classesExt)
	{
		var _this = this;
		var sax = require("sax");
		var parser = sax.parser(true);
		var buf = [];
		var bufLen = 0;
		var rootTag = true;

		parser.onopentag = function(node)
		{
			if(rootTag)
			{
				_this.rootTagName = node.name;
				if(classesExt)
				{
					var classes = (node.attributes["class"] || "").trim().split(/\s+/);
					for(var i=0; i<classesExt.length; i++)
					{
						classes.push(classesExt[i]);
					}
					node.attributes["class"] = classes.join(" ").trim();
				}

				if(id)
				{
					var idAttr = node.attributes["id"];
					if(!idAttr)
					{
						node.attributes["id"] = id;
					}
				}

				node.attributes["data-p"] = "<%= _locals.params ? JSON.stringify(_locals.params).replace(/\"/g, \"&quot;\") : \"\" %>";
			}

			buf.push("<"+node.name);
			for(var k in node.attributes)
			{
				var absolutize = node.attributes["data-absolutize"] != "false";
				var v = absolutize ? _this.absolutizePathIfNeeded("", node.name, k, node.attributes[k]) : node.attributes[k];
				buf.push(" "+k+"=\""+v+"\"");
			}
			buf.push(">");
			bufLen = buf.length;
			rootTag = false;
		};

		parser.onclosetag = function(tagName)
		{
			if(bufLen == buf.length && _.include(EMPTY_TAGS, tagName))
			{
				buf.pop();
				buf.push("/>");
			}
			else
			{
				buf.push("</"+tagName+">");
			}
		};

		parser.ontext = function(text)
		{
			buf.push(text);
		};

		parser.write(ejs);

		ejs = buf.join("");

		// log.debug("\n=======================================\n"+ejs+"\n=======================================");

		return phnq_ejs.compile(ejs);
	},
	
	dependsOnType: function(type)
	{
		var deps = this.getDependencies();
		var i = deps.length;
		while(i--)
		{
			var dep = deps[i];
			if(dep == type)
			{
				return true;
			}
		}
		return false;
	},

	getDependencies: function()
	{
		if(!this.dependencies)
		{
			var deps = [];

			var compiledMarkup = this.getCompiledMarkup();
			if(compiledMarkup)
			{
				var re = /widget\s*\(\s*"([^"]*)"/g;
				var m;
				while(m = re.exec(compiledMarkup))
				{
					var type = m[1];
					var depWidget = require("./widget_manager").instance().getWidget(type);
					if(depWidget)
					{
						var nestedDeps = depWidget.getDependencies();
						for(var i=0; i<nestedDeps.length; i++)
						{
							deps.push(nestedDeps[i]);
						}
						deps.push(type);
					}
				}
			}

			var rawScript = this.getFileData("js");

			try
			{
				var rawScriptWrapperFn = eval(
					"(function(context){ with(context){ try{" +
					rawScript +
					"}catch(ex){}}})"
				);
				rawScriptWrapperFn({
					// deprecated, use require instead...
					"depend": function(type)
					{
						this.require(type);
					},
					"require": function(type)
					{
						deps.push(type);
					}
				});
			}
			catch(ex)
			{
				log.error(ex);
			}

			// add dependents' dependencies
			var depDeps = [];
			for(var i=0; i<deps.length; i++)
			{
				var depWidget = require("./widget_manager").instance().getWidget(deps[i]);
				if(depWidget)
					depDeps = _.union(depDeps, depWidget.getDependencies());
			}

			this.dependencies = _.uniq(_.union(deps, depDeps));
			this.dependencies = require("./widget_manager").instance().sortDependencies(this.dependencies);
		}
		return _.clone(this.dependencies);
	},

	getFileData: function(ext)
	{
		if(!this[ext+"File"])
			return null;

		return _fs.readFileSync(this[ext+"File"], "UTF-8");
	},

	absolutizePathIfNeeded: function(tagUri, tagName, attrName, attrValue)
	{
		var LEADING_EJS = /^<%=([^%]*)%>(.*)/;
		var LEADING_EXP = /^\$\{([^}]*)\}(.*)/;
		var TRAILING_EJS = /^([^<]*)(<%=.*)/;
		var TRAILING_EXP = /^([^\$]*)(\$\{.*)/;

		var absBase = config.uriPrefix + "/" + this.type + "/";
		switch(tagUri + ":" + tagName+":"+attrName)
		{
			case ":link:href":
			case ":img:src":
			{
				var m;
				if(m = attrValue.match(LEADING_EJS) || attrValue.match(LEADING_EXP))
				{
					return "<%=fixUrl(\""+this.type+"\", "+m[1]+")%>"+m[2];
				}
				else if(m = attrValue.match(TRAILING_EJS) || attrValue.match(TRAILING_EXP))
				{
					return "<%=fixUrl(\""+this.type+"\", \""+m[1]+"\")%>"+m[2];
				}
				else if(attrValue.match(/^\/.*/))
				{
					return attrValue;
				}
				else
				{
					return "<%=fixUrl(\""+this.type+"\", \""+attrValue+"\")%>";
				}
				break;
			}
		}
		return attrValue;
	},

	getEmailMarkup: function(context, locale, fn)
	{
		var widgetManager = require("./widget_manager").instance();

		// Get Markup -- includes dependencies
		var markup = this.getMarkup(context);
		if(!markup)
			markup = "<h1 style=\"font-family:sans-serif\">no markup: "+this.type+"</h1>";

		var types = this.getDependencies();
		types.push(this.type);
		_.each(context.embedded, function(type)
		{
			types.push(type);
		});
		types = _.uniq(types);

		var styleAggregator = aggregator.newStyleAggregator();
		styleAggregator.append("widgetshell_head_style");

		_.each(widgetManager.lessKeys, function(lessKey)
		{
			styleAggregator.append(lessKey);
		});

		for(var i=0; i<types.length; i++)
		{
			styleAggregator.append("widget_"+types[i]+"_style");
		}

		var style = styleAggregator.getAggregate();

		var shellFn = getCompiledShellEmailMarkupTemplate();
		var shellCode = shellFn(
		{
			lang: locale,
			style: style,
			body: markup,
			widget: this
		});

		fn(shellCode);
	},

	getWidgetShellCode: function(context, fn)
	{
		var title = this.type;
		var widgetManager = require("./widget_manager").instance();
		
		context.title = function(bodyFn)
		{
			var buf = [];
			bodyFn(buf);
			title = buf.join("");
		};
		
		var head = "";
		context.head = function(bodyFn)
		{
			var buf = [];
			bodyFn(buf);
			head = buf.join("");
		};
		
		// Get Markup -- includes dependencies
		var markup = this.getMarkup(context);
		if(!markup)
			markup = "<h1 style=\"font-family:sans-serif\">no markup: "+this.type+"</h1>";

		var types;
		
		if(config.loadAllWidgets)
		{
			types = widgetManager.getAllTypes();
		}
		else
		{
			types = this.getDependencies();
			types.push(this.type);
			_.each(context.embedded, function(type)
			{
				types.push(type);
			});
			types = _.uniq(types);
		}
		
		var typesLen = types.length;

		// find the external scripts
		var extScriptBuf = [];
		for(var i=0; i<typesLen; i++)
		{
			var type = types[i];
			if(type.match(/^https?:/))
			{
				extScriptBuf.push("<script type='text/javascript' src='"+type+"'></script>");
			}
		}

		var locale = "en";
		var acceptLang = context.headers["accept-language"];
		if(acceptLang)
		{
			locale = acceptLang.split(",")[0];
			locale = locale.split(";")[0];
		}

		var scriptAggregator = aggregator.newScriptAggregator();
		scriptAggregator.append("client_boot");

		var styleAggregator = aggregator.newStyleAggregator();
		styleAggregator.append("widgetshell_head_style");

		_.each(widgetManager.lessKeys, function(lessKey)
		{
			styleAggregator.append(lessKey);
		});

		for(var i=0; i<types.length; i++)
		{
			scriptAggregator.append("widget_"+types[i]+"_script");
			styleAggregator.append("widget_"+types[i]+"_style");
		}
		
		var aggScriptUrl, aggStyleUrl;

		if(cdn.getCDN())
		{
			aggScriptUrl = cdn.getCDN().getUrlForFile("agg/"+scriptAggregator.getName()+".js");
			aggStyleUrl = cdn.getCDN().getUrlForFile("agg/"+styleAggregator.getName()+".css");
		}
		else
		{
			aggScriptUrl = config.uriPrefix + "/agg/" + scriptAggregator.getName()+".js";
			aggStyleUrl = config.uriPrefix + "/agg/" + styleAggregator.getName()+".css";
		}

		if(config.compressJS)
			aggScriptUrl += ".gz";

		if(config.compressCSS)
			aggStyleUrl += ".gz";

		var shellFn = getCompiledShellMarkupTemplate();
		var shellCode = shellFn(
		{
			title: title,
			head: head,
			lang: locale,
			prefix: config.uriPrefix,
			body: markup,
			jQueryCDN: config.jQueryCDN,
			extScript: extScriptBuf.join(""),
			aggScriptUrl: aggScriptUrl,
			aggStyleUrl: aggStyleUrl,
			widget: this
		});
		
		var scriptExtractRe = /(<script.*<\/script>)\s*<\/html>/;
		var matcher = scriptExtractRe.exec(shellCode);
		var scriptTagCode = matcher[1];
		
		shellCode = shellCode.replace(scriptTagCode, "");
		shellCode = shellCode.replace("</body>", scriptTagCode+"\n</body>")
		
		scriptAggregator.generate(function()
		{
			styleAggregator.generate(function()
			{
				cdn.sync(function()
				{
					fn(shellCode);
				});
			});
		});
	},

	getI18nStrings: function()
	{
		if(!this.i18nStrings)
		{
			var _this = this;
			this.i18nStrings = {};
			var i18nDir = _path.join(this.dir, "_i18n");
			if(_fs.existsSync(i18nDir))
			{
				var locales = _fs.readdirSync(i18nDir);
				locales.push(null); // this is the default locale
				_.each(locales, function(locale)
				{
					var localeDir = _path.join(i18nDir, locale||".");
					
					if(_fs.statSync(localeDir).isDirectory())
					{
						var stringsFilePath = _path.join(localeDir, "strings.json");
						var stat = _fs.statSync(stringsFilePath);
						if(stat && stat.isFile())
						{
							_this.i18nStrings[locale] = JSON.parse(_fs.readFileSync(stringsFilePath, "UTF-8"));
							require("./widget_manager").instance().watch(stringsFilePath);
						}
					}
				});
			}
		}
		return this.i18nStrings;
	},

	getI18nString: function(key, locale, localeOrig)
	{
		localeOrig = localeOrig || locale;

		var i18nStrings = this.getI18nStrings();

		if(i18nStrings[locale] && i18nStrings[locale][key])
			return i18nStrings[locale][key];

		if(locale)
			return this.getI18nString(key, getParentLocale(locale), localeOrig);

		var deps = this.getDependencies();
		for(var i=0; i<deps.length; i++)
		{
			var depWidget = require("./widget_manager").instance().getWidget(deps[i]);
			var str = depWidget.getI18nString(key, localeOrig);
			if(str)
				return str;
		}

		return null;
	},

	getTestCode: function(baseUrl)
	{
		var _this = this;
		var buf = [];

		var pageUrl = new String(baseUrl+this.type);

		buf.push("describe(\"Tests for widget: "+this.type+"\", function() {");
		buf.push("var browserOptions = {};");
		buf.push("beforeEach(function(done){");
		buf.push("browser.visit(\""+pageUrl+"\", browserOptions, function(){done();});");
		buf.push("});");
		buf.push("after(function(){");
		buf.push("browserOptions = {};");
		buf.push("});");

		_.each(this.tests, function(testFile, name)
		{
			buf.push("describe(\"\", function(){");
			var code = _fs.readFileSync(testFile, "UTF-8");
			buf.push(code);
			buf.push("});");
		});

		buf.push("});");

		return buf.join("");
	}
});

var getParentLocale = function(locale)
{
	var comps = locale.split(/[_-]/);
	if(comps.length > 1)
	{
		comps.pop();
		return comps.join("_");
	}
	else
	{
		return null;
	}
};

var compiledShellMarkupTemplate = null;
var getCompiledShellMarkupTemplate = function()
{
	if(!compiledShellMarkupTemplate)
	{
		compiledShellMarkupTemplate = eval(phnq_ejs.compile(_fs.readFileSync(__dirname+"/shell.html.ejs", "UTF-8"))); 
	}
	return compiledShellMarkupTemplate;
};

var compiledShellEmailMarkupTemplate = null;
var getCompiledShellEmailMarkupTemplate = function()
{
	if(!compiledShellEmailMarkupTemplate)
	{
		compiledShellEmailMarkupTemplate = eval(phnq_ejs.compile(_fs.readFileSync(__dirname+"/shell_email.html.ejs", "UTF-8"))); 
	}
	return compiledShellEmailMarkupTemplate;
};

var compiledScriptTemplate = null;
var getCompiledScriptTemplate = function()
{
	if(!compiledScriptTemplate)
	{
		compiledScriptTemplate = eval(phnq_ejs.compile(_fs.readFileSync(__dirname+"/script.js.ejs", "UTF-8"))); 
	}
	return compiledScriptTemplate;
};
