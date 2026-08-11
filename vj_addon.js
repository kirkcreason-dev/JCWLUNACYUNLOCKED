/* ================================================================
   VIOLENT J — SECRET CHARACTER ADDON (runtime, no engine rewrites)
   Load AFTER the main game script:  <script src="vj_addon.js"></script>
   Adds: roster entry (hidden), WHOOPWHOOP / 7-tap / ?vj unlock,
   sprite loading from sprites/manifest_vj.json, weapon-swing +
   weapon-walk art states, missing-art guard.
================================================================ */
(function () {
    'use strict';
    var TAG = '[VJ-ADDON] ';
    function log(m) { try { console.log(TAG + m); } catch (e) {} }
    try {

    // ---- 0. sanity: the engine globals this addon rides on ----
    if (typeof wrestlers === 'undefined' || typeof W !== 'function' ||
        typeof SPRITES === 'undefined' || typeof populateRoster !== 'function') {
        log('engine globals missing — wrong build, aborting'); return;
    }
    if (wrestlers.some(function (w) { return w.id === 'violentj'; })) {
        log('violentj already in roster — aborting duplicate'); return;
    }

    // ---- 1. roster entry (hidden until unlocked) ----
    var VJ = W('Violent J', 'violentj', [10, 10, 10, 10], 'HATCHET BOMB');
    VJ.secret = true;
    wrestlers.push(VJ);
    // portraits (files ship with the addon)
    try {
        var c = new Image(); c.src = 'ui/card_violentj.png'; CARD_IMGS.violentj = c;
        var b = new Image(); b.src = 'ui/big_violentj.png';  BIG_IMGS.violentj  = b;
    } catch (e) { log('portrait preload: ' + e.message); }

    // ---- 2. sprites: fetch the addon manifest and merge into SPRITES ----
    var spritesLoaded = false;
    fetch('sprites/manifest_vj.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (man) {
            var states = man.violentj || man;
            SPRITES.violentj = {};
            var n = 0;
            Object.keys(states).forEach(function (st) {
                var val = states[st];
                function li(v) { var i = new Image(); i.src = v.file; n++; return i; }
                SPRITES.violentj[st] = Array.isArray(val) ? val.map(li) : li(val);
            });
            VJ.real = true;
            spritesLoaded = true;
            log('sprites merged: ' + Object.keys(SPRITES.violentj).length + ' states, ' + n + ' images');
        })
        .catch(function (e) { log('manifest_vj.json failed: ' + e.message + ' — VJ will be hidden'); });

    // ---- 3. roster card (same DOM as populateRoster builds) ----
    function vjUnlocked() {
        try { return localStorage.getItem('lunacy_vj') === '1'; } catch (e) { return false; }
    }
    function addCard() {
        var grid = document.getElementById('rosterGrid');
        if (!grid || grid.querySelector('img[data-wid="violentj"]')) return null;
        var card = document.createElement('div');
        card.className = 'wrestler-card';
        card.style.borderColor = '#8dff1e';
        card.style.boxShadow = '0 0 12px rgba(141,255,30,0.65)';
        card.innerHTML = '<img src="ui/card_violentj.png" data-wid="violentj" alt="Violent J">' +
                         '<span class="card-name">VIOLENT J</span>';
        card.addEventListener('click', function () {
            showStats(VJ); selectWrestler(VJ, card);
            try { Snd.unlock(); } catch (e) {}
        });
        grid.appendChild(card);
        return card;
    }

    // ---- 4. unlock ----
    function unlockVJ() {
        var already = vjUnlocked();
        try { localStorage.setItem('lunacy_vj', '1'); } catch (e) {}
        var card = addCard() || document.querySelector('.wrestler-card img[data-wid="violentj"]');
        if (card && card.parentElement) card = card.tagName === 'IMG' ? card.parentElement : card;
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.animate([
                { boxShadow: '0 0 12px rgba(141,255,30,0.65)', transform: 'scale(1)' },
                { boxShadow: '0 0 34px #8dff1e', transform: 'scale(1.08)' },
                { boxShadow: '0 0 12px rgba(141,255,30,0.65)', transform: 'scale(1)' }
            ], { duration: 550, iterations: 5 });
        }
        try { Snd.unlock(); Snd.crowdPop(); } catch (e) {}
        var t = document.createElement('div');
        t.textContent = already ? 'VIOLENT J IS HERE — GREEN CARD IN THE ROSTER'
                                : 'WHOOP WHOOP! VIOLENT J HAS ENTERED THE BUILDING';
        t.style.cssText = 'position:fixed;top:18%;left:50%;transform:translateX(-50%);z-index:9999;' +
            'background:#000;color:#8dff1e;border:3px solid #8dff1e;padding:14px 22px;font-weight:900;' +
            'font-size:17px;letter-spacing:1px;box-shadow:0 0 40px #8dff1e;text-align:center;max-width:86vw;' +
            'font-family:Arial,sans-serif;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 3200);
        log('unlocked (already=' + already + ')');
    }
    window.unlockVJ = unlockVJ;

    // keyboard: letters only — WHOOPWHOOP works with or without spaces
    var buf = '';
    document.addEventListener('keydown', function (e) {
        if (!e.key || e.key.length !== 1) return;
        var ch = e.key.toLowerCase();
        if (ch < 'a' || ch > 'z') return;
        buf = (buf + ch).slice(-10);
        if (buf === 'whoopwhoop') { buf = ''; unlockVJ(); }
    });
    // touch: 7 quick taps on the title logo
    var taps = 0, last = 0;
    var logo = document.querySelector('#characterSelect .title-img');
    if (logo) {
        logo.style.touchAction = 'manipulation';
        var tap = function () {
            var now = Date.now();
            taps = (now - last < 2000) ? taps + 1 : 1;
            last = now;
            if (taps >= 7) { taps = 0; unlockVJ(); }
        };
        if (window.PointerEvent) logo.addEventListener('pointerdown', tap);
        else { logo.addEventListener('touchstart', tap); logo.addEventListener('mousedown', tap); }
    }
    // URL failsafe: ...index.html?vj
    try { if (/[?&]vj/.test(location.search)) setTimeout(unlockVJ, 600); } catch (e) {}
    // already unlocked on an earlier visit: show the card right away
    if (vjUnlocked()) setTimeout(addCard, 300);

    // ---- 5. weapon-art states (wrap spriteFor; graceful if signatures drift) ----
    if (typeof spriteFor === 'function') {
        var _spriteFor = spriteFor;
        // reassign the global binding: render() calls spriteFor by name
        spriteFor = function (f) {
            try {
                var S = SPRITES[f.wrestler.id];
                if (S && f.downTimer <= 0 && !f.climb && f.diveTimer <= 0 && !(M.grapple && M.grapple.victim === f)) {
                    // weapon swing art
                    if (f.swingTimer > 0 && f.weapon) {
                        var t = f.weapon.type;
                        var idx = Math.min(2, Math.floor((18 - f.swingTimer) / 6));
                        var pk = function (arr) { return arr[Math.min(arr.length - 1, idx)]; };
                        if (t === 'guitar' && (S.aGuitarR || S.aGuitarL)) {
                            var ag = f.direction < 0 ? (S.aGuitarL || S.aGuitarR) : (S.aGuitarR || S.aGuitarL);
                            return { img: pk(ag), flip: f.direction < 0 && !S.aGuitarL, noHeld: true };
                        }
                        if ((t === 'trashcan' || t === 'lid') && (S.aCanR || S.aCanL)) {
                            var ac = f.direction < 0 ? (S.aCanL || S.aCanR) : (S.aCanR || S.aCanL);
                            return { img: pk(ac), flip: f.direction < 0 && !S.aCanL, noHeld: true };
                        }
                        if (t === 'kendo' && (S.aKendoR || S.aKendoL) && !(S.aKendoR && S.aKendoL)) {
                            var ak = S.aKendoR || S.aKendoL;
                            return { img: pk(ak), flip: f.direction < 0 && !S.aKendoL, noHeld: true };
                        }
                    }
                    // weapon walk art (weapon drawn IN the frames)
                    if (f.moving && f.weapon && f.swingTimer <= 0 && f.stunTimer <= 0) {
                        var K = { chair: 'Chair', kendo: 'Kendo', trashcan: 'Can', lid: 'Can', guitar: 'Guitar' }[f.weapon.type];
                        if (K) {
                            var wL = S['wWalk' + K + 'L'], wR = S['wWalk' + K + 'R'];
                            if (wL || wR) {
                                var arr = f.direction < 0 ? (wL || wR) : (wR || wL);
                                var flipW = f.direction < 0 ? !wL : !wR;
                                return { img: arr[Math.floor(f.walkAnim) % arr.length], flip: flipW, noHeld: true };
                            }
                        }
                    }
                }
            } catch (e) { /* fall through to stock behavior */ }
            return _spriteFor(f);
        };
        log('spriteFor wrapped (weapon art active)');
    } else {
        log('spriteFor not found — weapon art skipped');
    }

    // ---- 6. missing-art guard: never an invisible wrestler ----
    if (typeof drawFighter === 'function') {
        var _drawFighter = drawFighter;
        drawFighter = function (f) {
            try {
                var S = SPRITES[f.wrestler.id];
                if (!S || (f.wrestler.id === 'violentj' && !spritesLoaded)) {
                    if (!f._artWarned) {
                        f._artWarned = true;
                        log('MISSING ART for ' + f.wrestler.id);
                        try { addFx(f.x, f.y - 90, 'MISSING ART — CHECK sprites/ UPLOAD!', { color: '#ff2255', size: 14 }); } catch (e) {}
                    }
                }
            } catch (e) {}
            return _drawFighter(f);
        };
    }

    log('ready — type WHOOPWHOOP (or 7 taps on the logo, or add ?vj to the URL)');
    } catch (err) {
        try { console.error(TAG + 'fatal: ' + err.message); } catch (e) {}
    }
})();
