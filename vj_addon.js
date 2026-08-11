/* ================================================================
   VIOLENT J — SECRET CHARACTER ADDON  (v2, self-authored rendering)
   Load AFTER the main game script:  <script src="vj_addon.js"></script>
   - roster entry (hidden) + WHOOPWHOOP / 7-tap / ?vj unlock
   - loads sprites from sprites/manifest_vj.json
   - FULLY authors Violent J's on-screen animation (walk/run legs,
     strikes, weapon art, pin cover) so it never depends on the host
     engine's sprite logic — guarantees leg movement + correct pin size
   - missing-art guard
================================================================ */
(function () {
    'use strict';
    var TAG = '[VJ-ADDON] ';
    function log(m) { try { console.log(TAG + m); } catch (e) {} }
    try {
    if (typeof wrestlers === 'undefined' || typeof W !== 'function' ||
        typeof SPRITES === 'undefined' || typeof populateRoster !== 'function') {
        log('engine globals missing — wrong build, aborting'); return;
    }
    if (wrestlers.some(function (w) { return w.id === 'violentj'; })) {
        log('already present — aborting duplicate'); return;
    }

    // ---- roster entry (maxed, secret) ----
    var VJ = W('Violent J', 'violentj', [10, 10, 10, 10], 'HATCHET BOMB');
    VJ.secret = true;
    wrestlers.push(VJ);
    try {
        var ic = new Image(); ic.src = 'ui/card_violentj.png'; CARD_IMGS.violentj = ic;
        var ib = new Image(); ib.src = 'ui/big_violentj.png';  BIG_IMGS.violentj  = ib;
    } catch (e) {}

    // ---- load his sprites ----
    var ready = false;
    fetch('sprites/manifest_vj.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (man) {
            var st = man.violentj || man;
            SPRITES.violentj = {};
            var n = 0;
            Object.keys(st).forEach(function (k) {
                var v = st[k];
                function li(e) { var i = new Image(); i.src = e.file; n++; return i; }
                SPRITES.violentj[k] = Array.isArray(v) ? v.map(li) : li(v);
            });
            VJ.real = true; ready = true;
            log('sprites merged: ' + Object.keys(SPRITES.violentj).length + ' states, ' + n + ' images');
        })
        .catch(function (e) { log('manifest_vj.json failed: ' + e.message); });

    // ---- roster card ----
    function unlocked() { try { return localStorage.getItem('lunacy_vj') === '1'; } catch (e) { return false; } }
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
            showStats(VJ); selectWrestler(VJ, card); try { Snd.unlock(); } catch (e) {}
        });
        grid.appendChild(card);
        return card;
    }
    function unlockVJ() {
        var was = unlocked();
        try { localStorage.setItem('lunacy_vj', '1'); } catch (e) {}
        var card = addCard() || document.querySelector('.wrestler-card img[data-wid="violentj"]');
        if (card && card.tagName === 'IMG') card = card.parentElement;
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try { card.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
                               { duration: 550, iterations: 4 }); } catch (e) {}
        }
        try { Snd.unlock(); Snd.crowdPop(); } catch (e) {}
        var t = document.createElement('div');
        t.textContent = was ? 'VIOLENT J IS HERE — GREEN CARD IN THE ROSTER'
                            : 'WHOOP WHOOP! VIOLENT J HAS ENTERED THE BUILDING';
        t.style.cssText = 'position:fixed;top:18%;left:50%;transform:translateX(-50%);z-index:9999;' +
            'background:#000;color:#8dff1e;border:3px solid #8dff1e;padding:14px 22px;font-weight:900;' +
            'font-size:17px;box-shadow:0 0 40px #8dff1e;text-align:center;max-width:86vw;font-family:Arial,sans-serif;';
        document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
    }
    window.unlockVJ = unlockVJ;
    var buf = '';
    document.addEventListener('keydown', function (e) {
        if (!e.key || e.key.length !== 1) return;
        var c = e.key.toLowerCase(); if (c < 'a' || c > 'z') return;
        buf = (buf + c).slice(-10); if (buf === 'whoopwhoop') { buf = ''; unlockVJ(); }
    });
    var taps = 0, last = 0, logo = document.querySelector('#characterSelect .title-img');
    if (logo) {
        logo.style.touchAction = 'manipulation';
        var tap = function () { var now = Date.now(); taps = (now - last < 2000) ? taps + 1 : 1; last = now; if (taps >= 7) { taps = 0; unlockVJ(); } };
        if (window.PointerEvent) logo.addEventListener('pointerdown', tap);
        else { logo.addEventListener('touchstart', tap); logo.addEventListener('mousedown', tap); }
    }
    try { if (/[?&]vj/.test(location.search)) setTimeout(unlockVJ, 600); } catch (e) {}
    if (unlocked()) setTimeout(addCard, 300);

    // ================================================================
    // SELF-AUTHORED RENDERING — Violent J only.
    // Mirrors the reference engine's spriteFor exactly, run against
    // SPRITES.violentj, so his legs animate + pin cover sizes right
    // no matter what sprite logic the deployed build uses.
    // ================================================================
    if (typeof spriteFor === 'function') {
        var _spriteFor = spriteFor;
        spriteFor = function (f) {
            if (!f || !f.wrestler || f.wrestler.id !== 'violentj') return _spriteFor(f);
            try {
                var S = SPRITES.violentj;
                if (!S) return _spriteFor(f);
                var phase = (typeof M !== 'undefined') ? M.phase : '';
                var grap  = (typeof M !== 'undefined') ? M.grapple : null;
                var win   = (typeof M !== 'undefined') ? M.winner : null;

                if ((phase === 'slowmo' || phase === 'over') && win === f && S.aWin && f.downTimer <= 0)
                    return { img: S.aWin, flip: false };
                if ((phase === 'slowmo' || phase === 'over') && win && win !== f && S.aLose && f.downTimer <= 0)
                    return { img: S.aLose, flip: false };

                var pinned = grap && grap.isPin && grap.victim === f;
                if (grap && grap.isPin && grap.holder === f && S.aCrouch)
                    return { img: S.aCrouch, flip: f.direction < 0 };
                if (f.climb) return { img: S.aIdleB || S.idle, flip: false };
                if (f.diveTimer > 0) {
                    if (f.diveTimer > 20 && S.aJump) return { img: S.aJump[0], flip: f.direction < 0, noHeld: true };
                    return { img: (S.aDive && S.aDive[0]) || S.jump, flip: f.direction > 0, noHeld: true };
                }
                if (pinned || f.downTimer > 0) {
                    if (!pinned && f.downTimer > 0 && f.downTimer <= 26 && S.aGetup)
                        return { img: S.aGetup[Math.min(2, Math.floor((26 - f.downTimer) / 9))], flip: f.direction < 0 };
                    var fb = f.fallFace === 'F' ? (S.aFallF || S.fallen) : (S.aFallB || S.fallen);
                    return { img: fb, flip: f.direction < 0 };
                }
                if (f.stunTimer > 0 && S.aStagger) return { img: S.aStagger, flip: f.direction < 0 };

                if (f.swingTimer > 0) {
                    var idx = Math.min(2, Math.floor((18 - f.swingTimer) / 6));
                    var pick = function (a) { return a[Math.min(a.length - 1, idx)]; };
                    if (f.weapon) {
                        var t = f.weapon.type;
                        if (t === 'chair' && S.aChairR) return { img: pick(S.aChairR), flip: f.direction < 0, noHeld: true };
                        if (t === 'guitar' && (S.aGuitarR || S.aGuitarL)) {
                            var ag = f.direction < 0 ? (S.aGuitarL || S.aGuitarR) : (S.aGuitarR || S.aGuitarL);
                            return { img: pick(ag), flip: f.direction < 0 && !S.aGuitarL, noHeld: true };
                        }
                        if ((t === 'trashcan' || t === 'lid') && (S.aCanR || S.aCanL)) {
                            var ac = f.direction < 0 ? (S.aCanL || S.aCanR) : (S.aCanR || S.aCanL);
                            return { img: pick(ac), flip: f.direction < 0 && !S.aCanL, noHeld: true };
                        }
                        if (t === 'kendo' && (S.aKendoR || S.aKendoL)) {
                            var ak = f.direction < 0 ? (S.aKendoL || S.aKendoR) : (S.aKendoR || S.aKendoL);
                            return { img: pick(ak), flip: f.direction < 0 && !S.aKendoL, noHeld: true };
                        }
                    }
                    var sets = [[S.aElbowL, S.aElbowR], [S.aPunchL, S.aPunchR], [S.aKickL, S.aKickR]];
                    var pr = sets[(f.strikeKind || 0) % sets.length];
                    var LL = pr[0], RR = pr[1];
                    if (LL && RR) return { img: pick(f.direction < 0 ? LL : RR), flip: f.direction < 0 };
                    if (S.elbowR) return { img: pick(S.elbowR), flip: f.direction < 0 };
                }

                if (f.jumpTimer > 0 && S.jump) return { img: S.jump, flip: f.direction < 0 };

                if (f.moving) {
                    if (f.vy < -0.6 && Math.abs(f.vy) >= Math.abs(f.vx) && (S.aIdleB || S.idle))
                        return { img: S.aIdleB || S.idle, flip: false };
                    // weapon walk art (weapon drawn IN the frames)
                    if (f.weapon) {
                        var K = { chair: 'Chair', kendo: 'Kendo', trashcan: 'Can', lid: 'Can', guitar: 'Guitar' }[f.weapon.type];
                        var wL = K && S['wWalk' + K + 'L'], wR = K && S['wWalk' + K + 'R'];
                        if (wL || wR) {
                            var wa = f.direction < 0 ? (wL || wR) : (wR || wL);
                            return { img: wa[Math.floor(f.walkAnim) % wa.length], flip: f.direction < 0 ? !wL : !wR, noHeld: true };
                        }
                    }
                    // bare walk / run — legs cycle via walkAnim
                    var fast = Math.hypot(f.vx, f.vy) > 3.3;
                    var L = fast ? (S.aRunL || S.aWalkL || S.walkL) : (S.aWalkL || S.walkL);
                    var R = fast ? (S.aRunR || S.aWalkR || S.walkR) : (S.aWalkR || S.walkR);
                    if (L && R) {
                        var arr = f.direction < 0 ? L : R;
                        return { img: arr[Math.floor(f.walkAnim) % arr.length], flip: f.direction > 0 };
                    }
                    if (S.walkR) return { img: S.walkR[Math.floor(f.walkAnim) % S.walkR.length], flip: f.direction > 0 };
                }
                return { img: S.aIdle || S.idle, flip: false };
            } catch (e) {
                log('spriteFor(vj) fell back: ' + e.message);
                return _spriteFor(f);
            }
        };
        log('rendering wrapped — VJ self-authored (walk/run/strikes/weapons/pin)');
    } else {
        log('spriteFor not found — cannot author VJ animation');
    }

    // ---- missing-art guard ----
    if (typeof drawFighter === 'function') {
        var _df = drawFighter;
        drawFighter = function (f) {
            try {
                if (f && f.wrestler && f.wrestler.id === 'violentj' && !ready && !f._warned) {
                    f._warned = true; log('drawing VJ before sprites finished loading');
                }
            } catch (e) {}
            return _df(f);
        };
    }

    log('ready — WHOOPWHOOP / 7 taps on the logo / ?vj');
    } catch (err) { try { console.error(TAG + 'fatal: ' + err.message); } catch (e) {} }
})();
