var widget =
{
    ready: function($$)
    {
        this.elements = $$("> *");
        this.show(0);
    },

    show: function(idx)
    {
        for(var i=0; i<this.elements.length; i++)
        {
            if(i == idx)
                $(this.elements[i]).show();
            else
                $(this.elements[i]).hide();
        }
    }
};
