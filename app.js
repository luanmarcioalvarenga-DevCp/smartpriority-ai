'use strict';
const KEY='smartpriority.tasks.v1';
const $=id=>document.getElementById(id);
const today=new Date();today.setHours(12,0,0,0);
const iso=(offset=0)=>{const d=new Date(today);d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const sample=[
{id:'demo-1',title:'Revisar apresentação do projeto',description:'Conferir os últimos ajustes e preparar a demonstração.',due:iso(1),impact:3,effort:1,status:'A fazer'},
{id:'demo-2',title:'Organizar backlog da semana',description:'Definir entregas e revisar o que é prioritário.',due:iso(3),impact:2,effort:2,status:'Em andamento'},
{id:'demo-3',title:'Estudar JavaScript por 40 minutos',description:'Praticar funções, eventos e manipulação do DOM.',due:iso(2),impact:2,effort:1,status:'A fazer'},
{id:'demo-4',title:'Configurar ambiente do projeto',description:'Preparar arquivos e verificar o funcionamento local.',due:iso(-1),impact:3,effort:2,status:'Concluído'},
{id:'demo-5',title:'Atualizar documentação',description:'Registrar funcionalidades e instruções no README.',due:iso(5),impact:1,effort:2,status:'A fazer'}];
function load(){try{const raw=localStorage.getItem(KEY);if(raw!==null){const data=JSON.parse(raw);if(Array.isArray(data))return data.filter(x=>x&&typeof x.id==='string')}}catch(e){console.warn('Armazenamento indisponível:',e)}return sample}
let tasks=load(),editing=null;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(tasks))}catch(e){console.warn('Não foi possível salvar:',e)}}
function daysLeft(due){const d=new Date(due+'T12:00:00');return Math.round((d-today)/86400000)}
function score(t){const days=daysLeft(t.due);return t.impact*30+(days<0?55:days===0?45:days<=2?32:days<=5?16:0)-t.effort*7}
function priority(t){const s=score(t);return s>=85?'Alta':s>=52?'Média':'Baixa'}
function dateLabel(value){return new Date(value+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
function el(tag,klass='',value){const node=document.createElement(tag);if(klass)node.className=klass;if(value!==undefined)node.textContent=value;return node}
function btn(label,title,action){const b=el('button','',label);b.type='button';b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',action);return b}
function updateStatus(id,status){const t=tasks.find(x=>x.id===id);if(t){t.status=status;persist();render()}}
function removeTask(id){if(!confirm('Excluir esta tarefa?'))return;tasks=tasks.filter(x=>x.id!==id);persist();render()}
function openForm(id=null){editing=id;const t=tasks.find(x=>x.id===id);$('taskForm').reset();$('modalTitle').textContent=t?'Editar tarefa':'Criar tarefa';const f=$('taskForm').elements;f.namedItem('title').value=t?.title||'';f.namedItem('description').value=t?.description||'';f.namedItem('due').value=t?.due||iso(1);f.namedItem('impact').value=t?.impact||'2';f.namedItem('effort').value=t?.effort||'2';f.namedItem('status').value=t?.status||'A fazer';$('modal').showModal()}
function makeCard(t){
const card=el('article','task');card.draggable=true;card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',t.id);e.dataTransfer.effectAllowed='move'});
const top=el('div','task-top');top.append(el('span','priority '+priority(t),priority(t)+' prioridade'));top.append(btn('✎','Editar '+t.title,()=>openForm(t.id)));card.append(top,el('h3','',t.title),el('p','',t.description||'Sem descrição adicional.'));
const footer=el('div','task-footer');const days=daysLeft(t.due);footer.append(el('span','',days<0?'⚠ Atrasada · '+dateLabel(t.due):'◷ '+dateLabel(t.due)));const actions=el('div','task-buttons');
if(t.status!=='A fazer')actions.append(btn('←','Voltar etapa',()=>updateStatus(t.id,t.status==='Concluído'?'Em andamento':'A fazer')));
if(t.status!=='Concluído')actions.append(btn('→','Avançar etapa',()=>updateStatus(t.id,t.status==='A fazer'?'Em andamento':'Concluído')));
actions.append(btn('×','Excluir tarefa',()=>removeTask(t.id)));footer.append(actions);card.append(footer);return card}
function renderBoard(){
const board=$('kanban');board.replaceChildren();const term=$('search').value.trim().toLocaleLowerCase('pt-BR'),filter=$('filter').value;
const shown=tasks.filter(t=>(t.title+' '+t.description).toLocaleLowerCase('pt-BR').includes(term)&&(filter==='all'||priority(t)===filter));
for(const status of ['A fazer','Em andamento','Concluído']){
const column=el('section','column');column.setAttribute('aria-label',status);const items=shown.filter(t=>t.status===status).sort((a,b)=>score(b)-score(a));
const head=el('div','column-head');const name=el('span');name.append(el('i','indicator'),document.createTextNode(status));head.append(name,el('small','',String(items.length)));column.append(head);
if(!items.length)column.append(el('p','empty','Nenhuma tarefa nesta etapa'));items.forEach(t=>column.append(makeCard(t)));
column.addEventListener('dragover',e=>{e.preventDefault();column.classList.add('drag-over')});
column.addEventListener('dragleave',()=>column.classList.remove('drag-over'));
column.addEventListener('drop',e=>{e.preventDefault();column.classList.remove('drag-over');updateStatus(e.dataTransfer.getData('text/plain'),status)});board.append(column)}}
function renderStats(){const done=tasks.filter(t=>t.status==='Concluído').length,pending=tasks.filter(t=>t.status!=='Concluído'),high=pending.filter(t=>priority(t)==='Alta').length;
const values=[['Total de tarefas',tasks.length,'▤','Registradas no workspace'],['Em andamento',tasks.filter(t=>t.status==='Em andamento').length,'◷','Atividades em execução'],['Concluídas',done,'✓','Entregas finalizadas'],['Alta prioridade',high,'✦','Tarefas que merecem atenção']];
$('stats').replaceChildren(...values.map(([label,value,icon,sub])=>{const box=el('article','stat');const title=el('div','label');title.append(el('span','',label),el('span','',icon));box.append(title,el('strong','',String(value)),el('small','',sub));return box}))}
function renderPlan(){const list=$('plan');list.replaceChildren();const pending=tasks.filter(t=>t.status!=='Concluído').sort((a,b)=>score(b)-score(a)).slice(0,4);
if(!pending.length){list.append(el('p','empty','Tudo concluído! Adicione uma nova tarefa.'));return}
pending.forEach((t,i)=>{const row=el('div','plan-row');row.append(el('span','plan-index',String(i+1).padStart(2,'0')));const details=el('div');
const when=daysLeft(t.due)<0?'Prazo vencido':daysLeft(t.due)===0?'Vence hoje':'Prazo '+dateLabel(t.due);
details.append(el('strong','',t.title),el('p','',priority(t)+' prioridade · '+when+' · Impacto '+t.impact+'/3'));row.append(details);list.append(row)})}
function renderProgress(){const done=tasks.filter(t=>t.status==='Concluído').length,percentage=tasks.length?Math.round(done/tasks.length*100):0;
const box=$('progress');box.replaceChildren();const wrap=el('div','progress-big');const ring=el('div','ring');
ring.style.background='conic-gradient(#a58bff '+percentage+'%,#303852 '+percentage+'%)';ring.append(el('div','ring-inner',percentage+'%'));
wrap.append(ring,el('p','progress-text',done+' de '+tasks.length+' tarefas concluídas. Continue avançando, uma entrega por vez.'));box.append(wrap)}
function render(){renderStats();renderBoard();renderPlan();renderProgress()}
$('today').textContent=today.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
$('addMain').addEventListener('click',()=>openForm());$('close').addEventListener('click',()=>$('modal').close());$('cancel').addEventListener('click',()=>$('modal').close());
$('search').addEventListener('input',renderBoard);$('filter').addEventListener('change',renderBoard);
$('taskForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget);const title=String(f.get('title')||'').trim();if(!title)return;
const task={id:editing||('task-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)),title,description:String(f.get('description')||'').trim(),due:String(f.get('due')),impact:Number(f.get('impact')),effort:Number(f.get('effort')),status:String(f.get('status'))};
if(editing)tasks=tasks.map(t=>t.id===editing?task:t);else tasks.unshift(task);persist();$('modal').close();render()});
persist();render();