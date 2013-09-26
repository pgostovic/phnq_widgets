var log = require("phnq_log").create(__filename);
var app = null;
var appRoot = null;
var _path = require("path");
var fs = require("fs");
var _ = require("underscore");
var ncp = require("ncp").ncp;
var phnq_core = require("phnq_core");
var config = require("./config");
var aggregator = require("./aggregator");
var Context = require("./context");

var phnq_widgets = module.exports =
{
	addPath: function(path)
	{
		require("./widget_manager").instance().addScanPath(path);
	},

	start: function(options)
	{
		log.info("starting phnq_widgets server");

		options = options || {};
		options.port = options.port || 8888;

		if(options.express)
		{
			app = options.express;
		}
		else
		{
			app = require("express")();
			app.listen(options.port);
			app.use(phnq_widgets.widgetRenderer());
		}
		
		this.setAppRoot(options.appRoot || _path.dirname(process.argv[1]));

		require("./routes").init(app, appRoot);

		aggregator.pruneAggDir();
	},
	
	setAppRoot: function(theAppRoot)
	{
		appRoot = this.appRoot = require("./widget_manager").appRoot = theAppRoot;
	},
	
	getApp: function()
	{
		return app;
	},

	widgetRenderer: function(options)
	{
		return function(req, res, next)
		{
			res.renderWidget = function(type, context)
			{
				phnq_widgets.renderWidget(type, context||{}, req, res, next);
			};
			next();
		};
	},

	renderWidget: function(type, context, req, res, next)
	{
		var widget = require("./widget_manager").instance().getWidget(type);
		if(!widget)
			return res.send(404);

		context = phnq_core.extend(new Context(widget, req), context);

		widget.getWidgetShellCode(context, function(code)
		{
			res.send(code);
		});
	},

	renderWidgetAsEmail: function(type, context, locale, fn)
	{
		var widget = require("./widget_manager").instance().getWidget(type);
		if(!widget)
			return fn(null);

		context = phnq_core.extend(new Context(widget), context);

		var subject = "";
		context.subject = function(subj)
		{
			subject = subj;
		};

		widget.getEmailMarkup(context, locale, function(code)
		{
			fn(subject, code);
		});
	},
	
	renderStaticWidget: function(type, appRoot, indexFile, fn)
	{
		this.setAppRoot(appRoot);
		this.config.uriPrefix = "static";
		this.config.uriPrefixAggCss = "../../static";
		this.config.includeTemplateWithScript = true;
	
		var renderDir = _path.join(appRoot, "rendered");

		phnq_core.rmdir(_path.join(appRoot, "static"));
		phnq_core.rmdir(_path.join(renderDir, "static"));
	
		this.renderWidget(type, {}, null,
		{
			// The 4th arg to renderWidget is a "response" object. Here, we're
			// just mocking the response object, so just need to implement
			// a send() function.
			send: function(markup)
			{
				if(!fs.existsSync(renderDir))
					fs.mkdirSync(renderDir);
				
				// write the markup to a file
				fs.writeFile(_path.join(renderDir, indexFile), markup, function(err)
				{
					if(err)
						return fn(err);
					
					// copy the generated static files over
					ncp(_path.join(appRoot, "static"), _path.join(renderDir, "static"), function(err)
					{
						if(err)
							return fn(err);

						phnq_core.rmdir(_path.join(appRoot, "static"));
						
						// copy all widget static dirs over
						var widgets = _.values(require("./widget_manager").instance().widgets);
						
						var copyNext = function(err)
						{
							if(err || widgets.length == 0)
								return fn(err);
								
							var widget = widgets.pop();
							var staticDir = _path.join(widget.dir, "_static");
							if(fs.existsSync(staticDir))
							{
								fs.mkdirSync(_path.join(renderDir, "static", widget.type));
								ncp(staticDir, _path.join(renderDir, "static", widget.type, "static"), function()
								{
									copyNext(err);
								});
							}
							else
							{
								copyNext();
							}
						};
						copyNext();
					});
				});
			}
		});
	},

	getTestCode: function(options)
	{
		var baseUrl = options.baseUrl + config.uriPrefix + "/";
		return require("./widget_manager").instance().getTestCode(baseUrl);
	},

	config: config
};
