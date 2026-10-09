(() => {
  const STORAGE_KEY = 'alpirsbacher-steeldartscup-mvp-v1';
  const GROUPS = 'ABCDEFGHIJKLMNOP'.split('');
  const BOARD_GROUPS = {
    1: ['A','B','C'],
    2: ['D','E','F'],
    3: ['G','H','I'],
    4: ['J','K','L'],
    5: ['M','N'],
    6: ['O','P']
  };
  const FIXED_R32 = [
    ['A',1,'P',2], ['B',1,'O',2], ['C',1,'N',2], ['D',1,'M',2],
    ['E',1,'L',2], ['F',1,'K',2], ['G',1,'J',2], ['H',1,'I',2],
    ['I',1,'H',2], ['J',1,'G',2], ['K',1,'F',2], ['L',1,'E',2],
    ['M',1,'D',2], ['N',1,'C',2], ['O',1,'B',2], ['P',1,'A',2]
  ];

  const NAV = [
    ['dashboard','▦','Dashboard'],
    ['checkin','✓','Check-in'],
    ['participants','👥','Teilnehmer'],
    ['draw','🎲','Auslosung'],
    ['groups','▤','Gruppen'],
    ['boards','🎯','Boards'],
    ['knockout','⌘','KO-Baum'],
    ['beamer','▣','Beamer'],
    ['sync','↻','Anmeldung / Sync']
  ];

  const firstNames = [
    'Andreas','Benjamin','Christian','Daniel','David','Dennis','Dominik','Florian','Frank','Jan',
    'Jens','Jonas','Kevin','Lars','Marco','Markus','Martin','Matthias','Michael','Nico',
    'Patrick','Peter','Philipp','Ralf','Robin','Sascha','Sebastian','Simon','Stefan','Sven',
    'Thomas','Timo','Tobias','Torsten','Alexander','Felix','Julian','Manuel','Oliver','René',
    'Fabian','Marcel','Kai','Tim','Max','Lukas','Niklas','Moritz','Johannes','Marius',
    'Lisa','Sarah','Julia','Anna','Laura','Nadine','Sandra','Melanie','Kathrin','Vanessa',
    'Marco','Steffen','Bernd','Heiko','Dirk','Volker','Joachim','Holger','Uwe','Jürgen',
    'Chris','Alex','Micha','Tom','Leon','Fabio','Pascal','Rene','Marvin','Dennis'
  ];
  const lastNames = [
    'Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann',
    'Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann',
    'Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier',
    'Lehmann','Schmid','Schulze','Maier','Köhler','Herrmann','König','Walter','Mayer','Huber',
    'Kaiser','Fuchs','Peters','Lang','Scholz','Möller','Weiß','Jung','Hahn','Schubert',
    'Vogel','Friedrich','Keller','Günther','Frank','Berger','Winkler','Roth','Beck','Lorenz',
    'Baumann','Franke','Albrecht','Schuster','Simon','Ludwig','Böhm','Winter','Kraus','Martin',
    'Schumacher','Vogt','Stein','Jäger','Otto','Sommer','Groß','Seidel','Heinrich','Brandt'
  ];
  const dartNames = ['The Hammer','Iceman','Black Arrow','The Fox','Bulleye','The Machine','Lucky Dart','Red Dragon','The Chief','One Dart'];

  let state = loadState();
  let currentView = 'dashboard';
  let currentGroup = 'A';
  let selectedBoard = 1;

  function seedParticipants() {
    return Array.from({length:80}, (_,i) => ({
      id: `P${String(i+1).padStart(3,'0')}`,
      firstName: firstNames[i],
      lastName: lastNames[i],
      dartName: i % 9 === 0 ? dartNames[(i/9) % dartNames.length | 0] : '',
      email: `${slug(firstNames[i])}.${slug(lastNames[i])}@beispiel.de`,
      phone: i % 4 === 0 ? '' : `0176 ${String(10000000+i*137).slice(0,8)}`,
      registrationStatus: 'bestätigt',
      checkinStatus: 'angemeldet',
      waitlist: false,
      active: true,
      source: 'Anmeldung'
    }));
  }

  function initialState() {
    return {
      version: 1,
      tournament: {
        name: '3. Alpirsbacher Steeldartscup',
        date: '16.01.2027',
        drawLocked: false,
        published: false,
        publishedAt: null,
        started: false,
        finished: false,
        phase: 'Vorbereitung'
      },
      participants: seedParticipants(),
      groups: {},
      boardSchedules: {},
      boardPointers: {1:0,2:0,3:0,4:0,5:0,6:0},
      lastCompletedByBoard: {1:null,2:null,3:null,4:null,5:null,6:null},
      manualGroupOrder: {},
      knockout: { r32: [], r16: [], qf: [], sf: [], third: [], final: [] },
      audit: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : initialState();
    } catch (_) {
      return initialState();
    }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); updateBadges(); }
  function resetDemo() { state = initialState(); saveState(); render(); toast('Demo wurde zurückgesetzt.','success'); }

  function slug(s){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,''); }
  function esc(s=''){ return String(s).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
  function playerName(p, fullDart=false){
    if (!p) return '–';
    return fullDart && p.dartName ? `${p.firstName} „${p.dartName}“ ${p.lastName}` : `${p.firstName} ${p.lastName}`;
  }
  function getPlayer(id){ return state.participants.find(p=>p.id===id); }
  function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function audit(text){ state.audit.unshift({at:new Date().toISOString(), text}); state.audit = state.audit.slice(0,100); }
  function toast(text,type='success'){ const root=document.getElementById('toastRoot'); const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=text; root.appendChild(el); setTimeout(()=>el.remove(),3000); }
  function pct(n,d){ return d ? Math.round(n/d*100) : 0; }

  function roundRobinMatches(ids, group) {
    const players = [...ids];
    if (players.length % 2) players.push(null);
    const rounds = [];
    const n = players.length;
    const arr = [...players];
    for (let r=0;r<n-1;r++) {
      const round=[];
      for (let i=0;i<n/2;i++) {
        const a=arr[i], b=arr[n-1-i];
        if (a && b) round.push([a,b]);
      }
      rounds.push(round);
      arr.splice(1,0,arr.pop());
    }
    const flattened=[];
    let count=1;
    for (const round of rounds) {
      for (const [a,b] of round) {
        flattened.push({
          id:`G-${group}-${count++}`,
          type:'group', group, playerA:a, playerB:b,
          winnerId:null, status:'pending', startedAt:null, completedAt:null
        });
      }
    }
    return flattened;
  }

  function performDraw() {
    const active = state.participants.filter(p=>p.active && p.registrationStatus==='bestätigt' && !p.waitlist);
    if (active.length < 80) return toast(`Es sind nur ${active.length} aktive bestätigte Teilnehmer vorhanden.`, 'danger');
    const selected = shuffle(active).slice(0,80);
    const groups = {};
    GROUPS.forEach((g,gi)=>{
      const ids=selected.slice(gi*5,gi*5+5).map(p=>p.id);
      groups[g]={name:g, board: Number(Object.keys(BOARD_GROUPS).find(b=>BOARD_GROUPS[b].includes(g))), playerIds:ids, matches:roundRobinMatches(ids,g)};
    });
    state.groups=groups;
    state.boardSchedules={};
    for(const [board,groupNames] of Object.entries(BOARD_GROUPS)) {
      const schedule=[];
      for(let i=0;i<10;i++) {
        for(const g of groupNames) schedule.push(groups[g].matches[i].id);
      }
      state.boardSchedules[board]=schedule;
      state.boardPointers[board]=0;
      state.lastCompletedByBoard[board]=null;
    }
    state.manualGroupOrder={};
    state.knockout={r32:[],r16:[],qf:[],sf:[],third:[],final:[]};
    state.tournament.drawLocked=true;
    state.tournament.published=false;
    state.tournament.started=false;
    state.tournament.phase='Ausgelost';
    audit('Gruppenauslosung durchgeführt.');
    saveState(); render(); toast('80 Teilnehmer wurden zufällig ausgelost.');
  }

  function allGroupMatches(){ return GROUPS.flatMap(g=>state.groups[g]?.matches||[]); }
  function findMatch(id){
    for(const g of GROUPS){ const m=state.groups[g]?.matches.find(x=>x.id===id); if(m) return m; }
    for(const round of Object.values(state.knockout)){ const m=(round||[]).find(x=>x.id===id); if(m) return m; }
    return null;
  }
  function boardMatch(board, offset=0){
    const schedule=state.boardSchedules[board]||[];
    let idx=(state.boardPointers[board]||0)+offset;
    while(idx<schedule.length){ const m=findMatch(schedule[idx]); if(m && m.status!=='completed') return m; idx++; }
    return null;
  }
  function normalizeBoardPointer(board){
    const schedule=state.boardSchedules[board]||[];
    let i=state.boardPointers[board]||0;
    while(i<schedule.length){ const m=findMatch(schedule[i]); if(m && m.status!=='completed') break; i++; }
    state.boardPointers[board]=i;
  }
  function startCurrentMatch(board){
    normalizeBoardPointer(board);
    const m=boardMatch(board,0); if(!m) return;
    if(m.status==='pending'){m.status='running';m.startedAt=new Date().toISOString(); audit(`${m.id} auf Board ${board} gestartet.`); saveState(); render();}
  }
  function completeGroupMatch(board, matchId, winnerId){
    const m=findMatch(matchId); if(!m || m.type!=='group') return;
    m.winnerId=winnerId; m.status='completed'; m.completedAt=new Date().toISOString();
    state.lastCompletedByBoard[board]=m.id;
    normalizeBoardPointer(board);
    audit(`${m.id} beendet: ${playerName(getPlayer(winnerId))} gewinnt.`);
    refreshKnockoutSeeds();
    saveState(); render(); toast('Ergebnis gespeichert.');
  }
  function undoLastBoardResult(board){
    const id=state.lastCompletedByBoard[board]; if(!id) return;
    const m=findMatch(id); if(!m) return;
    m.winnerId=null; m.status='pending'; m.completedAt=null; m.startedAt=null;
    const idx=(state.boardSchedules[board]||[]).indexOf(id); if(idx>=0) state.boardPointers[board]=Math.min(state.boardPointers[board],idx);
    state.lastCompletedByBoard[board]=null;
    audit(`${id} wurde vom Schreiber zurückgesetzt.`);
    refreshKnockoutSeeds(); saveState(); render(); toast('Letztes Ergebnis wurde zurückgesetzt.','warning');
  }

  function standings(groupName){
    const g=state.groups[groupName]; if(!g) return [];
    const rows=g.playerIds.map(id=>({id,wins:0,losses:0,played:0}));
    const map=Object.fromEntries(rows.map(r=>[r.id,r]));
    const completed=g.matches.filter(m=>m.status==='completed');
    for(const m of completed){
      map[m.playerA].played++; map[m.playerB].played++;
      if(m.winnerId===m.playerA){map[m.playerA].wins++;map[m.playerB].losses++;} else {map[m.playerB].wins++;map[m.playerA].losses++;}
    }
    const manual=state.manualGroupOrder[groupName];
    if(manual?.length===5){
      const rank=Object.fromEntries(manual.map((id,i)=>[id,i]));
      return rows.sort((a,b)=>rank[a.id]-rank[b.id]);
    }
    rows.sort((a,b)=>b.wins-a.wins || a.losses-b.losses || playerName(getPlayer(a.id)).localeCompare(playerName(getPlayer(b.id))));
    // Direct comparison only when exactly two players share the same win total.
    const byWins={}; rows.forEach(r=>(byWins[r.wins]??=[]).push(r));
    for(const tied of Object.values(byWins)){
      if(tied.length===2){
        const [a,b]=tied;
        const direct=completed.find(m=>[m.playerA,m.playerB].includes(a.id)&&[m.playerA,m.playerB].includes(b.id));
        if(direct){
          const ia=rows.indexOf(a), ib=rows.indexOf(b);
          if(direct.winnerId===b.id && ia<ib){ rows.splice(ia,1); rows.splice(ib,0,a); }
          if(direct.winnerId===a.id && ib<ia){ rows.splice(ib,1); rows.splice(ia,0,b); }
        }
      }
    }
    return rows;
  }
  function groupTieWarning(groupName){
    const g=state.groups[groupName]; if(!g || state.manualGroupOrder[groupName]) return false;
    const st=standings(groupName); const completed=g.matches.filter(m=>m.status==='completed').length;
    if(completed<10) return false;
    const byWins={}; st.forEach(r=>(byWins[r.wins]??=[]).push(r.id));
    return Object.values(byWins).some(ids=>ids.length>=3);
  }
  function groupComplete(groupName){ return (state.groups[groupName]?.matches||[]).every(m=>m.status==='completed'); }
  function qualifier(groupName, place){
    if(!groupComplete(groupName) || groupTieWarning(groupName)) return null;
    return standings(groupName)[place-1]?.id || null;
  }

  function refreshKnockoutSeeds(){
    if(!Object.keys(state.groups).length) return;
    const existing = Object.fromEntries((state.knockout.r32||[]).map(m=>[m.id,m]));
    state.knockout.r32 = FIXED_R32.map((x,i)=>{
      const [g1,p1,g2,p2]=x; const old=existing[`K-R32-${i+1}`];
      return {
        id:`K-R32-${i+1}`, type:'ko', round:'Letzte 32', bestOf:3,
        playerA: qualifier(g1,p1), playerB: qualifier(g2,p2),
        scoreA:old?.scoreA||0, scoreB:old?.scoreB||0, winnerId:old?.winnerId||null,
        status:old?.status||'pending', source:`${g1}${p1} – ${g2}${p2}`
      };
    });
    buildLaterRounds();
  }
  function buildLaterRounds(){
    const specs=[
      ['r16','Achtelfinale',8,3,'r32'],
      ['qf','Viertelfinale',4,5,'r16'],
      ['sf','Halbfinale',2,7,'qf'],
      ['final','Finale',1,9,'sf']
    ];
    for(const [key,label,count,bestOf,prev] of specs){
      const existing=Object.fromEntries((state.knockout[key]||[]).map(m=>[m.id,m]));
      state.knockout[key]=Array.from({length:count},(_,i)=>{
        const old=existing[`K-${key.toUpperCase()}-${i+1}`];
        const a=state.knockout[prev][i*2]?.winnerId||null;
        const b=state.knockout[prev][i*2+1]?.winnerId||null;
        return {id:`K-${key.toUpperCase()}-${i+1}`,type:'ko',round:label,bestOf,playerA:a,playerB:b,scoreA:old?.scoreA||0,scoreB:old?.scoreB||0,winnerId:old?.winnerId||null,status:old?.status||'pending'};
      });
    }
    const sf=state.knockout.sf;
    const losers=sf.map(m=>m.winnerId ? (m.winnerId===m.playerA?m.playerB:m.playerA) : null);
    const oldThird=state.knockout.third?.[0];
    state.knockout.third=[{id:'K-THIRD-1',type:'ko',round:'Spiel um Platz 3',bestOf:7,playerA:losers[0]||null,playerB:losers[1]||null,scoreA:oldThird?.scoreA||0,scoreB:oldThird?.scoreB||0,winnerId:oldThird?.winnerId||null,status:oldThird?.status||'pending'}];
  }

  function publishTournament(){
    if(!Object.keys(state.groups).length) return toast('Bitte zuerst auslosen.','warning');
    state.tournament.published=true; state.tournament.publishedAt=new Date().toISOString();
    audit('Turnierplan veröffentlicht.'); saveState(); render(); toast('Turnierplan veröffentlicht.');
  }
  function startTournament(){
    if(!state.tournament.published) return toast('Der Turnierplan muss zuerst veröffentlicht werden.','warning');
    state.tournament.started=true; state.tournament.phase='Gruppenphase';
    for(let b=1;b<=6;b++) startCurrentMatch(b);
    audit('Turnier gestartet.'); saveState(); render(); toast('Turnier ist gestartet.');
  }

  function renderNav(){
    document.getElementById('mainNav').innerHTML=NAV.map(([id,icon,label])=>`<button data-view="${id}" class="${id===currentView?'active':''}"><span>${icon}</span>${label}</button>`).join('');
    document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render();});
  }
  function updateBadges(){
    const pb=document.getElementById('publishBadge'); const ph=document.getElementById('phaseBadge'); if(!pb||!ph) return;
    pb.textContent=state.tournament.published?'Veröffentlicht':'Nicht veröffentlicht'; pb.className=`badge ${state.tournament.published?'badge-success':'badge-muted'}`;
    ph.textContent=state.tournament.phase; ph.className='badge';
  }
  function render(){
    renderNav(); updateBadges();
    const meta=NAV.find(x=>x[0]===currentView); document.getElementById('pageTitle').textContent=meta?meta[2]:'Dashboard';
    const content=document.getElementById('content');
    const views={dashboard:renderDashboard,checkin:renderCheckin,participants:renderParticipants,draw:renderDraw,groups:renderGroups,boards:renderBoards,knockout:renderKnockout,beamer:renderBeamer,sync:renderSync};
    content.innerHTML=(views[currentView]||renderDashboard)();
    bindViewHandlers();
  }

  function renderDashboard(){
    const matches=allGroupMatches(); const done=matches.filter(m=>m.status==='completed').length;
    const checked=state.participants.filter(p=>p.active&&p.checkinStatus==='eingecheckt').length;
    const groupsDone=GROUPS.filter(groupComplete).length;
    const warnings=GROUPS.filter(groupTieWarning).map(g=>`Gruppe ${g}: Stechen / manuelle Reihenfolge erforderlich`);
    const boards=Array.from({length:6},(_,i)=>renderBoardCard(i+1)).join('');
    return `
      <div class="grid grid-4">
        <div class="card metric"><span class="label">Gruppenspiele</span><span class="value">${done} / ${matches.length||160}</span><div class="progress"><span style="width:${pct(done,matches.length||160)}%"></span></div></div>
        <div class="card metric"><span class="label">Check-in</span><span class="value">${checked} / 80</span><span class="small muted">${80-checked} noch offen</span></div>
        <div class="card metric"><span class="label">Gruppen fertig</span><span class="value">${groupsDone} / 16</span><span class="small muted">${GROUPS.filter(g=>qualifier(g,1)&&qualifier(g,2)).length*2} KO-Spieler fest</span></div>
        <div class="card metric"><span class="label">Turnierstatus</span><span class="value" style="font-size:21px">${state.tournament.phase}</span><span class="small muted">${state.tournament.published?'Plan veröffentlicht':'Plan intern'}</span></div>
      </div>
      <div class="section-head" style="margin-top:22px"><h3>Boards</h3><div class="actions">${!state.tournament.started?`<button class="btn btn-success" id="startTournamentBtn" ${!state.tournament.published?'disabled':''}>Turnier starten</button>`:''}</div></div>
      <div class="board-grid">${boards}</div>
      <div class="grid grid-2" style="margin-top:18px">
        <div class="card"><h3>Hinweise</h3>${warnings.length?warnings.map(w=>`<div class="notice warning" style="margin-bottom:8px">⚠ ${w}</div>`).join(''):`<div class="notice success">Aktuell keine kritischen Hinweise.</div>`}</div>
        <div class="card"><h3>Kurzaktionen</h3><div class="actions"><button class="btn btn-secondary" data-goto="checkin">Check-in öffnen</button><button class="btn btn-secondary" data-goto="draw">Auslosung</button><button class="btn btn-secondary" data-goto="beamer">Beamer öffnen</button></div><p class="muted small" style="margin-bottom:0">Die zwei Turnierleiter können dieselbe Verwaltungsansicht benutzen. Eine echte Mehrbenutzer-Synchronisierung kommt mit dem Server-Backend.</p></div>
      </div>`;
  }

  function renderBoardCard(board){
    const cur=boardMatch(board,0), next=boardMatch(board,1);
    return `<div class="board-card ${cur?'running':''}">
      <div class="board-head"><span class="board-title">Board ${board}</span><span class="badge ${cur?.status==='running'?'badge-success':'badge-muted'}">${cur?.status==='running'?'Läuft':cur?'Bereit':'Fertig'}</span></div>
      ${cur?`<div class="small muted">Gruppe ${cur.group}</div><div class="match-main">${esc(playerName(getPlayer(cur.playerA)))}<br><span class="muted">gegen</span><br>${esc(playerName(getPlayer(cur.playerB)))}</div>`:`<div class="empty">Keine offenen Gruppenspiele</div>`}
      <div class="match-next"><strong>Als Nächstes</strong><br>${next?`${esc(playerName(getPlayer(next.playerA)))} – ${esc(playerName(getPlayer(next.playerB)))} · Gruppe ${next.group}`:'–'}</div>
      <div class="actions" style="margin-top:12px"><button class="btn btn-secondary btn-small" data-board-open="${board}">Board öffnen</button></div>
    </div>`;
  }

  function renderCheckin(){
    const ps=state.participants.filter(p=>p.active&&!p.waitlist);
    const checked=ps.filter(p=>p.checkinStatus==='eingecheckt').length;
    return `<div class="section-head"><div><h3>Teilnehmer-Check-in</h3><p class="muted small">Nur die Turnierleitung checkt Teilnehmer ein.</p></div><div class="actions"><button id="checkAllBtn" class="btn btn-secondary">Alle einchecken (Test)</button></div></div>
      <div class="card" style="margin-bottom:14px"><div class="grid grid-3"><div class="metric"><span class="label">Eingecheckt</span><span class="value">${checked}</span></div><div class="metric"><span class="label">Offen</span><span class="value">${ps.length-checked}</span></div><div><input id="checkinSearch" class="input" placeholder="Name suchen …"></div></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Dartname</th><th>Status</th><th>Gruppe</th><th class="compact">Aktion</th></tr></thead><tbody id="checkinRows">${ps.map(checkinRow).join('')}</tbody></table></div>`;
  }
  function checkinRow(p){
    const g=GROUPS.find(x=>state.groups[x]?.playerIds.includes(p.id))||'–';
    const checked=p.checkinStatus==='eingecheckt';
    return `<tr data-search="${esc((playerName(p)+' '+p.dartName).toLowerCase())}"><td><strong>${esc(playerName(p))}</strong></td><td>${p.dartName?`„${esc(p.dartName)}“`:'–'}</td><td><span class="status-dot ${checked?'ok':'warn'}"></span>${checked?'eingecheckt':'angemeldet'}</td><td>${g}</td><td class="compact"><button class="btn ${checked?'btn-secondary':'btn-success'} btn-small" data-checkin="${p.id}">${checked?'Zurücksetzen':'Einchecken'}</button></td></tr>`;
  }

  function renderParticipants(){
    const ps=state.participants;
    return `<div class="section-head"><div><h3>Teilnehmerverwaltung</h3><p class="muted small">Daten dürfen von der Turnierleitung auch nach der Übernahme korrigiert werden.</p></div><button class="btn" id="addParticipantBtn">Teilnehmer hinzufügen</button></div>
      <div class="card" style="margin-bottom:14px"><input id="participantSearch" class="input" placeholder="Teilnehmer suchen …"></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Name</th><th>Dartname</th><th>E-Mail</th><th>Telefon</th><th>Status</th><th class="compact">Aktion</th></tr></thead><tbody id="participantRows">${ps.map(p=>`<tr data-search="${esc((playerName(p)+' '+p.email+' '+p.dartName).toLowerCase())}"><td>${p.id}</td><td><strong>${esc(playerName(p))}</strong></td><td>${p.dartName?esc(p.dartName):'–'}</td><td>${esc(p.email)}</td><td>${esc(p.phone||'–')}</td><td>${p.waitlist?'<span class="badge badge-warning">Nachrücker</span>':p.active?'<span class="badge badge-success">aktiv</span>':'<span class="badge badge-muted">inaktiv</span>'}</td><td><button class="btn btn-secondary btn-small" data-edit-player="${p.id}">Bearbeiten</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderDraw(){
    const drawn=Object.keys(state.groups).length>0;
    return `<div class="grid grid-2">
      <div class="card"><h3>Gruppenauslosung</h3><p class="muted">80 aktive Teilnehmer werden vollständig zufällig auf 16 Gruppen à 5 verteilt.</p><div class="actions">
        <button class="btn" id="drawBtn" ${state.tournament.drawLocked?'disabled':''}>${drawn?'Neu auslosen':'Jetzt auslosen'}</button>
        <button class="btn btn-secondary" id="toggleLockBtn" ${!drawn?'disabled':''}>${state.tournament.drawLocked?'Auslosung entsperren':'Auslosung sperren'}</button>
      </div><p class="small muted">Nach Veröffentlichung wird eine Neuauslosung später mit zusätzlicher Sicherheitsabfrage versehen. In diesem MVP ist sie durch die Sperre geschützt.</p></div>
      <div class="card"><h3>Veröffentlichung</h3><p class="muted">Auslosung und Veröffentlichung sind getrennt. Erst veröffentlichen, wenn alles kontrolliert wurde.</p><div class="actions"><button class="btn btn-success" id="publishBtn" ${!drawn||state.tournament.published?'disabled':''}>Turnierplan veröffentlichen</button></div><p class="small muted">Status: <strong>${state.tournament.published?'veröffentlicht':'nur intern sichtbar'}</strong></p></div>
    </div>
    ${drawn?`<div class="group-grid" style="margin-top:18px">${GROUPS.map(g=>renderDrawGroup(g)).join('')}</div>`:`<div class="empty" style="margin-top:18px">Noch keine Auslosung vorhanden.</div>`}`;
  }
  function renderDrawGroup(g){
    const gr=state.groups[g];
    return `<div class="group-card"><h3><span>Gruppe ${g}</span><span class="badge">Board ${gr.board}</span></h3>${gr.playerIds.map((id,i)=>{const p=getPlayer(id);return `<div class="player-line"><span>${i+1}. <span class="player-name">${esc(playerName(p))}</span>${p.dartName?` <span class="dartname">„${esc(p.dartName)}“</span>`:''}</span><button class="btn btn-ghost btn-small" data-swap-player="${id}" data-group="${g}">Tauschen</button></div>`}).join('')}</div>`;
  }

  function renderGroups(){
    if(!Object.keys(state.groups).length) return `<div class="empty">Bitte zuerst eine Auslosung durchführen.</div>`;
    const tabs=GROUPS.map(g=>`<button class="${currentGroup===g?'active':''}" data-group-tab="${g}">${g}</button>`).join('');
    const g=state.groups[currentGroup], st=standings(currentGroup), warning=groupTieWarning(currentGroup);
    return `<div class="tabs">${tabs}</div>
      ${warning?`<div class="notice warning" style="margin-bottom:14px">⚠ In Gruppe ${currentGroup} besteht ein nicht automatisch auflösbarer Mehrfach-Gleichstand. Das vorgesehene Stechen kann gespielt und die Reihenfolge anschließend manuell festgelegt werden. <button class="btn btn-warning btn-small" data-manual-rank="${currentGroup}" style="margin-left:8px">Reihenfolge festlegen</button></div>`:''}
      <div class="grid grid-2">
        <div class="card"><div class="section-head"><h3>Tabelle Gruppe ${currentGroup}</h3><span class="badge">Board ${g.board}</span></div><div class="table-wrap"><table class="table" style="min-width:0"><thead><tr><th>#</th><th>Spieler</th><th>Sp.</th><th>Siege</th><th>N.</th></tr></thead><tbody>${st.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${esc(playerName(getPlayer(r.id)))}</strong></td><td>${r.played}</td><td>${r.wins}</td><td>${r.losses}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><h3>Spiele</h3>${g.matches.map((m,i)=>`<div class="player-line"><span><span class="muted">${i+1}.</span> ${esc(playerName(getPlayer(m.playerA)))} – ${esc(playerName(getPlayer(m.playerB)))}</span><span>${m.status==='completed'?`<strong>${esc(playerName(getPlayer(m.winnerId)))}</strong> ✓`:m.status==='running'?'<span class="badge badge-success">läuft</span>':'<span class="muted">offen</span>'}</span></div>`).join('')}</div>
      </div>`;
  }

  function renderBoards(){
    if(!Object.keys(state.groups).length) return `<div class="empty">Bitte zuerst auslosen.</div>`;
    return `<div class="tabs">${Array.from({length:6},(_,i)=>`<button data-board-tab="${i+1}" class="${selectedBoard===i+1?'active':''}">Board ${i+1}</button>`).join('')}</div>${renderBoardControl(selectedBoard)}`;
  }
  function renderBoardControl(board){
    const cur=boardMatch(board,0), next=boardMatch(board,1), last=state.lastCompletedByBoard[board];
    if(!cur) return `<div class="card"><h3>Board ${board}</h3><div class="empty">Alle Gruppenspiele auf diesem Board sind abgeschlossen.</div>${last?`<div class="actions" style="margin-top:12px"><button class="btn btn-warning" data-undo-board="${board}">Letztes Ergebnis korrigieren</button></div>`:''}</div>`;
    const pa=getPlayer(cur.playerA),pb=getPlayer(cur.playerB);
    return `<div class="board-control"><div class="card"><div class="section-head"><div><span class="badge">Board ${board}</span><h3 style="margin-top:8px">Aktuelles Spiel · Gruppe ${cur.group}</h3></div><span class="badge ${cur.status==='running'?'badge-success':'badge-muted'}">${cur.status==='running'?'läuft':'bereit'}</span></div>
      <div class="score-box"><div class="score-player"><div class="name">${esc(playerName(pa))}</div>${pa.dartName?`<div class="dartname">„${esc(pa.dartName)}“</div>`:''}</div><div class="versus">VS</div><div class="score-player"><div class="name">${esc(playerName(pb))}</div>${pb.dartName?`<div class="dartname">„${esc(pb.dartName)}“</div>`:''}</div></div>
      ${cur.status==='pending'?`<button class="btn btn-success btn-lg" data-start-match="${board}">Spiel starten</button>`:`<div class="big-choice"><button class="btn btn-success" data-win="${pa.id}" data-match="${cur.id}" data-board="${board}">${esc(pa.firstName)} gewinnt</button><button class="btn btn-success" data-win="${pb.id}" data-match="${cur.id}" data-board="${board}">${esc(pb.firstName)} gewinnt</button></div>`}
      ${last?`<div class="actions" style="margin-top:14px"><button class="btn btn-warning btn-small" data-undo-board="${board}">Letztes Ergebnis korrigieren</button></div>`:''}
      </div><div class="card card-subtle"><h3>Als Nächstes</h3>${next?`<div class="match-main">${esc(playerName(getPlayer(next.playerA)))}<br><span class="muted">gegen</span><br>${esc(playerName(getPlayer(next.playerB)))}</div><div class="small muted">Gruppe ${next.group}</div>`:`<div class="empty">Kein weiteres Spiel</div>`}<hr style="border:0;border-top:1px solid var(--border);margin:18px 0"><h3>Board-Reihenfolge</h3><p class="small muted">${BOARD_GROUPS[board].map(g=>`Gruppe ${g}`).join(' → ')} → …</p><p class="small muted">Fortschritt: ${state.boardPointers[board]} / ${(state.boardSchedules[board]||[]).length}</p></div></div>`;
  }

  function renderKnockout(){
    refreshKnockoutSeeds();
    const rounds=[['r32','Letzte 32'],['r16','Achtelfinale'],['qf','Viertelfinale'],['sf','Halbfinale'],['final','Finale']];
    return `<div class="notice" style="margin-bottom:14px">Der feste Baum ist hinterlegt. Qualifizierte Spieler werden automatisch eingetragen, sobald ihre Gruppe eindeutig beendet ist.</div><div class="bracket">${rounds.map(([key,label])=>`<div class="round"><h3>${label}</h3>${(state.knockout[key]||[]).map(m=>`<div class="bracket-match"><div class="tiny muted">${m.source||m.id} · BO${m.bestOf}</div><div class="bracket-player ${m.winnerId===m.playerA?'winner':''}">${m.playerA?esc(playerName(getPlayer(m.playerA),true)):'–'}</div><div class="bracket-player ${m.winnerId===m.playerB?'winner':''}">${m.playerB?esc(playerName(getPlayer(m.playerB),true)):'–'}</div></div>`).join('')}</div>`).join('')}</div><div class="card" style="margin-top:16px"><h3>Spiel um Platz 3</h3>${state.knockout.third.map(m=>`<div>${m.playerA?esc(playerName(getPlayer(m.playerA),true)):'–'} gegen ${m.playerB?esc(playerName(getPlayer(m.playerB),true)):'–'} · BO7 · Board 4</div>`).join('')}</div>`;
  }

  function renderBeamer(){
    const done=allGroupMatches().filter(m=>m.status==='completed').length;
    return `<div class="beamer"><div class="hero"><div><div class="eyebrow">Live · 3. Alpirsbacher Steeldartscup</div><h3>${state.tournament.phase}</h3></div><div class="right"><strong>${done} / ${allGroupMatches().length||160}</strong><div class="small muted">Gruppenspiele</div></div></div><div class="beamer-board-grid">${Array.from({length:6},(_,i)=>{const b=i+1,c=boardMatch(b,0),n=boardMatch(b,1);return `<div class="beamer-board"><div class="board-number">Board ${b}</div><div class="small muted">${c?`Gruppe ${c.group}`:'Fertig'}</div><div class="current">${c?`${esc(playerName(getPlayer(c.playerA)))}<br><span class="muted">vs.</span><br>${esc(playerName(getPlayer(c.playerB)))}`:'–'}</div><div class="next"><strong>Als Nächstes</strong><br>${n?`${esc(playerName(getPlayer(n.playerA)))} – ${esc(playerName(getPlayer(n.playerB)))}`:'–'}</div></div>`}).join('')}</div></div><p class="small muted" style="margin-top:10px">Im späteren Ausbau rotiert diese Ansicht automatisch zwischen Boards, Tabellen und KO-Baum.</p>`;
  }

  function renderSync(){
    const active=state.participants.filter(p=>p.active&&!p.waitlist).length; const wait=state.participants.filter(p=>p.waitlist).length;
    return `<div class="grid grid-2"><div class="card"><h3>Schnittstelle zur Anmeldeseite</h3><p>Dieser MVP verwendet lokale Testdaten. Für die spätere gemeinsame Domain ist die Teilnehmer-ID bereits als eindeutiger Schlüssel vorgesehen.</p><div class="notice">Geplante Felder: ID, Vorname, Nachname, optional Dartname, E-Mail, optional Telefonnummer, Anmeldestatus und Zeitstempel.</div><div class="actions" style="margin-top:14px"><button class="btn btn-secondary" id="fakeSyncBtn">Test-Synchronisierung</button></div></div><div class="card"><h3>Aktueller Datenbestand</h3><div class="grid grid-3"><div class="metric"><span class="label">Aktiv</span><span class="value">${active}</span></div><div class="metric"><span class="label">Nachrücker</span><span class="value">${wait}</span></div><div class="metric"><span class="label">Quelle</span><span class="value" style="font-size:18px">Demo</span></div></div><p class="small muted">Nach Veröffentlichung sollen externe Änderungen nicht unkontrolliert in den laufenden Turnierplan eingreifen.</p></div></div>`;
  }

  function bindViewHandlers(){
    document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{currentView=b.dataset.goto;render();});
    document.querySelectorAll('[data-board-open]').forEach(b=>b.onclick=()=>{selectedBoard=Number(b.dataset.boardOpen);currentView='boards';render();});
    document.getElementById('startTournamentBtn')?.addEventListener('click', startTournament);

    document.getElementById('checkAllBtn')?.addEventListener('click',()=>{state.participants.filter(p=>p.active&&!p.waitlist).forEach(p=>p.checkinStatus='eingecheckt');audit('Alle Teilnehmer für Test eingecheckt.');saveState();render();toast('Alle Teilnehmer eingecheckt.');});
    document.querySelectorAll('[data-checkin]').forEach(b=>b.onclick=()=>{const p=getPlayer(b.dataset.checkin);p.checkinStatus=p.checkinStatus==='eingecheckt'?'angemeldet':'eingecheckt';audit(`${playerName(p)}: Check-in auf ${p.checkinStatus} gesetzt.`);saveState();render();});
    bindSearch('checkinSearch','checkinRows'); bindSearch('participantSearch','participantRows');

    document.getElementById('addParticipantBtn')?.addEventListener('click',()=>openPlayerModal());
    document.querySelectorAll('[data-edit-player]').forEach(b=>b.onclick=()=>openPlayerModal(getPlayer(b.dataset.editPlayer)));

    document.getElementById('drawBtn')?.addEventListener('click',()=>{ if(state.tournament.published&&!confirm('Der Plan ist veröffentlicht. Wirklich komplett neu auslosen?')) return; performDraw(); });
    document.getElementById('toggleLockBtn')?.addEventListener('click',()=>{state.tournament.drawLocked=!state.tournament.drawLocked;audit(`Auslosung ${state.tournament.drawLocked?'gesperrt':'entsperrt'}.`);saveState();render();});
    document.getElementById('publishBtn')?.addEventListener('click',publishTournament);
    document.querySelectorAll('[data-swap-player]').forEach(b=>b.onclick=()=>openSwapModal(b.dataset.group,b.dataset.swapPlayer));

    document.querySelectorAll('[data-group-tab]').forEach(b=>b.onclick=()=>{currentGroup=b.dataset.groupTab;render();});
    document.querySelectorAll('[data-manual-rank]').forEach(b=>b.onclick=()=>openManualRankModal(b.dataset.manualRank));

    document.querySelectorAll('[data-board-tab]').forEach(b=>b.onclick=()=>{selectedBoard=Number(b.dataset.boardTab);render();});
    document.querySelectorAll('[data-start-match]').forEach(b=>b.onclick=()=>startCurrentMatch(Number(b.dataset.startMatch)));
    document.querySelectorAll('[data-win]').forEach(b=>b.onclick=()=>completeGroupMatch(Number(b.dataset.board),b.dataset.match,b.dataset.win));
    document.querySelectorAll('[data-undo-board]').forEach(b=>b.onclick=()=>{if(confirm('Das unmittelbar letzte Ergebnis dieses Boards wirklich zurücksetzen?'))undoLastBoardResult(Number(b.dataset.undoBoard));});

    document.getElementById('fakeSyncBtn')?.addEventListener('click',()=>toast('Demo-Sync ausgeführt – keine externen Änderungen vorhanden.'));
  }

  function bindSearch(inputId,tbodyId){
    const input=document.getElementById(inputId), body=document.getElementById(tbodyId); if(!input||!body) return;
    input.oninput=()=>{const q=input.value.trim().toLowerCase();body.querySelectorAll('tr').forEach(tr=>tr.style.display=!q||tr.dataset.search.includes(q)?'':'none');};
  }

  function openModal(html){ document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${html}</div></div>`; document.getElementById('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal();}; }
  function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

  function openPlayerModal(p=null){
    const id=p?.id||`P${String(state.participants.length+1).padStart(3,'0')}`;
    openModal(`<h3>${p?'Teilnehmer bearbeiten':'Teilnehmer hinzufügen'}</h3><div class="form-grid">
      <div class="form-field"><label>Vorname</label><input id="mFirst" class="input" value="${esc(p?.firstName||'')}"></div>
      <div class="form-field"><label>Nachname</label><input id="mLast" class="input" value="${esc(p?.lastName||'')}"></div>
      <div class="form-field"><label>Dartname (optional)</label><input id="mDart" class="input" value="${esc(p?.dartName||'')}"></div>
      <div class="form-field"><label>E-Mail</label><input id="mMail" class="input" value="${esc(p?.email||'')}"></div>
      <div class="form-field"><label>Telefon (optional)</label><input id="mPhone" class="input" value="${esc(p?.phone||'')}"></div>
      <div class="form-field"><label>Status</label><select id="mWait" class="select"><option value="active" ${!p?.waitlist?'selected':''}>Aktiver Teilnehmer</option><option value="wait" ${p?.waitlist?'selected':''}>Nachrückerliste</option><option value="inactive" ${p&&!p.active?'selected':''}>Inaktiv</option></select></div>
    </div><div class="modal-footer"><button class="btn btn-ghost" id="mCancel">Abbrechen</button><button class="btn" id="mSave">Speichern</button></div>`);
    document.getElementById('mCancel').onclick=closeModal;
    document.getElementById('mSave').onclick=()=>{
      const first=document.getElementById('mFirst').value.trim(),last=document.getElementById('mLast').value.trim(); if(!first||!last) return toast('Vor- und Nachname sind erforderlich.','warning');
      const mode=document.getElementById('mWait').value;
      const obj=p||{id,registrationStatus:'bestätigt',checkinStatus:'angemeldet',source:'Manuell'};
      Object.assign(obj,{firstName:first,lastName:last,dartName:document.getElementById('mDart').value.trim(),email:document.getElementById('mMail').value.trim(),phone:document.getElementById('mPhone').value.trim(),waitlist:mode==='wait',active:mode!=='inactive'});
      if(!p) state.participants.push(obj); audit(`${p?'Teilnehmer bearbeitet':'Teilnehmer hinzugefügt'}: ${playerName(obj)}.`); saveState();closeModal();render();toast('Teilnehmer gespeichert.');
    };
  }

  function openSwapModal(group,playerId){
    const p=getPlayer(playerId);
    const candidates=state.participants.filter(x=>x.active&&!x.waitlist&&x.id!==playerId);
    openModal(`<h3>${esc(playerName(p))} tauschen</h3><p class="muted">Wähle einen anderen aktiven Teilnehmer. Die beiden Gruppenslots werden getauscht.</p><input id="swapSearch" class="input" placeholder="Name suchen …"><div style="max-height:380px;overflow:auto;margin-top:10px" id="swapList">${candidates.map(c=>`<button class="btn btn-ghost" style="display:block;width:100%;text-align:left;margin-bottom:6px" data-swap-target="${c.id}">${esc(playerName(c))}</button>`).join('')}</div><div class="modal-footer"><button class="btn btn-ghost" id="swapCancel">Abbrechen</button></div>`);
    document.getElementById('swapCancel').onclick=closeModal;
    const search=document.getElementById('swapSearch'); search.oninput=()=>{const q=search.value.toLowerCase();document.querySelectorAll('[data-swap-target]').forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?'block':'none');};
    document.querySelectorAll('[data-swap-target]').forEach(b=>b.onclick=()=>swapPlayers(playerId,b.dataset.swapTarget));
  }
  function swapPlayers(a,b){
    let slotA=null,slotB=null;
    for(const g of GROUPS){ const gr=state.groups[g]; if(!gr) continue; const ia=gr.playerIds.indexOf(a),ib=gr.playerIds.indexOf(b); if(ia>=0)slotA=[g,ia]; if(ib>=0)slotB=[g,ib]; }
    if(!slotA||!slotB) return toast('Beide Spieler müssen ausgelost sein.','warning');
    const [ga,ia]=slotA,[gb,ib]=slotB;
    state.groups[ga].playerIds[ia]=b; state.groups[gb].playerIds[ib]=a;
    state.groups[ga].matches=roundRobinMatches(state.groups[ga].playerIds,ga); state.groups[gb].matches=roundRobinMatches(state.groups[gb].playerIds,gb);
    for(const board of [state.groups[ga].board,state.groups[gb].board]){
      const groupNames=BOARD_GROUPS[board],schedule=[];for(let i=0;i<10;i++)for(const g of groupNames)schedule.push(state.groups[g].matches[i].id);state.boardSchedules[board]=schedule;state.boardPointers[board]=0;state.lastCompletedByBoard[board]=null;
    }
    audit(`${playerName(getPlayer(a))} und ${playerName(getPlayer(b))} wurden getauscht.`); saveState();closeModal();render();toast('Spieler wurden getauscht.','warning');
  }

  function openManualRankModal(group){
    const st=standings(group); const g=state.groups[group];
    openModal(`<h3>Gruppe ${group}: Reihenfolge nach Stechen</h3><p class="muted">Trage die endgültige Reihenfolge Platz 1–5 ein. Diese überschreibt nur die Tabellenreihenfolge, nicht die bereits gespeicherten Ergebnisse.</p>${[1,2,3,4,5].map((n,i)=>`<div class="form-field" style="margin-bottom:10px"><label>Platz ${n}</label><select class="select manual-rank-select" data-rank="${i}">${g.playerIds.map(id=>`<option value="${id}" ${st[i]?.id===id?'selected':''}>${esc(playerName(getPlayer(id)))}</option>`).join('')}</select></div>`).join('')}<div class="modal-footer"><button class="btn btn-ghost" id="rankCancel">Abbrechen</button><button class="btn" id="rankSave">Speichern</button></div>`);
    document.getElementById('rankCancel').onclick=closeModal;
    document.getElementById('rankSave').onclick=()=>{const ids=[...document.querySelectorAll('.manual-rank-select')].map(s=>s.value);if(new Set(ids).size!==5)return toast('Jeder Spieler darf nur einmal vorkommen.','warning');state.manualGroupOrder[group]=ids;audit(`Manuelle Reihenfolge für Gruppe ${group} nach Stechen gesetzt.`);refreshKnockoutSeeds();saveState();closeModal();render();toast('Reihenfolge gespeichert.');};
  }

  document.getElementById('resetDemoBtn').onclick=()=>{if(confirm('Alle Teständerungen löschen und den Demo-Stand wiederherstellen?'))resetDemo();};
  render();
})();
