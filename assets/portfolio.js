/* Work page — filter toggle. Both filters currently show the same
   "coming soon" empty state (docs/04 §0/§4), so this only tracks which
   button is visually active; real filtering logic gets added once real
   entries exist. */

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});
