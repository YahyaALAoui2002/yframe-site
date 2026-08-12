/* Yframe — shared shell behavior (nav scroll-state, mobile menu, GSAP setup).
   Page-specific animations (hero scroll-split, card motion, etc.) are added
   per-page against docs/03-creative-direction.md as each page is built. */

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('mobileOverlay');
  const closeBtn = overlay ? overlay.querySelector('.close-btn') : null;

  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (hamburger && overlay) {
    const toggleOverlay = (open) => {
      overlay.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    hamburger.addEventListener('click', () => toggleOverlay(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleOverlay(false));
    overlay.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => toggleOverlay(false));
    });
  }
});
