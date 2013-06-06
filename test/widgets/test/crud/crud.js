require("phnq.crud");

var widget =
{
	ready: function($$)
	{
	}
};

test.crud.Bubba = new phnq.crud.CrudService(
{
	baseUrl: "the_base"
});

test.crud.Bubba.read("123", function(obj)
{
	
});