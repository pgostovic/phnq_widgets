phnq_log.exec("widgets", function(log)
{
	var widgetClasses = {};
	var widgetTmpltFns = {};
	var requestedTypes = {};
	var nextIdIdx = 0;

	window.phnq_widgets =
	{
		config: {}, // this gets filled in from the server

		widgetClasses: widgetClasses,

		create: function(type, obj)
		{
			obj.order = obj.order || 0;
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
				},

				find: function(type)
				{
					var found = [];
					this.get$$()(".winst").each(function()
					{
						var widgetObj = $(this).data("widget");
						if(widgetObj && widgetObj.type == type)
							found.push(widgetObj);
					});
					return found;
				},

				renderPartial: function(name, data)
				{
					var buf = [];
					var partialTmplt = this._partialTemplates[name];
					if(partialTmplt)
					{
						data = data instanceof Array ? data : [data];
						var partialFn = eval(partialTmplt);
						var dataLen = data.length;
						for(var i=0; i<dataLen; i++)
						{
							try
							{
								var ctx = phnq_core.extend(new phnq_widgets.Context({}), data[i]);
								buf.push(partialFn(ctx, ctx));
							}
							catch(ex)
							{
								log.error("Error rendering partial '"+name+"' for data ", data[i], " -- ", ex.message, ex);
							}
						}
					}
					else
					{
						throw "No partial named '"+name+"' in "+this.type;
					}
					return buf.join("");
				}
			});

			if(obj._remoteMethodNames.length > 0)
			{
				var ctx = window;
				$(type.split(".")).each(function()
				{
					ctx[this] = ctx[this] || {};
					ctx = ctx[this];
				});

				$(obj._remoteMethodNames).each(function()
				{
					var mName = this;
					ctx[mName] = function()
					{
						var httpMethod = mName.substring(0, 3).toUpperCase();
						var cmdName = mName.substring(3);

						if(httpMethod != "GET" && httpMethod != "POST")
						{
							cmdName = mName;
							httpMethod = "POST";
						}

						var url = phnq_widgets.config.uriPrefix + "/" + type + "/remote/" + cmdName;
						var args = [];

						for(var i=0; i<arguments.length; i++)
						{
							args.push(arguments[i]);
						}

						var fn = args.pop();
						if(typeof(fn) != "function")
						{
							args.push(fn);
							fn = function(){};
						}

						var data = {};
						if(httpMethod == "POST")
						{
							data = JSON.stringify(args);
						}
						else if(httpMethod == "GET")
						{
							for(var i=0; i<args.length; i++)
							{
								args[i] = escape(args[i]);
							}
							url += ("/" + args.join("/"));
						}

				        $.ajax(
				        {
				            url: url,
				            type: httpMethod,
				            data: data,
				            dataType: "json",
				            contentType: "application/json; charset=utf-8"
				        }).success(function(resp, status, xhr)
				        {
				            fn(resp, xhr);
				        }).error(function(resp, status, xhr)
				        {
				            errorFn(resp, xhr);
				        });
					};
				});
			}
		},

		scan: function(/* options, fn, newlyAdded */)
		{
			var options, fn, newlyAdded;
			for(var i=0; i<arguments.length; i++)
			{
				var arg = arguments[i];
				if(typeof(arg) == "function")
					fn = arg;
				else if(arg instanceof Array)
					newlyAdded = arg;
				else if(typeof(arg) == "object")
					options = arg;
			}

			var _this = this;
			var added = false;
			var toLoad = {};

			options = options || {};

			newlyAdded = newlyAdded || [];

			// Turn widget placeholders into widgets (markup only), or if no
			// markup available, add type to a list of types to load.
			$(options.wphSelector || ".wph:visible").each(function()
			{
				added = true;
				var wphElmnt = this;
				var type = $(wphElmnt).attr("class").split(/\s+/).pop();
				var tmpltFn = widgetTmpltFns[type];
				if(tmpltFn)
				{
					var paramsMatcher = /<!--(.*)?-->/.exec($(wphElmnt).html());
					var params = paramsMatcher ? JSON.parse(paramsMatcher[1]) : {};
					var context = new phnq_widgets.Context(params);
					context.type = type;

					var markup = tmpltFn(context);

					// Extract the id from the markup, and bind it to the wph.
					// This makes it possible to find the resulting widget
					// given only the wph.
					var m = /^\<\w+\s+.*\s+id="(\w+)"[\s>]/.exec(markup);
					if(m)
						$(wphElmnt).attr("data-wid", m[1]);

                    $(wphElmnt).replaceWith(markup);
				}
				else
				{
					if(requestedTypes[type])
					{
	                    $(wphElmnt).replaceWith("<span class='loadError'>Error: "+type+"</span>");
					}
					else
					{
						toLoad[type] = true;
					}
				}
			});

			// Widgets that have had their markup inserted, but not yet bound to
			// a widget object are tagged with the "widget" class. Bind these
			// elements to corresponding widget instances.
			$(".widget").each(function()
			{
				added = true;
				var widgetElmnt = this;
				var type = $(widgetElmnt).attr("class").split(/\s+/).pop();

				$(widgetElmnt).removeClass("widget");
				$(widgetElmnt).addClass("winst");

				var widgetClass = widgetClasses[type];
				if(widgetClass)
				{
					var widget = new widgetClass();
					widget.type = type;
					widget.elmntId = $(widgetElmnt).attr("id");
					$(widgetElmnt).data("widget", widget);
					newlyAdded.push(widget);

					widget.params = JSON.parse($(widgetElmnt).attr("data-p"));
				}
			});

			// make an array of types to load...
			var toLoadArr = [];
			for(var type in toLoad)
			{
				toLoadArr.push(type);
			}

			// Load any widgets that need loading. If any widgets were added
			// above, or if any widgets needed loading then re-scan.
			this.load(toLoadArr, function()
			{
				if(added || toLoadArr.length > 0)
				{
					_this.scan(fn, newlyAdded, options);
				}
				else
				{
					if(options.delayLifecycle && fn)
						fn();

					// Widgets get added to the "newlyAdded" array from the top
					// of the DOM down. It is better if descendent widgets get
					// their ready() function called before their ancestors, so
					// reverse newlyAdded.
					newlyAdded.reverse();

					newlyAdded.sort(function(w1, w2)
					{
						if(w1.order < w2.order)
							return -1;
						else if(w1.order > w2.order)
							return 1;
						else
							return 0;
					});

					$(newlyAdded).each(function()
					{
						this._ready();
					});

					if(!options.delayLifecycle && fn)
						fn();
				}
			});
		},

		// Load required widgets.  It is possible for widgets to have been partially
		// loaded. Widgets that are loaded as part of the initial page load will not
		// have markup templates available. So, the types to be loaded are sorted
		// into two lists: 1) needing template only, and 2) needing full load.
		load: function(types, fn)
		{
			if(types.length == 0)
				return fn();

			var allTypes = [];
			for(var type in widgetClasses)
			{
				allTypes.push(type);
			}
			for(var type in widgetTmpltFns)
			{
				allTypes.push(type);
			}

			var classesOnly = [];
			var fullyLoaded = [];
			for(var i=0; i<allTypes.length; i++)
			{
				var type = allTypes[i];
				if(widgetTmpltFns[type])
					fullyLoaded.push(type);
				else
					classesOnly.push(type);
			}

			// TODO: Make this absolute to allow cross-domain loading...
            $.getJSON(phnq_widgets.config.uriPrefix+"/load?jsoncallback=?",
            {
            	t: types.join(","), // types to load
                co: classesOnly.join(","), // currently loaded (classes only)
                fl: fullyLoaded.join(",") // currently loaded (fully)
            }, function(res)
            {
            	// add templates
            	for(var type in res.templates)
            	{
            		widgetTmpltFns[type] = eval(res.templates[type]);
            	}

            	// Add CSS to page
            	var style = res.styles.join("");
            	if(style)
	        		$("head").append("<style type='text/css'>"+style+"</style>");

            	// Evaluate scripts
            	var script = res.scripts.join("");
            	if(script)
            		eval(script);

                fn();
            });
		}
	};

	$(function()
	{
		phnq_widgets.scan();
	});

	window.depend = function()
	{
		// not needed on client...
	};

	window.require = function()
	{
		// not needed on client...
	};

	(function($)
	{
		var methods =
		{
			scan: function(fn)
			{
				phnq_widgets.scan.apply(phnq_widgets, arguments);
			},

			wph: function(type, params)
			{
				return "<span class=\"wph "+type+"\"><!--"+JSON.stringify(params||{})+"--><br/></span>";
			},

			boundObject: function()
			{
				var objs = [];
				$(this).each(function()
				{
					var wObj = $(this).data("widget");
					if(wObj)
					{
						objs.push(wObj);
					}
					else // if this is a wph, might be able to get the widget still
					{
						var wid = $(this).attr("data-wid");
						wObj = $("#"+wid).first().data("widget");
						if(wObj)
							objs.push(wObj);
					}
				});
				return objs;
			}
		};

		$.fn.widgets = function(method)
		{
			if( methods[method])
			{
				return methods[method].apply( this, Array.prototype.slice.call(arguments, 1));
			}
			else if (typeof method === 'object' || ! method)
			{
				return methods.init.apply(this, arguments);
			}
			else
			{
				$.error('Method ' +  method + ' does not exist on jQuery.widgets');
			}    
		};
	})(jQuery);
});
