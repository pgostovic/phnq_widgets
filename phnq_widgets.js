require("phnq_log").exec("phnq_widgets", function(log)
{
	var _ = require("underscore");
	var app = null;
	var widgetManager = require("./widget_manager").instance();
	var _fs = require("fs");
	var _path = require("path");
	var phnq_core = require("phnq_core");
	var config = require("./config");

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
			setRoutes();
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

				/*
				*	The context object is what is passed into the compiled markup
				*	template function.  This must be duplicated on the client too
				*	with alternative, client-specific implementations.
				*/
				var nextIdIdx = 0;
				phnq_core.extend(context,
				{
					embedded: [],

					query: req.query,

					params: {},

					i18n: function(key)
					{
						var locale = "en_US";

						var currentWidget = this.embedded.length == 0 ? widget : widgetManager.getWidget(this.embedded[this.embedded.length-1]);
						return currentWidget.getString(key, locale) || "[MISSING_STRING("+locale+", "+currentWidget.type+") - "+key+"]";
					},

					nextId: function()
					{
						return config.idPrefix + (nextIdIdx++);
					},

					widget: function(type /* , params, bodyFn */)
					{
						var params=null, bodyFn=null;

						for(var i=1; i<arguments.length; i++)
						{
							if(!params && typeof(arguments[i]) == "object")
								params = arguments[i];
							else if(!bodyFn && typeof(arguments[i]) == "function")
								bodyFn = arguments[i];
						}

						params = params || {};
						var isLazy = !!params._lazy;

						if(bodyFn)
						{
							if(isLazy)
								throw "A widget with a body function may not be loaded lazily: "+type;

							var buf = [];
							bodyFn(buf);
							this.body = buf.join("");
						}

						this.params = params;

						var markup;
						if(isLazy)
						{
							markup = "<span class=\"wph "+type+"\"><!--"+JSON.stringify(this.params)+"--></span>";
						}
						else
						{
							this.embedded.push(type);
							var widget = widgetManager.getWidget(type);
							var compiledMarkup = widget.getCompiledMarkup();
							if(compiledMarkup)
							{
								var markupFn = eval(compiledMarkup);
								markup = markupFn(this);
							}
							else
							{
								markup = "";
							}
							this.embedded.pop();
						}

						this.params = {};
						this.body = null;

						return markup;
					}
				});

				res.send(widget.getWidgetShellCode(context));
			});
		},

		config: config
	};

	var setRoutes = function()
	{
		/*
		*	Gets the client-side bootstrap JS. This includes jQuery and some
		*	other JS utilities to allow the loading of widgets.
		*/
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
			var path = _path.join(_path.dirname(process.argv[1]), "/agg/"+req.params.aggFile+".js");
			_fs.exists(path, function(exists)
			{
				if(!exists)
					widgetManager.generateAggregateScript(req.params.aggFile);

				res.sendfile(path);
			});
		});

		app.get(config.uriPrefix+"/agg/:aggFile.css", function(req, res)
		{
			var path = _path.join(_path.dirname(process.argv[1]), "/agg/"+req.params.aggFile+".css");
			_fs.exists(path, function(exists)
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
				widget.getRemoteHandlers()["get"+cmd].apply(null, args);
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
			"client/json2.js",
			"phnq_core",
			"phnq_log",
			"client/widgets.js"
		];

		if(!config.jQueryCDN)
			bootFiles.splice(0, 0, "client/jquery-1.7.2.min.js");

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
