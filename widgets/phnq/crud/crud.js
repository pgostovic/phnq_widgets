require("phnq.net");

phnq.crud.CrudService = phnq_core.clazz(
{
	init: function(options)
	{
		this.baseUrl = fixBaseUrl(options.baseUrl);
		
		if(options.create)
			this.create = options.create;

		if(options.read)
			this.read = options.read;

		if(options.update)
			this.update = options.update;

		if(options.delete)
			this.delete = options.delete;

		if(options.list)
			this.delete = options.list;
	},
	
	create: function(obj, fn)
	{
		fn();
	},
	
	read: function(id, fn)
	{
		var url = this.baseUrl + id;
		
		console.log("YOYO");	
		fn();
	},
	
	update: function(id, obj, fn)
	{
		fn();
	},
	
	delete: function(id, fn)
	{
		fn();
	},
	
	list: function(fn)
	{
		fn();
	}
});

var fixBaseUrl = function(baseUrl)
{
	baseUrl = (baseUrl||"").trim();
	if(!baseUrl.match(/\/$/))
		baseUrl = baseUrl + "/";
	
	return baseUrl;	
};
