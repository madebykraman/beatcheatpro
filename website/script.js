const items=document.querySelectorAll('.feature,.step,.principles article,.hero-copy,.hero-visual');
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');observer.unobserve(e.target)}}),{threshold:.12});
items.forEach((el,i)=>{el.style.transitionDelay=Math.min(i*.035,.28)+'s';observer.observe(el)});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const el=document.querySelector(a.getAttribute('href'));if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'})}}));

const hero=document.querySelector('.hero-visual');
if(hero){
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    hero.style.transform='perspective(900px) rotateX('+(-y*3)+'deg) rotateY('+(x*4)+'deg) translateY(-4px)';
  });
  hero.addEventListener('pointerleave',()=>hero.style.transform='');
}