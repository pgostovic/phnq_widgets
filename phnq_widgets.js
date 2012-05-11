require("phnq_log").exec("phnq_widgets", function(log)
{
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

		app.get(config.uriPrefix+"/:widgetType", function(req, res)
		{
			if(!req.widget)
				return res.send(404);

			/*
			*	The context object is what is passed into the compiled markup
			*	template function.  This must be duplicated on the client too
			*	with alternative implementations.
			*/
			var nextIdIdx = 0;
			var context =
			{
				params: req.query,
				widget: function(type)
				{
					var widget = widgetManager.getWidget(type);
					var markupFn = eval(widget.getCompiledMarkup());
					var markup = markupFn(this);
					return markup;
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
