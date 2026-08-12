/* Home page motion — docs/03-creative-direction.md §4.
   Only hero type-reveal (§4.4) and pillar-card scroll-in + tilt (§4.1/§4.2)
   are in scope here. Brand story / trust strip stay static per §4.5 -
   motion budget isn't spent where it doesn't serve routing or credibility. */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.gsap) return;

  // Hero type reveal, on load (§4.4)
  gsap.from('.hero-headline, .hero-sub', {
    y: 24,
    opacity: 0,
    duration: 1,
    ease: 'power2.out',
    stagger: 0.15,
  });

  // Pillar cards scroll-in (§4.1)
  if (window.ScrollTrigger) {
    gsap.from('.pillar-card', {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.15,
      scrollTrigger: {
        trigger: '.pillars',
        start: 'top 80%',
      },
    });
  }

  // Restrained tilt-on-hover (§4.2 — not a full 3D scene, small rotation only)
  document.querySelectorAll('.pillar-card').forEach((card) => {
    const maxTilt = 4;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateX: -py * maxTilt,
        rotateY: px * maxTilt,
        duration: 0.4,
        ease: 'power2.out',
        transformPerspective: 800,
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' });
    });
  });
});
