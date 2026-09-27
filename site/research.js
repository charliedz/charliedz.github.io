/* Open linked disclosures before scrolling; ordinary anchors still work without JS. */
(() => {
  function revealDetails() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (target?.tagName === 'DETAILS') target.open = true;
  }
  revealDetails();
  window.addEventListener('hashchange', revealDetails);
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (target?.tagName === 'DETAILS') target.open = true;
    });
  });
  if (document.querySelector('#homotopy-diagram')?.dataset.ready === 'true' &&
      document.querySelector('#synthetic-particles')?.getContext('2d')) {
    document.querySelectorAll('[data-diagram-control]').forEach(button => { button.hidden = false; });
  }
})();
