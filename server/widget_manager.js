require("phnq_log").exec("widget_manager", function(log)
{
	var phnq_core = require("phnq_core");
	var fs = require("fs");
	var _path = require("path");
	var Widget = require("./widget");
	var _ = require("underscore");
	var config = require("./config");
	var crypto = require("crypto");
	var less = require("less");

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
			this.lessFiles = null;
			this.aggScriptCache = {};
			this.aggStyleCache = {};
		},

		getIndex: function()
		{
			// TODO: may want to cache this somehow.
			return _.keys(this.widgets).sort();
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

		/*
		*	This method operates asynchronously if a callback function is
		*	specified, otherwise it returns the widget synchronously, but
		*	forgoes the scan.
		*/
		getWidget: function(type)
		{
			this.scan();
			return this.widgets[type];
		},

		processScript: function(script)
		{
			log.debug("Processing script... (this should not get called very often -- result should be cached)");
			if(config.compressJS)
			{
				log.startTimer();
				var len1 = script.length;
				var jsp = require("uglify-js").parser;
				var pro = require("uglify-js").uglify;

				var ast = jsp.parse(script); // parse code and get the initial AST
				ast = pro.ast_mangle(ast); // get a new AST with mangled names
				ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
				script = pro.gen_code(ast); // compressed code here

				var len2 = script.length;
				var percentReduc = Math.round(1000*(len1-len2)/len1)/10;

				log.debug("Compressing script: "+len1+"bytes to "+len2+" bytes ("+percentReduc+"%)");
			}
			log.debug("Done processing script.");
			return script;
		},

		processStyle: function(style)
		{
			log.debug("Processing style... (this should not get called very often -- result should be cached)");

			log.startTimer();

			var parser = new(less.Parser);
			parser.parse(style, function(err, tree)
			{
				if(err)
				{
					log.error("unable to less\'ify style: ", err.message);
				}
				else
				{
					style = tree.toCSS({ yuicompress: config.compressCSS });
				}
			});
			log.debug("Done processing style.");
			return style;
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
			var key = types.sort().join(",");
			var script = this.aggScriptCache[key];
			if(!script)
			{
				script = this.aggScriptCache[key] = this.processScript(this.getAggregate(types, "script"));
			}
			return script;
		},

		getAggregatedStyle: function(types)
		{
			var key = types.sort().join(",");
			var style = this.aggStyleCache[key];
			if(!style)
			{
				var buf = [];
				_.each(this.lessFiles, function(lessFile)
				{
					buf.push(fs.readFileSync(lessFile, "UTF-8"));
				});
				buf.push(this.getAggregate(types, "style"));
				style = this.aggStyleCache[key] = this.processStyle(buf.join(""));
			}
			return style;
		},

		getAggregate: function(types, format)
		{
			var buf = [];

			if(format == "style")
			{
				buf.push(".wph {visibility: hidden; width: 1px}\n");
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
			var aggDir = _path.join(module.exports.appRoot, "/agg/");
			if(fs.existsSync(aggDir))
			{
				var names = fs.readdirSync(aggDir);
				_.each(names, function(name)
				{
					var aggFilePath = _path.join(aggDir, name);
					log.debug("Clearing agg file: ", aggFilePath);
					fs.unlinkSync(aggFilePath);
				});
			}
		},

		createAggDir: function()
		{
			var aggDir = _path.join(module.exports.appRoot, "/agg/");

			if(!fs.existsSync(aggDir))
			{
				log.debug("Creating agg dir: ", aggDir);
				fs.mkdirSync(aggDir);
			}
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
			var path = _path.join(module.exports.appRoot, "/agg/"+this.getAggregatedScriptName(types)+".js");
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
			var path = _path.join((module.exports.appRoot), "/agg/"+this.getAggregatedStyleName(types)+".css");
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
			this.lessFiles = [];
			this.aggScriptCache = {};
			this.aggStyleCache = {};

			var paths = this.scanPaths.slice(0).reverse();
			paths.push(_path.join(__dirname, "../widgets"));
			paths = _.uniq(paths); // in case we're running app.js in this package

			_.each(_.uniq(paths), function(path)
			{
				_this.addWidgetsAtPath(path);
			});
		},

		addWidgetsAtPath: function(path)
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
					if(name != "i18n" && name != "static")
					{
						_this.addWidgetsAtPath(f);
					}
				}
				else
				{
					if(name.match(/.*\.less$/))
					{
						_this.lessFiles.push(f);
					}
					else
					{
						var m = /[^\.]*\.(ejs|js|css)/.exec(name.replace(/\.html$/, ".html.ejs"));
						if(m)
						{
							_this.watch(f);

							var filename = _path.basename(f);

							var ext = m[1];
							var type = _path.basename(_path.dirname(f));
							var widget = _this.widgets[type] || (_this.widgets[type] = new Widget(_path.dirname(f)));
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
