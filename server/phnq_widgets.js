var log = require("phnq_log").create(__filename);
var app = null;
var appRoot = null;
var _path = require("path");
var fs = require("fs");
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

		phnq_core.extend(context, new Context(widget, req));

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

		phnq_core.extend(context, new Context(widget));

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
	
	renderStaticWidget: function(type, appRoot, fn)
	{
		this.setAppRoot(appRoot);
		this.config.uriPrefix = "static";
	
		var renderDir = _path.join(appRoot, "rendered");
	
		var markup = this.renderWidget(type, {}, null,
		{
			send: function(markup)
			{
				fs.mkdir(renderDir, function(err)
				{
					if(err)
						return fn(err);
					
					fs.writeFile(_path.join(renderDir, type+".html"), markup, function(err)
					{
						if(err)
							return fn(err);

						ncp(_path.join(appRoot, "static"), _path.join(renderDir, "static"), function(err)
						{
							fn(err);
						});
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
