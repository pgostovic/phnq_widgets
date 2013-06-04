require("ext.hashchange");

phnq.routes = function(routes)
{
	$(window).hashchange(function()
	{
		if(!routes)
			return;

		var pathMatcher = /\#\!?(\/?)(.*)/.exec(location.hash);
		if(pathMatcher)
		{
			var matched = false;
			var path = pathMatcher[1] + pathMatcher[2];
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
					matched = true;
					break;
				}
			}
			if(!matched && typeof(routes["default"]) == "function")
				routes["default"].apply(this, [path]);
		}
		else
		{
			if(typeof(routes["default"]) == "function")
				routes["default"].apply(this, [""]);
		}
	});
	$(window).hashchange();
};
