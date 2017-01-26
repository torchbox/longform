from django.db import models

from modelcluster.fields import ParentalKey

from wagtail.wagtailcore.models import Page, Orderable
from wagtail.wagtailcore.fields import StreamField
from wagtail.wagtailadmin.edit_handlers import (
    FieldPanel, StreamFieldPanel, InlinePanel, PageChooserPanel
)
from wagtail.wagtailimages.edit_handlers import ImageChooserPanel
from wagtail.wagtailsearch import index

from .blocks import LongformBlock


class LongformRelatedLink(Orderable):
    page = ParentalKey('LongformPage', related_name='related_links')
    link = models.ForeignKey(
        'wagtailcore.Page',
        related_name='+',
        help_text="Allows you to include links to other pages on the website."
        " Displays title of page, listing image, listing intro, and category"
        " labels."
    )

    panels = [
        PageChooserPanel('link'),
    ]


class LongformPageMenuLinks(models.Model):
    page = ParentalKey('longform.LongformPage', related_name='menu_links')
    url = models.URLField()
    title = models.CharField(max_length=255)

    panels = [
        FieldPanel('url'),
        FieldPanel('title')
    ]


class Footnote(Orderable):
    page = ParentalKey('longform.LongformPage', related_name='footnotes')
    text = models.TextField()


class LongformPage(Page):
    body = StreamField(LongformBlock())
    introduction = models.CharField(max_length=255)
    background_image = models.ForeignKey(
        'images.GlobalWitnessImage',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    search_fields = Page.search_fields + [
        index.SearchField('body'),
    ]

    content_panels = Page.content_panels + [
        FieldPanel('introduction'),
        ImageChooserPanel('background_image'),
        InlinePanel('menu_links', label="Menu Links"),
        InlinePanel('related_links', label="Related page"),
        StreamFieldPanel('body'),
        InlinePanel('footnotes', label="Footnotes")
    ]

    subpage_types = []

    def get_context(self, request):
        context = super().get_context(request)

        if request.GET.get('accessible'):
            context.update(render_accessible=True)

        return context

    class Meta:
        verbose_name = "Longform Report"
        verbose_name_plural = "Longform Reports"
