var config = require("./config");
var _ = require("underscore");
var path = require("path");
var fs = require("fs");
var log = require("phnq_log").create(__filename);

module.exports =
{
	needsSync: false,

	getCDN: function()
	{
		if(config.cdn)
		{
			var cdns = _.keys(config.cdn);
			if(cdns.length == 1)
				return require("./cdnImpl/"+cdns[0]);
			else
				throw "Exactlyt one CDN must be configured.";
		}
		else
		{
			return null;
		}
	},

	sync: function(fn)
	{
		var cdn = this.getCDN();
		if(!cdn)
			return fn();

		if(!this.needsSync)
			return fn();

		var _this = this;

		var appStaticDir = path.join(require("./phnq_widgets").appRoot, "static");

		var staticRoots = [{base:appStaticDir, prefix:""}];

		_.each(require("./widget_manager").instance().widgets, function(widget, type)
		{
			staticRoots.push({base:path.join(widget.dir, "_static"), prefix:"widgets/"+type+"/static/"});
		});

		var syncNext = function()
		{
			var staticRoot = staticRoots.pop();
			if(!staticRoot)
			{
				_this.needsSync = false;
				return fn();
			}

			fs.exists(staticRoot.base, function(exists)
			{
				if(exists)
				{
					syncTree(staticRoot.base, staticRoot.base, staticRoot.prefix, function()
					{
						syncNext();
					});
				}
				else
				{
					syncNext();
				}
			});
		};
		syncNext();
	}
};

var syncTree = function(folder, base, prefix, fn)
{
	fs.readdir(folder, function(err, names)
	{
		var next = function()
		{
			var name = names.pop();
			if(!name)
				return fn();

			if(name.match(/^\./))
				return next();

			var f = path.join(folder, name);
			fs.stat(f, function(err, stat)
			{
				if(stat.isDirectory())
				{
					syncTree(f, base, prefix, function()
					{
						next();
					});
				}
				else
				{
					var objName = prefix+path.relative(base, f);

					fs.readFile(f, function(err, data)
					{
						var cdn = module.exports.getCDN();
						cdn.put(objName, data, function()
						{
							next();
						});
					});
				}
			});
		};
		next();
	});
};
