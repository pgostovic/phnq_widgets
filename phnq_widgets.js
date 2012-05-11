require("phnq_log").exec("phnq_widgets", function(log)
{
	var _ = require("underscore");
	var app = require("express").createServer();
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

		listen: function(port)
		{
			port = port || 8888;
			app.listen(port);
			setRoutes();
		},

		config: config
	};

	var setRoutes = function()
	{
		app.get(config.uriPrefix+"/boot", function(req, res)
		{
			res.contentType("js");
			res.send(getClientBoot());
		});

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

		app.get(config.uriPrefix+"/:widgetType", function(req, res)
		{
			if(!req.widget)
				return res.send(404);

			/*
			*	The context object is what is passed into the compiled markup
			*	template function.  This must be duplicated on the client too
			*	with alternative, client-specific implementations.
			*/
			var nextIdIdx = 0;
			var context =
			{
				params: req.query,
				widget: function(type, options)
				{
					options = options || {};
					options.lazy = !!options.lazy;

					if(options.lazy)
					{
						var wphBuf = [];
						wphBuf.push("<ul class=\"wph "+type+"\">");
						// params as <li>'s
						wphBuf.push("</ul>");
						return wphBuf.join("");
					}
					else
					{
						var widget = widgetManager.getWidget(type);
						var markupFn = eval(widget.getCompiledMarkup());
						var markup = markupFn(this);
						return markup;
					}
				},
				nextId: function()
				{
					return config.idPrefix + (nextIdIdx++);
				}
			};

			res.send(req.widget.getWidgetShellCode(context));
		});

		app.get(config.uriPrefix+"/:widgetType/static/:staticPath", function(req, res)
		{
			if(!req.widget)
				return res.send(404);

			res.sendfile(_path.join(req.widget.dir, "static", req.params.staticPath));
		});

		app.param("widgetType", function(req, res, next, widgetType)
		{
			widgetManager.getWidget(widgetType, function(err, widget)
			{
				if (err)
					return next(err);

				req.widget = widget;
				next();
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
			"client/jquery-1.7.2.min.js",
			"phnq_core",
			"phnq_log",
			"client/widgets.js"
		];

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
