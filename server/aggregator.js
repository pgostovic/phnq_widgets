var fs = require("fs");
var _path = require("path");
var widgetManager = require("./widgetManager").instance();
var appRoot = _path.dirname(process.argv[1]);
var log = require("phnq_log").create(__filename);
var _ = require("underscore");
var phnq_core = require("phnq_core");

module.exports =
{
	createAggDir: function(fn)
	{
		var aggDir = _path.join(appRoot, "/agg/");

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
	},

	clearAggDir: function()
	{
		var aggDir = _path.join(appRoot, "/agg/");
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

	getAggScriptForTypes: function(types)
	{

	},

	Aggregator: phnq_core.clazz(
	{
		init: function(ext)
		{
			this.ext = ext;
			this.comps = [];

			if(this.ext == "css")
			{
				this.comps.push(".wph {visibility: hidden; width: 1px}\n");
				this.comps.push(".loadError { padding: 5px; margin: 5px; background: #c00; color: #fff; }\n");
			}
		},

		append: function(str)
		{
			this.comps.push(str);
		},

		getName: function()
		{
			
		}
	});
};
