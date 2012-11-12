var assert = require("assert");

describe("hashroutes", function()
{
	beforeEach(function(done)
	{
		browser.reload(function()
		{
			done();
		});
	});

	it("should display SLASHPATH when location.hash is set to #!/path", function(done)
	{
		browser.location = "#!/path";
		browser.wait(function()
		{
			assert.equal("SLASHPATH", browser.text("div"));
			done();
		});
	});

	it("should display SLASHPATH/foo when location.hash is set to #!/path/foo", function(done)
	{
		browser.location = "#!/path/foo";
		browser.wait(function()
		{
			assert.equal("SLASHPATH/foo", browser.text("div"));
			done();
		});
	});

	it("should display DEFAULT when location.hash is set to #!/abcdefghijk", function(done)
	{
		browser.location = "#!/abcdefghijk";
		browser.wait(function()
		{
			assert.equal("DEFAULT", browser.text("div"));
			done();
		});
	});
});
