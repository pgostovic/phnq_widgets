var assert = require("assert");

describe("Tests with language set to French", function()
{
	before(function()
	{
		browserOptions.headers =
		{
			"accept-language": "fr"
		};
	});

	it("should display 'Bonjour Monde!' for the key 'helloworld'.", function()
	{
		assert.equal(browser.text("h1.helloworld"), "Bonjour Monde!");
	});

	it("should display the missing string message for the key 'nothing'.", function()
	{
		var str = browser.text("h1.nothing");
		assert(str.match(/^\[MISSING_STRING\(/));
	});
});
