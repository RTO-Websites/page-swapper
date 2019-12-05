/*
  psw: {container, instance, args}
*/
PageSwapper.sliders.swiper = {
    defaultArgs: {
        slidesPerView: 1,
        autoHeight: 1,
        loop: false,
        spaceBetween: 20,
        allowTouchMove: false,
        calculateHeight: true,
        observer: false,
    },
    swiperInstance: null,
    container: null,
    $container: null,

  init: function(psw) {
      let args = $.extend(PageSwapper.sliders.swiper.defaultArgs, psw.args.sliderConfig),
          container = typeof (psw.container) === 'string' ? psw.container : psw.container[0],
          self = this;

      PageSwapper.sliders.swiper.container = container;
      PageSwapper.sliders.swiper.$container = $(container);

      $(container).wrapInner('<div class="swiper-slide psw-item active" />');
      $(container).wrapInner('<div class="swiper-wrapper psw-stage" />');
      $(container).before('<div style="height:0;"><span style="display:inline-block;" /></div>');

      PageSwapper.sliders.swiper.swiperInstance = new Swiper(container, args);

      PageSwapper.sliders.swiper.swiperInstance
        .on('slideChange', function () {
          PageSwapper.sliders.swiper.$container.find('.psw-item').removeClass('active');

          self.getCurrent().addClass('active');
        })
        .on('slideChangeTransitionEnd', function () {
          PageSwapper.sliders.swiper.swiperInstance.updateAutoHeight(200);
        });


      this.lastPswHeight = 0;
      setInterval(function() {
        let currentPswHeight = $('.psw-item.active .psw-tab').height();
        if (this.lastPswHeight !== currentPswHeight) {
          PageSwapper.sliders.swiper.swiperInstance.updateAutoHeight(150);
          this.lastPswHeight = currentPswHeight;
        }
      }, 200);
    },

    to: function(psw, index) {
        PageSwapper.sliders.swiper.swiperInstance.slideTo(index);
    },

    add: function(psw, newTab) {
        let item = $('<div class="swiper-slide psw-item" />');
        item.append(newTab);
        PageSwapper.sliders.swiper.swiperInstance.appendSlide(item[0]);
    },

    remove: function(psw, tab) {
        PageSwapper.sliders.swiper.swiperInstance.removeSlide(tab.index());
    },

    setClasses: function(psw) {
        let $container = PageSwapper.sliders.swiper.$container;
        $container.addClass('psw-container');
        $container.find('> .swiper-wrapper').addClass('psw-stage');

        // add element classes
        $container.find('.psw-stage > .swiper-slide').addClass('psw-item');
    },

    getCurrent: function(psw) {
        return $(PageSwapper.sliders.swiper.$container.find('.psw-item')
          .get(PageSwapper.sliders.swiper.swiperInstance.activeIndex));
    },
};