var widget =
{
    order: -1,

    ready: function($$)
    {
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

        this.get$$()("> *").each(function(i)
        {
            if(i == idx)
                $(this).show();
            else
                $(this).hide();
        });
    }
};
