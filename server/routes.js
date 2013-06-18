var log = require("phnq_log").create(__filename);
var _ = require("underscore");
var _fs = require("fs");
var _path = require("path");
var config = require("./config");
var aggregator = require("./aggregator");
var perf = require("./perf");

exports.init = function(app, appRoot)
{
	var widgetManager = require("./widget_manager").instance();

	/*
	*	Implicit addition of controllers.  Looks for a folder named "controllers"
	*	in the app folder and calls init() on required js files.
	*/
	var controllersPath = _path.join(appRoot, "controllers");
	_fs.readdir(controllersPath, function(err, names)
	{
		_.each(names, function(name)
		{
			if(name.match(/^[^\.].*\.js$/))
			{
				var controller = require(_path.join(controllersPath, name));
				if(typeof(controller.init) == "function")
					controller.init(app);
			}
		})
	});

	/*
	*	Gets the client-side bootstrap JS. This includes jQuery and some
	*	other JS utilities to allow the loading of widgets.
	*/
	// TODO: make this cacheable.
	app.get(config.uriPrefix+"/boot", function(req, res)
	{
		res.type("js");
		res.send(aggregator.getClientBoot());
	});

	/*
	*	Load widgets onto the client.
	*/
	app.get(config.uriPrefix+"/load", function(req, res)
	{
		var result =
		{
			templates: {},
			scripts: [],
			styles: []
		};

		var classesOnly = req.query.co.split(",");
		var fullyLoaded = req.query.fl.split(",");
		var toLoad = req.query.t.split(",");

		// Fill in toLoad with dependencies.
		for(var i=0; i<toLoad.length; i++)
		{
			var type = toLoad[i];
			var widget = widgetManager.getWidget(type);
			if(widget)
			{
				var deps = widget.getDependencies();
				for(var j=0; j<deps.length; j++)
				{
					if(_.indexOf(fullyLoaded, deps[j]) == -1)
						toLoad.push(deps[j]);
				}
			}
		}
		toLoad = _.uniq(toLoad);
		
		toLoad = widgetManager.sortDependencies(toLoad);

		for(var i=0; i<toLoad.length; i++)
		{
			var type = toLoad[i];
			var widget = widgetManager.getWidget(type);
			if(widget)
			{
				result.templates[type] = widget.getCompiledMarkup();

				if(_.indexOf(classesOnly, type) == -1)
				{

					var script = widget.getScript();
					if(script)
						result.scripts.push(script);

					var style = widget.getStyle();
					if(style)
						result.styles.push(style);
				}
			}
		}

		var buf = [];
		buf.push(req.query.jsoncallback);
		buf.push("(");
		buf.push(JSON.stringify(result));
		buf.push(");");

		res.contentType("js");
		res.send(buf.join(""));
	});

	app.get(config.uriPrefix+"/agg/:aggFile.js", function(req, res)
	{
		var scriptAgg = aggregator.newScriptAggregator(req.params.aggFile);
		scriptAgg.generate(function()
		{
			res.type("js");
			res.sendfile(_path.join(appRoot, "static", "agg", req.params.aggFile+".js"));
		});
	});

	app.get(config.uriPrefix+"/agg/:aggFile.js.gz", function(req, res)
	{
		var scriptAgg = aggregator.newScriptAggregator(req.params.aggFile);
		scriptAgg.generate(function()
		{
			res.type("js");
			res.header("Content-Encoding", "gzip");
			res.sendfile(_path.join(appRoot, "static", "agg", req.params.aggFile+".js.gz"));
		});
	});

	app.get(config.uriPrefix+"/agg/:aggFile.css", function(req, res)
	{
		var styleAgg = aggregator.newStyleAggregator(req.params.aggFile);
		styleAgg.generate(function()
		{
			res.type("css");
			res.sendfile(_path.join(appRoot, "static", "agg", req.params.aggFile+".css"));
		});
	});

	app.get(config.uriPrefix+"/agg/:aggFile.css.gz", function(req, res)
	{
		var styleAgg = aggregator.newStyleAggregator(req.params.aggFile);
		styleAgg.generate(function()
		{
			res.type("css");
			res.header("Content-Encoding", "gzip");
			res.sendfile(_path.join(appRoot, "static", "agg", req.params.aggFile+".css.gz"));
		});
	});

	app.get(config.uriPrefix+"/:widgetType", function(req, res)
	{
		require("./phnq_widgets").renderWidget(req.params.widgetType, {}, req, res);
	});

	app.get(new RegExp(config.uriPrefix+"/([^/]*)/_?static/(.*)"), function(req, res)
	{
		var widgetType = req.params[0];
		var staticPath = req.params[1];

		var widget = widgetManager.getWidget(widgetType);
		if(!widget)
			return res.send(404);

		res.sendfile(_path.join(widget.dir, "_static", staticPath));
	});

	app.post(config.uriPrefix+"/:widgetType/remote/:cmd", function(req, res)
	{
		var widget = widgetManager.getWidget(req.params.widgetType);
		if(!widget)
			return res.send(404);

		var args = req.body;
		args.push(function(resp)
		{
			res.json(resp);
		});

		var remoteHandlerFn = widget.getRemoteHandlers()["post"+req.params.cmd] || widget.getRemoteHandlers()[req.params.cmd];
		remoteHandlerFn.apply(null, args);
	});

	app.get(new RegExp("^"+config.uriPrefix+"/([^/]*)/remote/([^/]*)/(.*)"), function(req, res)
	{
		var widgetType = req.params[0];
		var cmd = req.params[1];
		var args = req.params[2].split("/");

		var widget = widgetManager.getWidget(widgetType);
		if(!widget)
			return res.send(404);

		args.push(function(resp)
		{
			res.json(resp);
		});
		var remoteHandlerFn = widget.getRemoteHandlers()["get"+cmd];

		if(remoteHandlerFn.maxAge)
			res.header("Cache-Control", "max-age="+remoteHandlerFn.maxAge+", must-revalidate");

		remoteHandlerFn.apply(null, args);
	});
};
