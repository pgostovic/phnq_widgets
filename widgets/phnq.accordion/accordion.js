(function($)
{
	var animTime = 200;

	$.fn.accordion = function()
	{
		var accordElmnt = this;

		// hide all to begin
		$("h3", accordElmnt).each(function()
		{
			$(this).next().hide();
		});

		$("h3", accordElmnt).click(function()
		{
			var clickedH3 = this;

			$(clickedH3).addClass("selected");
			$(clickedH3).next().slideDown(animTime);

			$("h3", accordElmnt).each(function()
			{
				if(this != clickedH3)
				{
					$(this).removeClass("selected");
					$(this).next().slideUp(animTime);
				}
			});
		});

		$(accordElmnt).addClass("phnq.accordion");
	};
})(jQuery);