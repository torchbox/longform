/* global $, GWL, dataLayer */

// Support passive event listeners?
// http://stackoverflow.com/questions/37721782/what-are-passive-event-listeners
// Snippet from: https://github.com/Modernizr/Modernizr/pull/1982/files
function supportsPassive(){
    var supportsPassiveOption = false;
    try {
        var opts = Object.defineProperty({}, 'passive', {
            get: function() {
                supportsPassiveOption = true;
            }
        });
        window.addEventListener('test', null, opts);
    } catch (e) {
        // 
    }
    return supportsPassiveOption;
}


function getTransformProperty( node ) {
    var properties = [
        'transform',
        '-webkit-transform',
        '-ms-transform',
        '-moz-transform',
        '-o-transform'
    ];
    var p;
    while( ( p = properties.shift() ) !== null ){
        if ( typeof node.style[p] != 'undefined' ) {
            return p;
        }
    }
    return false;
}

// http://stackoverflow.com/a/18621161
$.fn.removeClassRegex = function(regex) {
    return $(this).removeClass(function(index, classes) {
        return classes.split(/\s+/).filter(function(c) {
            return regex.test(c);
        }).join(' ');
    });
};

var _browserTransformProp   = getTransformProperty( $( 'body' )[0] ),
    _URL                    =  window.URL || window.webkitURL;


/*
    Page behavior

    // TODO, split this into global modules, ES6 classes or go full react
    // TODO, normalise default state of jquery variables to null instad of empty array for more reliable conditionals
    // TODO, disabiguate animation speed across CSS and JS
*/

// var GWL = GWL || {};

GWL.page = (function(){

    var $page           = $( '.page--content' ),
        $navigation     = $( '.page--navigation' ),
        XHR             = null, // new XMLHttpRequest(),
        animSpeed       = 475,  // Time we wait for animations to complete
        vHeight         = 0,    // Viewport height
        footnoteTop     = 0,    // Required for scrolltop calulcations in nested scroll container
        state           = {
            firstLoad   : true,
            busy        : false,
            breakpoint  : '',   // CSS breakpoint for responsive behaviours: 
            type        : '',   // Section type locked_background, locked_column, reveal_list, single_column
            mediaQueue  : [],   // Media queue
            scrolling   : {
                direction : undefined // up / down
            },
            chapter     : {
                name        : '',   // Chapters have names, sections are page numbered
                position    : 0,
                items       : [],
                $scroll     : 0,
                $current    : null
            },
            section     : {
                animSpeed   : 500,      // Time we wait for animations to complete
                position    : 0,        // Current position in section array
                theme       : 'light',  //    
                showcase    : false,    // Are we in showcase mode?
                items       : [],       // Items in section array
                $current    : [],       // Current element
                $scroll     : []        // Current scroll container
            },
            locked      : {         // Any locked items in section
                position    : 0,
                $items      : []
            }
        };

    function init(){
        state.chapter.items = getChapters();
        refreshClientGlobals();
        bindEvents();

        navigateFromURL( );
        
    }

/*********************************************

>   Utility 

*/

    function refreshClientGlobals(){
        vHeight = getHeight();
        footnoteTop = getFootnotePos();
        state.breakpoint = getBreakpoint();
    }

    function getBreakpoint(){
        var breakpoint = window.getComputedStyle(document.querySelector('body'), ':before').getPropertyValue('content').replace(/\"/g, '');
        return breakpoint;
    }

    function getHeight(){
        var vHeight = $( window ).height();
        return vHeight;
    }

    function getFootnotePos(){
        var footnoteTop = $( '.page--footnotes' ).offset().top;
        return footnoteTop;
    }

    function getChapters(){

        var items = [];
        // Use map?
        $page.find( '.chapter' ).each(function(){
            var $item = $( this );
            // console.log( 'chap', $item );
            items.push( $item );
        });

        return items;
    }

    function getSections( $chapter ){
        // Clear items
        var items = [];
        // Use map?
        $chapter.find( 'div[class^="section--"]' ).each(function(){
            var $item = $( this );
            items.push( $item );
        });

        return items;
    }

    function animateOut( $elem, className, speed, callback ){
        $elem.addClass( className + '--out-anim' );
        $elem.addClass( className + '--out' );
        setTimeout(function(){
            $elem.removeClass( className + '--in' );
        }, 10 );
        setTimeout(function(){
            $elem.removeClass( className + '--in' );
            $elem.removeClass( className + '--out-anim' );
            if( callback ){
                callback();
            }
        }, speed );
    }

    function animateIn( $elem, className, speed, callback ){
        $elem.addClass( className + '--in-anim' );
        $elem.addClass( className + '--in' );
        setTimeout(function(){
            $elem.removeClass( className + '--out' );
        }, 10 );
        setTimeout(function(){
            $elem.removeClass( className + '--out' );
            $elem.removeClass( className + '--in-anim' );
            if( callback ){
                callback();
            }
        }, speed );
    }

    function animateElement( $elem, className, delay, duration, unload, callback ){

        var name        = 'anim--' + className,
            setup       = 32, // 2 Frames to setup
            start       = setup + delay,
            animations  = [];

        // Clear any previous animation classes
        // TODO: Replace with data attribute, pull the previous anim state and remove it
        // Or not... doesn't seem to work as well
        // if( $elem.data( 'animated' ) ){
        //     prevAnim = $elem.data( 'animated' );
        //     $elem.removeClass( prevAnim );
        //     $elem.removeClass( prevAnim + '-setup' );
        //     $elem.removeClass( prevAnim + '-transition' );
        // }
        $elem.removeClassRegex(/^anim--/);
        // Add transition setup properties
        $elem.addClass( name + '-setup' );
        // Remove any CSS unload optimisations
        $elem.removeClass( 'unload' );

        // Setup transition properties
        var setTransitionProps = window.setTimeout(function setTransitionProps(){
            $elem.addClass( name + '-transition' );
        }, setup/2 );

        // Start the animation
        var startAnimation = window.setTimeout(function startAnimation(){
            $elem.addClass( name );
            $elem.removeClass( name + '-setup' );
        }, start );
        
        // Animation completed
        var endAnimation = window.setTimeout(function endAnimation(){
            // Animation Complete

            // We don't want to the opportunity to stop the animation anymore
            $elem.removeData( 'animating' );
            // Data attr for removing animations
            // Or not... doesn't seem to work as well
            $elem.data( 'animated', name ); 
            // Remove transition property
            $elem.removeClass( name + '-transition' );

            // Hook for CSS optimisations
            if( unload ){
                $elem.addClass( 'unload' );
            }
            
            if( callback ){
                callback();
            }
        }, duration + start );

        // Get and clear any old timeouts
        if( $elem.data( 'animating' ) ){

            animations = $elem.data( 'animating' );
            for (var i=0; i<animations.length; i++) {
                clearTimeout(animations[i]);
            }

        } 

        // We are officially animating now, rest of it is callbacks
        $elem.data( 'animating', [ setTransitionProps, startAnimation, endAnimation ] );

    }


/*********************************************

>   Browser history

*/

    function updateHistory( sectionNumber ){

        // Chapter / Section
        var url = '#chapter-' + state.chapter.position + '/section-' + sectionNumber;

        history.pushState( {
            'chapterName'   : state.chapter.name,
            'chapterPos'    : state.chapter.position,
            'sectionPos'    : sectionNumber
        }, '', url );

    }

    // When we load the page, we need to navigate to a chapter and section based on the URL
    function navigateFromURL(){

        var chapter = getChapterFromHash(),
            section = getSectionFromHash();

        changeChapter( chapter, 'down', section, false );

    }

    // When a user presses back/forward in their browser
    function navigateFromBrowserHistory( ){

        var chapter     = getChapterFromHash(),
            section     = getSectionFromHash(),
            direction   = 'down';

        console.log( 'chap', chapter, 'sec', section );

        // if chapter is different from the one in our state obj, 
        if( chapter !== state.chapter.position ){

            // Check direction
            if( chapter < state.chapter.position ){
                direction = 'up';
            }

            changeChapter( chapter, direction, section, false );

        // else if section is different from the one in our state obj
        } else if ( section !== state.section.position ){

            // Check direction
            if( section < state.section.position ){
                direction = 'up';
            }

            changeSection( section, direction, false );
        }

    }

    function getChapterFromHash(){

        var hash    = window.location.hash,
            chapter = 0;

        if( hash.split( '#chapter-' )[1] && hash.split( '#chapter-' )[1].split( '/' )[0] ){
            chapter = +hash.split( '#chapter-' )[1].split( '/' )[0];
        }

        return chapter;
    }

    function getSectionFromHash(){
        var hash    = window.location.hash,
            section = 0;

        if( hash.split( '/section-' )[1] ){
            section = +hash.split( '/section-' )[1];
        }

        return section;
    }



/*********************************************

>   Media Loading

*/


    function mediaProgress( e, $progressBar ){

        if (e.lengthComputable) {
            var percentComplete = Math.round((e.loaded / e.total) * 100);
            $progressBar.css( _browserTransformProp, 'translate3d( ' +  percentComplete + '%' +', 0, 0px)' );
        }

    }

    function mediaLoad( e, $item, $block, $progressNode, $progressBar ){

        var xhr = e.currentTarget;

        if( xhr.status == 200 ){

            // console.log( 'RUN LOADED' );
            $progressBar.css( _browserTransformProp, 'translate3d( 100%, 0, 0px)' );

            // Create blob regardless
            var blob    = xhr.response,
                media   = _URL.createObjectURL(blob);

            // Check $item type
            // TODO: Optimisation would be to pass this information when requesting the file, or do this in a callback, lots of options

            // Background images
            if( $item.hasClass( 'image--blur' ) || $item.hasClass( 'image--cover' ) || $item.hasClass( 'image--inline' )){
                $item.css( 'background-image',  'url(' + media + ')' );
            }

            // Background video
            if( $item.hasClass( 'video--cover' ) ){
                $item.attr( 'src',  media );
            }

            // Garbage the blob after it has been rendered
            // THEN do actions on node, to avoid the chance of removing a blob whilst it is being painted.
            // Might need to profile this
            // Nice use case for serviceworkers? Apparently not: https://www.chromestatus.com/feature/5685092332601344
            // 500ms timeout to allow for loading sequence to end elegantly
            setTimeout(function(){
                // _URL.revokeObjectURL(media);
                // $item classes
                $item.addClass( 'loaded' );
                $item.removeClass( 'loading' );
                // $block classes
                $block.addClass( 'loaded' );
                $block.removeClass( 'loading' );
                // $progessNode classes
                $progressNode.addClass( 'loaded' );
                $progressNode.removeClass( 'loading' );

                // // Could put this in the timeout above to be sure
                $( window ).trigger( 'media_loaded', { 
                    $item       : $item,
                    xhrEvent    : xhr
                });

            }, 500 );

            // // TODO: Replace functionality with events
            processMediaQueue();

        } else {
            // WJAT
            console.error( 'could not get media', $item, e );
        }

    }

    function loadMedia( $item ){

        var path            = $item.data( 'src' ),
            $block          = $item.closest( '[class^="block--"]' ),
            $progressNode   = $item.siblings( '.progress' ),
            $progressBar    = $progressNode.find( '.bar' );

        XHR = new XMLHttpRequest();

        // If no path, return to process chapter queue
        if( !path ){
            // console.error( 'no path in loadMedia() for', $item );
            processMediaQueue();
            return false;
        }

        if( $item.hasClass( 'loaded' ) ){
            setTimeout(function(){
                $( window ).trigger( 'media_loaded', { 
                    $item       : $item
                });
                processMediaQueue();
            }, 100 );
            return false;
        }

        // Set loading classes for styling
        $item.addClass( 'loading' );
        $block.addClass( 'loading' );
        $progressNode.addClass( 'loading' );

        // Configure XHR request
        XHR.open('GET', path, true);
        XHR.responseType = 'blob';

        // XHR events
        XHR.addEventListener( 'progress', function xhrProgressEvent( e ){
            mediaProgress( e, $progressBar );
        });
        // Could use individual events; load, timeout, error - for the moment lets catch them all under loadend
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
        XHR.addEventListener( 'loadend', function xhrLoadEvent( e ){
            mediaLoad( e, $item, $block, $progressNode, $progressBar );
        });

        // Begin XHR
        XHR.send();

    }

    function queueMedia( $container ){

        // Find all media in $container and queue it
        $container.find( '.image--blur, .image--cover, .video--cover, .image--inline' ).each(function( ){
            var $item = $( this );
            // console.log( 'in queue', $item );
            state.mediaQueue.push( $item );
        });

    }

    function processMediaQueue( ){

        stopDownload();

        var $item = state.mediaQueue[0];

        if( state.mediaQueue.length > 0 ){
            state.mediaQueue.shift();
            loadMedia( $item );
        }

    }

    // Clear any existing lazy loading actions
    function stopDownload( ){
        if( XHR ){
            XHR.abort();
        }
    }

    function resetQueue( ){

        // Reset the queue
        state.mediaQueue = [];

    }


/*********************************************

>   Iframe functions

*/


    function activateIframe( $block ){

        var $iframe = $block.find( '.embed--iframe' ),
            src     = $iframe.data( 'src' );

        console.log( 'active iframe', $block, $iframe );

        if( !$block.hasClass( 'loaded' ) ){
            $iframe.attr( 'src', src );
            $block.addClass( 'loaded' );
        }

    }


/*********************************************

>   Scrolling

*/


    function scrollEnd( $scrollContainer ){

        // Abstract out?
        if( state.type === 'reveal_list' ){
            if( state.locked.position === 0 ){
                // return true;
            } else {
                return false;
            }
        }

        var read = true;

        if( $scrollContainer.length > 0 ){
            read = $scrollContainer[0].scrollHeight - $scrollContainer[0].scrollTop <= $scrollContainer[0].clientHeight + 5;
        }

        return read;
    }

    function scrollStart( $scrollContainer ){

        // TODO: Maybe not retrun false?
        if( $scrollContainer < 1 ){
            return false;
        }

        // Abstract out?
        if( state.type === 'reveal_list' ){
            if( state.locked.position === (state.locked.$items.length - 1) ){
                return true;
            } else {
                return false;
            }
        }

        var read = true;

        if( $scrollContainer.length > 0 ){
            read = $scrollContainer[0].scrollTop === 0;
        }

        return read;
    }

    function scrollPercent( $scrollContainer ){

        // TODO: Maybe not retrun false?
        if( $scrollContainer < 1 ){
            return false;
        }

        var containerHeight     = 0,
            contentHeight       = 0,
            scrollPos           = 0,
            scrollPercent       = 0;

        containerHeight     = $scrollContainer[0].clientHeight,
        contentHeight       = $scrollContainer[0].scrollHeight,
        scrollPos           = $scrollContainer[0].scrollTop,
        scrollPercent       = Math.round((scrollPos / (contentHeight - containerHeight )) * 100);

        return scrollPercent;

    }

    // Setup scroll start location
    function setupSectionScrollContent( $section, direction ){

        var $scroll = $section.find( '.content--scroll' );

        if( $scroll[0] ){
            if( direction === 'down' ){
                $scroll[0].scrollTop = 0;
            } else if ( direction === 'up' ){
                $scroll[0].scrollTop = $scroll[0].scrollHeight;
            }
        }

    }


/*********************************************

>   Reveal Section

*/


    function setupReveal( direction ){

        var $currentBlock       = state.section.$current,
            $lockedItems        = $currentBlock.find( '.content--locked' ),
            position            = 0;

        // console.log( ' :: setupReval', direction );

        if( direction === 'up' ){
            position = 0;
            // 
            $lockedItems.each(function setUp( i ){
                if( i > 0 ){
                    $( this ).addClass( 'up' );
                }
            });
        }

        if( direction === 'down' || direction === undefined ){
            position = $lockedItems.length - 1;
        }

        // set state object
        if( $lockedItems.length > 0 ){
            state.locked = {
                position    : position,
                $items      : $lockedItems
            };
        } else {
            state.locked = {
                position    : 0,
                $items      : null
            };
        }

    }

    function changeReveal( $elem, direction, nextPosition ){

        state.busy = true;

        // TODO: Kill events here!

        if( direction === 'down' ){
            $elem.addClass( 'up' );
        }

        if( direction === 'up' ){
            $elem.removeClass( 'up' );
        }

        setTimeout(function(){
            state.locked.position = nextPosition;
            state.busy = false;
        }, animSpeed*2 );

    }

    function manageReveal( direction ){

        // Check we have everything. and are not busy
        if( state.busy === true && direction ){
            return false;
        }

        // console.log( ' :: manageReveal', direction );

        var $current        = $( state.locked.$items[ state.locked.position ] ),
            nextPosition    = 0;

        if( direction === 'up' ){
            if( state.locked.position < state.locked.$items.length - 1){
                nextPosition = state.locked.position + 1;
                $current = $( state.locked.$items[ nextPosition ] );
                changeReveal( $current, direction, nextPosition );
            } else {
                previousBlock();
            }
        }

        if( direction === 'down' ){
            if( state.locked.position > 0 ){
                nextPosition = state.locked.position - 1;
                changeReveal( $current, direction, nextPosition );
            } else {
                nextBlock();
            }
        }

        return $current;

    }


/*********************************************

>   Locked Blocks

*/


    function animateLockedOut( $item, direction, instant ){
        var className       = 'out-' + direction,
            animDuration    = instant ? 0 : 900;

        animateElement( $item, className, 0, animDuration, false );
    }

    function animateLockedIn( $item, direction, instant ){
        var className       = 'in-' + direction,
            animDuration   = instant ? 0 : 900;

        animateElement( $item, className, 0, animDuration, false );
    }

    // next: bool (true: next, false: previous)
    // maybe make this a string inline with everything else to help with ease of reading?
    function changeLockedContent( next, direction ){

        var $oldItem        = $( state.locked.$items[ state.locked.position ] ),
            nextPos         = next ? ( state.locked.position + 1 ) : ( state.locked.position - 1 ),
            animDirection   = 'up',
            $newItem        = $( state.locked.$items[ nextPos ] );

        if( direction === 'up' ){
            animDirection = 'down';
        }

        // console.log( direction, $oldItem, $newItem );
        animateLockedOut( $oldItem, animDirection );
        animateLockedIn( $newItem, animDirection );

        if( $newItem.hasClass( 'block--embed' ) ){
            activateIframe( $newItem );
        }

        state.locked.position = nextPos;
        state.locked.$item = $newItem;

    }

    function manageLockedContent( direction ){

        var multiplier          = state.locked.position + 1,
            scrollPoint         = 0,
            $scrollContainer    = state.section.$scroll;

        if( direction === 'down' ){

            // TODO: Could replace with scrollpercent?
            if( scrollEnd( $scrollContainer ) ){
                nextBlock();
            }

            if( state.locked.$items ){
                scrollPoint = ( 100 / state.locked.$items.length ) * multiplier;
                if( scrollPercent( $scrollContainer ) > scrollPoint ){
                    changeLockedContent( true, direction );
                }
            }
        }

        if( direction === 'up' ){

            // TODO: Could replace with scrollpercent?
            if( scrollStart( $scrollContainer ) ){
                previousBlock();
            }

            if( state.locked.$items ){
                scrollPoint = ( 100 / state.locked.$items.length ) * ( multiplier - 1 );
                if( scrollPercent( $scrollContainer ) < scrollPoint ){
                    changeLockedContent( false, direction );
                }
            }
        }

    }

    function setupLockedContent( direction ){

        var $currentBlock       = state.section.$current,
            $lockedContent      = $currentBlock.find( '.content--locked' ),
            $lockedItems        = $lockedContent.find( 'div[class^="block--"]' ),
            position            = 0,
            $lockedItem         = null;

        // position is different depending on the direction 
        if( direction === 'up' ){
            position = $lockedItems.length - 1;
        }

        $lockedItem = $( $lockedItems[ position ] );       

        // Set state 
        if( $lockedContent.length > 0 ){
            state.locked.position = position;
            state.locked.$items = $lockedItems;
            state.locked.$item = $lockedItem;
        } else {
            state.locked.position = 0;
            state.locked.$items = null;
            state.locked.$item = null;
        }

    }

    function setupSectionLockedContent( $section, direction ){

        // animateLockedIn( $lockedItem, invertDirection );
        var animDirection   = 'up',
            position        = 0,
            $items          = $section.find( '.content--locked div[class^="block--"]' );

        if( direction === 'up' ){
            position = $items.length - 1;
            animDirection = 'down';
        }


        $items.each(function( i, item ){
            var $item       = $( item );

            if( i === position ){
                animateLockedIn( $item, animDirection, true );
            } else {
                animateLockedOut( $item, animDirection, true );
            }

        });

    }



/*********************************************

>   ? Page

*/

// Add handling of the page here? Could handle initial load, overal media queue


/*********************************************

>   Chapters

    We can navigate to chapters in 3 different ways;
     - Scrolling through the report
     - Using the chapter navigation
     - Loading directly to a chapter (deeplinking)

     Chapters and sections should have a standardised set of methods for carrying out require actions at specific points

*/


    function changeChapter( item, direction, sectionItem, updateURL ){

        if( state.chapter.busy ){
            return false;
        }

        state.chapter.busy = true;

        var $oldChapter     = state.chapter.$current,
            $newChapter     = state.chapter.items[ item ];


        // Consider the section, within the chapter we are going to display
        console.log( 'changeChapter', direction, item, state.chapter.items );

        // Potentially do this, somewhere else, originally here as chapter animations relied on this being set
        $( 'body' ).removeClassRegex(/^direction--/);
        $( 'body' ).addClass( 'direction--' + direction );

        if( $oldChapter ){
            animateElement( $oldChapter, 'out', 0, 900, true );
        }

        loadChapter( $newChapter, item, direction, sectionItem, updateURL );

        trackChapterChange( $newChapter, $oldChapter );
        
    }

    // Could be extended
    function loadChapter( $chapter, item, direction, sectionItem, updateURL ){

        console.log( 'loadChapter', $chapter );

        var sectionPos = sectionItem ? sectionItem : 0,
            $section = $( $chapter.find( 'div[class^="section--"]' )[ sectionPos ] ); // TODO: Use this to load specific sections of a chapter when using window.hostory?


        $section.addClass( 'is--loading' );

        // $chapter.addClass( 'block' );
        // work out what needs to be loaded

        // If we are already loaded, lets just go to the new section

        // If we are not yet loaded, lets preload it so the chapter loads elegantly with the image
        $( window ).one( 'media_loaded', function pageIntro( ){

            setTimeout(function(){
                if( state.firstLoad ){
                    $( 'body' ).removeClass( 'load--init' );
                    state.firstLoad = false;
                }
                $section.addClass( 'is--loaded' );
                $section.removeClass( 'is--loading' );
            }, 1000 );

        });

        processChapter( item, direction, $chapter );
        changeSection( sectionPos, direction, updateURL );

        animateElement( $chapter, 'in', 0, 1500, false, function(){
            state.chapter.busy = false;
            // work out what needs to be loaded
            queueMedia( $section );
            processMediaQueue();
        });

    }

    function processChapter( item, direction, $chapter ){

        // var sectionPos = 0;

        state.chapter.$current  = $chapter;
        state.chapter.$scroll   = $chapter.find( ' > .content' ),
        state.chapter.position  = item;
        state.chapter.name      = $chapter.attr( 'id' );

        state.section.items     = getSections( $chapter );

        // if( direction === 'up' ){
        //     sectionPos = state.section.items.length - 1;
        // }

        // Set navigation item
        // TODO: fire events for chapter and section changes, the scope of this may be better understood at a later time
        setNavigationCurrent( item );

        // TODO: Prepare sections for chapter based on direction before changing
        // resetSections( sectionPos, direction );

    }


/*********************************************

>   Sections

    We can navigate to sections in 3 different ways;
     - As the first item of a chapter
     - Scrolled to as part of a chapter
     - Loading directly to a section (deeplinking)

*/

    // Scroll the Section container to the current section
    function scrollToSection( arrayPos ){
        var newHeight = -( arrayPos * vHeight );
        state.chapter.$scroll.css( _browserTransformProp, 'translate3d( 0, ' +  newHeight + 'px' +', 0px)' );
    }

    // Add/remove 
    function prepareSections( item ){
        
        // find next section
        var nextItem    = item + 1,
            prevItem    = item - 1;

        $.each( state.section.items, function( i, $item ){
            if( i === nextItem || i === prevItem ){
                $item.removeClass( 'unload' );
            } else if( i !== item ) {
                $item.addClass( 'unload' );
            }
        });

    }

    function setupSection( item ){
        prepareSections( item );
    }

    /**
     * Change to the requested section
     * @param {number} item - The position in the chaper
     * @param {string} direction - Requested direction, up/down.
     // TODO: Split up to have 
      - CleanSection
      - ? LoadSection
      - ProcessSection
     */
    function changeSection( item, direction, updateURL ){

        if( state.section.busy ){
            return false;
        }

        state.section.busy = true;

        console.log( ' > changeSection', item, direction );

        // TODO: Kill events here?
        
        var oldPos          = state.section.position,
            $nextSection    = state.section.items[ item ],
            $oldScroll      = state.section.$scroll.length ? state.section.$scroll.find( ' > .content' ) : state.section.items[ oldPos ],
            $newScroll      = null,
            // TODO: Get good at regex? : P
            // This is fragile and should be updated
            type            = $nextSection.attr( 'class' ).split( 'section--' )[1].split( ' ' )[0],
            theme           = $nextSection.attr( 'class' ).split( 'theme--' )[1].split( ' ' )[0];

        console.log( ' - section type: ', type );
        console.log( ' - section theme: ', theme );
        
        $( 'body' ).removeClassRegex(/^direction--/);
        $( 'body' ).addClass( 'direction--' + direction );

        // Get correct scrollcontainer 
        // if( state.breakpoint === 'large' ){
        $oldScroll  = state.section.$scroll.length ? state.section.$scroll : null;
        $newScroll  = state.section.items[ item ].find( '.content--scroll' );
        // }

        // Remove showcase if open
        if( state.section.showcase ){
            toggleShowcase();
        }

        // Set type on body
        $( 'body' ).removeClassRegex(/^theme--/);
        $( 'body' ).addClass( 'theme--'+theme );
        
        // Take down scroll containers
        if( $oldScroll ){
            $oldScroll.css( 'overflow-y', 'hidden' );
        }

        setupSection( item );
        setupSectionScrollContent( $nextSection, direction );
        setupSectionLockedContent( $nextSection, direction );

        // If intro to chapter setup animation
        if( direction === 'down' && item === 0 ){
            // $nextSection.addClass( 'intro' );
        }

        if( state.chapter.position === 0 && item === 0 ){
            $( 'body' ).addClass( 'cover' );
        } else {
            $( 'body' ).removeClass( 'cover' );
        }

        // Animate to chapter position
        scrollToSection( item );

        animateElement( $nextSection, 'in', 0, 900, false, function(){
            // Setup scroll containers
            // ScrollTop depending on direction
            if( direction === 'up' && $newScroll[0] ){
                // console.log( $newScroll );
                $newScroll[0].scrollTop = $newScroll[0].scrollHeight;
                // scrollTop = $newScroll
            }
            processSection( item, direction, $newScroll, type, theme, updateURL );
            // If intro to chapter teardown intro animation
            if( direction === 'down' && item === 0 ){
                setTimeout(function(){
                    $newScroll.css( 'overflow-y', 'auto' );
                    state.section.busy = false;
                    // setTimeout(function(){
                    //     $nextSection.removeClass( 'intro-setup' );
                    // }, animSpeed);
                }, state.section.animSpeed );
            } else {
                $newScroll.css( 'overflow-y', 'auto' );
                state.section.busy = false;
            }
        });

        if( state.section.$current.length > 0 ){
            animateElement( state.section.$current, 'out', 0, 900, true, function(){
                // state.chapter.busy = false;
                // Revoke URL here?
            });
        }
        
    }

    function processSection( item, direction, $scrollContainer, type, theme, updateURL ){

        var $newSection         = state.section.items[ item ];

        state.type              = type;
        state.section.$current  = $newSection;
        state.section.$scroll   = $scrollContainer;
        state.section.position  = item;
        state.section.theme     = theme;

        if( updateURL ){
            updateHistory( item );
        }

        loadSectionMedia( $newSection );
        loadSectionIframes( $newSection );


        if( state.type === 'locked_background' || state.type === 'locked_column' || state.type === 'fullscreen_title' || state.type === 'single_column' || state.type === 'call_to_action' || state.type === 'cover'  ){
            setupLockedContent( direction );
        }

        if( state.type === 'reveal_list' ){
            setupReveal( direction );
        }

        // Temporarily hide showcase mode on locked column as it doesn't do anything yet;
        if( state.type === 'locked_column' ){
            hideShowcaseMode();
        } else {
            displayShowcaseMode();
        }

    }

    // Load any iframe content found in the scrollable container within the passed section
    function loadSectionIframes( $section ){

        $section.find( '.content--scroll .block--embed').each(function(){
            var $item = $( this );
            if( !$item.hasClass( 'loaded' ) ){
                activateIframe( $item );
            }
        });

    }

    function loadSectionMedia( $section ){

        resetQueue();
        queueMedia( $section );
        processMediaQueue();

    }

/*********************************************

>   Navigating page

*/

    function nextBlock( ){
        var newSection      = 0,
            newChapter      = 0,
            currentSection  = +state.section.position;

        // If we are not the last section in the current chapter
        if( currentSection < state.section.items.length-1 ){
            newSection = currentSection + 1;
            changeSection( newSection, 'down', true );
        // Otherwise, check we are not on the last chapter, and move tot he next chapter
        } else if( state.chapter.position < state.chapter.items.length-1 ){
            newChapter = state.chapter.position + 1;
            changeChapter( newChapter, 'down', 0, true );
        }
    }


    function previousBlock(){
        var newSection      = 0,
            newChapter      = 0,
            currentSection  = +state.section.position;

        // If we are not on the first section of a chapter, lets go to the previous
        if( currentSection > 0 ){
            newSection = currentSection - 1;
            changeSection( newSection, 'up', true );
        // Otherwise check we are not the first chapter, and move to the previous
        } else if( state.chapter.position !== 0 ){
            newChapter = state.chapter.position - 1;
            // Get the last section of the chapter
            newSection = getSections( state.chapter.items[ newChapter ] ).length - 1;
            changeChapter( newChapter, 'up', newSection, true );
        }
    }


/*********************************************

>   Menus & Share

*/

    function setNavigationCurrent( item ){

        var $newLink = $( $navigation.find( '.link--chapter' )[ item ] ),
            $oldLink = $( '.link--chapter.active' );

        $oldLink.removeClass( 'active' );
        $newLink.addClass( 'active' );
    }

    function chapterNavigation( e ){
        e.preventDefault();

        if( state.chapter.busy === true ){
            return false;
        }

        // Should get chapter ID, but going to get array position
        var item        = e.currentTarget,
            container   = item.parentNode,
            index       = Array.prototype.indexOf.call( container.children, item ),
            direction   = 'down'; // Always start from the top of a chapter when using the navigation

        // If same do nothing
        if( index === state.chapter.position ){
            return false;
        }

        if( index < state.chapter.position ){
            direction = 'up';
        }

        changeChapter( index, direction, 0, true );

    }

/*********************************************

>   Showcase

*/

    function showcaseIn(){
        animateIn( $( 'body' ), 'showcase', 500, function(){
            state.section.showcase = true;
            bindRecover();
        });
    }

    function showcaseOut(){
        unBindRecover();
        animateOut( $( 'body' ), 'showcase', 500, function(){
            state.section.showcase = false;    
        });
    }

    function toggleShowcase( ){

        if( $( 'body' ).hasClass( 'menu--in') ){
            menuOut();
        }

        if( $( 'body' ).hasClass( 'share--in') ){
            shareOut();
        }

        if( state.section.showcase === false ){
            showcaseIn();
        } else {
            showcaseOut();
        }

    }


    // Temp hid/show showcase mode
    function hideShowcaseMode(){
        $( 'body' ).addClass( 'disableShowcaseMode' );
    }
    
    function displayShowcaseMode(){
        $( 'body' ).removeClass( 'disableShowcaseMode' );
    }



/*********************************************

>   Menu

*/

    function menuIn(){
        $( '.page--menu' ).removeClass( 'unload' );
        animateIn( $( 'body' ), 'menu', 1000 );
    }

    function menuOut(){
        animateOut( $( 'body' ), 'menu', 1000, function(){
            $( '.page--menu' ).addClass( 'unload' );
        });
    }

    function toggleMenu( ){

        if( $( 'body' ).hasClass( 'share--in') ){
            shareOut();
        }

        if( state.section.showcase ){
            showcaseOut();
        }

        if( $( 'body' ).hasClass( 'menu--in') ){
            menuOut();
        } else {
            menuIn();
        }

    }


/*********************************************

>   Share

*/

    function shareIn(){
        $( '.page--share' ).removeClass( 'unload' );
        animateIn( $( 'body' ), 'share', 1000 );
    }

    function shareOut(){
        animateOut( $( 'body' ), 'share', 1000, function(){
            $( '.page--share' ).addClass( 'unload' );
        });
    }

    function toggleShare( ){

        if( $( 'body' ).hasClass( 'menu--in') ){
            menuOut();
        }

        if( state.section.showcase ){
            showcaseOut();
        }

        if( $( 'body' ).hasClass( 'share--in') ){
            shareOut();
        } else {
            shareIn();
        }

    }

/*********************************************

>   Footnotes

*/

    // depends on footnoteTop
    function scrollToFootnote( id ){

        var $container  = $( '.footnotes--list' ),
            $footnote   = $container.find( '#footnote_'+id ),
            scrollPos   = 0;

        $container.scrollTop( 0 );
        scrollPos = ( $footnote.offset().top - footnoteTop ) - 10;
        $container.scrollTop( scrollPos );

    }

    // function footnoteCloseHandler( e ){

    //     console.log( 'a', !$( e.target ).closest( '.footnotes-number' ).length, !$( e.target ).hasClass( 'footnotes-number' ) );
    //     console.log( 'b', !$( e.target ).closest( '.footnotes--list' ).length, !$( e.target ).is( '.footnotes--list' ) );

    //     if( !$( e.target ).closest( '.footnotes--list' ).length && !$( e.target ).is( '.footnotes--list' ) && !$( e.target ).closest( '.footnotes-number' ).length && !$( e.target ).is( '.footnotes-number' ) ){
    //         footnoteClose();
    //     }
    // }

    function footnoteOpen( ){
        animateIn( $( 'body' ), 'footnotes', 1000 );
        // setTimeout(function(){
        //     document.addEventListener( 'click', footnoteCloseHandler );
        // }, 900 );
    }

    function footnoteClose( e ){
        e.preventDefault();
        animateOut( $( 'body' ), 'footnotes', 1000 );
        // document.removeEventListener( 'click', footnoteCloseHandler );
    }

/*********************************************

>   Scroll hijacking

*/

    function processScroll( direction ){

        state.scrolling.direction = direction;

        if( state.type === 'locked_background' || state.type === 'locked_column' || state.type === 'fullscreen_title' || state.type === 'single_column' || state.type === 'call_to_action' || state.type === 'cover'  ){
            manageLockedContent( direction );
        }

        if( state.type === 'reveal_list' ){
            manageReveal( direction );
        }

        // Kill blurr
        if (document.activeElement != document.body) document.activeElement.blur();
    }

    function scrollJack( e ){
        var direction = '';

        if( e.deltaY < 0 ){
            direction = 'up';
        }

        if( e.deltaY > 0 ){
            direction = 'down';
        }

        processScroll( direction );

    }

/*********************************************

>   Element handlers

*/

    function continueClick( e ){
        e.preventDefault();
        // Goto the first section of the first chapter
        // IF that doesn't exist go to the next chapter
        if( state.section.items.length > 0 ){
            changeSection( 1, 'down', true );
        } else {
            changeChapter( 1, 'down', 0, true );
        }

    }

    function chapterHover( e ){
        var $link = $( e.currentTarget ).find( '.text--chapter_name' );
        animateElement( $link, 'in', 0, 650, false );
    }

    function chapterOut( e ){
        var $link = $( e.currentTarget ).find( '.text--chapter_name.anim--in' );
        animateElement( $link, 'out', 0, 400, true );
    }

    function showcaseClick( e ){
        e.preventDefault();
        toggleShowcase();
    }

    function shareClick( e ){
        e.preventDefault();
        toggleShare();
    }

    function menuClick( e ){
        e.preventDefault();
        toggleMenu();
    }

    function embedClick( e ){
        var $block = $( e.currentTarget );
        activateIframe( $block );
    }

    function footnoteClick( e ){
        e.preventDefault();

        var $link   = $( e.currentTarget ),
            noteID  = $link.parent( '.footnote-number' ).data( 'order' );

        scrollToFootnote( noteID );
        trackFootnoteClick( noteID);

        if( !$( 'body' ).hasClass( 'footnotes--in' ) ){
            footnoteOpen();
        }
    }

/*********************************************

>   Event Binding

*/

    function bindRecover(){
        state.section.$current[0].addEventListener( 'click', showcaseClick );
    }

    function unBindRecover(){
        state.section.$current[0].removeEventListener( 'click', showcaseClick );
    }

    function bindEvents(){

        var hoverTimer,
            hoverDelay = 100;

        window.onpopstate = function popStateChange( e ){
            navigateFromBrowserHistory( e );
        };

        $( '.link--continue' ).on( 'click', continueClick );
        $( '.block--embed' ).on( 'click', embedClick );
        $( '.link--share' ).on( 'click', shareClick );
        $( '.link--menu' ).on( 'click', menuClick );
        $( '.link--chapter' ).on( 'click', chapterNavigation );
        $( '.link--chapter' ).on( 'mouseenter', function( e ){
            hoverTimer = setTimeout(function(){
                chapterHover( e );
            }, hoverDelay );
        });
        $( '.link--chapter' ).on( 'mouseleave', function( e ){
            clearTimeout( hoverTimer );
            chapterOut( e );
        });
        $( '.link--showcase' ).on( 'click', showcaseClick );

        $( 'a[href^="#footnote_"]' ).on( 'click', footnoteClick );
        $( '.footnotes--close' ).on( 'click', function( e ){
            footnoteClose( e );
        });

        $(window).swipe( {
            swipe: function( event, direction ){
                
                var normalisedDirection = 'down';

                if( direction === 'down' ){
                    normalisedDirection = 'up';
                }

                if( direction === 'up' ){
                    normalisedDirection = 'down';
                }

                if( direction === 'down' || direction === 'up' ){
                    processScroll( normalisedDirection );
                }
            },
            threshold               : 0,
            preventDefaultEvents    : false,
            // triggerOnTouchLeave     : true, // produces errors in console
            fallbackToMouseEvents   : false,
            allowPageScroll         : 'none',
            fingers                 : 'all'
        });

        window.addEventListener( 'wheel', scrollJack, supportsPassive ? { passive: true } : false );

        window.addEventListener( 'resize', function( ){
            refreshClientGlobals();
            scrollToSection( state.section.position );
        }, supportsPassive ? { passive: true } : false );


        // Handle scroll inertia 
        // Unfortunately scroll event does not return direction -_-
        // Storing direction in state, and processing it when we have ended scrolling to ensure locked content changes
        var timer;
        $( '.content--scroll' ).on( 'scroll', function( ){
            if(timer) {
                clearTimeout(timer);
            }
            timer=setTimeout(function(){
                processScroll( state.scrolling.direction );
            },55);
        });


    }

/*********************************************

>   Analytics

*/

    function trackChapterChange( $newChapter, $oldChapter ){

        var nextChapterName = $newChapter.attr( 'id' ),
            prevChapterName = '';

        // Push events to GA
        dataLayer.push({
            'event': 'chapterStart',
            'chapter': nextChapterName
        });

        if( $oldChapter ){
            prevChapterName = $oldChapter.attr( 'id' );
            dataLayer.push({
                'event': 'chapterEnd',
                'chapter': prevChapterName
            });
        }
    }

    function trackFootnoteClick( footnoteID ){
        dataLayer.push({
            'event': 'footnoteClick',
            'id': footnoteID
        });
    }

    return {
        state : state,
        init : init
    };

})();

GWL.page.init();
