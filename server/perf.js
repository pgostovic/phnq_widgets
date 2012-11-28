var log = require("phnq_log").create(__filename);

var startTimeMillis = new Date().getTime();

module.exports =
{
	getUptimeMillis: function()
	{
		return new Date().getTime() - startTimeMillis;
	}
};
