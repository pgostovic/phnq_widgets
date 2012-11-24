var log = require("phnq_log").create(__filename);
var app = null;
var appRoot = null;
var _path = require("path");
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

		appRoot = this.appRoot = options.appRoot || _path.dirname(process.argv[1]);
		require("./widget_manager").appRoot = appRoot;

		require("./routes").init(app, appRoot);

		aggregator.pruneAggDir();
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

	getTestCode: function(options)
	{
		var baseUrl = options.baseUrl + config.uriPrefix + "/";
		return require("./widget_manager").instance().getTestCode(baseUrl);
	},

	config: config
};
