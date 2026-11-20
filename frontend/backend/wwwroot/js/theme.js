/* The shell owns the preference and animates one circular reveal across its iframe. */
(() => {
    'use strict';
    const key='campus-theme',documents=new Set([document]);
    const system=window.matchMedia('(prefers-color-scheme: dark)'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const read=()=>{try{return localStorage.getItem(key);}catch{return null;}};
    const saved=read();
    let mode=['light','dark'].includes(saved)?saved:system.matches?'dark':'light',busy=false;
    const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 14A9 9 0 0 1 10 3.3 9 9 0 1 0 20.7 14Z"/></svg>';
    const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
    function update(doc){
        doc.documentElement.dataset.theme=mode;
        doc.documentElement.classList.toggle('theme-changing',busy);
        doc.querySelectorAll('.theme-toggle').forEach(button=>{
            button.setAttribute('aria-label','Switch to '+(mode==='dark'?'light':'dark')+' mode');
            button.setAttribute('aria-pressed',String(mode==='dark'));
            button.title=button.getAttribute('aria-label');button.disabled=busy;
            button.innerHTML=(mode==='dark'?sun:moon)+'<span class="theme-toggle-label">'+(mode==='dark'?'Light mode':'Dark mode')+'</span>';
        });
    }
    function attach(doc){documents.add(doc);update(doc);}
    function apply(next,persist=true){
        mode=next;
        for(const doc of documents){if(doc!==document&&doc.defaultView?.document!==doc){documents.delete(doc);continue;}update(doc);}
        if(persist)try{localStorage.setItem(key,mode);}catch{/* The in-memory preference still works when storage is unavailable. */}
    }
    function setBusy(value){busy=value;documents.forEach(doc=>{doc.documentElement.classList.toggle('theme-changing',value);doc.querySelectorAll('.theme-toggle').forEach(button=>button.disabled=value);});}
    async function toggle(button){
        if(busy)return;
        const next=mode==='dark'?'light':'dark';
        if(motion.matches){setBusy(true);apply(next);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));setBusy(false);return;}
        setBusy(true);
        const rect=button.getBoundingClientRect(),frame=button.ownerDocument.defaultView.frameElement?.getBoundingClientRect();
        const x=rect.left+rect.width/2+(frame?.left||0),y=rect.top+rect.height/2+(frame?.top||0);
        const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+4;
        const clips=[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`];
        try{
            if(document.startViewTransition){
                const transition=document.startViewTransition(()=>apply(next));
                try{
                    await transition.ready;
                    const animation=document.documentElement.animate({clipPath:clips},{duration:650,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'});
                    await animation.finished;
                }catch{/* Hidden tabs may skip snapshots; the preference is still applied. */}
                await transition.finished.catch(()=>{});
            }else{
                const overlay=document.createElement('div');overlay.className='theme-reveal-overlay';overlay.dataset.next=next;overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
                try{await overlay.animate({clipPath:clips},{duration:500,easing:'ease-in-out',fill:'forwards'}).finished;}finally{apply(next);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));overlay.remove();}
            }
        }finally{setBusy(false);}
    }
    function mount(doc){
        attach(doc);if(doc.querySelector('.theme-toggle'))return;
        const button=doc.createElement('button');button.type='button';button.className='theme-toggle';button.addEventListener('click',()=>toggle(button));
        const sidebar=doc.querySelector('.dashboard-sidebar .preview-toolbar');
        const publicActions=doc.querySelector('.premium-nav .nav-auth');
        const toolbar=doc.querySelector('.preview-toolbar:not([hidden])');
        const registerHeader=doc.body.dataset.section==='auth'?doc.querySelector('header'):null;
        const loginBack=doc.querySelector('.form-panel > .back');
        if(registerHeader&&!sidebar&&!publicActions&&!toolbar){
            const actions=doc.createElement('div');actions.className='auth-header-actions';
            const back=registerHeader.querySelector('.back');
            if(back)actions.append(back);
            actions.append(button);registerHeader.append(actions);
        }
        else if(sidebar||publicActions||toolbar)(sidebar||publicActions||toolbar).append(button);
        else if(loginBack){const row=doc.createElement('div');row.className='auth-theme-row';loginBack.before(row);row.append(loginBack,button);}
        else{button.classList.add('theme-toggle-floating');doc.body.append(button);}
        update(doc);
    }
    window.CampusTheme=Object.freeze({attach,mount,toggle,get mode(){return mode;},get switching(){return busy;}});
    update(document);
    system.addEventListener('change',()=>{if(!['dark','light'].includes(read()))apply(system.matches?'dark':'light',false);});
    window.addEventListener('storage',event=>{if(event.key===key)apply(['dark','light'].includes(event.newValue)?event.newValue:system.matches?'dark':'light',false);});
})();
