(function($)
{
	var animTime = 200;

	$.fn.accordion = function(options)
	{
		options = options || {};
		if(options.expand)
			accordianExpand(options.expand);
		else
			accordionInit(this);
	};

	var accordionInit = function(accordElmnt)
	{
		// hide all to begin
		$("h3", accordElmnt).each(function()
		{
			$(this).next().hide();
		});

		$("h3", accordElmnt).click(function()
		{
			accordianExpand(this);
		});

		$(accordElmnt).addClass("phnq.accordion");
	};

	var accordianExpand = function(elmnt)
	{
		$(elmnt).addClass("selected");
		$(elmnt).next().slideDown(animTime);

		$(elmnt).closest(".phnq\\.accordion").find("h3").each(function()
		{
			if(this != elmnt)
			{
				$(this).removeClass("selected");
				$(this).next().slideUp(animTime);
			}
		});
	};
})(jQuery);
