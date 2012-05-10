require("phnq_log").exec("phnq_widgets", function(log)
{
	var app = require("express").createServer();
	var widgetManager = require("./widget_manager").create();
	var _fs = require("fs");
	var _path = require("path");
	var phnq_core = require("phnq_core");

	var phnq_widgets = module.exports =
	{
		addPath: function(path)
		{
			widgetManager.addScanPath(path);
		},

		listen: function(port, prefix)
		{
			port = port || 8888;
			this.prefix = this.prefix || "/widgets";
			app.listen(port);
			setRoutes(this.prefix);
		}
	};

	var setRoutes = function(prefix)
	{
		app.get(prefix+"/boot", function(req, res)
		{
			res.contentType("js");
			res.send(getClientBoot());
		});

		app.get(prefix+"/:widgetType", function(req, res)
		{
			if(!req.widget)
				return res.send(404);

			var context =
			{
				params: req.query,
				widget: function(type)
				{
					var widget = widgetManager.getWidget(type);
					var markupFn = eval(widget.getCompiledMarkup());
					var markup = markupFn();
					return markup;
				}
			};

			res.send(req.widget.getWidgetShellCode(context));
		});

		app.get(prefix+"/:widgetType/static/:staticPath", function(req, res)
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
			"phnq_log"
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
	};
});
