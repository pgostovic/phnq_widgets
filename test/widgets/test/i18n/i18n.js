var widget =
{
	ready: function($$)
	{
		$$(".items").html(this.renderPartial("item", {itemName:"Bubba"}));
		
		$$(".greeting").text(this.i18n("greeting", {firstName:"Bubba", lastName:"Gump"}));
	}
};
