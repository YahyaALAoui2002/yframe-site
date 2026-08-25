/* Contact page — service-type preselect from ?service= (set by CTA links on
   cinematic-video.html and web-digital.html), and FormSubmit.co AJAX
   submission (GitHub Pages is static, so the form POSTs to FormSubmit,
   which relays submissions to the studio inbox as email).

   The destination is base64-assembled rather than a plaintext address so
   repo/page scrapers don't harvest it; once the FormSubmit alias endpoint
   is activated, swap ENDPOINT to the alias and drop the encoding. */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const service = params.get('service');
  const select = document.getElementById('serviceSelect');
  if (service && select && select.querySelector(`option[value="${service}"]`)) {
    select.value = service;
  }

  const ENDPOINT =
    'https://formsubmit.co/ajax/' + atob('YWxhb3VpLnlhaHlhMjAyMEBnbWFpbC5jb20=');

  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  const setStatus = (msg, state) => {
    if (!status) return;
    status.textContent = msg;
    status.className = 'form-status ' + (state || '');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot: real visitors never fill this hidden field.
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value) return;

    const data = new FormData(form);
    const serviceLabel = select.options[select.selectedIndex]
      ? select.options[select.selectedIndex].text
      : data.get('service');

    const button = form.querySelector('button[type="submit"]');
    const buttonLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('', '');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || '-',
          service: serviceLabel,
          message: data.get('message'),
          _subject: `New enquiry — ${serviceLabel}`,
          _template: 'table',
          _captcha: 'false',
        }),
      });
      if (!res.ok) throw new Error(`FormSubmit responded ${res.status}`);
      form.reset();
      setStatus('Message sent — we’ll get back to you within one business day.', 'ok');
    } catch (err) {
      // Fallback keeps the lead reachable even if the relay is down.
      setStatus(
        'Something went wrong sending your message. Please email us directly at hello@yframe.studio or call +33 7 55 20 40 78.',
        'error'
      );
    } finally {
      button.disabled = false;
      button.textContent = buttonLabel;
    }
  });
});
