require("phnq_log").exec("widget_manager", function(log)
{
	var phnq_core = require("phnq_core");
	var fs = require("fs");
	var _path = require("path");
	var Widget = require("./widget");

	var instance = null;

	module.exports =
	{
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
		},

		addScanPath: function(path)
		{
			path = _path.resolve(_path.dirname(process.argv[1]), path);
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

		/*
		*	This method operates asynchronously if a callback function is
		*	specified, otherwise it returns the widget synchronously, but
		*	forgoes the scan.
		*/
		getWidget: function(type, fn)
		{
			if(fn)
			{
				var _this = this;
				this.scan(function()
				{
					fn(null, _this.widgets[type]);
				});
			}
			else
			{
				return this.widgets[type];
			}
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
					_this.scan(function(){});
				});
			}
		},

		scan: function(fn)
		{
			if(this.widgets)
				return fn();

			var nowMillis = new Date().getTime();

			if((nowMillis - this.lastScanMillis) < 2000)
				return fn();

			log.info("Scanning for widgets...");

			this.lastScanMillis = nowMillis;

			if(this.scanPaths.length == 0)
				this.addScanPath("widgets");

			var _this = this;

			this.widgets = {};

			var paths = this.scanPaths.slice(0).reverse();
			paths.push(_path.join(__dirname, "widgets"));

			var scanNextPath = function()
			{
				if(paths.length == 0)
				{
					fn();
				}
				else
				{
					var path = paths.pop();
					_this.addWidgetsAtPath(path, function()
					{
						scanNextPath();
					});
				}
			};
			scanNextPath();
		},

		addWidgetsAtPath: function(path, fn)
		{
			var _this = this;

			_this.watch(path);

			fs.readdir(path, function(err, names)
			{
				var next = function()
				{
					if(names.length == 0)
					{
						fn();
					}
					else
					{
						var name = names.pop();
						var f = _path.join(path, name);
						fs.stat(f, function(err, stat)
						{
							if(stat && stat.isDirectory())
							{
								_this.addWidgetsAtPath(f, function()
								{
									next();
								});
							}
							else
							{
								_this.watch(f);

								var m = /[^\.]*\.(ejs|js|css)/.exec(name);
								if(m)
								{
									var ext = m[1];
									var type = _path.basename(_path.dirname(f));
									var widget = _this.widgets[type] || (_this.widgets[type] = new Widget(_path.dirname(f)));
									widget[ext+"File"] = f;
									next();
								}
								else
								{
									next();
								}
							}
						});
					}
				};
				next();
			});
		}
	});
});
