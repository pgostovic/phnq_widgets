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

	it("should correctly insert localized text in a partial rendered on the client", function()
	{
		assert.equal(browser.text("h1.item"), "Name: Bubba");
	});

	it("should correctly insert parameterized localized text programmatically on the client", function()
	{
		assert.equal(browser.text("h1.greeting"), "Hello Bubba Gump.");
	});
});
