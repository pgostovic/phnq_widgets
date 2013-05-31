var widget =
{
	ready: function($$)
	{
		var deck = this.findOne(/deck/);

		$$("button.one").click(function()
		{
			deck.show(0);
		});
		$$("button.two").click(function()
		{
			deck.show(1);
		});
		$$("button.three").click(function()
		{
			deck.show(2);
		});
		$$("button.a").click(function()
		{
			deck.show("a");
		});
		$$("button.b").click(function()
		{
			deck.show("b");
		});
		$$("button.c").click(function()
		{
			deck.show("c");
		});
	}
};
