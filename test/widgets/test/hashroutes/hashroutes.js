depend("phnq.hashroutes");

var widget =
{
	ready: function($$)
	{
		phnq.hashroutes.set(
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
