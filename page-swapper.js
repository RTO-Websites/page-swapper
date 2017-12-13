/************************************
 * Author: Sascha Hennemann
 * Last change: 13.12.2017 10:29
 *
 *
 * Requrires: jQuery, modernizr, owl.carousel2
 *
 * License: GPL v3
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 ************************************/


var PageSwapper = function (args) {
  var win = window,
    doc = win.document,
    self = this,

    defaultArgs = {
      disableCache: false,
      debug: false,
      sliderConfig: {},
      //owlVersion: 2,

      sliderType: 'owl',
    },

    // private vars
    container = null,
    host = win.location.protocol + '//' + win.location.host,
    currentUrl = win.location.href,
    hash = '',
    initFailed = false,

    sliderArgs = {};

  pswXhr = null;


  var init = function () {
    if (!win.$) {
      win.$ = jQuery;
    }

    args = $.extend(defaultArgs, args);
    args.id = 'page-swapper';

    container = $($(args.container)[0]);

    sliderArgs = {
      args: args,
      container: container,
      instance: self,
    };

    if (container.is('body')) {
      // wrap all if container is body
      container.wrapInner('<div class="psw-body"></div>');
      container = container.find('> .psw-body');
    }

    // wrap current content with item
    container.wrapInner('<div class="tab psw-starttab psw-tab"></div>');


    // Set Click-Events to all <a>
    $('body').on('click', 'a:not(a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".gif"], a[href*=".JPG"], a[href*=".GIF"], a[href*=".PNG"], a[href*=".JPEG"])', self.linkClick);

    // pushstatechange -> backbutton
    $(win).on('popstate', function () {
      self.open(doc.location.href);
    });


    container.addClass('psw-container');

    // init slider
    PageSwapper.sliders[args.sliderType].init(sliderArgs);

    // add css and classes to first item
    var curTab = container.find('.psw-starttab');
    curTab.attr('data-url', win.location.href);
    curTab.data('title', doc.title);
    curTab.data('bodyclass', $('body').prop('class').replace('no-js', ''));
    curTab.data('originalhtml', '');

    debug('psw init', self, container, args);

    self.setClasses();
  };

  self.setArgs = function (newArgs) {
    args = $.extend(args, newArgs);
  };

  /**
   * Click-Event for links
   *
   * @param event
   */
  self.linkClick = function (event) {
    if (!event || !event.target || initFailed) {
      return;
    }

    // Find <a> from clicked element
    var clickedElement = $(event.target);
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
    var filteredFileEndings = ['zip', 'exe', 'rar', 'pdf', 'doc', 'gif', 'png', 'jpg', 'jpeg', 'bmp', 'mp4', 'mp3'],
      fileEnding = url.split('.');
    fileEnding = fileEnding[fileEnding.length - 1];
    if ($.inArray(fileEnding, filteredFileEndings) !== -1) {
      return;
    }

    // Start Opening
    event.preventDefault();
    self.open(url, event);
  };

  /**
   * Opens a Url
   *
   * @param {type} url
   * @returns {undefined}
   */
  self.open = function (url, event) {
    var splittedUrl = url.split('#');
    hash = '';
    url = splittedUrl[0];
    if (typeof(splittedUrl[1]) !== 'undefined') {
      hash = splittedUrl[1];
    }

    if (currentUrl === url) {
      checkHash();
      return;
    }

    // callback
    container.trigger('psw-beforeopen', {
      'container': container,
      'url': url,
      'hash': hash,
      'currentUrl': currentUrl,
      'clickEvent': event,
    });
    debug('psw beforeOpen', self, container, args, url, hash, currentUrl);

    var hasCache = checkForCache(url);
    if (hasCache) {
      return;
    }

    $('body').removeClass('psw-finish-loading').addClass('psw-loading');

    if (pswXhr) {
      // abort previous ajax
      pswXhr.abort();
      pswXhr = null;
    }

    pswXhr = $.ajax({
      dataType: 'text',
      type: 'GET',
      url: url,
      data: {pswLoad: 1},
      success: function (data, textStatus, jqXHR) {
        loadComplete(data, textStatus, url, jqXHR);
      },
      error: function () {
        $('body').removeClass('psw-loading');
        $('body').addClass('psw-loaderror');
        errorTimeout = setTimeout(function () {
          $('body').removeClass('psw-loaderror');
        }, 1000);
      }
    });

    // callback
    container.trigger('psw-loadstart', {
      'container': container,
      'url': url,
      'hash': hash,
      'currentUrl': currentUrl,
      'clickEvent': event,
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
  var loadComplete = function (data, textStatus, url, jqXHR) {
    $('body').removeClass('psw-loading').addClass('psw-finish-loading');


    var newTab = $('<div class="tab psw-tab" />'),
      currentTab = self.getCurrent(),
      tabData,
      pswPageId = '',
      title = '',
      bodyClass = '';

    if (!jqXHR) {
      return false;
    }
    var contentHeader = jqXHR.getResponseHeader('Content-Type');
    if (contentHeader.indexOf('text/html') === -1) {
      return false;
    }

    debug('psw loadComplete', self, container, args, url, hash, currentUrl, jqXHR);

    title = getTitleFromData(data);
    tabData = getTabFromData(data);

    content = tabData.content;
    bodyClass = tabData.bodyClass;

    // add tab to swapper
    PageSwapper.sliders[args.sliderType].add(sliderArgs, newTab);

    // set new ids for prevent mulitple ids
    addIdPrefixes(currentTab);

    newTab.data('originalhtml', content.html());

    // add html to tab
    setHtmlToTab(newTab, content);

    changeUrl(url, title);

    // set url and title to data
    newTab.attr('data-url', url).data('title', title);
    newTab.data('bodyclass', bodyClass);
    newTab.parent().addClass('psw-item');

    finish(newTab.parent(), {
      'container': container,
      'oldTab': currentTab,
      'newTab': newTab.parent(),
      'url': url,
      'currentUrl': currentUrl,
      'fullHtml': tabData.fullHtml,
    });
  };

  /**
   * Jump to item that already exists
   *
   * @param element
   * @param url
   */
  self.openFromCache = function (element, url) {
    // remove-id-prefixes from newtab and add to oldtab
    var currentItem = self.getCurrent();
    addIdPrefixes(currentItem);
    removeIdPrefixes(element.parent());

    var orgHtml = element.data('originalhtml');

    // reset html for new js-parsing
    if (!orgHtml || !orgHtml.length) {
      getOriginalHtml(element);
    } else {
      element.empty().html(orgHtml); // for new js-parsing
    }

    changeUrl(url, element.data('title'));

    debug('psw openFromCache', url, element, orgHtml);

    var bodyClass = element.data('bodyclass');
    if (args.selector === 'body') {
      bodyClass += ' page-swapper ';
    }

    $('body').removeClass($('body').prop('class'))
      .addClass(bodyClass);

    // callback
    finish(element.parent(), {
      'container': container,
      'oldTab': self.getCurrent(),
      'newTab': element.parent(),
      'url': url,
    });
  };

  /**
   * Finish all and change item in owlCarousel
   *
   * @param owlItem
   * @param callbackArgs
   */
  var finish = function (owlItem, callbackArgs) {
    // callback
    container.trigger('psw-loadcomplete', callbackArgs);
    // jump to tab on owl
    self.jumpTo(owlItem.index());

    debug('psw finish', owlItem, owlItem.index());

    checkHash();

    /**
     * Track ajax
     */
    if (typeof _gaq !== "undefined" && _gaq !== null) {
      _gaq.push(['_trackPageview', args.url]);
    }
    if (typeof(ga) !== 'undefined' && ga !== null) {
      ga('send', 'pageview', location.pathname);
    }

    if (typeof(Piwik) !== 'undefined' && Piwik !== null) {
      var tracker = Piwik.getTracker();
      tracker.setCustomUrl(window.location.href);
      tracker.setDocumentTitle(document.title);
      tracker.trackPageView();
    }
  };

  /**
   * Jumps to index in owl
   *
   * @param index
   */
  self.jumpTo = function (index) {
    PageSwapper.sliders[args.sliderType].to(sliderArgs, index);
  };

  /**
   * Check if page is already loaded
   *
   * @param url
   * @returns {boolean}
   */
  var checkForCache = function (url) {
    var cacheElement = container.find('.psw-tab[data-url="' + url + '"]');
    if (!cacheElement.length) {
      // find with trailing slash
      cacheElement = container.find('.psw-tab[data-url="' + url + '/"]');
    }

    if (cacheElement.length > 0) {
      // open from cache
      self.openFromCache(cacheElement, url);
      return true;
    }

    return false;
  };

  /**
   * Checks hash and scroll to hash-offset
   */
  var checkHash = function () {
    debug('psw checkHash', self, container, args, hash, currentUrl);
    if (!args.disableHash && hash && $('#' + hash).length > 0) {
      $('html,body').animate({scrollTop: $('#' + hash).offset().top}, 600);
      hash = '';
    }
  };


  /**
   *  set new ids for prevent mulitple ids
   *
   * @param {type} tab
   * @returns {undefined}
   */
  var addIdPrefixes = function (tab) {
    tab.find('*').each(function (index, element) {
      if (element.id.length > 0) {
        element.id = 'psw-rm-' + element.id;
      }
    });
  };

  /**
   * Removes a tab from swapper
   *
   * @param tab
   */
  var removeTab = function (tab) {
    PageSwapper.sliders[args.sliderType].remove(sliderArgs, tab);
  };

  /**
   *  remove new ids for prevent mulitple ids
   *
   * @param {type} tab
   * @returns {undefined}
   */
  var removeIdPrefixes = function (tab) {
    tab.find('*').each(function (index, element) {
      if (element.id.length > 0) {
        element.id = element.id.replace('psw-rm-', '');
      }
    });
  };


  /**
   * Set classes for container and items
   */
  self.setClasses = function () {
    // add psw-classes
    container.addClass('psw-container');

    PageSwapper.sliders[args.sliderType].setClasses(sliderArgs);
  };

  /**
   * return the current element
   *
   * @returns {*}
   */
  self.getCurrent = function () {
    return PageSwapper.sliders[args.sliderType].getCurrent(sliderArgs);
  };

  var changeUrl = function (url, title) {
    currentUrl = url;
    // change pushstate
    if (win.history && typeof(win.history.pushState) !== 'undefined') {
      // pushState({  Params }, Title, Path);
      win.history.pushState({}, title, url);
      doc.title = jQuery('<textarea />').html(title).text();
    }
  };


  /**
   * Gets tab-content from xhr-data
   *
   * @param data
   * @returns {*}
   */
  var getTabFromData = function (data) {
    // Parse data
    data = data.replace('<body', '<body><div id="psw-body"').replace('</body>', '</div></body');

    var newHtml = $.parseHTML(data, true),
      bodyClass;
    newHtml = $(newHtml);

    if (newHtml.filter('#psw-body').length > 0) {
      // Add new class to body
      bodyClass = newHtml.filter('#psw-body').prop('class').replace('no-js', '');
      var oldClasses = $('body').prop('class');

      if (args.selector === 'body') {
        bodyClass += ' page-swapper ';
      }
      $('body').removeClass(oldClasses)
        .addClass(bodyClass);
    }

    var content = newHtml.find(args.selector);
    if (content.length === 0) {
      content = newHtml.filter('#psw-body');
    }

    return {content: content, bodyClass: bodyClass, fullHtml: newHtml};
  };

  /**
   * Loads page and get html
   *
   * @param tab
   */
  var getOriginalHtml = function (tab) {
    debug('psw getOrgHtml', tab, tab.data('url'));
    pswXhr = $.ajax({
      dataType: 'text',
      type: 'GET',
      url: tab.data('url'),
      data: {pswLoad: 1},
      success: function (data, textStatus, jqXHR) {
        var content = getTabFromData(data).content;
        tab.data('originalhtml', content.html());
        // add html to tab
        setHtmlToTab(tab, content);
        debug('psw getOrgHtml finish', tab, content.html());
      },
    });
  };

  /**
   * Sets content to tab
   *
   * @param tab
   * @param content
   */
  var setHtmlToTab = function (tab, content) {
    try {
      tab.empty().html(content.html());
    } catch (e) {
      content.find('script').remove();
      tab.empty().html(content.html());
    }
  };

  /**
   * Extract title from xhr-data
   * @param data
   * @returns {*}
   */
  var getTitleFromData = function (data) {
    var title = data.match(/<title>(.*?)<\/title>/);

    if (title && title[1]) {
      title = title[1];
    } else {
      title = '';
    }

    return title;
  };

  /**
   * Use only of you know what you do
   *
   * @param url
   */
  self.changeCurrentUrl = function (url) {
    currentUrl = url;
  };

  var debug = function () {
    if (args.debug) {
      console.info(arguments);
    }
  };

  /**
   * Sets debug-mode
   *
   * @returns {undefined}
   */
  self._debug = function (debug) {
    args.debug = debug;
  };

  init();
};

jQuery.fn.pageSwapper = function (args) {
  if (typeof(args) === 'undefined') {
    args = {};
  }

  if (!typeof(args.selector) === 'undefined') {
    args.selector = this.selector;
  }

  if (typeof(args.selector) === 'undefined') {
    console.info('PageSwapper: No selector defined');
  }

  this.each(function (index, element) {
    if (typeof(document.pageSwapperInstance) === 'undefined') {
      args.container = jQuery(element);
      document.pageSwapperInstance = new PageSwapper(args);
    }
  });
};

PageSwapper.sliders = {};
