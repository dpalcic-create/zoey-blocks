'use strict';
const W=10,H=22,HID=2;
const COLORS={I:'#4dd8ff',O:'#ffd23f',T:'#b46bff',S:'#5ee07a',Z:'#ff5a6e',J:'#4a7dff',L:'#ff9a3c'};
const SHAPES={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const rotCW=m=>m.map((r,i)=>r.map((_,j)=>m[m.length-1-j][i]));
const ROT={};for(const k in SHAPES){ROT[k]=[SHAPES[k]];for(let i=1;i<4;i++)ROT[k].push(rotCW(ROT[k][i-1]));}
// SRS kicks (x right, y up) for CW from state s; CCW from s = negated CW kicks of (s-1)
const KJ=[[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],[[0,0],[1,0],[1,-1],[0,2],[1,2]],[[0,0],[1,0],[1,1],[0,-2],[1,-2]],[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]];
const KI=[[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],[[0,0],[1,0],[-2,0],[1,-2],[-2,1]]];
function kicks(t,from,dir){if(t==='O')return[[0,0]];const K=t==='I'?KI:KJ;if(dir>0)return K[from];return K[(from+3)%4].map(([x,y])=>[-x,-y]);}
const $=id=>document.getElementById(id);
const LS={get(k,d){try{const v=localStorage.getItem('zb_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('zb_'+k,JSON.stringify(v))}catch(e){}},del(k){localStorage.removeItem('zb_'+k)}};
const settings=Object.assign({sound:true,buttons:false,ghost:true,haptic:true},LS.get('settings',{}));
let G=null; // game state
function newGame(){G={board:Array.from({length:H},()=>Array(W).fill(0)),bag:[],queue:[],hold:null,canHold:true,cur:null,score:0,level:1,lines:0,combo:-1,b2b:false,over:false,paused:false,clearing:null,lockT:0,lockResets:0,fallAcc:0,started:Date.now()};fillQ();spawn();save();}
function fillQ(){while(G.queue.length<5){if(!G.bag.length){G.bag=Object.keys(SHAPES);for(let i=6;i>0;i--){const j=Math.floor(Math.random()*(i+1));[G.bag[i],G.bag[j]]=[G.bag[j],G.bag[i]];}}G.queue.push(G.bag.pop());}}
function mk(t){const n=ROT[t][0].length;return{t,r:0,x:t==='O'?4:3,y:t==='I'?0:1-(0),};}
function spawn(t){if(!t){t=G.queue.shift();fillQ();}G.cur={t,r:0,x:t==='O'?4:3,y:t==='I'?0:0};G.lockT=0;G.lockResets=0;G.fallAcc=0;G.lastRot=false;
 if(collide(G.cur.x,G.cur.y,G.cur.r)){gameOver();return;}
 if(!collide(G.cur.x,G.cur.y+1,G.cur.r))G.cur.y++; }
function cells(t,r,x,y){const m=ROT[t][r],o=[];for(let i=0;i<m.length;i++)for(let j=0;j<m.length;j++)if(m[i][j])o.push([x+j,y+i]);return o;}
function collide(x,y,r,t){t=t||G.cur.t;for(const[cx,cy]of cells(t,r,x,y)){if(cx<0||cx>=W||cy>=H)return true;if(cy>=0&&G.board[cy][cx])return true;}return false;}
function grounded(){return collide(G.cur.x,G.cur.y+1,G.cur.r);}
function resetLock(){if(grounded()&&G.lockResets<15){G.lockT=0;G.lockResets++;}}
function move(dx){if(!live())return false;if(!collide(G.cur.x+dx,G.cur.y,G.cur.r)){G.cur.x+=dx;G.lastRot=false;resetLock();snd('move');return true;}return false;}
function rotate(dir){if(!live())return false;const c=G.cur,to=(c.r+(dir>0?1:3))%4;for(const[kx,ky]of kicks(c.t,c.r,dir)){if(!collide(c.x+kx,c.y-ky,to)){c.x+=kx;c.y-=ky;c.r=to;G.lastRot=true;G.lastKick=[kx,ky];resetLock();snd('rot');return true;}}return false;}
function soft(){if(!live())return false;if(!grounded()){G.cur.y++;G.score+=1;G.fallAcc=0;G.lastRot=false;return true;}return false;}
function hard(){if(!live())return;let n=0;while(!grounded()){G.cur.y++;n++;}G.score+=2*n;snd('drop');buzz(15);lock();}
function hold(){if(!live()||!G.canHold)return;const t=G.cur.t;if(G.hold){const h=G.hold;G.hold=t;spawn(h);}else{G.hold=t;spawn();}G.canHold=false;snd('hold');}
function live(){return G&&!G.over&&!G.paused&&!G.clearing&&G.cur&&screen==='game';}
function tspin(){const c=G.cur;if(c.t!=='T'||!G.lastRot)return false;let n=0;for(const[dx,dy]of[[0,0],[2,0],[0,2],[2,2]]){const X=c.x+dx,Y=c.y+dy;if(X<0||X>=W||Y>=H||(Y>=0&&G.board[Y][X]))n++;}return n>=3;}
function lock(){const c=G.cur,ts=tspin();let above=true;for(const[x,y]of cells(c.t,c.r,c.x,c.y)){if(y>=0)G.board[y][x]=c.t;if(y>=HID)above=false;}
 G.cur=null;const full=[];for(let y=0;y<H;y++)if(G.board[y].every(v=>v))full.push(y);
 if(above&&!full.length){gameOver();return;}
 score(full.length,ts);
 if(full.length){G.clearing={rows:full,t:0};snd('clear'+Math.min(full.length,4));buzz(full.length>=4?[30,40,30]:20);}else{G.canHold=true;spawn();save();}}
function finishClear(){const rows=G.clearing.rows;G.board=G.board.filter((_,y)=>!rows.includes(y));while(G.board.length<H)G.board.unshift(Array(W).fill(0));G.clearing=null;G.canHold=true;spawn();save();}
function score(n,ts){const L=G.level;let pts=0,label='';const base=ts?[400,800,1200,1600][n]:[0,100,300,500,800][n];
 if(n||ts){pts=base*L;label=ts?('T-Spin'+(n?' '+['','Single','Double','Triple'][n]:'')):['','Single','Double','Triple','4 Lines!'][n];}
 if(n){const diff=n===4||ts;if(diff&&G.b2b){pts=Math.floor(pts*1.5);label='Back-to-Back '+label;}G.b2b=diff;G.combo++;if(G.combo>0){pts+=50*G.combo*L;label+=` · Combo ×${G.combo}`;}}
 else G.combo=-1;
 if(G.board.every(r=>r.every(v=>!v))&&n){pts+=3000*L;label='Perfect clear!';}
 G.score+=pts;G.lines+=n;const nl=Math.floor(G.lines/10)+1;if(nl>G.level){G.level=nl;label+=` · Level ${nl}!`;snd('level');}
 if(label)showPop(label,n);G.lastClear={n,ts,pts};}
function gravityMs(l){return Math.max(16,Math.pow(0.8-(l-1)*0.007,l-1)*1000);}
function gameOver(){G.over=true;G.cur=G.cur||null;snd('over');buzz([60,60,120]);LS.del('save');const hs=LS.get('scores',[]);const e={s:G.score,l:G.lines,v:G.level,d:Date.now()};hs.push(e);hs.sort((a,b)=>b.s-a.s);const top=hs.slice(0,10);LS.set('scores',top);const rank=top.indexOf(e);
 setTimeout(()=>showOver(e,rank,top),450);}
function save(){if(G&&!G.over){const s=Object.assign({},G);s.clearing=null;LS.set('save',s);}}
// ---- render
const well=$('well'),wx=well.getContext('2d'),holdC=$('holdC'),hx=holdC.getContext('2d'),nextC=$('nextC'),nx=nextC.getContext('2d');
let CS=24,DPR=Math.max(1,window.devicePixelRatio||1);
function layout(){const pa=$('playArea');const aw=Math.min(window.innerWidth,430)-58*2-20;const ah=pa.clientHeight-8;CS=Math.max(12,Math.floor(Math.min(aw/W,ah/(H-HID))));
 well.width=CS*W*DPR;well.height=CS*(H-HID)*DPR;well.style.width=CS*W+'px';well.style.height=CS*(H-HID)+'px';
 for(const c of[holdC,nextC]){c.width=c.clientWidth*DPR;c.height=c.clientHeight*DPR;}}
function block(ctx,x,y,s,col,alpha){ctx.globalAlpha=alpha==null?1:alpha;const r=s*.18;ctx.fillStyle=col;rr(ctx,x+1,y+1,s-2,s-2,r);ctx.fill();
 const g=ctx.createLinearGradient(x,y,x,y+s);g.addColorStop(0,'rgba(255,255,255,.45)');g.addColorStop(.5,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=g;rr(ctx,x+1,y+1,s-2,s-2,r);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.35)';rr(ctx,x+s*.2,y+s*.14,s*.35,s*.12,s*.06);ctx.fill();ctx.globalAlpha=1;}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function draw(){const c=wx;c.setTransform(DPR,0,0,DPR,0,0);c.fillStyle='#120b2b';c.fillRect(0,0,CS*W,CS*(H-HID));
 c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=1;for(let i=1;i<W;i++){c.beginPath();c.moveTo(i*CS+.5,0);c.lineTo(i*CS+.5,CS*20);c.stroke();}for(let j=1;j<20;j++){c.beginPath();c.moveTo(0,j*CS+.5);c.lineTo(CS*W,j*CS+.5);c.stroke();}
 if(!G)return;const cl=G.clearing;
 for(let y=HID;y<H;y++)for(let x=0;x<W;x++){const v=G.board[y][x];if(!v)continue;if(cl&&cl.rows.includes(y)){const p=cl.t/300;const wipe=Math.abs(x-4.5)<p*6;if(wipe)continue;block(c,x*CS,(y-HID)*CS,CS,'#fff');}else block(c,x*CS,(y-HID)*CS,CS,COLORS[v]);}
 if(cl){c.globalAlpha=Math.max(0,1-cl.t/300)*.5;c.fillStyle='#fff';for(const y of cl.rows)c.fillRect(0,(y-HID)*CS,CS*W,CS);c.globalAlpha=1;}
 if(G.cur){const p=G.cur;if(settings.ghost){let gy=p.y;while(!collide(p.x,gy+1,p.r))gy++;for(const[x,y]of cells(p.t,p.r,p.x,gy))if(y>=HID){c.strokeStyle=COLORS[p.t];c.globalAlpha=.6;c.lineWidth=2;rr(c,x*CS+3,(y-HID)*CS+3,CS-6,CS-6,CS*.15);c.stroke();c.globalAlpha=1;}}
  const lk=grounded()?0.75+0.25*Math.cos(G.lockT/60):1;for(const[x,y]of cells(p.t,p.r,p.x,p.y))if(y>=HID)block(c,x*CS,(y-HID)*CS,CS,COLORS[p.t],lk);}
 mini(hx,holdC,G.hold?[G.hold]:[],G.canHold?1:.35);mini(nx,nextC,G.queue.slice(0,3),1);
 $('hScore').textContent=G.score.toLocaleString();$('hLevel').textContent=G.level;$('hLines').textContent=G.lines;}
function mini(c,cv,list,a){c.setTransform(DPR,0,0,DPR,0,0);const w=cv.clientWidth,h=cv.clientHeight;c.clearRect(0,0,w,h);const s=12,slot=h/Math.max(1,list.length===3?3:1);
 list.forEach((t,i)=>{const m=ROT[t][0];const cs=cells(t,0,0,0);const xs=cs.map(p=>p[0]),ys=cs.map(p=>p[1]);const bw=(Math.max(...xs)-Math.min(...xs)+1)*s,bh=(Math.max(...ys)-Math.min(...ys)+1)*s;const ox=(w-bw)/2-Math.min(...xs)*s,oy=i*slot+(slot-bh)/2-Math.min(...ys)*s;
  for(const[x,y]of cs)block(c,ox+x*s,oy+y*s,s,COLORS[t],a);});}
// ---- loop
let last=performance.now(),screen='title';
function loop(now){const dt=Math.min(100,now-last);last=now;
 if(G&&screen==='game'&&!G.paused&&!G.over){if(G.clearing){G.clearing.t+=dt;if(G.clearing.t>=320)finishClear();}
  else if(G.cur){if(grounded()){G.lockT+=dt;if(G.lockT>=500)lock();}else{G.fallAcc+=dt;const gm=gravityMs(G.level);while(G.fallAcc>=gm&&G.cur&&!grounded()){G.fallAcc-=gm;G.cur.y++;G.lastRot=false;}}}
  rep(dt);}
 if(screen==='game')draw();requestAnimationFrame(loop);}
// ---- UI
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));screen=id;if(id==='game')requestAnimationFrame(layout);if(id==='title')refreshTitle();}
function refreshTitle(){const s=LS.get('save',null);$('resumeBtn').hidden=!s;const hs=LS.get('scores',[]);$('best').textContent='Best: '+(hs[0]?hs[0].s.toLocaleString():0);}
function overlay(html){$('card').innerHTML=html;$('overlay').classList.add('show');}
function closeOv(){$('overlay').classList.remove('show');}
function pause(){if(!G||G.over||screen!=='game')return;G.paused=true;save();
 overlay(`<img class="zimg" src="zoey-face.jpg" alt=""><h2>Paused</h2><p class="sub">Zoey is waiting patiently…</p><div class="btnrow"><button class="big" id="oResume">Resume</button><button class="mid" id="oSet">Settings</button><button class="mid" id="oRestart">Restart</button><button class="mid" id="oHome">Home</button></div>`);
 $('oResume').onclick=resume;$('oRestart').onclick=()=>{closeOv();newGame();};$('oHome').onclick=()=>{closeOv();save();show('title');};$('oSet').onclick=()=>openSettings(pause);}
function resume(){closeOv();if(G){G.paused=false;last=performance.now();}}
function showOver(e,rank,top){const fresh=rank===0;
 overlay(`<h2>${fresh?'New high score!':'Game over'}</h2><img class="zimg" src="zoey.jpg" alt="Zoey">${fresh?'<div class="badge">🐾 Zoey is so proud! 🐾</div>':''}<div class="bigscore">${e.s.toLocaleString()}</div><div class="stats"><span>Lines ${e.l}</span><span>Level ${e.v}</span></div>${table(top.slice(0,5),e)}<div class="btnrow"><button class="big" id="oAgain">Play again</button><button class="mid" id="oHome">Home</button></div>`);
 $('oAgain').onclick=()=>{closeOv();newGame();};$('oHome').onclick=()=>{closeOv();G=null;show('title');};}
function table(list,me){if(!list.length)return'<p class="sub">No scores yet — go play!</p>';return'<table>'+list.map((s,i)=>`<tr class="${s===me?'me':''}"><td>${i+1}</td><td style="text-align:right">${s.s.toLocaleString()}</td><td>L${s.v}</td><td>${s.l} ln</td><td>${new Date(s.d).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</td></tr>`).join('')+'</table>';}
function openSettings(back){const opts=[['buttons','On-screen buttons','Use buttons instead of swipe gestures'],['sound','Sound effects',''],['ghost','Ghost piece','Shows where the piece will land'],['haptic','Vibration','Android only']];
 overlay(`<h2>Settings</h2>${opts.map(o=>`<div class="opt"><div>${o[1]}<small>${o[2]}</small></div><button class="tog ${settings[o[0]]?'on':''}" data-k="${o[0]}" aria-label="${o[1]}"></button></div>`).join('')}<div class="btnrow"><button class="big" id="oDone">Done</button></div>`);
 document.querySelectorAll('.tog').forEach(b=>b.onclick=()=>{const k=b.dataset.k;settings[k]=!settings[k];b.classList.toggle('on',settings[k]);LS.set('settings',settings);applySettings();});
 $('oDone').onclick=()=>{closeOv();back&&back();};}
function applySettings(){document.body.classList.toggle('btns',settings.buttons);if(screen==='game')requestAnimationFrame(layout);}
let popT,cheerT;const CHEERS=['Woof!','Good job!','Pawsome!','Arf arf!','Treat time!','Yip!'];
function showPop(txt,n){const p=$('popup');p.textContent=txt;p.classList.remove('show');void p.offsetWidth;p.classList.add('show');
 if(n){const a=$('avatar');a.classList.remove('bounce');void a.offsetWidth;a.classList.add('bounce');$('cheerTxt').textContent=n>=4?'Zoey-tastic!':CHEERS[Math.floor(Math.random()*CHEERS.length)];$('cheer').classList.add('show');clearTimeout(cheerT);cheerT=setTimeout(()=>$('cheer').classList.remove('show'),1300);}}
// ---- sound
let AC=null;function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function tone(f,d,type,v,at,slide){const a=AC;const t=a.currentTime+(at||0);const o=a.createOscillator(),g=a.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(v||.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.02);}
function snd(k){if(!settings.sound||!AC)return;try{switch(k){case'move':tone(220,.04,'square',.025);break;case'rot':tone(440,.05,'triangle',.05);break;case'drop':tone(160,.12,'sine',.12,0,60);break;case'hold':tone(330,.08,'triangle',.05);tone(495,.08,'triangle',.05,.06);break;
 case'clear1':tone(523,.12,'triangle',.07);break;case'clear2':[523,659].forEach((f,i)=>tone(f,.12,'triangle',.07,i*.07));break;case'clear3':[523,659,784].forEach((f,i)=>tone(f,.13,'triangle',.07,i*.07));break;case'clear4':[523,659,784,1047,1319].forEach((f,i)=>tone(f,.16,'square',.05,i*.07));break;
 case'level':[392,523,659,784].forEach((f,i)=>tone(f,.15,'triangle',.07,i*.09));break;case'over':[392,330,262,196].forEach((f,i)=>tone(f,.25,'sawtooth',.05,i*.18));break;}}catch(e){}}
function buzz(p){if(settings.haptic&&navigator.vibrate)try{navigator.vibrate(p)}catch(e){}}
// ---- touch gestures
const gs=$('game');let T=null;
gs.addEventListener('touchstart',e=>{ac();if(settings.buttons||e.target.closest('button,#pad'))return;e.preventDefault();if(e.touches.length===2){T=null;rotate(-1);return;}const t=e.touches[0];T={x0:t.clientX,y0:t.clientY,x:t.clientX,y:t.clientY,ax:t.clientX,ay:t.clientY,t0:performance.now(),axis:null,hist:[[t.clientX,t.clientY,performance.now()]],moved:false};},{passive:false});
gs.addEventListener('touchmove',e=>{e.preventDefault();if(!T||settings.buttons)return;const t=e.touches[0],now=performance.now();T.hist.push([t.clientX,t.clientY,now]);if(T.hist.length>6)T.hist.shift();
 const dx=t.clientX-T.x0,dy=t.clientY-T.y0;if(!T.axis&&Math.hypot(dx,dy)>10)T.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
 const step=Math.max(16,CS*.9);
 if(T.axis==='x'){while(t.clientX-T.ax>=step){move(1);T.ax+=step;T.moved=true;}while(T.ax-t.clientX>=step){move(-1);T.ax-=step;T.moved=true;}}
 else if(T.axis==='y'){while(t.clientY-T.ay>=step){soft();T.ay+=step;T.moved=true;}if(dy<-40&&!T.held){T.held=true;hold();}}},{passive:false});
gs.addEventListener('touchend',e=>{if(!T||settings.buttons)return;e.preventDefault();const now=performance.now();const dx=T.hist.at(-1)[0]-T.x0,dy=T.hist.at(-1)[1]-T.y0,dur=now-T.t0;
 const h0=T.hist[0],h1=T.hist.at(-1),vy=(h1[1]-h0[1])/Math.max(1,h1[2]-h0[2]);
 if(T.axis==='y'&&dy>30&&(vy>0.9||(dur<220&&dy>50)))hard();
 else if(!T.axis&&dur<300)rotate(1);T=null;},{passive:false});
gs.addEventListener('touchcancel',()=>T=null);
// mouse fallback (desktop testing): click = rotate
well.addEventListener('mousedown',()=>{ac();});
// ---- buttons with auto-repeat
let held=null;const ACT={left:()=>move(-1),right:()=>move(1),soft:()=>soft(),cw:()=>rotate(1),ccw:()=>rotate(-1),hard:()=>hard(),hold:()=>hold()};
function rep(dt){if(!held)return;held.t+=dt;const das=held.a==='soft'?60:170,arr=held.a==='soft'?40:50;while(held.t>=das){ACT[held.a]();held.t-=arr;}}
document.querySelectorAll('#pad button').forEach(b=>{const a=b.dataset.a;const down=e=>{e.preventDefault();ac();b.classList.add('on');ACT[a]();if(b.classList.contains('rep'))held={a,t:0};};const up=e=>{e&&e.preventDefault();b.classList.remove('on');if(held&&held.a===a)held=null;};
 b.addEventListener('touchstart',down,{passive:false});b.addEventListener('touchend',up,{passive:false});b.addEventListener('touchcancel',up);b.addEventListener('mousedown',down);b.addEventListener('mouseup',up);b.addEventListener('mouseleave',up);});
// ---- keyboard
const keys={};document.addEventListener('keydown',e=>{ac();if(screen!=='game'||!G)return;const k=e.key;
 if(k==='p'||k==='P'||k==='Escape'){G.paused?resume():pause();e.preventDefault();return;}
 if(keys[k]&&!['ArrowLeft','ArrowRight','ArrowDown'].includes(k))return;keys[k]=1;
 const m={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'soft',ArrowUp:'cw',x:'cw',X:'cw',z:'ccw',Z:'ccw',Control:'ccw',' ':'hard',c:'hold',C:'hold',Shift:'hold'}[k];if(m){e.preventDefault();ACT[m]();}});
document.addEventListener('keyup',e=>{keys[e.key]=0;});
// ---- wiring
$('playBtn').onclick=()=>{ac();if(LS.get('save',null)&&!confirm('Start a new game? Your saved game will be lost.'))return;newGame();show('game');};
$('resumeBtn').onclick=()=>{ac();const s=LS.get('save',null);if(!s)return;G=s;G.paused=false;G.clearing=null;if(!G.cur){G.canHold=true;spawn();}show('game');};
$('pauseBtn').onclick=e=>{pause();};
$('setBtn').onclick=()=>openSettings();
$('scoresBtn').onclick=()=>{overlay(`<img class="zimg" src="zoey-face.jpg" alt=""><h2>High scores</h2>${table(LS.get('scores',[]),null)}<div class="btnrow"><button class="big" id="oDone">Done</button></div>`);$('oDone').onclick=closeOv;};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&!G.over&&screen==='game'){if(!G.paused)pause();else save();}});
window.addEventListener('pagehide',()=>save());
window.addEventListener('resize',()=>{if(screen==='game')layout();});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault());
applySettings();refreshTitle();requestAnimationFrame(loop);
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
// test hook
window.__zb={get G(){return G},set(v){G=v},newGame,move,rotate,soft,hard,hold,lock,spawn,collide,cells,ROT,W,H,
 setBoard(rows){/* rows: array of strings bottom-aligned, '#'=filled */G.board=Array.from({length:H},()=>Array(W).fill(0));rows.forEach((r,i)=>{const y=H-rows.length+i;[...r].forEach((ch,x)=>{if(ch!=='.')G.board[y][x]=ch==='#'?'J':ch;});});},
 setPiece(t,x,y,r){G.cur={t,x,y,r:r||0};G.lockT=0;G.lockResets=0;}};
