require("phnq_log").exec("widget_manager", function(log)
{
	var phnq_core = require("phnq_core");
	var fs = require("fs");
	var _path = require("path");
	var Widget = require("./widget");
	var _ = require("underscore");
	var config = require("./config");
	var crypto = require("crypto");

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
		},

		getIndex: function()
		{
			return _.keys(this.widgets).sort();
		},

		addScanPath: function(path)
		{
			path = _path.resolve(exports.appRoot, path);
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

		getAggregatedScriptName: function(types)
		{
			types.sort();

			var index = this.getIndex();
			var typesBitset = new phnq_core.BitSet();
			for(var i=0; i<types.length; i++)
			{
				if(!types[i].match(/^https?:/))
				{
					var widget = this.getWidget(types[i]);
					typesBitset.set(_.indexOf(index, types[i]));
				}
			}
			var hash = crypto.createHash("md5");
			var script = this.getAggregatedScript(types);
			hash.update(script, "UTF-8");
			return typesBitset.toArray().join("_") + "_" + hash.digest("hex");
		},

		getAggregatedStyleName: function(types)
		{
			types.sort();

			var index = this.getIndex();
			var typesBitset = new phnq_core.BitSet();
			for(var i=0; i<types.length; i++)
			{
				if(!types[i].match(/^https?:/))
				{
					var widget = this.getWidget(types[i]);
					typesBitset.set(_.indexOf(index, types[i]));
				}
			}
			var hash = crypto.createHash("md5");
			var style = this.getAggregatedStyle(types);
			hash.update(style, "UTF-8");
			return typesBitset.toArray().join("_") + "_" + hash.digest("hex");
		},

		getAggregatedScript: function(types)
		{
			return this.getAggregate(types, "script");
		},

		getAggregatedStyle: function(types)
		{
			return this.getAggregate(types, "style");
		},

		getAggregate: function(types, format)
		{
			var buf = [];

			if(format == "style")
			{
				buf.push(".wph {visibility: hidden;}\n");
				buf.push(".loadError { padding: 5px; margin: 5px; background: #c00; color: #fff; }\n");
			}

			var typesLen = types.length;
			for(var i=0; i<typesLen; i++)
			{
				var type = types[i];
				if(!type.match(/^https?:/))
				{
					try
					{
						var widget = this.getWidget(type);
						if(format == "script")
							buf.push(widget.getScript());
						else if(format == "style")
							buf.push(widget.getStyle());
					}
					catch(ex)
					{
						log.error("Error aggregating script dependency: ", type);
					}
				}
			}
			return buf.join("");
		},

		clearAggDir: function()
		{
			var aggDir = _path.join(_path.dirname(exports.appRoot), "/agg/");
			var names = fs.readdirSync(aggDir);
			_.each(names, function(name)
			{
				var aggFilePath = _path.join(aggDir, name);
				log.debug("Clearing agg file: ", aggFilePath);
				fs.unlinkSync(aggFilePath);
			});
		},

		createAggDir: function()
		{
			var aggDir = _path.join(_path.dirname(exports.appRoot), "/agg/");
			if(!_path.existsSync(aggDir))
				fs.mkdirSync(aggDir);
		},

		generateAggregateScript: function(name)
		{
			var index = this.getIndex();
			var comps = name.split("_");
			comps.pop();
			var typesBitset = new phnq_core.BitSet(comps);
			var types = [];
			for(var i=0; i<index.length; i++)
			{
				if(typesBitset.isSet(i))
					types.push(index[i]);
			}
			var path = _path.join(_path.dirname(exports.appRoot), "/agg/"+this.getAggregatedScriptName(types)+".js");
			log.debug("generating aggregate script file: "+path);
			this.createAggDir();
			fs.writeFileSync(path, this.getAggregatedScript(types), "UTF-8");
		},

		generateAggregateStyle: function(name)
		{
			var index = this.getIndex();
			var comps = name.split("_");
			comps.pop();
			var typesBitset = new phnq_core.BitSet(comps);
			var types = [];
			for(var i=0; i<index.length; i++)
			{
				if(typesBitset.isSet(i))
					types.push(index[i]);
			}
			var path = _path.join(_path.dirname(exports.appRoot), "/agg/"+this.getAggregatedStyleName(types)+".css");
			log.debug("generating aggregate style file: "+path);
			this.createAggDir();
			fs.writeFileSync(path, this.getAggregatedStyle(types), "UTF-8");
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
			paths.push(_path.join(__dirname, "../widgets"));

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
								if(name == "i18n" || name == "static")
								{
									next();
								}
								else
								{
									_this.addWidgetsAtPath(f, function()
									{
										next();
									});
								}
							}
							else
							{
								_this.watch(f);
								var m = /[^\.]*\.(ejs|js|css)/.exec(name.replace(/\.html$/, ".html.ejs"));
								if(m)
								{
									var filename = _path.basename(f);
									var ext = m[1];
									var type = _path.basename(_path.dirname(f));
									var widget = _this.widgets[type] || (_this.widgets[type] = new Widget(_path.dirname(f)));
									var partialMatch = /^_([^.]*).html.ejs/.exec(filename);
									var handlerMatch = /^_([^.]*).js/.exec(filename);
									if(partialMatch)
									{
										widget.partials[partialMatch[1]] = f;
									}
									else if(handlerMatch)
									{
										widget.remoteHandlerFile = f;
									}
									else
									{
										widget[ext+"File"] = f;
									}
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
