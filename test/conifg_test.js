require("phnq_log").setLevel("none");
var phnq_widgets = require("../server/phnq_widgets");
var widget_manager = require("../server/widget_manager");
var assert = require("assert");

describe("Config Test", function()
{
	describe("Per-widget config override", function()
	{
		it("should allow config override with config.json file", function()
		{
			var configTestWidget = widget_manager.instance().getWidget("test.config");
			assert.equal(false, configTestWidget.config.wrapScript);
		});
	});
});
