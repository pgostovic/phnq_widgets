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
	
	it("should correctly insert localized text in a partial rendered on the client", function()
	{
		assert.equal(browser.text("h1.item"), "Nom: Bubba");
	});
	
	it("should correctly insert parameterized localized text programmatically on the client", function()
	{
		assert.equal(browser.text("h1.greeting"), "Bonjour Gump, Bubba.");
	});
});
