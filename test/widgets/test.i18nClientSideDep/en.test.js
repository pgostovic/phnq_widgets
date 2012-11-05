var assert = require("assert");

describe("Tests with language set to English", function()
{
	before(function()
	{
		browserOptions.headers =
		{
			"accept-language": "en"
		};
	});

	it("should display 'Hello World!' for the key 'helloworld'", function()
	{
		assert.equal(browser.text("h1.helloworld"), "Hello World!");
	});

	it("should display the missing string message for the key 'nothing'", function()
	{
		var str = browser.text("h1.nothing");
		assert(str.match(/^\[MISSING_STRING\(/));
	});
});
