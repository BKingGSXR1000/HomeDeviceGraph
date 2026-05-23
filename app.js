const KEY="deviceNetworkMap.clean.v12",W=180,H=86,OPTKEY="deviceNetworkMap.options.v1";
let t={
  x:0,y:0,s:1
}
,sel=new Set(),focusSel=new Set(),selC=null,drag=null,groupDrag=null,pan=null,lastUrl="",lastImgName="device-network-map.png",options=loadOptions(),filter={
  kind:"",name:"",conn:"",hide:false
}
,initialLayout=null,autoZoomLayout=true;
const $=id=>document.getElementById(id),svg=$("svg"),vp=$("vp"),groups=$("groups"),links=$("links"),nodes=$("nodes"),panel=$("panel"),status=$("status");

function uid(){
  return"id_"+Math.random().toString(36).slice(2,9)
}
function boxFill(n){
  return (n.kind==='repeater')?'#dbeafe':fill(n.type)
}
function msg(s,e=false){
  status.textContent=s;
  status.style.color=e?'var(--d)':'var(--m)';
  clearTimeout(msg.to);
  msg.to=setTimeout(()=>status.textContent='',4500)
}
function esc(s){
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
}
function trunc(s,m){
  s=String(s||'');
  return s.length>m?s.slice(0,m-1)+'…':s
}
function fill(type){
  return type==='router'?'#e0f2fe':type==='client'?'#ecfccb':type==='infra'?'#fae8ff':'#f8fafc'
}

function loadOptions(){
  try{
    return{
      relatedBorder:5,dimUnrelated:true,showNotes:false,...JSON.parse(localStorage.getItem(OPTKEY)||'{}')
    }
  }
  catch{
    return{
      relatedBorder:5,dimUnrelated:true,showNotes:false
    }
  }
}
function saveOptions(){
  try{
    localStorage.setItem(OPTKEY,JSON.stringify(options))
  }
  catch{
  }
}
function applyOptionsCss(){
  document.documentElement.style.setProperty('--rb',(options.relatedBorder||5)+'px')
}

function kindList(){
  return[['router','Router'],['repeater','Repeater'],['switch','Switch'],['desktop','Desktop PC'],['laptop','Laptop'],['console','Console / PS5'],['webcam','Webcam'],['printer','Printer'],['homeassistant','Home Assistant'],['audio','Audio device'],['speakers','Speakers'],['usb','USB / peripherals'],['keyboard','Keyboard'],['mouse','Mouse'],['powerstation','Power station'],['phone','Phone'],['vr','VR headset'],['streaming','Streaming device'],['tv','TV'],['lock','Lock / door device'],['client','Generic client'],['other','Other']]
}
function kindOptions(k){
  return kindList().map(o=>`<option value="${o[0]}" ${k===o[0]?'selected':''}>${o[1]}</option>`).join('')
}
function initSystemMenu(){
  $('systemBtn').onclick=e=>{
    e.stopPropagation();
    $('systemMenu').hidden=!$('systemMenu').hidden;
    $('layoutMenu').hidden=true
  }
  ;
  $('systemMenu').onclick=e=>e.stopPropagation();
  $('layoutBtn').onclick=e=>{
    e.stopPropagation();
    $('layoutMenu').hidden=!$('layoutMenu').hidden;
    $('systemMenu').hidden=true
  }
  ;
  $('layoutMenu').onclick=e=>e.stopPropagation();
  document.addEventListener('click',()=>{
    $('systemMenu').hidden=true;
    $('layoutMenu').hidden=true
  }
  )
}

function initFilters(){
  let s=$('filterKind');
  s.innerHTML='<option value="">All types</option>'+kindList().map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('');
  s.oninput=()=>{
    filter.kind=s.value;
    render();
    updateFilterButton()
  }
  ;
  $('filterName').oninput=e=>{
    filter.name=e.target.value.trim().toLowerCase();
    render();
    updateFilterButton()
  }
  ;
  $('filterConn').oninput=e=>{
    filter.conn=e.target.value;
    render();
    updateFilterButton()
  }
  ;
  $('filterHide').onchange=e=>{
    filter.hide=e.target.checked;
    render();
    updateFilterButton()
  }
  ;
  $('clearFilter').onclick=()=>{
    filter={
      kind:'',name:'',conn:'',hide:false
    }
    ;
    s.value='';
    $('filterName').value='';
    $('filterConn').value='';
    $('filterHide').checked=false;
    render();
    updateFilterButton();
    msg('Filter reset.')
  }
  ;
  $('filterBtn').onclick=()=>{
    $('filterbar').hidden=!$('filterbar').hidden;
    updateFilterButton()
  }
  ;
  $('closeFilter').onclick=()=>{
    $('filterbar').hidden=true;
    updateFilterButton()
  }
}
function nodeMatchesFilter(n){
  let k=n.kind||n.type||'other',txt=(n.name+' '+(n.subtitle||'')+' '+(n.notes||'')).toLowerCase();
  return(!filter.kind||k===filter.kind)&&(!filter.name||txt.includes(filter.name))
}
function connectionKind(c){
  if(c.type==='lan'||c.type==='wifi')return c.type;
  let txt=((c.label||'')+' '+(c.type||'')).toLowerCase();
  return txt.includes('usb')?'usb':'other'
}
function connMatchesFilter(c){
  return !filter.conn||connectionKind(c)===filter.conn
}
function filterActive(){
  return!!(filter.kind||filter.name||filter.conn)
}
function updateFilterButton(){
  let w=$('filterWarn');
  if(w)w.hidden=!(filterActive()&&$('filterbar').hidden)
}

function nodeH(){
  return options.showNotes?86:74
}
function portY(){
  return options.showNotes?76:64
}
function portCount(n){
  return Math.max(0,parseInt(n.portCount)||0)
}
function usedPorts(n){
  return data.connections.filter(c=>c.type==='lan'&&(c.from===n.id||c.to===n.id)).length
}
function wifiCount(n){
  return data.connections.filter(c=>c.type==='wifi'&&(c.from===n.id||c.to===n.id)).length
}
function portBarSvg(n){
  let total=portCount(n);
  if(!total)return'';
  let used=Math.min(total,usedPorts(n)),x=12,y=portY(),w=156,h=6,gap=2,seg=(w-gap*(total-1))/total,s='';
  for(let i=0;
  i<total;
  i++){
    s+=`<rect x="${x+i*(seg+gap)}" y="${y}" width="${seg}" height="${h}" rx="2" ry="2" fill="${i<used?'#fca5a5':'#e5e7eb'}" stroke="#ffffff" stroke-width=".5"/>`
  }
  return s
}
function wifiBadgeSvg(n){
  let c=wifiCount(n);
  return c?`<g opacity=".78"><path d="M145 15 Q153 7 161 15" fill="none" stroke="#166534" stroke-width="1.5" stroke-linecap="round"/><path d="M149 19 Q153 15 157 19" fill="none" stroke="#166534" stroke-width="1.5" stroke-linecap="round"/><circle cx="153" cy="22" r="1.5" fill="#166534"/><text x="162" y="21" font-size="10" font-weight="700" fill="#166534">${c}</text></g>`:''
}
function wrapWords(s,max){
  let words=String(s||'').replaceAll('  ',' ').split(' '),lines=[''];
  for(const w of words){
    let test=(lines[lines.length-1]+' '+w).trim();
    if(test.length>max&&lines[lines.length-1])lines.push(w);
    else lines[lines.length-1]=test
  }
  return lines.slice(0,2)
}
function titleSvg(n){
  let max=wifiCount(n)?10:18,lines=wrapWords(n.name,max);
  return `<text class="title" x="52" y="23">${lines.map((l,i)=>`<tspan x="52" dy="${i?15:0}">${esc(l)}</tspan>`).join('')}</text>`
}
function textMax(n,normal,withWifi){
  return wifiCount(n)?withWifi:normal
}
function iconFor(n){
  let k=n.kind||n.type||'other';
  return{
    router:'📡',repeater:'📶',switch:'⇄',desktop:'🖥',laptop:'💻',console:'🎮',webcam:'webcam-vector',printer:'🖨',homeassistant:'🏠',audio:'🔊',speakers:'🔈',usb:'🔌',keyboard:'⌨️',mouse:'🖱️',powerstation:'🔋',phone:'📱',vr:'🥽',streaming:'📺',tv:'📺',lock:'🔐',client:'●',infra:'◈',other:'●'
  }
  [k]||'●'
}
function iconSvg(n){
  let i=iconFor(n);
  if(i==='webcam-vector')return`<svg x="8" y="8" width="38" height="38" viewBox="0 0 48 48"><circle cx="24" cy="23" r="13" fill="#111827"/><circle cx="24" cy="23" r="8" fill="#38bdf8"/><circle cx="21" cy="20" r="3" fill="#e0f2fe"/><path d="M19 36h10l3 7H16z" fill="#64748b"/><rect x="13" y="42" width="22" height="3" rx="1.5" fill="#334155"/></svg>`;
  return`<text x="14" y="31" font-size="23">${i}</text>`
}

function example(){
  return{
    nodes:[],groups:[],connections:[]
  }
}

function load(){
  try{
    let d=JSON.parse(localStorage.getItem(KEY)||'null');
    if(d&&Array.isArray(d.nodes)&&Array.isArray(d.connections)){
      if(!Array.isArray(d.groups))d.groups=[];
      return d
    }
  }
  catch{
  }
  return example()
}
let data=load();
function captureLayout(){
  return data.nodes.map(n=>({
    id:n.id,x:n.x,y:n.y
  }
  ))
}
function restoreLayout(){
  if(!initialLayout){
    msg('No initial layout stored.',true);
    return
  }
  let m=new Map(initialLayout.map(p=>[p.id,p]));
  for(const n of data.nodes){
    let p=m.get(n.id);
    if(p){
      n.x=p.x;
      n.y=p.y
    }
  }
  if(autoZoomLayout)fitToView();
  else{
    t={
      x:0,y:0,s:1
    }
    ;
    apply()
  }
  save();
  render();
  msg('Layout reset.')
}
function contentBounds(){
  if(!data.nodes.length)return null;
  let pad=80,minX=Math.min(...data.nodes.map(n=>n.x))-pad,minY=Math.min(...data.nodes.map(n=>n.y))-pad,maxX=Math.max(...data.nodes.map(n=>n.x+W))+pad,maxY=Math.max(...data.nodes.map(n=>n.y+nodeH()))+pad;
  return{
    x:minX,y:minY,w:maxX-minX,h:maxY-minY
  }
}
function fitToView(){
  let b=contentBounds();
  if(!b)return;
  let r=svg.getBoundingClientRect(),s=Math.min(2.2,Math.max(.25,Math.min(r.width/b.w,r.height/b.h)));
  t={
    x:(r.width-b.w*s)/2-b.x*s,y:(r.height-b.h*s)/2-b.y*s,s
  }
  ;
  apply()
}
function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(data,null,2));
    return true
  }
  catch{
    msg('Local save failed. Use JSON download.',true);
    return false
  }
}

function world(x,y){
  let r=svg.getBoundingClientRect();
  return{
    x:(x-r.left-t.x)/t.s,y:(y-r.top-t.y)/t.s
  }
}
function apply(){
  vp.setAttribute('transform',`translate(${t.x} ${t.y}) scale(${t.s})`)
}
function marker(type){
  return type==='lan'?'al':type==='wifi'?'aw':'au'
}
function getFocus(){
  let rn=new Set(),rc=new Set();
  for(const c of data.connections){
    if(focusSel.has(c.from)){
      rc.add(c.id);
      rn.add(c.to)
    }
    if(focusSel.has(c.to)){
      rc.add(c.id);
      rn.add(c.from)
    }
  }
  for(const id of focusSel)rn.delete(id);
  return{
    rn,rc,active:focusSel.size>0
  }
}

function render(){
  groups.innerHTML='';
  links.innerHTML='';
  nodes.innerHTML='';
  if(!data.nodes.length){
    let msgNode=document.createElementNS('http://www.w3.org/2000/svg','text');
    msgNode.setAttribute('x',80);
    msgNode.setAttribute('y',90);
    msgNode.setAttribute('fill','#64748b');
    msgNode.setAttribute('font-size','16');
    msgNode.textContent='Empty map. Click “Load JSON” to load your saved network, or “Add device” to start manually.';
    nodes.appendChild(msgNode);
    selects();
    apply();
    return
  }
  let f=getFocus(),fa=filterActive();
  renderGroups();
  for(const c of data.connections){
    let a=data.nodes.find(n=>n.id===c.from),b=data.nodes.find(n=>n.id===c.to);
    if(!a||!b)continue;
    let fm=nodeMatchesFilter(a)&&nodeMatchesFilter(b)&&connMatchesFilter(c);
    if(fa&&filter.hide&&!fm)continue;
    let x1=a.x+W/2,y1=a.y+nodeH()/2,x2=b.x+W/2,y2=b.y+nodeH()/2,cv=Math.min(90,Math.max(30,Math.hypot(x2-x1,y2-y1)*.18)),p=`M${x1} ${y1}C${x1+cv} ${y1},${x2-cv} ${y2},${x2} ${y2}`;
    let hit=document.createElementNS('http://www.w3.org/2000/svg','path');
    hit.setAttribute('d',p);
    hit.setAttribute('class',fa&&!fm?'conn-hit filteredDim':'conn-hit');
    hit.onpointerdown=e=>{
      e.stopPropagation();
      sel.clear();
      selC=c.id;
      edit();
      render()
    }
    ;
    links.appendChild(hit);
    let path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',p);
    path.setAttribute('class',`conn ${c.type||'unknown'}${selC===c.id?' sel':''}${f.rc.has(c.id)?' related':''}${options.dimUnrelated&&f.active&&!f.rc.has(c.id)?' dimmed':''}${fa&&!fm?' filteredDim':''}`);
    path.setAttribute('marker-end',`url(#${marker(c.type)})`);
    path.onpointerdown=e=>{
      e.stopPropagation();
      sel.clear();
      selC=c.id;
      edit();
      render()
    }
    ;
    links.appendChild(path);
    let lab=document.createElementNS('http://www.w3.org/2000/svg','text');
    lab.setAttribute('class',`clabel${options.dimUnrelated&&f.active&&!f.rc.has(c.id)?' dimmed':''}${fa&&!fm?' filteredDim':''}`);
    lab.setAttribute('x',(x1+x2)/2);
    lab.setAttribute('y',(y1+y2)/2-8);
    lab.setAttribute('text-anchor','middle');
    lab.textContent=c.label||c.type||'connection';
    links.appendChild(lab)
  }
  for(const n of data.nodes){
    let nm=nodeMatchesFilter(n),nh=nodeH();
    if(fa&&filter.hide&&!nm)continue;
    let g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class',`node${sel.has(n.id)?' sel':''}${focusSel.has(n.id)||f.rn.has(n.id)?' related':''}${options.dimUnrelated&&f.active&&!focusSel.has(n.id)&&!f.rn.has(n.id)?' dimmed':''}${fa&&!nm?' filteredDim':''}`);
    g.setAttribute('transform',`translate(${n.x} ${n.y})`);
    g.innerHTML=`<rect width="${W}" height="${nh}" rx="6" ry="6" fill="${boxFill(n)}"/>${iconSvg(n)}${wifiBadgeSvg(n)}${titleSvg(n)}<text class="sub" x="52" y="55">${esc(trunc(n.subtitle||n.type,textMax(n,20,12)))}</text>${options.showNotes?`<text class="note" x="14" y="70">${esc(trunc(n.notes||'',28))}</text>`:''}${portBarSvg(n)}`;
    g.oncontextmenu=e=>{
      e.preventDefault();
      e.stopPropagation();
      selC=null;
      if(e.shiftKey){
        focusSel.has(n.id)?focusSel.delete(n.id):focusSel.add(n.id)
      }
      else{
        focusSel.clear();
        focusSel.add(n.id)
      }
      render();
      msg('Highlight mode: right-click empty space to clear.')
    }
    ;
    g.onpointerdown=e=>{
      if(e.button===2)return;
      e.preventDefault();
      e.stopPropagation();
      if(window.getSelection)window.getSelection().removeAllRanges();
      let w=world(e.clientX,e.clientY);
      if(e.shiftKey){
        sel.has(n.id)?sel.delete(n.id):sel.add(n.id)
      }
      else if(!sel.has(n.id)){
        sel.clear();
        sel.add(n.id)
      }
      drag={
        id:n.id,startX:w.x,startY:w.y,items:[...sel].map(id=>{
          let node=data.nodes.find(x=>x.id===id);
          return{
            id,x:node.x,y:node.y
          }
        }
        )
      }
      ;
      svg.setPointerCapture(e.pointerId);
      selC=null;
      edit();
      render()
    }
    ;
    nodes.appendChild(g)
  }
  selects();
  apply()
}

function renderGroups(){
  if(!Array.isArray(data.groups))data.groups=[];
  let fa=filterActive();
  for(const gr of data.groups){
    let all=(gr.nodeIds||[]).map(id=>data.nodes.find(n=>n.id===id)).filter(Boolean),bs=fa&&filter.hide?all.filter(nodeMatchesFilter):all;
    if(!bs.length)continue;
    let any=!fa||all.some(nodeMatchesFilter),pad=34,x=Math.min(...bs.map(n=>n.x))-pad,y=Math.min(...bs.map(n=>n.y))-pad-20,w=Math.max(...bs.map(n=>n.x+W))-x+pad,h=Math.max(...bs.map(n=>n.y+nodeH()))-y+pad,g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class',`group${fa&&!any?' filteredDim':''}`);
    g.innerHTML=`<rect class="gbox" x="${x}" y="${y}" width="${w}" height="${h}" rx="20" ry="20"/><rect class="ghandle" x="${x+10}" y="${y+8}" width="24" height="24" rx="7" ry="7"/><text class="ghandletext" x="${x+15}" y="${y+25}">✥</text><text class="gtext" x="${x+42}" y="${y+24}">${esc(gr.name||'Group')}</text>`;
    g.oncontextmenu=e=>{
      e.preventDefault();
      e.stopPropagation();
      focusSel.clear();
      render();
      msg('Highlight mode cleared.')
    }
    ;
    g.querySelector('.ghandle').onpointerdown=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(window.getSelection)window.getSelection().removeAllRanges();
      let w=world(e.clientX,e.clientY);
      groupDrag={
        id:gr.id,x:w.x,y:w.y
      }
      ;
      svg.setPointerCapture(e.pointerId);
      sel.clear();
      focusSel.clear();
      selC=null;
      edit();
      render()
    }
    ;
    groups.appendChild(g)
  }
}

function selects(){
  for(const id of['from','to']){
    let el=$(id),old=el.value;
    el.innerHTML='';
    for(const n of data.nodes){
      let o=document.createElement('option');
      o.value=n.id;
      o.textContent=n.name;
      el.appendChild(o)
    }
    if(old)el.value=old
  }
}
function edit(){
  let ns=data.nodes.filter(n=>sel.has(n.id));
  if(selC){
    let c=data.connections.find(x=>x.id===selC),a=data.nodes.find(n=>n.id===c.from),b=data.nodes.find(n=>n.id===c.to);
    panel.innerHTML=`<div class="row"><label>Connection label</label><input id="ecl" value="${esc(c.label)}"></div><div class="row"><label>Type</label><select id="ect"><option value="lan" ${c.type==='lan'?'selected':''}>Ethernet / LAN</option><option value="wifi" ${c.type==='wifi'?'selected':''}>Wi-Fi</option><option value="unknown" ${c.type==='unknown'?'selected':''}>Unknown / other</option></select></div><div class="hint">${esc(a?.name)} → ${esc(b?.name)}</div><div class="buttons"><button id="savc" class="primary small">Apply</button><button id="delc" class="danger small">Delete</button></div>`;
    $('savc').onclick=()=>{
      c.label=$('ecl').value;
      c.type=$('ect').value;
      save();
      render()
    }
    ;
    $('delc').onclick=()=>{
      data.connections=data.connections.filter(x=>x.id!==c.id);
      selC=null;
      save();
      edit();
      render()
    }
    ;
    return
  }
  if(ns.length===1){
    let n=ns[0];
    panel.innerHTML=`<div class="row"><label>Name</label><input id="en" value="${esc(n.name)}"></div><div class="row"><label>Type</label><select id="et"><option value="router" ${n.type==='router'?'selected':''}>Router / gateway</option><option value="infra" ${n.type==='infra'?'selected':''}>Infrastructure</option><option value="client" ${n.type==='client'?'selected':''}>Client device</option><option value="other" ${n.type==='other'?'selected':''}>Other</option></select></div><div class="row"><label>Device symbol</label><select id="ek">${kindOptions(n.kind||n.type)}</select></div><div class="row"><label>Subtitle</label><input id="es" value="${esc(n.subtitle)}"></div><div class="row"><label>Port count</label><input id="ep" type="number" min="0" step="1" value="${portCount(n)}"></div><div class="hint" style="margin-bottom:9px">Used LAN/Ethernet ports: ${usedPorts(n)} / ${portCount(n)}</div><div class="row"><label>Notes</label><textarea id="eno">${esc(n.notes)}</textarea></div><div class="buttons"><button id="savn" class="primary small">Apply</button><button id="dupn" class="small">Duplicate</button><button id="deln" class="danger small">Delete</button></div>`;
    $('savn').onclick=()=>{
      n.name=$('en').value||'Unnamed device';
      n.type=$('et').value;
      n.kind=$('ek').value;
      n.subtitle=$('es').value;
      n.portCount=Math.max(0,parseInt($('ep').value)||0);
      n.notes=$('eno').value;
      save();
      render();
      edit()
    }
    ;
    $('dupn').onclick=()=>{
      let c={
        ...n,id:uid(),name:n.name+' copy',x:n.x+30,y:n.y+30
      }
      ;
      data.nodes.push(c);
      sel.clear();
      sel.add(c.id);
      save();
      render();
      edit()
    }
    ;
    $('deln').onclick=()=>{
      data.nodes=data.nodes.filter(x=>x.id!==n.id);
      data.connections=data.connections.filter(c=>c.from!==n.id&&c.to!==n.id);
      data.groups.forEach(g=>g.nodeIds=(g.nodeIds||[]).filter(id=>id!==n.id));
      sel.clear();
      save();
      render();
      edit()
    }
    ;
    return
  }
  panel.textContent=ns.length>1?`${ns.length} devices selected. Press “Connect selected”.`:'Select a device or connection to edit it.'
}

svg.oncontextmenu=e=>{
  e.preventDefault();
  if(e.target===svg){
    focusSel.clear();
    render();
    msg('Highlight mode cleared.')
  }
}
;
svg.onpointerdown=e=>{
  if(e.button===2)return;
  if(e.target===svg){
    sel.clear();
    selC=null;
    edit();
    render()
  }
  pan={
    sx:e.clientX,sy:e.clientY,tx:t.x,ty:t.y
  }
  ;
  svg.setPointerCapture(e.pointerId)
}
;
svg.onpointermove=e=>{
  if(groupDrag){
    let gr=data.groups.find(g=>g.id===groupDrag.id),w=world(e.clientX,e.clientY),dx=Math.round(w.x-groupDrag.x),dy=Math.round(w.y-groupDrag.y);
    if(gr){
      for(const id of gr.nodeIds||[]){
        let n=data.nodes.find(x=>x.id===id);
        if(n){
          n.x+=dx;
          n.y+=dy
        }
      }
      groupDrag.x=w.x;
      groupDrag.y=w.y;
      render()
    }
    return
  }
  if(drag){
    let w=world(e.clientX,e.clientY),dx=Math.round(w.x-drag.startX),dy=Math.round(w.y-drag.startY);
    for(const it of drag.items){
      let n=data.nodes.find(x=>x.id===it.id);
      if(n){
        n.x=it.x+dx;
        n.y=it.y+dy
      }
    }
    render();
    return
  }
  if(pan&&e.buttons===1&&!drag&&!groupDrag){
    t.x=pan.tx+e.clientX-pan.sx;
    t.y=pan.ty+e.clientY-pan.sy;
    apply()
  }
}
;
svg.onpointerup=()=>{
  if(drag||groupDrag)save();
  drag=null;
  groupDrag=null;
  pan=null;
  if(window.getSelection)window.getSelection().removeAllRanges()
}
;
svg.onwheel=e=>{
  e.preventDefault();
  let r=svg.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,os=t.s,ns=Math.min(2.8,Math.max(.35,os*(e.deltaY<0?1.08:.92))),wx=(mx-t.x)/os,wy=(my-t.y)/os;
  t.s=ns;
  t.x=mx-wx*ns;
  t.y=my-wy*ns;
  apply()
}
;

$('add').onclick=()=>{
  let r=svg.getBoundingClientRect(),c=world(r.left+r.width/2,r.top+r.height/2),n={
    id:uid(),name:'New device',type:'client',kind:'client',portCount:0,subtitle:'Edit me',notes:'',x:Math.round(c.x-W/2),y:Math.round(c.y-H/2)
  }
  ;
  data.nodes.push(n);
  sel.clear();
  sel.add(n.id);
  selC=null;
  save();
  render();
  edit()
}
;
$('connect').onclick=()=>{
  let ids=[...sel];
  if(ids.length<2){
    msg('Select two devices first. Use Shift-click.',true);
    return
  }
  data.connections.push({
    id:uid(),from:ids[0],to:ids[1],type:'lan',label:'Ethernet / LAN'
  }
  );
  save();
  render()
}
;
$('addconn').onclick=()=>{
  let f=$('from').value,to=$('to').value;
  if(!f||!to||f===to){
    msg('Choose two different devices.',true);
    return
  }
  data.connections.push({
    id:uid(),from:f,to,type:$('ctype').value,label:$('clabel').value||$('ctype').value
  }
  );
  $('clabel').value='';
  save();
  render()
}
;
$('group').onclick=()=>{
  let ids=[...sel];
  if(ids.length<2){
    msg('Select at least two devices.',true);
    return
  }
  let name=prompt('Group name:','New group')||'New group';
  data.groups.push({
    id:uid(),name,nodeIds:ids
  }
  );
  save();
  render();
  msg('Group created.')
}
;

function autoLayout(){
  let root=data.nodes.find(n=>/magenta/i.test(n.name))||data.nodes.find(n=>n.type==='router')||data.nodes[0];
  if(!root)return;
  let adj=new Map(data.nodes.map(n=>[n.id,[]]));
  for(const c of data.connections){
    if(adj.has(c.from)&&adj.has(c.to)){
      adj.get(c.from).push(c.to);
      adj.get(c.to).push(c.from)
    }
  }
  let depth=new Map([[root.id,0]]),q=[root.id];
  for(let i=0;
  i<q.length;
  i++)for(const nb of adj.get(q[i])||[])if(!depth.has(nb)){
    depth.set(nb,depth.get(q[i])+1);
    q.push(nb)
  }
  for(const n of data.nodes)if(!depth.has(n.id))depth.set(n.id,Math.max(1,...depth.values())+1);
  let cols={
  }
  ;
  for(const n of data.nodes)(cols[depth.get(n.id)]||(cols[depth.get(n.id)]=[])).push(n);
  for(const d of Object.keys(cols).map(Number).sort((a,b)=>a-b)){
    cols[d].sort((a,b)=>a.name.localeCompare(b.name));
    cols[d].forEach((n,i)=>{
      n.x=80+d*310;
      n.y=70+i*145
    }
    )
  }
  separateGroups();
  t={
    x:0,y:0,s:1
  }
  ;
  apply()
}
function experimentalLayout(){
  autoLayout();
  let ns=data.nodes,pos=new Map(ns.map(n=>[n.id,{
    x:n.x,y:n.y,vx:0,vy:0
  }
  ])),edges=data.connections.filter(c=>pos.has(c.from)&&pos.has(c.to)),area=Math.max(760*560,ns.length*W*H*3.2),k=Math.sqrt(area/ns.length)*.78;
  for(let step=0;
  step<360;
  step++){
    let temp=20*(1-step/360)+.9;
    for(const a of ns){
      let pa=pos.get(a.id);
      for(const b of ns){
        if(a===b)continue;
        let pb=pos.get(b.id),dx=(pa.x-pb.x)||.01,dy=(pa.y-pb.y)||.01,dist=Math.hypot(dx,dy)||.01,force=k*k/dist;
        pa.vx+=dx/dist*force*.012;
        pa.vy+=dy/dist*force*.012
      }
      pa.vx+=((760/2)-pa.x)*.0022;
      pa.vy+=((560/2)-pa.y)*.0022
    }
    for(const e of edges){
      let a=pos.get(e.from),b=pos.get(e.to),dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||.01,w=e.type==='unknown'?.65:1,force=dist*dist/k*.004*w;
      a.vx+=dx/dist*force;
      b.vx-=dx/dist*force;
      a.vy+=dy/dist*force;
      b.vy-=dy/dist*force
    }
    for(let i=0;
    i<ns.length;
    i++)for(let j=i+1;
    j<ns.length;
    j++){
      let a=pos.get(ns[i].id),b=pos.get(ns[j].id),ox=(W+20)-Math.abs(a.x-b.x),oy=(nodeH()+20)-Math.abs(a.y-b.y);
      if(ox>0&&oy>0){
        let sx=a.x<b.x?-1:1,sy=a.y<b.y?-1:1;
        if(ox<oy){
          a.vx+=sx*ox*.11;
          b.vx-=sx*ox*.11
        }
        else{
          a.vy+=sy*oy*.11;
          b.vy-=sy*oy*.11
        }
      }
    }
    for(const n of ns){
      let p=pos.get(n.id),len=Math.hypot(p.vx,p.vy)||1,lim=Math.min(temp,len);
      p.x+=p.vx/len*lim;
      p.y+=p.vy/len*lim;
      p.vx*=.55;
      p.vy*=.55
    }
  }
  let minX=Math.min(...ns.map(n=>pos.get(n.id).x)),minY=Math.min(...ns.map(n=>pos.get(n.id).y));
  for(const n of ns){
    let p=pos.get(n.id);
    n.x=Math.round((p.x-minX+45)/10)*10;
    n.y=Math.round((p.y-minY+45)/10)*10
  }
  compress(.82);
  resolve(18);
  separateGroups();
  resolve(18);
  t={
    x:0,y:0,s:1
  }
  ;
  apply()
}
function compress(f){
  let cx=data.nodes.reduce((s,n)=>s+n.x,0)/data.nodes.length,cy=data.nodes.reduce((s,n)=>s+n.y,0)/data.nodes.length;
  for(const n of data.nodes){
    n.x=Math.round(cx+(n.x-cx)*f);
    n.y=Math.round(cy+(n.y-cy)*f)
  }
}
function resolve(gap){
  for(let pass=0;
  pass<80;
  pass++){
    let moved=false;
    for(let i=0;
    i<data.nodes.length;
    i++)for(let j=i+1;
    j<data.nodes.length;
    j++){
      let a=data.nodes[i],b=data.nodes[j],ox=(W+gap)-Math.abs(a.x-b.x),oy=(nodeH()+gap)-Math.abs(a.y-b.y);
      if(ox>0&&oy>0){
        moved=true;
        if(ox<oy){
          let s=a.x<b.x?-1:1;
          a.x+=s*Math.ceil(ox/2);
          b.x-=s*Math.ceil(ox/2)
        }
        else{
          let s=a.y<b.y?-1:1;
          a.y+=s*Math.ceil(oy/2);
          b.y-=s*Math.ceil(oy/2)
        }
      }
    }
    if(!moved)break
  }
}

function groupBounds(gr){
  let ns=(gr.nodeIds||[]).map(id=>data.nodes.find(n=>n.id===id)).filter(Boolean);
  if(!ns.length)return null;
  let pad=60,x=Math.min(...ns.map(n=>n.x))-pad,y=Math.min(...ns.map(n=>n.y))-pad,w=Math.max(...ns.map(n=>n.x+W))-x+pad,h=Math.max(...ns.map(n=>n.y+nodeH()))-y+pad;
  return{
    x,y,w,h
  }
}

function shiftGroup(gr,dx,dy){
  for(const id of gr.nodeIds||[]){
    let n=data.nodes.find(x=>x.id===id);
    if(n){
      n.x+=dx;
      n.y+=dy
    }
  }
}

function separateGroups(){
  if(!Array.isArray(data.groups)||data.groups.length<2)return;
  for(let pass=0;
  pass<16;
  pass++){
    let moved=false;
    for(let i=0;
    i<data.groups.length;
    i++)for(let j=i+1;
    j<data.groups.length;
    j++){
      let a=groupBounds(data.groups[i]),b=groupBounds(data.groups[j]);
      if(!a||!b)continue;
      let gap=50,overlap=!(a.x+a.w+gap<b.x||b.x+b.w+gap<a.x||a.y+a.h+gap<b.y||b.y+b.h+gap<a.y);
      if(overlap){
        let moveRight=Math.ceil(a.x+a.w+gap-b.x);
        shiftGroup(data.groups[j],Math.max(moveRight,80),0);
        moved=true
      }
    }
    if(!moved)break
  }
}

$('layout').onclick=()=>{
  autoLayout();
  if(autoZoomLayout)fitToView();
  save();
  render();
  $('layoutMenu').hidden=true;
  msg('Layout updated.')
}
;
$('layoutExp').onclick=()=>{
  experimentalLayout();
  if(autoZoomLayout)fitToView();
  save();
  render();
  $('layoutMenu').hidden=true;
  msg('Experimental layout updated.')
}
;
$('resetLayout').onclick=()=>{
  $('layoutMenu').hidden=true;
  restoreLayout()
}
;
$('autoZoomLayout').onchange=e=>{
  autoZoomLayout=e.target.checked;
  if(autoZoomLayout){
    fitToView();
    msg('Auto zoom enabled.')
  }
}
;
$('options').onclick=()=>openOptions();
$('closeOptions').onclick=()=>$('optionsOverlay').hidden=true;
$('applyOptions').onclick=()=>{
  options.relatedBorder=Math.max(1,Math.min(16,parseInt($('relatedBorderInput').value)||5));
  options.dimUnrelated=$('dimUnrelatedInput').checked;
  options.showNotes=$('showNotesInput').checked;
  saveOptions();
  applyOptionsCss();
  $('optionsOverlay').hidden=true;
  render();
  msg('Options applied.')
}
;
$('defaultOptions').onclick=()=>{
  options={
    relatedBorder:5,dimUnrelated:true,showNotes:false
  }
  ;
  saveOptions();
  applyOptionsCss();
  openOptions();
  render();
  msg('Default options restored.')
}
;
function openOptions(){
  $('relatedBorderInput').value=options.relatedBorder||5;
  $('dimUnrelatedInput').checked=options.dimUnrelated!==false;
  $('showNotesInput').checked=!!options.showNotes;
  $('optionsOverlay').hidden=false
}

$('save').onclick=()=>{
  if(save())msg('Saved locally.')
}
;
$('json').onclick=()=>download('device-network-map.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');
$('showjson').onclick=()=>showJson();
function showJson(){
  let j=JSON.stringify(data,null,2);
  panel.innerHTML=`<div class="row"><label>Editable JSON backup</label><textarea id="jsonout" style="min-height:360px;font-family:ui-monospace,Consolas,monospace;font-size:12px">${esc(j)}</textarea></div><div class="buttons"><button id="copyjson" class="primary small">Copy JSON</button><button id="selectjson" class="small">Select all</button></div><div class="hint">Save this text as <strong>device-network-map.json</strong>.</div>`;
  $('copyjson').onclick=async()=>{
    try{
      await navigator.clipboard.writeText(j);
      msg('JSON copied.')
    }
    catch{
      msg('Clipboard blocked. Select and copy manually.',true)
    }
  }
  ;
  $('selectjson').onclick=()=>{
    $('jsonout').focus();
    $('jsonout').select()
  }
}
async function loadJsonFile(f){
  if(!f)return;
  if(!/\.json$/i.test(f.name)&&f.type&&f.type!=='application/json'){
    msg('Please drop a JSON file.',true);
    return
  }
  try{
    let d=JSON.parse(await f.text());
    if(!Array.isArray(d.nodes)||!Array.isArray(d.connections))throw Error('Invalid format');
    data=d;
    if(!Array.isArray(data.groups))data.groups=[];
    initialLayout=captureLayout();
    sel.clear();
    focusSel.clear();
    selC=null;
    save();
    render();
    edit();
    msg('JSON loaded.')
  }
  catch(err){
    msg('Could not load JSON: '+err.message,true)
  }
}

$('file').onchange=async e=>{
  await loadJsonFile(e.target.files[0]);
  e.target.value=''
}
;

const loadLabel=document.querySelector('label.file');
loadLabel.addEventListener('dragover',e=>{
  e.preventDefault();
  loadLabel.classList.add('dragover')
}
);
loadLabel.addEventListener('dragleave',()=>loadLabel.classList.remove('dragover'));
loadLabel.addEventListener('drop',async e=>{
  e.preventDefault();
  loadLabel.classList.remove('dragover');
  await loadJsonFile(e.dataTransfer.files[0])
}
);

$('reset').onclick=()=>{
  data=example();
  initialLayout=captureLayout();
  sel.clear();
  focusSel.clear();
  selC=null;
  save();
  render();
  edit();
  msg('Empty map restored.')
}
;

function download(name,content,type){
  let b=content instanceof Blob?content:new Blob([content],{
    type
  }
  ),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;
  a.download=name;
  a.rel='noopener';
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1500);
  msg('Download requested.')
}

window.onkeydown=e=>{
  if(e.key==='Delete'||e.key==='Backspace'){
    if(selC){
      data.connections=data.connections.filter(c=>c.id!==selC);
      selC=null
    }
    else if(sel.size){
      data.nodes=data.nodes.filter(n=>!sel.has(n.id));
      data.connections=data.connections.filter(c=>!sel.has(c.from)&&!sel.has(c.to));
      data.groups.forEach(g=>g.nodeIds=(g.nodeIds||[]).filter(id=>!sel.has(id)));
      sel.clear()
    }
    save();
    render();
    edit()
  }
}
;

initialLayout=captureLayout();
applyOptionsCss();
initSystemMenu();
initFilters();
updateFilterButton();
render();
edit();
