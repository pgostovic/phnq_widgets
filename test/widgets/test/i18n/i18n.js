var widget =
{
	ready: function($$)
	{
		$$(".items").html(this.renderPartial("item", {itemName:"Bubba"}));
	}
};
