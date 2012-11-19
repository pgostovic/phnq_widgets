require("phnq_log").exec("widget_manager", function(log)
{
	var phnq_core = require("phnq_core");
	var fs = require("fs");
	var _path = require("path");
	var Widget = require("./widget");
	var _ = require("underscore");
	var config = require("./config");
	var aggregator = require("./aggregator");

	var instance = null;

	module.exports =
	{
		appRoot: _path.dirname(process.argv[1]),

		instance: function()
		{
			return instance || (instance = new WidgetManager());
		}
	};

	var WidgetManager = phnq_core.clazz(
	{
		init: function()
		{
			this.scanPaths = [];
			this.widgets = null;
			this.lastScanMillis = 0;
			this.watched = {};
			this.lessKeys = null;
		},

		addScanPath: function(path)
		{
			path = _path.join(module.exports.appRoot, path);
			try
			{
				fs.statSync(path);
				log.debug("Added widget scan path: ", path);
				this.scanPaths.push(path);
			}
			catch(ex)
			{
				log.debug("Error adding widget scan path: ", ex.toString());
			}
		},

		getWidget: function(type)
		{
			this.scan();
			return this.widgets[type];
		},

		watch: function(path)
		{
			if(!this.watched[path])
			{
				var _this = this;
				this.watched[path] = true;
				fs.watch(path, {persistent:false}, function()
				{
					_this.widgets = null;
				});
			}
		},

		getTestCode: function(baseUrl)
		{
			var buf = [];
			this.scan();
			_.each(this.widgets, function(widget)
			{
				buf.push(widget.getTestCode(baseUrl));
			});
			return buf.join("");
		},

		scan: function()
		{
			if(this.widgets)
				return;

			var nowMillis = new Date().getTime();

			if((nowMillis - this.lastScanMillis) < 2000)
				return;

			log.info("Scanning for widgets...");

			this.lastScanMillis = nowMillis;

			if(this.scanPaths.length == 0)
				this.addScanPath("widgets");

			var _this = this;

			this.widgets = {};
			this.lessKeys = [];
			aggregator.clear();
			
			var paths = this.scanPaths.slice(0).reverse();
			paths.push(_path.join(__dirname, "../widgets"));
			paths = _.uniq(paths); // in case we're running app.js in this package

			_.each(_.uniq(paths), function(path)
			{
				_this.addWidgetsAtPath(path, path);
			});

			_.each(this.widgets, function(widget, type)
			{
				var script = widget.getScript();
				if(script)
					aggregator.registerString("widget_"+type+"_script", script);

				var style = widget.getStyle();
				if(style)
					aggregator.registerString("widget_"+type+"_style", style);
			});

			var buf = [];
			buf.push(".wph {visibility: hidden; width: 1px}\n");
			buf.push(".loadError { padding: 5px; margin: 5px; background: #c00; color: #fff; }\n");
			aggregator.registerString("widgetshell_head_style", buf.join(""));

			aggregator.registerString("client_boot", aggregator.getClientBoot(true));
		},

		addWidgetsAtPath: function(path, basePath)
		{
			var _this = this;

			_this.watch(path);

			var names = fs.readdirSync(path);

			_.each(names, function(name)
			{
				var f = _path.join(path, name);
				var stat = fs.statSync(f);

				if(stat && stat.isDirectory())
				{
					if(name != "_i18n" && name != "_static")
					{
						_this.addWidgetsAtPath(f, basePath);
					}
				}
				else
				{
					if(name.match(/.*\.less$/))
					{
						var lessKey = "less_"+_path.relative(basePath, f);
						aggregator.registerString(lessKey, fs.readFileSync(f, "UTF-8"));
						_this.lessKeys.push(lessKey);
					}
					else
					{
						var m = /[^\.]*\.(ejs|js|css)/.exec(name.replace(/\.html$/, ".html.ejs"));
						if(m)
						{
							var type = _path.basename(_path.dirname(f));
							if(!type.match(/\./))
								type = _path.relative(basePath, _path.dirname(f)).split("/").join(".");

							_this.watch(f);

							var filename = _path.basename(f);

							var ext = m[1];
							var widget = _this.widgets[type] || (_this.widgets[type] = new Widget(type, _path.dirname(f)));
							var partialMatch = /^_([^.]*).html(\.ejs)?/.exec(filename);
							var handlerMatch = /^_([^.]*)\.js/.exec(filename);
							var testMatch = /^([^.]*)\.test\.js/.exec(filename);
							if(partialMatch)
							{
								widget.partials[partialMatch[1]] = f;
							}
							else if(handlerMatch)
							{
								widget.remoteHandlerFile = f;
							}
							else if(testMatch)
							{
								widget.tests[testMatch[1]] = f;
							}
							else
							{
								widget[ext+"File"] = f;
							}
						}
					}
				}
			});
		}
	});
});
