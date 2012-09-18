phnq_log.exec("context", function(log)
{
	var nextIdIdx = 0;

	phnq_widgets.Context = phnq_core.clazz(
	{
		init: function(params)
		{
			this.params = params;
			this.query = getQueryParams();
		},

		widget: function(type, params)
		{
			return $().widgets("wph", type, params);
		},

		nextId: function()
		{
			return phnq_widgets.config.idPrefixClient + (nextIdIdx++);
		},

		i18n: function(key)
		{
			var locale = navigator.language;
			return "[NOT FOUND]";
		}
	});
	
	var queryParams = null;
	var getQueryParams = function()
	{
		if(!queryParams)
		{
			queryParams = {};
			if(location.search.match(/^\?/))
			{
				$(location.search.substring(1).split("&")).each(function()
				{
					var nvp = this.split("=");
					if(nvp.length == 2)
						queryParams[nvp[0]] = unescape(nvp[1]);
				});
			}
		}
		return queryParams;
	};
});
