var widget =
{
    order: -1,

    ready: function($$)
    {
        $$("> .cards").show();

        this.keys = this.params.keys;

        if(this.keys)
        {
            this.keyLookup = {};
            for(var i=0; i<this.keys.length; i++)
            {
                this.keyLookup[this.keys[i]] = i;
            }
        }

        this.show(-1);
    },

    show: function(idx)
    {
        if(typeof(idx) == "string" && this.keys)
            idx = this.keyLookup[idx];

        var hidden = [];
        var shown = [];

        var args = [];
        for(var i=1; i<arguments.length; i++)
        {
            args.push(arguments[i]);
        }

        var foundCard = false;

        this.get$$()("> .cards > *").each(function(i)
        {
            if(i == idx)
            {
                $(this).show();
                shown.push(this);
                foundCard = true;
            }
            else
            {
                $(this).hide();
                hidden.push(this);
            }
        });

        phnq_widgets.scan(function()
        {
            $(hidden).each(function()
            {
                var bos = $(this).widgets("boundObject");
                if(bos.length == 1 && typeof(bos[0].hide) == "function")
                    bos[0].hide();
            });

            $(shown).each(function()
            {
                var bos = $(this).widgets("boundObject");
                if(bos.length == 1 && typeof(bos[0].show) == "function")
                    bos[0].show.apply(bos[0], args);
            });
        });

        return foundCard;
    }
};
