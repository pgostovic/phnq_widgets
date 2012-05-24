var widget =
{
    ready: function($$)
    {
        this.show(0);
    },

    show: function(idx)
    {
        this.get$$()("> *").each(function(i)
        {
            if(i == idx)
                $(this).show();
            else
                $(this).hide();
        });
    }
};
