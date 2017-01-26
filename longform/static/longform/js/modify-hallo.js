function modifyHallo () {
    if ($('body').hasClass('model-longformpage')) {
        delete halloPlugins['halloformat'];
        delete halloPlugins['halloheadings'];
        delete halloPlugins['hallolists'];
        delete halloPlugins['hallohr'];
        registerHalloPlugin('footnotebutton');
    }

    $(function() {

        $(document).on("click", '#id_footnotes-FORMS .icon-bin', function(e) {
            // remove the footnote from any rich text areas it was added to
            var deletedFootnote = $(this).closest("li[id^='inline_child_footnotes-']");
            var deletedFootnoteNumber = deletedFootnote.children("input[name$='-ORDER']").val();
            var toDelete = $('sup[data-order="'+deletedFootnoteNumber+'"]');
            var richtext = toDelete.closest('.richtext');
            toDelete.remove();
            richtext.trigger('change');

            // re-order the remaining footnotes
            $.each($('.footnote-number'), function(index, value) {
                var value = $(value);
                var order = value.data('order');

                if (order > deletedFootnoteNumber) {
                    var footnote = $('a', value);
                    var newOrder = order - 1;

                    value.attr('data-order', newOrder); 
                    footnote.attr('href', '#footnote_' + newOrder);
                    footnote.text( newOrder );

                    // trigger change on rich text field to save
                    value.closest('.richtext').trigger('change');
                }
            });
        });

        $.ajax({
            url: "/footnotes_modal/",
            success: function (data) { $('body').append(data); },
            dataType: 'html'
        });
    });
}
