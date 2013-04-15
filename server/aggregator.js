var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var phnq_core = require("phnq_core");
var config = require("./config");
var cdn = require("./cdn");
var less = require("less");
var zlib = require("zlib");
var _ = require("underscore");
var log = require("phnq_log").create(__filename);

var strings = {};
var files = [];
var nameCache = {};

var stringKeys = null;
var getStringKeys = function()
{
	if(!stringKeys)
	{
		stringKeys = _.keys(strings).sort();
	}
	return stringKeys;
};

module.exports =
{
	getClientBoot: function(refresh)
	{
		return getClientBoot(refresh);
	},

	newStyleAggregator: function(name)
	{
		return new StyleAggregator(name);
	},

	newScriptAggregator: function(name)
	{
		return new ScriptAggregator(name);
	},

	registerFile: function(file, fn)
	{
		var _this = this;
		fs.readFile(file, "UTF-8", function(err, data)
		{
			_this.registerString(file, data);
			files.push(file);
			fn();
		});
	},

	registerFileSync: function(file)
	{
		this.registerString(file, fs.readFileSync(file, "UTF-8"));
		files.push(file);
	},

	registerString: function(key, str)
	{
		strings[key] = str;
	},

	clear: function()
	{
		nameCache = {};
		strings = _.pick(strings, files);
		stringKeys = null;
	},

	pruneAggDir: function()
	{
		var aggDir = path.join(require("./phnq_widgets").appRoot, "static", "agg");

		if(fs.existsSync(aggDir))
		{
			var names = fs.readdirSync(aggDir);
			var atimes = {};
			_.each(names, function(name)
			{
				var stat = fs.statSync(path.join(aggDir, name));
				atimes[name] = stat.atime;
			});

			// Sort by last access time, most to least recent...
			names.sort(function(n1, n2)
			{
				var a1 = atimes[n1];
				var a2 = atimes[n2];

				if(a1 == a2)
					return 0;
				else if(a1 < a2)
					return 1;
				else
					return -1;
			});

			// Get all but the 20 most recently accessed...
			var toRm = names.splice(20);

			_.each(toRm, function(name)
			{
				var aggFilePath = path.join(aggDir, name);
				log.debug("Clearing agg file: ", aggFilePath, atimes[name]);
				fs.unlinkSync(aggFilePath);
			});
		}
	}
};

var createStaticDir = function(fn)
{
	var dir = path.join(require("./phnq_widgets").appRoot, "static");

	fs.exists(dir, function(exists)
	{
		if(exists)
			return fn();

		fs.mkdir(dir, function(err)
		{
			if(err) throw err;
			fn();
		});
	});
};

var createAggDir = function(fn)
{
	createStaticDir(function()
	{
		var aggDir = path.join(require("./phnq_widgets").appRoot, "static/agg");

		fs.exists(aggDir, function(exists)
		{
			if(exists)
				return fn();

			fs.mkdir(aggDir, function(err)
			{
				if(err) throw err;
				fn();
			});
		});
	});
};

var Aggregator = phnq_core.clazz(
{
	init: function(ext, name)
	{
		this.ext = ext;
		this.compKeys = [];
		this.name = null;
		this.aggStr = null;

		if(name)
		{
			require("./widget_manager").instance().scan();
			var comps = name.split("_");
			comps.pop();
			var bitset = new phnq_core.BitSet(comps);
			var keys = getStringKeys();
			for(var i=0; i<keys.length; i++)
			{
				if(bitset.isSet(i))
				{
					this.compKeys.push(keys[i]);
				}
			}
			var nameCheck = this.getName();
			if(name != nameCheck)
				throw "Aggregate checksum failed: "+nameCheck+"."+ext+" != "+name+"."+ext;
		}
	},

	append: function(key)
	{
		if(strings[key])
		{
			this.compKeys.push(key);
			this.name = null;
			this.aggStr = null;
		}
	},

	getName: function()
	{
		if(!this.name)
		{
			var sortedKeys = phnq_core.clone(this.compKeys).sort();
			var bitset = new phnq_core.BitSet();
			var keys = getStringKeys();
			_.each(sortedKeys, function(key)
			{
				bitset.set(_.indexOf(keys, key));
			});

			var bitsetArr = bitset.toArray().join("_");

			if(!(this.name = nameCache[bitsetArr]))
			{
				var hash = crypto.createHash("md5");
				hash.update(this.getAggregate(), "UTF-8");
				this.name = nameCache[bitsetArr] = bitsetArr + "_" + hash.digest("hex");
			}
		}
		return this.name;
	},

	getAggregate: function()
	{
		if(!this.aggStr)
		{
			var buf = [];
			_.each(this.compKeys, function(key)
			{
				buf.push(strings[key]);
			});
			this.aggStr = this.process(buf.join(""));
		}
		return this.aggStr;
	},

	generate: function(fn)
	{
		var _this = this;

		var file = path.join(require("./phnq_widgets").appRoot, "static", "agg", this.getName()+"."+this.ext);

		var ensureExists = function(fn2)
		{
			createAggDir(function()
			{
				fs.exists(file, function(exists)
				{
					if(exists)
						return fn2();

					log.startTimer();

					var agg = _this.getAggregate();

					fs.writeFile(file, agg, "UTF-8", function(err)
					{
						if(err)
							throw err;

						log.debug("generated aggregate: ", path.relative(require("./phnq_widgets").appRoot, file));

						fn2();
					});
				});
			});
		};

		ensureExists(function()
		{
			if(_this.shouldCompress())
			{
				var gzipFile = file + ".gz";
				fs.exists(gzipFile, function(exists)
				{
					if(exists)
						return fn();

					log.startTimer();

					var gzip = zlib.createGzip();
					var inp = fs.createReadStream(file);
					var out = fs.createWriteStream(gzipFile);
					out.on("close", function()
					{
						fs.stat(file, function(err, stat)
						{
							fs.stat(gzipFile, function(err, gzipStat)
							{
								var percReduc = Math.round(1000*(stat.size-gzipStat.size)/stat.size)/10;
								log.debug("gzip'd "+stat.size+"->"+gzipStat.size+" bytes ("+percReduc+"% reduction): ", path.relative(require("./phnq_widgets").appRoot, gzipFile));
								fn();
							});
						});
					});
					inp.pipe(gzip).pipe(out);
				});
			}
			else
			{
				fn();
			}
		});
	}
});

var ScriptAggregator = Aggregator.extend(
{
	init: function(name)
	{
		this._init("js", name);
	},

	shouldCompress: function()
	{
		return config.compressJS;
	},

	process: function(script)
	{
		if(config.minifyJS)
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

			log.debug("minified script: "+len1+"->"+len2+" bytes ("+percentReduc+"%)");
		}

		return script;
	}
});

var StyleAggregator = Aggregator.extend(
{
	init: function(name)
	{
		this._init("css", name);
	},

	shouldCompress: function()
	{
		return config.compressCSS;
	},

	process: function(style)
	{
		var origStyle = style;
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
				style = tree.toCSS({ yuicompress: config.minifyCSS });
			}
		});

		if(config.minifyCSS)
		{
			var len1 = origStyle.length;
			var len2 = style.length;
			var percentReduc = Math.round(1000*(len1-len2)/len1)/10;
			log.debug("less\'ified and minified style: "+len1+"->"+len2+" bytes ("+percentReduc+"%)");
		}
		else
		{
			log.debug("less\'ified style");
		}
		return style;
	}
});

var clientBoot = null;
var getClientBoot = function(refresh)
{
	if(clientBoot && !refresh)
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
		bootFiles.splice(0, 0, "../client/jquery-"+config.jQueryVersion+".js");

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
			filename = path.resolve(__dirname, bootFiles[i]);
		}
		if(filename)
			buf.push(fs.readFileSync(filename, "UTF-8"));
	}

	buf.push("phnq_widgets.config = ");
	buf.push(JSON.stringify(require("./phnq_widgets").config));
	buf.push(";");

	return clientBoot = buf.join("");
};
