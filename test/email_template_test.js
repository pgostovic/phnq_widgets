require("phnq_log").setLevel("none");
var phnq_widgets = require("../server/phnq_widgets");
var assert = require("assert");

describe("Email template", function()
{
	describe("Bubba", function()
	{
		it("should bla", function(done)
		{
			phnq_widgets.renderWidgetAsEmail("test.email_template", {cheese:"Oka"}, "en", function(subject, body)
			{
				// console.log("subject: ", subject);
				// console.log("body: ", body);
				assert.equal("one", "one");
				done();
			});
		});
	});
});
