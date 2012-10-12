require("phnq_log").exec("phnq_widgets", function(log)
{
	var _ = require("underscore");
	var app = null;
	var appRoot = null;
	var widgetManager = null;
	var _fs = require("fs");
	var _path = require("path");
	var phnq_core = require("phnq_core");
	var config = require("./config");
	var Context = require("./context");

	var phnq_widgets = module.exports =
	{
		addPath: function(path)
		{
			widgetManager.addScanPath(path);
		},

		start: function(options)
		{
			options = options || {};
			options.port = options.port || 8888;

			if(options.express)
			{
				app = options.express;
			}
			else
			{
				app = require("express").createServer();
				app.listen(options.port);
			}

			appRoot = options.appRoot || _path.dirname(process.argv[1]);
			require("./widget_manager").appRoot = appRoot;
			widgetManager = require("./widget_manager").instance();

			setRoutes();

			widgetManager.clearAggDir();
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
			widgetManager.getWidget(type, function(err, widget)
			{
				if(err)
				{
					if(next)
						return next(err);
					else
						return res.send(500, err);
				}

				if(!widget)
					return res.send(404);

				phnq_core.extend(context, new Context(widget, req));

				res.send(widget.getWidgetShellCode(context));
			});
		},

		config: config
	};

	var setRoutes = function()
	{
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
			res.contentType("js");
			res.send(getClientBoot());
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
			var path = _path.join(appRoot, "/agg/"+req.params.aggFile+".js");
			_path.exists(path, function(exists)
			{
				if(!exists)
					widgetManager.generateAggregateScript(req.params.aggFile);

				res.sendfile(path);
			});
		});

		app.get(config.uriPrefix+"/agg/:aggFile.css", function(req, res)
		{
			var path = _path.join(appRoot, "/agg/"+req.params.aggFile+".css");
			_path.exists(path, function(exists)
			{
				if(!exists)
					widgetManager.generateAggregateStyle(req.params.aggFile);

				res.sendfile(path);
			});
		});

		app.get(config.uriPrefix+"/:widgetType", function(req, res)
		{
			phnq_widgets.renderWidget(req.params.widgetType, {}, req, res);
		});

		app.get(config.uriPrefix+"/:widgetType/static/:staticPath", function(req, res)
		{
			widgetManager.getWidget(req.params.widgetType, function(err, widget)
			{
				if (err)
					return res.send(err);

				if(!widget)
					return res.send(404);

				res.sendfile(_path.join(widget.dir, "static", req.params.staticPath));
			});
		});

		app.post(config.uriPrefix+"/:widgetType/remote/:cmd", function(req, res)
		{
			widgetManager.getWidget(req.params.widgetType, function(err, widget)
			{
				if (err)
					return res.send(err);

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
		});

		app.get(new RegExp("^"+config.uriPrefix+"/([^/]*)/remote/([^/]*)/(.*)"), function(req, res)
		{
			var widgetType = req.params[0];
			var cmd = req.params[1];
			var args = req.params[2].split("/");

			widgetManager.getWidget(widgetType, function(err, widget)
			{
				if (err)
					return res.send(err);

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
		});
	};

	var clientBoot = null;
	var getClientBoot = function()
	{
		if(clientBoot)
			return clientBoot;

		var bootFiles =
		[
			"../client/json2.js",
			"phnq_core",
			"phnq_log",
			"../client/widgets.js",
			"../client/context.js"
		];

		if(!config.jQueryCDN)
			bootFiles.splice(0, 0, "../client/jquery-1.8.2.js");

		var buf = [];
		for(var i=0; i<bootFiles.length; i++)
		{
			var filename;
			try
			{
				filename = require(bootFiles[i]).getFileName();
			}
			catch(ex)
			{
				filename = _path.resolve(__dirname, bootFiles[i]);
			}
			if(filename)
				buf.push(_fs.readFileSync(filename, "UTF-8"));
		}

		buf.push("phnq_widgets.config = ");
		buf.push(JSON.stringify(phnq_widgets.config));
		buf.push(";");

		return clientBoot = buf.join("");

		// var jsp = require("uglify-js").parser;
		// var pro = require("uglify-js").uglify;

		// var orig_code = buf.join("");
		// var ast = jsp.parse(orig_code); // parse code and get the initial AST
		// ast = pro.ast_mangle(ast); // get a new AST with mangled names
		// ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
		// var final_code = pro.gen_code(ast); // compressed code here		

		// return clientBoot = final_code;
	};
});
