(() => {
  'use strict';
  const controls=document.querySelector('.identity-switch');
  const buttons=[...controls.querySelectorAll('button')];
  const marks=[...document.querySelectorAll('[data-logo]')];
  for(const button of buttons) {
    button.addEventListener('click',()=>{
      const mono=button.dataset.treatment==='mono';
      for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
      for(const mark of marks)mark.src=`assets/logos/${mark.dataset.logo}${mono?'-mono':''}.svg`;
    });
  }
  controls.hidden=false;
})();
