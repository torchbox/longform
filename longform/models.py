from django.db import models
from django.conf import settings

from modelcluster.fields import ParentalKey

from wagtail.wagtailcore.models import Page, Orderable
from wagtail.wagtailcore.fields import StreamField
from wagtail.wagtailadmin.edit_handlers import (
    FieldPanel, StreamFieldPanel, InlinePanel, PageChooserPanel
)
from wagtail.wagtailimages.edit_handlers import ImageChooserPanel
from wagtail.wagtailsearch import index

from .blocks import LongformBlock


class LongformPage(Page):
    body = StreamField(LongformBlock())
    introduction = models.CharField(max_length=255)
    background_image = models.ForeignKey(
        settings.WAGTAILIMAGES_IMAGE_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )

    search_fields = Page.search_fields + [
        index.SearchField('body'),
    ]

    content_panels = Page.content_panels + [
        FieldPanel('introduction'),
        ImageChooserPanel('background_image'),
        StreamFieldPanel('body'),
    ]

    subpage_types = []

    def get_template(self, request, *args, **kwargs):
        if request.is_ajax():
            return self.ajax_template or self.template
        else:
            return 'longform/longform_page.html'

    def get_context(self, request):
        context = super().get_context(request)

        if request.GET.get('accessible'):
            context.update(render_accessible=True)

        return context

    class Meta:
        verbose_name = "Longform Page"
        verbose_name_plural = "Longform Pages"
        abstract = True
