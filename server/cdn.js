var config = require("./config");
var _ = require("underscore");

module.exports =
{
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
	}
};
