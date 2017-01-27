# Longform

Provides a new page type in wagtail that allows authors to add content to several newely defined block types within streamfield.

Each longform page created produces both a page that depends on JavaScript, and, a Printable, Accessible, JavaScript-less, lightweight page.


## What's required

* An instance of [Wagtail](https://github.com/wagtail/wagtail)


## What's included

* Blocktype definitions for streamfield
* Templates, compiled CSS and JS to render both resulting pages


## Installation




## Authoring content with it

 * The `title`, `introduction` and `background image` make up the Coverblock
 * The `menu links` populate the primary navigation
 * The `related page` is added to the Footerblock as a link using the `title` and `introduction` properties from the linked page
 * Within the `body` an author will need to create a `chapter` providing it with a `title`, each chapter populates the chapter navigation present on desktop resolutions upwards
 * After creating a `chapter` users can then chose the `section` style they would like to use


## Developing with it

If you would like to make modifications to the templates;

* Browse the templates directory and modify the corresponding template

If you would like to adjust the CSS and/or JS;

* Ensure you have [node](https://nodejs.org/en/) 4.x or higher (we recommend sticking to LTS releases to ensure module compatibility)
* Install dependancies, navigate to the `/longform` directory and run `npm install`
* Build and watch source directories with `npm run dev`
