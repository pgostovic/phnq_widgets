phnq_log.exec("widgets", function(log)
{
	var widgetClasses = {};

	window.phnq_widgets =
	{
		create: function(type, obj)
		{
			var widgetClass = widgetClasses[type] = phnq_core.clazz(obj || {});
			phnq_core.extend(widgetClass.prototype,
			{
				_ready: function()
				{
					if(this.ready)
						this.ready(this.get$$());
				},

				getElement: function()
				{
                	return this.elmntId ? document.getElementById(this.elmntId) : null;
				},

				"get$$": function()
				{
	                if(!this.$$)
	                {
	                    var _this = this;
	                    this.$$ = function(sel)
	                    {
	                        var widgetElmnt = _this.getElement();
	                        return $(sel||widgetElmnt, widgetElmnt);
	                    };
	                }
	                return this.$$;
				}
			});
		},

		scan: function()
		{
			var added = false;

			$(".wph").each(function()
			{
				added = true;
			});

			$(".widget").each(function()
			{
				added = true;
				var widgetElmnt = this;
				var type = $(widgetElmnt).attr("class").split(/\s+/).pop();

				$(widgetElmnt).removeClass("widget");

				var widgetClass = widgetClasses[type];
				if(widgetClass)
				{
					var widget = new widgetClass();
					widget.elmntId = $(widgetElmnt).attr("id");
					widget._ready();
				}
			});

			if(added)
				this.scan();
		}
	};

	$(function()
	{
		phnq_widgets.scan();
	});

	window.requireWidget = function()
	{
		// not needed on client...
	};
});
