var assert = require("assert");
var path = require("path");
var phnq_widgets = require("../server/phnq_widgets");
var Browser = require("zombie");
var phnq_log = require("phnq_log");

describe("phnq_widgets", function()
{
	before(function()
	{
		phnq_widgets.start({port:7777, appRoot:__dirname});
	});

	describe("stuff", function()
	{
		it("should load HelloWorld", function(done)
		{
			var browser = new Browser();

			browser.visit("http://localhost:7777/widgets/HelloWorld", function ()
			{
				assert.equal(true, !!browser.query("body[class~=\"HelloWorld\"]"), "Body element with HelloWorld class");
				done();
			});
		});
	});
});
