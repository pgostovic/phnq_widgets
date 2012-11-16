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

	clearAggDir: function()
	{
		var aggDir = path.join(require("./phnq_widgets").appRoot, "/agg/");

		if(fs.existsSync(aggDir))
		{
			var names = fs.readdirSync(aggDir);
			_.each(names, function(name)
			{
				var aggFilePath = path.join(aggDir, name);
				log.debug("Clearing agg file: ", aggFilePath);
				fs.unlinkSync(aggFilePath);
			});
		}
	}
};

var createAggDir = function(fn)
{
	var aggDir = path.join(require("./phnq_widgets").appRoot, "/agg/");

	fs.exists(aggDir, function(exists)
	{
		if(exists)
			return fn();

		log.debug("Creating agg dir: ", aggDir);
		fs.mkdir(aggDir, function()
		{
			fn();
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
			if(this.compKeys)
				this.compKeys.sort();

			var bitset = new phnq_core.BitSet();
			var keys = getStringKeys();
			_.each(this.compKeys, function(key)
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

		var file = path.join(require("./phnq_widgets").appRoot, "agg", this.getName()+"."+this.ext);

		var ensureExists = function(fn2)
		{
			createAggDir(function()
			{
				fs.exists(file, function(exists)
				{
					if(exists)
						return fn2();

					var agg = _this.getAggregate();

					fs.writeFile(file, agg, "UTF-8", function(err)
					{
						if(err)
							throw err;

						if(cdn.getCDN())
						{
							cdn.getCDN().put(path.basename(file), agg, function()
							{
								fn2();
							});
						}
						else
						{
							fn2();
						}
					});
				});
			});
		};

		ensureExists(function()
		{
			if(_this.shouldCompress())
			{
				var gzipFile = file + ".gzip";
				fs.exists(gzipFile, function(exists)
				{
					if(exists)
						return fn();

					var gzip = zlib.createGzip();
					var inp = fs.createReadStream(file);
					var out = fs.createWriteStream(gzipFile);
					out.on("close", function()
					{
						// TODO CDN push...

						fn();
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
			log.debug("Minifying JS...");
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

			log.debug("Minified script: "+len1+"bytes to "+len2+" bytes ("+percentReduc+"%)");
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

		log.debug("Done processing style.");

		return style;
	}
});
