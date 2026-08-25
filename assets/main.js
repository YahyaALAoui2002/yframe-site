document.addEventListener('DOMContentLoaded', () => {

  // Lenis smooth scroll
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.08 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  // AOS
  if (window.AOS) AOS.init({ duration: 700, once: true, offset: 80 });

  // Nav scroll state + scroll progress bar
  const nav = document.getElementById('nav');
  const progress = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    if (nav) {
      if (window.scrollY > 80) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }
    if (progress) {
      const h = document.documentElement;
      const scrolled = (h.scrollTop || document.body.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      progress.style.width = scrolled + '%';
    }
  });

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const mobileOverlay = document.getElementById('mobileOverlay');
  if (hamburger && mobileOverlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileOverlay.classList.toggle('open');
    });
    document.querySelectorAll('.mobile-overlay a').forEach(a => a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileOverlay.classList.remove('open');
    }));
  }

  // tsParticles (only if a #particles element exists on this page)
  if (document.getElementById('particles') && window.tsParticles) {
    tsParticles.load('particles', {
      particles: {
        number: { value: 28 },
        color: { value: '#ffffff' },
        opacity: { value: 0.18, random: true, animation: { enable: true, speed: 0.6, minimumValue: 0.05, sync: false } },
        size: { value: 2, random: true },
        move: { enable: true, speed: 0.5, direction: 'top', random: true, straight: false, outModes: 'out' },
        shape: { type: 'circle' }
      },
      detectRetina: true
    });
  }

  // Vanilla Tilt on service / include cards
  if (window.VanillaTilt) {
    VanillaTilt.init(document.querySelectorAll('.service-card, .include-card'), { max: 6, speed: 400, glare: true, 'max-glare': 0.15, perspective: 800 });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // SEO page: SERP click-through bars fill in when scrolled into view
  const serpRows = document.querySelectorAll('.serp-row');
  if (serpRows.length) {
    const serpObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          serpObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    serpRows.forEach(row => serpObserver.observe(row));
  }

  // Contact form (index page)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      this.innerHTML = '<div style="text-align:center;padding:40px 0;"><p style="font-size:24px;font-weight:700;color:#0066FF;">Got it. We will be in touch within 2 hours.</p><p style="font-size:16px;color:#666;margin-top:8px;">Check your inbox, we usually reply by email first.</p></div>';
    });
  }
});
