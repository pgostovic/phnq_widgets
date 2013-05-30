var assert = require("assert");

describe("Set the html document title", function()
{
	beforeEach(function(done)
	{
		browser.reload(function()
		{
			done();
		});
	});

	describe("Setting the html document title from the root widget", function()
	{
		it("should set the page title", function()
		{
			var title = browser.text("title");
			
			assert.equal("The title that I set", title);
		});
	});
});
