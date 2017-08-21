/************************************
 * Author: Sascha Hennemann
 * Last change: 21.08.2017 11:52
 *
 *
 * Requrires: jQuery, modernizr, owl.carousel2
 *
 * License: GPL v3
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 ************************************/

PageSwapper.sliders.owl = {

  owlDefaultArgs: {
    margin: 20,
    mouseDrag: false,
    touchDrag: false,
    disableHash: false
  },

  init: function(psw) {
    // arguments for owl
    var owlArgs = $.extend(PageSwapper.sliders.owl.owlDefaultArgs, psw.args.owlConfig, psw.args.sliderConfig);
    owlArgs = $.extend(owlArgs, {
      items: 1,
      singleItem: true, // for owl 1
      autoHeight: true,
    });

    // init owl
    try {
      psw.container.owlCarousel(owlArgs);
    } catch (e) {
      initFailed = true;
      console.info('psw-owl-init-error', e, psw.container, owlArgs);
      return;
    }

    // for owl v1
    if (psw.container.data('owl.carousel') && psw.container.data('owl.carousel')._plugins &&
      psw.container.data('owl.carousel')._plugins.autoHeight) {
      setInterval(function () {
        psw.container.data('owl.carousel')._plugins.autoHeight.update();
      }, 300);
    }

    // clear dom
    $(document).on('translated.owl.carousel', '.psw-container', function (e) {
      e.stopPropagation();
      if (!$(e.target).is('.psw-container')) {
        return;
      }
      $('.psw-item:not(.active) .psw-tab').empty();
    });
  },

  to: function(psw, index) {
    if (psw.args.owlVersion == 1) {
      psw.container.data('owlCarousel').goTo(index); // v1
    } else {
      psw.container.trigger('to.owl.carousel', index); // v2
    }
  },

  add: function(psw, newTab) {
    if (psw.args.owlVersion == 1) {
      // owl carousel 1
      psw.container.data('owlCarousel').addItem(newTab);
      // owl1 removes all classes and data from items
      psw.instance.setClasses();
    } else {
      // owl carousel 2
      psw.container.trigger('add.owl.carousel', newTab);
      psw.container.trigger('refresh.owl.carousel');
    }
  },

  remove: function(psw, tab) {
    // remove tab from swapper
    if (psw.args.owlVersion == 1) {
      // owl carousel 1
      psw.container.data('owlCarousel').removeItem(tab.index());
      // owl1 removes all classes and data from items
      psw.instance.setClasses();
    } else {
      // owl carousel 2
      psw.container.trigger('remove.owl.carousel', tab.index());
      psw.container.trigger('refresh.owl.carousel');
    }
  },

  setClasses: function(psw) {
    psw.container.addClass('owl-carousel');
    psw.container.find('> .owl-stage-outer, > .owl-wrapper-outer').addClass('psw-stage-outer');
    psw.container.find('> .owl-stage-outer > .owl-stage, > .owl-wrapper-outer > .owl-wrapper').addClass('psw-stage');

    // add element classes
    psw.container.find('.psw-stage > .owl-item').addClass('psw-item');
  },

  getCurrent: function(psw) {
    var curTab;
    if (psw.args.owlVersion == 1) {
      curTab = psw.container.find('.psw-item:nth-child(' + container.data('owlCarousel').currentItem + ')');
    } else {
      curTab = psw.container.find('.psw-item.active')
    }

    return curTab;
  }
};