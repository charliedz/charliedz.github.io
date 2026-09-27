document.querySelector('#year').textContent = new Date().getFullYear();

(() => {
  const tabs = [...document.querySelectorAll('[data-visual]')];
  const note = document.querySelector('.diagram-note');
  if (document.querySelector('#homotopy-diagram').dataset.ready !== 'true') return;

  function select(tab, focus = false) {
    const changed=tab.getAttribute('aria-selected')!=='true';
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const panel=document.getElementById(tab.getAttribute('aria-controls'));
      panel.getAnimations().forEach(animation=>animation.cancel());
      panel.animate([{opacity:0},{opacity:1}],{duration:320,easing:'ease-out'});
    }
    note.open = false;
    if (focus) tab.focus({preventScroll:true});
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });

  for (const id of ['show-homotopy', 'homotopy-thumbnail']) {
    const button = document.getElementById(id);
    button.hidden = false;
    button.addEventListener('click', () => {
      select(tabs[1], true);
      document.querySelector('.visualization').scrollIntoView({block:'center', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
  }
  document.addEventListener('click', event => { if (!note.contains(event.target)) note.open = false; });
  note.addEventListener('keydown', event => {
    if (event.key === 'Escape') { note.open = false; note.querySelector('summary').focus(); }
  });
  document.querySelector('.visual-tabs').hidden = false;
})();
