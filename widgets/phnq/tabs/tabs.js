require("phnq.deck");

var widget =
{
	ready: function($$)
	{
		var _this = this;

		this.deck = this.find("phnq.deck")[0];
		this.show(0);

		$$(".tabs > label").each(function(idx)
		{
			$(this).click(function()
			{
				_this.show(idx)
			});
		});
	},

	show: function(idx)
	{
        if(typeof(idx) == "string" && this.deck.keys)
            idx = this.deck.keyLookup[idx];

		var $$ = this.get$$();
		$$(".tabs > label").removeClass("active");

		$$(".tabs > label:nth-child("+(idx+1)+")").addClass("active");

		this.deck.show(idx);
	}
};
