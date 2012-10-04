depend("ext.hashchange");

window.phnq = window.phnq || {};

var routes = null;

phnq.hashroutes =
{
	set: function(_routes)
	{
		routes = _routes;
		$(window).hashchange();
	}
};

$(window).hashchange(function()
{
	if(!routes)
		return;

	var pathMatcher = /\#\!(.*)/.exec(location.hash);
	if(pathMatcher)
	{
		var path = pathMatcher[1];
		for(var route in routes)
		{
			var m = new RegExp("^"+route+"$").exec(path);
			if(m)
			{
				var args = [];
				for(var i=1; i<m.length; i++)
				{
					args.push(m[i]);
				}
				routes[route].apply(this, args);
				return;
			}
		}
		if(typeof(routes["default"]) == "function")
			routes["default"].apply(this, [path]);
	}
	else
	{
		if(typeof(routes["default"]) == "function")
			routes["default"].apply(this, [""]);
	}
});
