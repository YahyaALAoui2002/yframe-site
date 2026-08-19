/* Contact page — service-type preselect from ?service= (set by CTA links on
   cinematic-video.html and web-digital.html), and mailto: form submission
   (see note in contact.html - GitHub Pages has no backend to POST to). */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const service = params.get('service');
  const select = document.getElementById('serviceSelect');
  if (service && select && select.querySelector(`option[value="${service}"]`)) {
    select.value = service;
  }

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const serviceLabel = select.options[select.selectedIndex]
        ? select.options[select.selectedIndex].text
        : data.get('service');
      const body = [
        `Name: ${data.get('name')}`,
        `Email: ${data.get('email')}`,
        `Phone: ${data.get('phone') || '-'}`,
        `Service: ${serviceLabel}`,
        '',
        data.get('message')
      ].join('\n');
      const subject = `New enquiry — ${serviceLabel}`;
      window.location.href = `mailto:hello@yframe.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
});
