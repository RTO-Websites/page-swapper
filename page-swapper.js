/************************************
 * Author: Sascha Hennemann
 * Last change: 08.10.2015 17:06
 *
 *
 * Requrires: jquery, modernizr, owl.carousel2
 *
 * License: GPL v3
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 ************************************/


var PageSwapper = function(args) {
    var win = window,
        doc = win.document,
        self = this,

        defaultArgs = {
            disableCache : false,
            debug : false,
            tabSelector : '.tab',
            owlConfig: {}
        },

        owlDefaultArgs = {
            margin: 20,
            mouseDrag: false,
            touchDrag: false,
        },
    // private vars
        container = null,
        host = 'http://' + win.location.host,
        currentUrl = win.location.href,
        hash = '',
        tabSelector = null,

    // private functions
        debug,
        loadComplete,
        checkHash,
        changeUrl,
        addIdPrefixes,
        removeIdPrefixes,
        finish,
        init;


    init = function() {
        args = jQuery.extend( defaultArgs, args );
        args.id = 'page-swapper';

        container = jQuery( jQuery( args.container )[0] );
        tabSelector = args.tabSelector;

        // wrap current content with item
        container.wrapInner('<div class="tab psw-starttab" data-url="' + win.location.href + '"></div>');

        // Set CSS and classes
        container.addClass('psw-container');
        container.addClass('owl-carousel');

        // Set Click-Events to all <a>
        jQuery('body').on('click', 'a:not(a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".gif"], a[href*=".JPG"], a[href*=".GIF"], a[href*=".PNG"], a[href*=".JPEG"])', self.linkClick);

        // pushstatechange -> backbutton
        jQuery(win).on('popstate', function() { self.open(doc.location.href); });

        var owlArgs = jQuery.extend( owlDefaultArgs, args.owlConfig );
        owlArgs = jQuery.extend(owlArgs,{
            items: 1,
            autoHeight: true,
        });

        // init owl
        container.owlCarousel(owlArgs);

        // add css and classes to first item
        var curTab = container.find('.psw-starttab').parent();
        curTab.data('url', win.location.href)
        curTab.data('title', doc.title)
        curTab.data('bodyclass', jQuery('body').prop('class').replace('no-js', ''));

        debug('psw init', self, container, args);
    };

    self.linkClick = function(event) {
        if (!event || !event.target) {
            return;
        }

        // Find <a> from clicked element
        var clickedElement = jQuery(event.target);
        if (!clickedElement.is('a')) {
            clickedElement = clickedElement.closest('a');
        }
        if (!clickedElement.prop('href')) {
            return;
        }
        if (clickedElement.hasClass('no-ajax')) {
            return;
        }
        var url = clickedElement.prop('href');
        if (url.indexOf(host) === -1) {
            // external -> return
            return;
        }
        if (url.indexOf('mailto:') !== -1) {
            return;
        }

        // Check for file-endings
        var filteredFileEndings= ['zip', 'exe', 'rar', 'pdf', 'doc', 'gif', 'png', 'jpg', 'jpeg', 'bmp', 'mp4', 'mp3'],
            fileEnding = url.split('.');
        fileEnding = fileEnding[ fileEnding.length -1 ];
        if ( jQuery.inArray( fileEnding, filteredFileEndings ) !== -1 ) {
            return;
        }

        // Start Opening
        event.preventDefault();
        self.open(url);
    };

    /**
     * Opens a Url
     *
     * @param {type} url
     * @returns {undefined}
     */
    self.open = function(url) {
        var splittedUrl = url.split('#');
        hash = '';
        url = splittedUrl[0];
        if (typeof(splittedUrl[1]) !== 'undefined') {
            hash = splittedUrl[1];
        }

        // callback
        container.trigger('psw-beforeopen', {
            'container' : container,
            'url' : url,
            'hash': hash,
            'currentUrl' : currentUrl
        });
        debug('psw beforeOpen', self, container, args, url, hash, currentUrl);

        if (currentUrl === url) {
            checkHash();
            return;
        }

        var cacheElement = container.find('.owl-item[data-url="' + url + '"]');
        if (cacheElement.length > 0) {
            self.openFromCache(cacheElement, url);
            return;
        }

        jQuery('body').removeClass('psw-finish-loading').addClass('psw-loading');

        jQuery.ajax({
            dataType: 'text',
            type: 'GET',
            url: url,
            data: null,
            success: function(data, textStatus, jqXHR) {
                loadComplete(data, textStatus, url, jqXHR);
            },
            error: function() {
                jQuery('body').removeClass('psw-loading');
                jQuery('body').addClass('psw-loaderror');
                errorTimeout = setTimeout(function() { jQuery('body').removeClass('psw-loaderror'); }, 1000);
            }
        });

        // callback
        container.trigger('psw-loadstart', {
            'container' : container,
            'url' : url,
            'hash': hash,
            'currentUrl' : currentUrl
        });
        debug('psw loadstart', self, container, args, url, hash, currentUrl);
    };

    /**
     * Loading of page is complete
     *
     * @param {type} data
     * @param {type} textStatus
     * @param {type} url
     * @returns {undefined}
     */
    loadComplete = function(data, textStatus, url, jqXHR) {
        jQuery('body').removeClass('psw-loading').addClass('psw-finish-loading');

        var newTab = jQuery('<div class="tab" />');

        if (!jqXHR) {
            return false;
        }
        var contentHeader = jqXHR.getResponseHeader('Content-Type');
        if (contentHeader.indexOf('text/html') === -1) {
            return false;
        }

        debug('psw loadComplete', self, container, args, url, hash, currentUrl, jqXHR);

        var currentTab = container.find('> .active'),
            title = data.match(/<title>(.*?)<\/title>/);

        if (title && title[1]) {
            title = title[1];
        } else {
            title = '';
        }

        // Parse data
        data = data.replace('<body', '<body><div id="psw-body"').replace('</body>', '</div></body');
        var newHtml = jQuery.parseHTML(data, true);
        newHtml = jQuery(newHtml);

        if (newHtml.filter('#psw-body').length > 0) {
            // Add new class to body
            var bodyClass = newHtml.filter('#psw-body').prop('class').replace('no-js', '');
            var oldClasses = jQuery('body').prop('class');

            if (args.selector === 'body') {
                bodyClass += ' page-swapper ';
            }
            jQuery('body').removeClass(oldClasses)
                .addClass(bodyClass);
            newTab.parent().data('bodyclass', bodyClass);
        }

        var content = newHtml.find(args.selector);
        if (content.length === 0) {
            content = newHtml.filter('#psw-body');
        }

        // add tab to swapper
        container.trigger('add.owl.carousel', newTab);
        container.trigger('refresh.owl.carousel');

        // set new ids for prevent mulitple ids
        addIdPrefixes(currentTab);

        // add html to tab
        try {
            newTab.html(content.html());
        } catch(e) {
            content.find('script').remove();
            newTab.html(content.html());
        }

        changeUrl(url, title);

        // set url and title to data
        newTab.parent().attr('data-url', url).data('title', title);

        // jump to tab on owl
        container.trigger('to.owl.carousel', newTab.parent().index());


        finish(newTab.parent(), {
            'container' : container,
            'oldTab' : currentTab,
            'newTab' : newTab.parent(),
            'url': url,
            'currentUrl' : currentUrl
        });
    };

    self.openFromCache = function(element, url) {
        addIdPrefixes(container.find('> .active'));
        removeIdPrefixes(element);

        var oldHtml = element.html();
        element.empty().html(oldHtml); // for new js-parsing

        changeUrl(url, element.data('title'));

        debug('psw openFromCache', url, element );

        var bodyClass = element.data('bodyclass');
        if (args.selector === 'body') {
            bodyClass += ' page-swapper ';
        }
        jQuery('body').removeClass(jQuery('body').prop('class'))
            .addClass(bodyClass);


        // callback
       finish( element, {
            'container' : container,
            'oldTab' : container.find('> .active'),
            'newTab' : element,
            'url': url,
        });
    };

    /**
     * Finish all and change item in owlCarousel
     *
     * @param owlItem
     * @param callbackArgs
     */
    finish = function(owlItem, callbackArgs) {
        // callback
        container.trigger('psw-loadcomplete', callbackArgs);
        container.trigger('to.owl.carousel', owlItem.index());

        /**
         * Track ajax
         */
        if (typeof _gaq !== "undefined" && _gaq !== null) {
            _gaq.push(['_trackPageview', args.url]);
        }
    };

    /**
     * Checks hash and scroll to hash-offset
     */
    checkHash = function() {
        debug('psw checkHash', self, container, args, hash, currentUrl);
        if (hash && jQuery('#' + hash).length > 0) {
            jQuery('html,body').animate({ scrollTop: jQuery('#' + hash).offset().top }, 600);
            hash = '';
        }
    };

    /**
     *  set new ids for prevent mulitple ids
     *
     * @param {type} tab
     * @returns {undefined}
     */
    addIdPrefixes = function(tab) {
        tab.find('*').each(function(index, element) {
            if (element.id.length > 0) {
                element.id = 'psw-rm-' + element.id;
            }
        });
    };
    /**
     *  remove new ids for prevent mulitple ids
     *
     * @param {type} tab
     * @returns {undefined}
     */
    removeIdPrefixes = function(tab) {
        tab.find('*').each(function(index, element) {
            if (element.id.length > 0) {
                element.id = element.id.replace('psw-rm-', '');
            }
        });
    };

    changeUrl = function(url, title) {
        currentUrl = url;
        // change pushstate
        if (win.history && typeof(win.history.pushState) !== 'undefined') {
            // pushState({  Params }, Title, Path);
            win.history.pushState({ }, title, url);
            doc.title = title;
        }
    };

    /**
     * Use only of you know what you do
     *
     * @param url
     */
    self.changeCurrentUrl = function(url) {
        currentUrl = url;
    };

    debug = function() {
        if ( args.debug ) {
            console.info( arguments );
        }
    };

    /**
     * Sets debug-mode
     *
     * @returns {undefined}
     */
    self._debug = function() {
        if ( args.debug ) {
            args.debug = false;
        } else {
            args.debug = true;
        }
    };

    init();
};

jQuery.fn.pageSwapper = function(args) {
    if (typeof(args) === 'undefined') {
        args = {};
    }
    args.selector = this.selector;
    this.each(function(index, element) {
        if (typeof(document.pageSwapperInstance) === 'undefined') {
            args.container = jQuery(element);
            document.pageSwapperInstance = new PageSwapper(args);
        }
    });
};