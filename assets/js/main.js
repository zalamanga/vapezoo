(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navbar = document.querySelector('#navbar');
  const menu = document.querySelector('.mobile-nav-toggle');
  const header = document.querySelector('#header');
  const topbar = document.querySelector('#topbar');
  const backToTop = document.querySelector('.back-to-top');
  const backToContact = document.querySelector('.back-to-wa');

  const setMenu = (open) => {
    if (!navbar || !menu) return;
    navbar.classList.toggle('navbar-mobile', open);
    menu.classList.toggle('bi-list', !open);
    menu.classList.toggle('bi-x', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
  };

  if (navbar && menu) {
    setMenu(false);
    menu.addEventListener('click', () => {
      setMenu(menu.getAttribute('aria-expanded') !== 'true');
    });
    navbar.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menu.focus();
      }
    });
    window.matchMedia('(min-width: 992px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbar .nav-link').forEach((link) => {
    const active = link.getAttribute('href') === currentPage;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  const updateScrollState = () => {
    const scrolled = window.scrollY > 100;
    header?.classList.toggle('header-scrolled', scrolled);
    topbar?.classList.toggle('topbar-scrolled', scrolled);
    backToTop?.classList.toggle('active', window.scrollY > 300);
    backToContact?.classList.toggle('active', window.scrollY > 1000);
  };
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  document.querySelectorAll('.scrollto').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true' || !link.getAttribute('href')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname
          || !url.hash || url.hash === '#') return;
      let target;
      try {
        target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      } catch {
        return;
      }
      if (!target) return;
      event.preventDefault();
      setMenu(false);
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight || 0),
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    });
  });

  backToTop?.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  const indicators = document.querySelector('#hero-carousel-indicators');
  if (indicators) {
    indicators.replaceChildren();
    document.querySelectorAll('#heroCarousel .carousel-item').forEach((item, index) => {
      const indicator = document.createElement('button');
      indicator.type = 'button';
      indicator.setAttribute('data-bs-target', '#heroCarousel');
      indicator.setAttribute('data-bs-slide-to', String(index));
      indicator.setAttribute('aria-label', `Slide ${index + 1}`);
      if (item.classList.contains('active')) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-current', 'true');
      }
      indicators.append(indicator);
    });
  }

  if (reducedMotion && window.bootstrap) {
    document.querySelectorAll('[data-bs-ride="carousel"]').forEach((element) => {
      element.removeAttribute('data-bs-ride');
      window.bootstrap.Carousel.getInstance(element)?.pause();
    });
  }

  if (typeof window.Swiper === 'function') {
    if (document.querySelector('.testimonials-slider')) {
      new window.Swiper('.testimonials-slider', {
        speed: reducedMotion ? 0 : 600,
        loop: true,
        autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false },
        slidesPerView: 'auto',
        pagination: { el: '.swiper-pagination', type: 'bullets', clickable: true },
      });
    }
    if (document.querySelector('.featured-products-carousel')) {
      new window.Swiper('.featured-products-carousel', {
        speed: reducedMotion ? 0 : 400,
        loop: true,
        autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false },
        slidesPerView: 'auto',
        pagination: { el: '.swiper-pagination', type: 'bullets', clickable: true },
        breakpoints: {
          320: { slidesPerView: 1, spaceBetween: 20 },
          768: { slidesPerView: 2, spaceBetween: 20 },
          1200: { slidesPerView: 3, spaceBetween: 20 },
        },
      });
    }
  }

  if (window.AOS) {
    if (!reducedMotion) document.documentElement.classList.add('aos-enabled');
    window.AOS.init({ duration: 1000, easing: 'ease-in-out', once: true, mirror: false, disable: reducedMotion });
  }
})();
