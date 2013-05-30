var assert = require("assert");

describe("Client-side config test", function()
{
	beforeEach(function(done)
	{
		browser.reload(function()
		{
			done();
		});
	});

	describe("Setting wrapScript to false", function()
	{
		it("should create a global scope variable", function()
		{
			assert.equal("Globular", browser.evaluate('SHOULD_BE_GLOBAL_SCOPE'));
		});
	});
});
