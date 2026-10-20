const state = { projects: [], project: null, view: 'modules', registry: 'files', selected: null, timer: null,
  camera: { x: 0, y: 0, scale: 1 }, graphBounds: null, cameraNeedsFit: true };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const ago = iso => { const seconds = Math.max(0, (Date.now() - new Date(iso)) / 1000); return seconds < 60 ? `${Math.floor(seconds)}s` : seconds < 3600 ? `${Math.floor(seconds/60)}m` : `${Math.floor(seconds/3600)}h`; };

async function api(path, options={}) {
  const response = await fetch(path, {headers:{'Content-Type':'application/json'}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }

async function boot() {
  try { const health = await api('/api/health'); $('#provider').textContent = `${health.provider} provider`; }
  catch { $('#connection').textContent='Engine unavailable'; }
  await refreshProjects();
  if (state.projects[0]) await selectProject(state.projects[0].id);
}
async function refreshProjects() {
  state.projects = await api('/api/projects');
  $('#project-list').innerHTML = state.projects.map(p => `<button class="project-link ${state.project?.id===p.id?'active':''}" data-project="${p.id}">${escapeHtml(p.name)}<small>${escapeHtml(p.status)}</small></button>`).join('') || '<div class="empty-list">No projects yet</div>';
  $$('[data-project]').forEach(el => el.onclick=()=>selectProject(el.dataset.project));
}
async function selectProject(id) {
  state.project = await api(`/api/projects/${id}`); state.selected=null;
  state.cameraNeedsFit=true;
  $('#empty-state').classList.add('hidden'); $('#workspace').classList.remove('hidden');
  render(); await refreshProjects(); schedulePoll();
}
function schedulePoll() {
  clearTimeout(state.timer);
  if (!state.project) return;
  state.timer=setTimeout(async()=>{ try { state.project=await api(`/api/projects/${state.project.id}`); render(); schedulePoll(); } catch(e){toast(e.message)} }, state.project.status==='running'?700:2500);
}
function render() {
  const p=state.project; if(!p)return;
  $('#project-title').textContent=p.name;
  $('#project-status').textContent=p.status; $('#project-status').className=`status ${p.status}`;
  const active=p.runs.find(r=>['queued','running'].includes(r.status));
  $('#run-button').textContent=active?'Cancel run':p.status==='completed'?'Run again':'Run agents';
  $('#run-button').disabled=false;
  const completed=p.modules.filter(m=>m.status==='completed').length;
  $('#stats').innerHTML=stat('Modules',`${completed}/${p.modules.length}`)+stat('Active agents',p.agents.filter(a=>a.status==='running').length)+stat('Tracked files',p.files.length)+stat('Events',p.events.length);
  renderGraph(); renderInspector(); renderActivity(); renderRegistry();
}
const stat=(label,value)=>`<div class="stat"><small>${label}</small><strong>${value}</strong></div>`;
function renderGraph() {
  const p=state.project, agents=state.view==='agents';
  $('#graph-caption').textContent=(agents?'Agent hierarchy and lifecycle':'Architecture and dependencies')+' · scroll to zoom · drag to pan';
  let nodes, edges;
  if(!agents){
    nodes=p.modules.map(m=>({...m,left:m.x,top:m.y})); edges=p.dependencies.map(d=>[d.source_id,d.target_id]);
  } else {
    const level={main:0,module:1,coding:2,testing:2}; const counts={};
    nodes=p.agents.map(a=>{const l=level[a.role]??2; counts[l]=(counts[l]||0)+1; const idx=counts[l]-1; return {...a,kind:a.role,left:40+l*245,top:25+(idx%6)*58};});
    edges=p.agents.filter(a=>a.parent_id).map(a=>[a.parent_id,a.id]);
  }
  $('#nodes').innerHTML=nodes.map(n=>`<button class="node ${state.selected===n.id?'selected':''}" data-node="${n.id}" data-kind="${n.kind}" data-status="${n.status}" style="left:${n.left}px;top:${n.top}px"><span class="node-title">${escapeHtml(n.name)}</span><small><i class="dot"></i>${escapeHtml(n.status)} · ${escapeHtml(n.kind||n.role)}</small></button>`).join('');
  const map=Object.fromEntries(nodes.map(n=>[n.id,n]));
  $('#edges').innerHTML=`<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#41516e"/></marker></defs>`+edges.map(([a,b])=>{const s=map[a],t=map[b];if(!s||!t)return'';return `<path class="edge" d="M ${s.left+145} ${s.top+30} C ${s.left+180} ${s.top+30}, ${t.left-35} ${t.top+30}, ${t.left} ${t.top+30}"/>`}).join('');
  if(nodes.length) state.graphBounds={minX:Math.min(...nodes.map(n=>n.left)),minY:Math.min(...nodes.map(n=>n.top)),maxX:Math.max(...nodes.map(n=>n.left+145)),maxY:Math.max(...nodes.map(n=>n.top+64))};
  applyCamera();
  if(state.cameraNeedsFit){state.cameraNeedsFit=false;requestAnimationFrame(fitGraph)}
  $$('[data-node]').forEach(el=>el.onclick=()=>{state.selected=el.dataset.node;renderGraph();renderInspector();});
}

function applyCamera(){
  const {x,y,scale}=state.camera, transform=`translate(${x}px, ${y}px) scale(${scale})`;
  $('#edges').style.transform=transform; $('#nodes').style.transform=transform;
  $('#zoom-level').textContent=`${Math.round(scale*100)}%`;
}
function setZoom(nextScale, clientX, clientY){
  const graph=$('#graph'), rect=graph.getBoundingClientRect(), old=state.camera.scale;
  const scale=Math.min(2.5,Math.max(.3,nextScale));
  const px=(clientX??rect.left+rect.width/2)-rect.left, py=(clientY??rect.top+rect.height/2)-rect.top;
  const worldX=(px-state.camera.x)/old, worldY=(py-state.camera.y)/old;
  state.camera.scale=scale; state.camera.x=px-worldX*scale; state.camera.y=py-worldY*scale; applyCamera();
}
function fitGraph(){
  const graph=$('#graph'), b=state.graphBounds; if(!b)return;
  const padding=42, width=Math.max(1,b.maxX-b.minX), height=Math.max(1,b.maxY-b.minY);
  const scale=Math.min(1.35,Math.max(.3,Math.min((graph.clientWidth-padding*2)/width,(graph.clientHeight-padding*2)/height)));
  state.camera={scale,x:(graph.clientWidth-width*scale)/2-b.minX*scale,y:(graph.clientHeight-height*scale)/2-b.minY*scale}; applyCamera();
}
function renderInspector() {
  const p=state.project;
  let selected=p.modules.find(m=>m.id===state.selected)||p.agents.find(a=>a.id===state.selected);
  if(!selected){
    $('#inspector-content').innerHTML=`<p class="brief">${escapeHtml(p.prompt)}</p><div class="detail-list"><div class="detail-row"><small>Workspace</small><span>${escapeHtml(p.workspace)}</span></div><div class="detail-row"><small>Workflow</small><span>Plan → implement → validate → accept</span></div><div class="detail-row"><small>Shared memory</small><span>${p.memories.length} recorded entries</span></div></div>`; return;
  }
  const isAgent=!!selected.role;
  const linkedFiles=isAgent?p.files.filter(f=>f.owner_agent_id===selected.id):p.files.filter(f=>f.module_id===selected.id);
  $('#inspector-content').innerHTML=`<span class="status ${selected.status}">${escapeHtml(selected.status)}</span><h3>${escapeHtml(selected.name)}</h3><p class="brief">${escapeHtml(isAgent?selected.task:selected.description)}</p><div class="detail-list"><div class="detail-row"><small>${isAgent?'Role':'Module type'}</small><span>${escapeHtml(isAgent?selected.role:selected.kind)}</span></div><div class="detail-row"><small>Tracked files</small><span>${linkedFiles.length}</span></div><div class="detail-row"><small>Files</small>${linkedFiles.slice(0,6).map(f=>`<span class="chip">${escapeHtml(f.path)}</span>`).join('')||'<span>None yet</span>'}</div></div>`;
}
function renderActivity() {
  const events=state.project.events;
  $('#activity').innerHTML=events.map(e=>`<div class="event ${e.type.replaceAll('.','-')}"><i class="event-dot"></i><p>${escapeHtml(e.message)}<small>${escapeHtml(e.type)}</small></p><small>${ago(e.created_at)}</small></div>`).join('')||'<div class="empty-list">Activity will appear when agents start</div>';
}
function renderRegistry(){
  const p=state.project;
  $('#registry').innerHTML=state.registry==='files' ? p.files.map(f=>`<div class="file"><span>⌁ ${escapeHtml(f.path)}</span><small>${f.size} B</small></div>`).join('')||'<div class="empty-list">Files appear as coding agents work</div>' : p.memories.map(m=>`<div class="memory"><small>${escapeHtml(m.category)} · ${escapeHtml(m.author)}</small><p>${escapeHtml(m.content)}</p></div>`).join('')||'<div class="empty-list">No memory entries</div>';
}

function openDialog(){ $('#create-dialog').showModal(); $('#prompt').focus(); }
$('#new-project').onclick=openDialog; $('#empty-create').onclick=openDialog;
$('#dialog-close').onclick=()=>$('#create-dialog').close(); $('#cancel-create').onclick=()=>$('#create-dialog').close();
$('#create-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;button.textContent='Creating…';try{const project=await api('/api/projects',{method:'POST',body:JSON.stringify({prompt:$('#prompt').value})});$('#create-dialog').close();await selectProject(project.id);toast('Project graph created')}catch(err){toast(err.message)}finally{button.disabled=false;button.textContent='Create graph'}};
$('#run-button').onclick=async()=>{const active=state.project.runs.find(r=>['queued','running'].includes(r.status));try{if(active){await api(`/api/projects/${state.project.id}/runs/${active.id}/cancel`,{method:'POST',body:'{}'});toast('Cancellation requested')}else{await api(`/api/projects/${state.project.id}/runs`,{method:'POST',body:'{}'});toast('Agent run started')}state.project=await api(`/api/projects/${state.project.id}`);render();schedulePoll()}catch(e){toast(e.message)}};
$$('[data-view]').forEach(el=>el.onclick=()=>{$$('[data-view]').forEach(x=>x.classList.remove('active'));el.classList.add('active');state.view=el.dataset.view;state.selected=null;state.cameraNeedsFit=true;renderGraph();renderInspector()});
$$('[data-tab]').forEach(el=>el.onclick=()=>{$$('[data-tab]').forEach(x=>x.classList.remove('active'));el.classList.add('active');state.registry=el.dataset.tab;renderRegistry()});
$('#fit-graph').onclick=fitGraph;
$('#zoom-in').onclick=()=>setZoom(state.camera.scale*1.2);
$('#zoom-out').onclick=()=>setZoom(state.camera.scale/1.2);
const graph=$('#graph'); let drag=null;
graph.addEventListener('wheel',event=>{event.preventDefault();setZoom(state.camera.scale*(event.deltaY<0?1.12:1/1.12),event.clientX,event.clientY)},{passive:false});
graph.addEventListener('pointerdown',event=>{if(event.target.closest('.node'))return;drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,startX:state.camera.x,startY:state.camera.y};graph.setPointerCapture(event.pointerId);graph.classList.add('panning')});
graph.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId)return;state.camera.x=drag.startX+event.clientX-drag.x;state.camera.y=drag.startY+event.clientY-drag.y;applyCamera()});
const stopPan=event=>{if(!drag||drag.pointer!==event.pointerId)return;drag=null;graph.classList.remove('panning')};
graph.addEventListener('pointerup',stopPan);graph.addEventListener('pointercancel',stopPan);
window.addEventListener('resize',()=>{if(state.project)fitGraph()});
boot().catch(e=>toast(e.message));

