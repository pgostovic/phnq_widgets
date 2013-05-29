require("phnq.routes");

var widget =
{
	ready: function($$)
	{
		phnq.routes(
		{
			"default": function(path)
			{
				$$().text("DEFAULT");
			},
			"/path": function()
			{
				$$().text("SLASHPATH");
			},
			"/path/(.+)": function(key)
			{
				$$().text("SLASHPATH/"+key);
			}
		});
	}
};
