var assert = require("assert");

describe("Deck with h1 elements", function()
{
	beforeEach(function(done)
	{
		browser.reload(function()
		{
			done();
		});
	});

	describe("No selection", function()
	{
		it("should not have any visible h1's to begin", function()
		{
			assert.equal(0, browser.evaluate('$("h1:visible")').length);
		});
	});

	describe("Selecting by index", function()
	{
		it("should show h1.one when button.one is pressed", function(done)
		{
			browser.pressButton("button.one", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});

		it("should show h1.two when button.two is pressed", function(done)
		{
			browser.pressButton("button.two", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});

		it("should show h1.three when button.three is pressed", function(done)
		{
			browser.pressButton("button.three", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});
	});

	describe("Selecting by key", function()
	{
		it("should show h1.one when button.a is pressed", function(done)
		{
			browser.pressButton("button.a", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});

		it("should show h1.two when button.b is pressed", function(done)
		{
			browser.pressButton("button.b", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});

		it("should show h1.three when button.c is pressed", function(done)
		{
			browser.pressButton("button.c", function()
			{
				assert.equal(1, browser.evaluate('$("h1:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.one:visible")').length);
				assert.equal(0, browser.evaluate('$("h1.two:visible")').length);
				assert.equal(1, browser.evaluate('$("h1.three:visible")').length);
				done();
			});
		});
	});
});
