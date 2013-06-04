var assert = require("assert");

describe("Multiple JS File test", function()
{
	beforeEach(function(done)
	{
		browser.reload(function()
		{
			done();
		});
	});

	describe("Multiple JS files in a single widget", function()
	{
		it("All JS files should exists", function()
		{
			assert.equal("js1", browser.evaluate('test.multijs.js1.name'));
			assert.equal("js2", browser.evaluate('test.multijs.js2.name'));
			assert.equal("js3", browser.evaluate('test.multijs.js3.name'));
		});
	});
});
