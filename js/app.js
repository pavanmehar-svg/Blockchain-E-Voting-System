const state = {
  voters:        {},     // { voterID: { name, govId, bio, voted } }
  blockchain:    [],     // Array of block objects
  authenticated: null,   // Currently authenticated voter ID
  selectedCand:  null,   // Currently selected candidate ID
  authAttempts:  0,
  authFails:     0,
  stats: {
    total:   0,
    clean:   0,
    flagged: 0,
    blocked: 0
  }
};

const CANDIDATES = [
  {
    id:     'C1',
    name:   'Dr. Amit Sharma',
    party:  'National Progress Party',
    color:  '#3b82f6',
    color2: '#1d4ed8',
    emoji:  '👨‍💼'
  },
  {
    id:     'C2',
    name:   'Priya Nair',
    party:  'Democratic Alliance',
    color:  '#8b5cf6',
    color2: '#6d28d9',
    emoji:  '👩‍💼'
  },
  {
    id:     'C3',
    name:   'Rahul Verma',
    party:  'Federal Development Party',
    color:  '#10b981',
    color2: '#065f46',
    emoji:  '👨‍💼'
  }
];
function genHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

/**
 * Generate a 64-character pseudo-random hex string (simulates SHA-256 output).
 * @returns {string} 64-char uppercase hex
 */
function genLongHash() {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('').toUpperCase();
}

/**
 * Get current time as HH:MM:SS string.
 * @returns {string}
 */
function nowTime() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

/**
 * Count the number of votes for a given candidate across the blockchain.
 * @param {string} candId - Candidate ID
 * @returns {number}
 */
function getVoteCount(candId) {
  return state.blockchain.filter(b => b.candidate === candId).length;
}

/**
 * Helper to safely set an element's text content.
 * @param {string} id - Element ID
 * @param {string|number} value
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}


function initBlockchain() {
  state.blockchain.push({
    index:     0,
    type:      'genesis',
    hash:      genLongHash(),
    prevHash:  '0000000000000000000000000000000000000000000000000000000000000000',
    data:      'Genesis Block — Election Initialized',
    nonce:     1337,
    timestamp: new Date().toISOString()
  });
  renderBlockchain();
}

function renderBlockchain() {
  const container = document.getElementById('blockchain-view');
  if (!container) return;

  container.innerHTML = '';

  state.blockchain.forEach((blk, i) => {
   
    if (i > 0) {
      const connector = document.createElement('div');
      connector.className = 'block-connector';
      connector.textContent = '→';
      container.appendChild(connector);
    }

    const isNew = (i === state.blockchain.length - 1 && i > 0);

    const blockEl = document.createElement('div');
    blockEl.className = [
      'block',
      i === 0 ? 'genesis' : '',
      isNew ? 'new-block' : ''
    ].join(' ').trim();

    blockEl.innerHTML = `
      <div class="block-num">
        # BLOCK ${blk.index} ${blk.index === 0 ? '· GENESIS' : '· VOTE TX'}
      </div>
      <div class="block-hash">Hash: ${blk.hash.substring(0, 20)}...</div>
      <div class="block-data">
        ${blk.type === 'genesis'
          ? 'Election initialized'
          : `Voter: ...${(blk.voterID || '').slice(-8)}<br>Cand: ${blk.candidate || '—'}`
        }<br>
        Nonce: ${blk.nonce}<br>
        <span style="color:var(--muted);font-size:9px">
          prev: ${(blk.prevHash || '').substring(0, 14)}...
        </span>
      </div>
    `;

    container.appendChild(blockEl);
  });

  // Update counters
  const count = state.blockchain.length;
  setText('blk-count', count);
  setText('block-count-badge', `⛓ ${count} BLOCKS`);
}



/**
 * Append a new line to the AI monitoring log.
 * Also increments the events-monitored counter.
 *
 * @param {string} msg   - Log message
 * @param {string} type  - 'ok' | 'warn' | 'info' | 'error'
 */
function addLog(msg, type = 'info') {
  const log = document.getElementById('ai-log');
  if (!log) return;

  const div = document.createElement('div');
  div.className = 'log-line';
  div.innerHTML = `
    <span class="log-time">${nowTime()}</span>
    <span class="log-${type}">${msg}</span>
  `;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;

  state.stats.total++;
  setText('mon-total', state.stats.total);
}


function startRegistration() {
  const name  = document.getElementById('reg-name').value.trim();
  const govId = document.getElementById('reg-id').value.trim();

  if (!name || !govId) {
    alert('Please fill in Full Name and Government ID before registering.');
    return;
  }

  
  const bioHash = genLongHash().substring(0, 32);
  document.getElementById('reg-bio').value = bioHash;

  
  document.getElementById('reg-btn').disabled = true;

 
  const resultCard = document.getElementById('reg-result');
  if (resultCard) resultCard.style.display = 'none';

  ['step-id', 'step-bio', 'step-ai', 'step-otp', 'step-reg-done'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active', 'done');
    }
  });

  const stepIds = ['step-id', 'step-bio', 'step-ai', 'step-otp', 'step-reg-done'];
  let current = 0;

  function advanceStep() {
  
    if (current > 0) {
      const prev = document.getElementById(stepIds[current - 1]);
      if (prev) {
        prev.classList.remove('active');
        prev.classList.add('done');
      }
    }

    if (current < stepIds.length) {
      const curr = document.getElementById(stepIds[current]);
      if (curr) curr.classList.add('active');
      current++;
      setTimeout(advanceStep, 850);
    } else {
      // All steps done
      finishRegistration(name, govId, bioHash);
    }
  }

  advanceStep();
  addLog(`Registration started for: ${name}`, 'info');
}

/**
 * Complete registration: store voter data, show confirmation card,
 * and auto-fill authentication form.
 *
 * @param {string} name     - Voter's full name
 * @param {string} govId    - Government ID
 * @param {string} bioHash  - Biometric hash (simulated)
 */
function finishRegistration(name, govId, bioHash) {
  const vid = 'VTR-' + genLongHash().substring(0, 16);

  state.voters[vid] = {
    name:   name,
    govId:  govId,
    bio:    bioHash,
    voted:  false
  };

  const resultCard = document.getElementById('reg-result');
  if (resultCard) resultCard.style.display = 'block';

  setText('reg-voter-id',      vid);
  setText('reg-success-name',  `${name} — Successfully Registered!`);

  document.getElementById('reg-btn').disabled = false;

  const authVid = document.getElementById('auth-vid');
  const authBio = document.getElementById('auth-bio');
  if (authVid) authVid.value = vid;
  if (authBio) authBio.value = bioHash;

  addLog(`✓ Voter registered · ID: ${vid.substring(0, 20)}... · Biometric stored securely`, 'ok');
  state.stats.clean++;
  setText('mon-clean', state.stats.clean);
}


function authenticate() {
  const vid = document.getElementById('auth-vid').value.trim();
  const bio = document.getElementById('auth-bio').value.trim();

  if (!vid || !bio) {
    alert('Please enter both Voter ID and Biometric Hash.');
    return;
  }

  const logLinesEl = document.getElementById('auth-log-lines');
  const statusEl   = document.getElementById('auth-status');
  const resultEl   = document.getElementById('auth-result');

  if (statusEl) statusEl.style.display = 'block';
  if (resultEl) resultEl.style.display = 'none';
  if (logLinesEl) logLinesEl.innerHTML = '';

  state.authAttempts++;

  const voter = state.voters[vid];
  const valid = voter && voter.bio === bio;

  const verifySteps = [
    { t: 200,  msg: '→ Validating Voter ID format and checksum...' },
    { t: 500,  msg: '→ Querying encrypted voter registry on blockchain...' },
    { t: 900,  msg: '→ Matching biometric hash (confidence: 98.7%)...' },
    { t: 1200, msg: '→ Running AI anomaly detection (ResNet-50 model)...' },
    { t: 1600, msg: '→ Checking duplicate vote flags across all 7 nodes...' }
  ];

  verifySteps.forEach(step => {
    setTimeout(() => {
      if (logLinesEl) {
        logLinesEl.innerHTML +=
          `<div style="color:var(--acc3)">${step.msg}</div>`;
      }
    }, step.t);
  });

  setTimeout(() => {
    showAuthResult(valid, voter, vid);
  }, 2100);
}

/**
 * Display the authentication result card.
 *
 * @param {boolean} valid  - Whether credentials matched
 * @param {object}  voter  - Voter object from state (may be undefined)
 * @param {string}  vid    - Voter ID entered
 */
function showAuthResult(valid, voter, vid) {
  const resultEl = document.getElementById('auth-result');
  const box      = document.getElementById('auth-result-box');
  const icon     = document.getElementById('auth-result-icon');
  const title    = document.getElementById('auth-result-title');
  const msgEl    = document.getElementById('auth-result-msg');

  if (!resultEl || !box) return;
  resultEl.style.display = 'block';

  box.classList.remove('success', 'warning', 'error');

  if (valid && !voter.voted) {
 
    state.authenticated = vid;
    box.classList.add('success');
    icon.textContent    = '✅';
    title.textContent   = `Welcome, ${voter.name}`;
    title.style.color   = 'var(--acc3)';
    msgEl.textContent   = 'AI verified · No anomaly detected · You may now cast your vote';

    const castBtn = document.getElementById('cast-btn');
    if (castBtn) castBtn.disabled = false;
    setText('vote-msg', `Authenticated: ${voter.name}`);
    renderCandidates();

    addLog(`✓ Auth success · ${voter.name} · AI: CLEAN · Proceeding to vote`, 'ok');
    state.stats.clean++;
    setText('mon-clean', state.stats.clean);

  } else if (voter && voter.voted) {
   
    box.classList.add('warning');
    icon.textContent    = '⚠️';
    title.textContent   = 'Duplicate Vote Attempt — Blocked';
    title.style.color   = 'var(--warn)';
    msgEl.textContent   = 'This voter has already cast a vote. Double voting is not permitted.';

    addLog(`⚠ BLOCKED: ${voter.name} — duplicate vote attempt detected`, 'warn');
    state.stats.flagged++;
    setText('mon-flagged', state.stats.flagged);

  } else {
   
    state.authFails++;
    box.classList.add('error');
    icon.textContent    = '❌';
    title.textContent   = 'Authentication Failed';
    title.style.color   = 'var(--danger)';
    msgEl.textContent   = 'Invalid credentials or unregistered voter. AI flagged as potential fraud. IP logged.';

    addLog(`✗ AUTH FAILED · Credentials invalid · Possible fraud · IP flagged`, 'error');
    state.stats.blocked++;
    setText('mon-blocked', state.stats.blocked);
  }

  if (state.authAttempts > 0) {
    const rate = Math.round(
      ((state.authAttempts - state.authFails) / state.authAttempts) * 100
    );
    setText('auth-rate', rate + '%');
  }
}


function renderCandidates() {
  const grid = document.getElementById('candidates-grid');
  if (!grid) return;

  grid.innerHTML = CANDIDATES.map(c => `
    <div class="candidate-card ${state.selectedCand === c.id ? 'selected' : ''}"
         id="card-${c.id}"
         onclick="selectCandidate('${c.id}')">
      <div class="vote-badge">✓</div>
      <div class="candidate-avatar"
           style="background: linear-gradient(135deg, ${c.color}, ${c.color2})">
        ${c.emoji}
      </div>
      <div class="candidate-name">${c.name}</div>
      <div class="candidate-party">${c.party}</div>
      <div class="candidate-votes">
        VOTES:
        <span id="vcount-${c.id}"
              style="color:${c.color}; font-weight:700">
          ${getVoteCount(c.id)}
        </span>
      </div>
    </div>
  `).join('');
}

/**
 * Select a candidate card, updating UI and state.
 * @param {string} id - Candidate ID
 */
function selectCandidate(id) {
  state.selectedCand = id;
  CANDIDATES.forEach(c => {
    const card = document.getElementById('card-' + c.id);
    if (card) card.classList.toggle('selected', c.id === id);
  });
}

function castVote() {
  if (!state.authenticated) {
    alert('Please authenticate before voting.');
    return;
  }
  if (!state.selectedCand) {
    alert('Please select a candidate first.');
    return;
  }

  const vid   = state.authenticated;
  const voter = state.voters[vid];

  if (!voter) {
    alert('Voter record not found.');
    return;
  }
  if (voter.voted) {
    alert('You have already voted!');
    return;
  }
  voter.voted = true;

  const prevBlock = state.blockchain[state.blockchain.length - 1];
  const txHash    = genLongHash();

  const newBlock = {
    index:     state.blockchain.length,
    type:      'vote',
    hash:      genLongHash(),
    prevHash:  prevBlock.hash,
    voterID:   vid,
    candidate: state.selectedCand,
    encrypted: true,                        // AES-256 in real system
    nonce:     Math.floor(Math.random() * 99999),
    timestamp: new Date().toISOString()
  };

  state.blockchain.push(newBlock);

  const txHashEl = document.getElementById('tx-hash-val');
  if (txHashEl) {
    txHashEl.textContent =
      `TX Hash:   0x${txHash}\n` +
      `Block:     #${newBlock.index}\n` +
      `Voter:     ${vid.substring(0, 24)}...\n` +
      `Encrypted: AES-256 · Signed: ECDSA · Nodes: 7/7`;
  }

  const txPopup = document.getElementById('tx-popup');
  if (txPopup) txPopup.classList.add('show');

  const castBtn = document.getElementById('cast-btn');
  if (castBtn) castBtn.disabled = true;
  setText('vote-msg', '✅ Vote successfully cast and recorded on blockchain!');

  state.authenticated = null;
  state.selectedCand  = null;

  renderBlockchain();
  renderCandidates();
  updateResults();

  addLog(
    `✓ Vote cast · Block #${newBlock.index} mined · Candidate: ${newBlock.candidate} · Broadcast to 7 nodes`,
    'ok'
  );
  state.stats.clean++;
  setText('mon-clean', state.stats.clean);
}

function updateResults() {
  const totalVotes = state.blockchain.filter(b => b.type === 'vote').length;
  const resDiv     = document.getElementById('results-view');
  if (!resDiv) return;

  if (totalVotes === 0) {
    resDiv.innerHTML = `
      <div class="no-data">
        No votes cast yet. Results will appear here automatically after the first vote.
      </div>`;
    return;
  }

  const maxVotes = Math.max(...CANDIDATES.map(c => getVoteCount(c.id)));

  const barsHTML = CANDIDATES.map(c => {
    const count = getVoteCount(c.id);
    const pct   = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const leading = count === maxVotes && count > 0;

    return `
      <div class="results-bar-wrap">
        <div class="results-header">
          <div>
            <strong>${c.name}</strong>
            ${leading ? `<span class="leading-badge">LEADING</span>` : ''}
            <div style="color:var(--muted);font-size:11px;font-family:var(--mono);margin-top:2px">
              ${c.party}
            </div>
          </div>
          <div style="font-weight:700;color:${c.color};font-size:16px;text-align:right">
            ${count} votes<br>
            <span style="font-size:12px">${pct}%</span>
          </div>
        </div>
        <div class="results-bar">
          <div class="results-fill"
               style="width:${pct}%;background:linear-gradient(90deg,${c.color},${c.color2})">
          </div>
        </div>
      </div>
    `;
  }).join('');

  resDiv.innerHTML = barsHTML + `
    <div class="results-footer">
      <span>
        Total valid votes: <strong style="color:var(--text)">${totalVotes}</strong>
      </span>
      <span style="color:var(--muted);font-family:var(--mono);font-size:11px">
        Source: Decrypted blockchain · ${new Date().toLocaleTimeString()}
      </span>
    </div>
  `;
}

function simulateFraud() {
  const attacks = [
    ['⚠ ALERT: Duplicate vote attempt detected from IP 203.45.122.18', 'warn'],
    ['✗ BLOCKED: Tampered block hash mismatch — block rejected', 'error'],
    ['⚠ ALERT: Unusual pattern — 47 votes/sec detected from node 6 — throttling', 'warn'],
    ['✗ BLOCKED: Fake biometric injection attempt — AI confidence 99.7% fake', 'error'],
    ['⚠ ALERT: Man-in-the-middle attempt on node 3 — channel reinforced', 'warn'],
    ['✗ BLOCKED: SQL injection in voterID field — sanitized and logged', 'error'],
    ['⚠ ALERT: VPN masking detected — geolocation anomaly flagged', 'warn'],
    ['✗ BLOCKED: Replay attack with stale block hash — nonce mismatch', 'error'],
    ['⚠ ALERT: Brute-force biometric scan from IP 192.168.0.77', 'warn'],
    ['✗ BLOCKED: Modified transaction signature — ECDSA verification failed', 'error']
  ];

  const pick = attacks[Math.floor(Math.random() * attacks.length)];
  addLog(pick[0], pick[1]);

  if (pick[1] === 'warn') {
    state.stats.flagged++;
    setText('mon-flagged', state.stats.flagged);
  } else {
    state.stats.blocked++;
    setText('mon-blocked', state.stats.blocked);
  }
}

function clearLog() {
  const log = document.getElementById('ai-log');
  if (log) {
    log.innerHTML = `
      <div class="log-line">
        <span class="log-time">${nowTime()}</span>
        <span class="log-info">Log cleared. AI monitoring active. All systems operational.</span>
      </div>`;
  }
}


/**
 * Switch between the six main panels.
 * Refreshes data-dependent views on switch.
 *
 * @param {string} name - Panel name: 'register' | 'authenticate' |
 *                        'vote' | 'blockchain' | 'monitor' | 'results'
 */
function showTab(name) {
  const PANEL_ORDER = ['register', 'authenticate', 'vote', 'blockchain', 'monitor', 'results'];
  const idx = PANEL_ORDER.indexOf(name);

  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === idx);
  });

  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById('panel-' + name);
  if (targetPanel) targetPanel.classList.add('active');

  // Refresh views when switching to them
  if (name === 'results')    updateResults();
  if (name === 'vote')       renderCandidates();
  if (name === 'blockchain') renderBlockchain();
}
document.addEventListener('DOMContentLoaded', () => {
  initBlockchain();
  renderCandidates();
  updateResults();

  console.log('%cBlockVote Initialized', 'color:#00d4ff;font-size:16px;font-weight:bold');
  console.log('%cBlockchain E-Voting System — CSE B.Tech Final Year', 'color:#7c3aed');
});
