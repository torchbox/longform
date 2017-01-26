(function() {
    (function($) {
        return $.widget("IKS.footnotebutton", {
            options: {
                uuid: '',
                editable: null
            },
            populateToolbar: function(toolbar) {
                var button, widget;

                widget = this;

                button = $('<span></span>');
                button.hallobutton({
                    uuid: this.options.uuid,
                    editable: this.options.editable,
                    label: 'Footnote',
                    icon: 'icon-cogs',
                    command: null
                });
                toolbar.append(button);

                button.on("click", function(event) {
                    var lastSelection = widget.options.editable.getSelection();
                    var table = $('#footnotes-listing tbody');
                    table.empty();

                    $.each($("#id_footnotes-FORMS > li:not(.deleted)"), function( index, value ) {
                        var order = index + 1;
                        var text = $('.field-content textarea', value).val();
                        var row = $('<tr><td>'+order+'</td><td>'+text+'</td></tr>').css({"cursor":"pointer"});
                        table.append(row);

                        row.on("click", function(event) {
                            var wrapElem = document.createElement('span');

                            // Wagtail will remove span element on the whitelisting phase.
                            // We need it only on front-end to append a footnote element at the end of selection.
                            lastSelection.surroundContents(wrapElem);

                            var elem = $('<sup class="footnote-number" data-order="'+order+'" style="margin: 0 2px 0 6px;"><a href="#footnote_'+order+'">'+order+'</a></sup>')[0];
                            wrapElem.appendChild(elem);

                            widget.options.editable.element.trigger('change');
                            $('#footnotes-modal').modal('hide');
                        });
                    });
                    
                    $('#footnotes-modal').modal('show');
                });
            }
        });
    })(jQuery);

}).call(this);
