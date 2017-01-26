from django.utils.html import format_html_join, format_html
from django.conf import settings

from wagtail.wagtailcore import hooks


def check_footnote_sup_class(x):
    if x.get('class', []) == ['footnote--number']:
        return x
    else:
        return None


@hooks.register('construct_whitelister_element_rules')
def whitelister_element_rules():
    return {
        'sup': check_footnote_sup_class
    }


@hooks.register('insert_editor_js')
def editor_js():
    js_files = [
        'longform/js/hallo-plugins/footnote.js',
        'longform/js/modify-hallo.js'
    ]
    js_includes = format_html_join(
        '\n', '<script src="{0}{1}"></script>',
        ((settings.STATIC_URL, filename) for filename in js_files)
    )
    return js_includes + format_html(
        """
        <script>
            modifyHallo();
        </script>
        """
    )


@hooks.register('insert_editor_css')
def editor_css():
    return format_html('<link rel="stylesheet" href="' +
                       settings.STATIC_URL +
                       'longform/css/footnote.css">')
