from django.forms import ChoiceField
from django.utils.safestring import mark_safe
from django.template.loader import render_to_string

from wagtail.wagtailcore.blocks import (
    StreamBlock, StructBlock, FieldBlock, CharBlock,
    RichTextBlock, RawHTMLBlock, URLBlock
)
from wagtail.wagtailimages.blocks import ImageChooserBlock


# Mixin to allow the rendering of an "accessible" (no js) template

class Accessible(object):
    def render(self, value, context=None):
        if context is None:
            new_context = self.get_context(value)
        else:
            new_context = dict(context)
            new_context.update(self.get_context(value))

        if new_context.get('render_accessible'):
            accessible_template = getattr(
                self.meta, 'accessible_template', None
            )
            if not accessible_template:
                return self._render_basic_with_context(value, context=context)
            else:
                return mark_safe(
                    render_to_string(accessible_template, new_context)
                )
        else:
            return super().render(value, context)


# Themes

class ThemeChoiceBlock(FieldBlock):
    field = ChoiceField(
        choices=(
            ('light', 'Light'),
            ('dark', 'Dark'),
        )
    )


# Alignment Blocks

class TwoColumnAlignmentChoiceBlock(FieldBlock):
    field = ChoiceField(
        choices=(
            ('left', 'Left'),
            ('right', 'Right'),
        )
    )


class ThreeColumnAlignmentChoiceBlock(FieldBlock):
    field = ChoiceField(
        choices=(
            ('left', 'Left'),
            ('right', 'Right'),
            ('middle', 'Middle')
        )
    )


# Content Block Types

class ImageBlock(StructBlock):
    image = ImageChooserBlock()
    caption = RichTextBlock(required=False)

    class Meta:
        icon = "image"
        template = "longform/blocks/image_block.html"


class PullQuoteBlock(StructBlock):
    quote = CharBlock(classname="quote title")
    attribution = CharBlock(required=False)

    class Meta:
        icon = "openquote"
        template = 'longform/blocks/pull_quote.html'


class ImageStreamBlock(StreamBlock):
    image = ImageBlock()

    class Meta:
        icon = "image / picture"
        template = 'longform/blocks/image_stream.html'


class BackgroundBlock(Accessible, StructBlock):
    images = ImageStreamBlock(required=False)
    video = URLBlock(required=False, icon="arrow-right")
    caption = RichTextBlock(required=False)

    class Meta:
        icon = "openquote"
        template = 'longform/blocks/background.html'
        accessible_template = "longform/blocks/accessible_background.html"


class IframeBlock(Accessible, StructBlock):
    iframe_url = URLBlock(required=True, icon="arrow-right")
    iframe_width = CharBlock(required=False)
    iframe_height = CharBlock(required=False)
    iframe_id = CharBlock(required=False)
    iframe_html = RawHTMLBlock(required=False)
    fallback_image = ImageBlock()

    class Meta:
        icon = "site"
        template = 'longform/blocks/html.html'
        accessible_template = "longform/blocks/accessible_html.html"


class ContentStreamBlock(StreamBlock):
    section_heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/section_heading.html"
    )
    heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/heading.html"
    )
    sub_heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/sub_heading.html"
    )
    intro = RichTextBlock(
        icon="pilcrow",
        template="longform/blocks/intro.html"
    )
    paragraph = RichTextBlock(
        icon="pilcrow",
        template="longform/blocks/paragraph.html"
    )
    image = ImageBlock()
    pullquote = PullQuoteBlock()
    html = IframeBlock(template="longform/blocks/html.html")

    class Meta:
        template = 'longform/blocks/content_stream.html'


class LockedBackgroundStreamBlock(StreamBlock):
    section_heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/section_heading.html"
    )
    heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/heading.html"
    )
    sub_heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/sub_heading.html"
    )
    intro = RichTextBlock(
        icon="pilcrow",
        template="longform/blocks/intro.html"
    )
    paragraph = RichTextBlock(
        icon="pilcrow",
        template="longform/blocks/paragraph.html"
    )
    pullquote = PullQuoteBlock()
    html = IframeBlock(template="longform/blocks/html.html")

    class Meta:
        template = 'longform/blocks/content_stream.html'


class LockedColumnStreamBlock(StreamBlock):
    image = ImageBlock()
    pullquote = PullQuoteBlock()
    html = IframeBlock(template="longform/blocks/html.html")

    class Meta:
        template = 'longform/blocks/content_stream.html'


class RevealContentStreamBlock(StreamBlock):
    heading = CharBlock(
        icon="title", classname="title",
        template="longform/blocks/heading.html"
    )

    class Meta:
        template = 'longform/blocks/content_stream.html'


# Section Block Types

class FullscreenTitleBlock(Accessible, StructBlock):
    background = BackgroundBlock(required=False)
    foreground = LockedBackgroundStreamBlock(required=False)
    foreground_alignment = ThreeColumnAlignmentChoiceBlock()
    theme = ThemeChoiceBlock()

    class Meta:
        icon = "horizontalrule"
        template = "longform/blocks/fullscreen_title.html"
        accessible_template = "longform/blocks/accessible_fullscreen_title.html"


class LockedBackgroundBlock(Accessible, StructBlock):
    background = BackgroundBlock(required=False)
    foreground = LockedBackgroundStreamBlock(required=False)
    foreground_alignment = ThreeColumnAlignmentChoiceBlock()
    theme = ThemeChoiceBlock(default='dark')

    class Meta:
        icon = "horizontalrule"
        template = "longform/blocks/locked_background.html"
        accessible_template = "longform/blocks/accessible_locked_background.html"


class LockedColumnBlock(Accessible, StructBlock):
    locked_column = LockedColumnStreamBlock(required=False)
    scrollable_column = ContentStreamBlock(required=False)
    locked_column_alignment = TwoColumnAlignmentChoiceBlock()
    theme = ThemeChoiceBlock(default='light')

    class Meta:
        icon = "arrows-up-down"
        template = "longform/blocks/locked_column.html"
        accessible_template = "longform/blocks/accessible_locked_column.html"


class RevealBlock(StructBlock):
    background = ImageBlock()
    foreground = RevealContentStreamBlock()

    class Meta:
        icon = "view"
        template = "longform/blocks/reveal.html"


class RevealStreamBlock(Accessible, StreamBlock):
    reveal = RevealBlock()

    class Meta:
        icon = "view"
        template = "longform/blocks/reveal_stream.html"
        accessible_template = "longform/blocks/accessible_reveal_stream.html"


# Top-level block types

class SectionBlock(StreamBlock):
    fullscreen_title = FullscreenTitleBlock()
    locked_background = LockedBackgroundBlock()
    locked_column = LockedColumnBlock()
    reveal_list = RevealStreamBlock()

    class Meta:
        template = "longform/blocks/section.html"


class ChapterBlock(StructBlock):
    title = CharBlock(icon="title", classname="title")
    section = SectionBlock()

    class Meta:
        icon = "radio-empty"
        template = "longform/blocks/chapter.html"


class LongformBlock(StreamBlock):
    chapter = ChapterBlock()

    class Meta:
        template = "longform/blocks/longform.html"
