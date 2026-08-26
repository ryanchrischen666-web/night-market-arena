'use strict';

// ============ META UI：介紹 · 成就 · 攤位 · 等級列 · 獎勵 ============
const UI = (() => {
  const $ = id => document.getElementById(id);
  const META_SCREENS = ['howto-screen', 'ach-screen', 'shop-screen'];

  function backToTitle() {
    META_SCREENS.forEach(s => $(s) && $(s).classList.add('hidden'));
    $('title-screen').classList.remove('hidden');
    renderTitleMeta();
  }
  function openScreen(id) {
    $('title-screen').classList.add('hidden');
    META_SCREENS.forEach(s => $(s) && $(s).classList.add('hidden'));
    $(id).classList.remove('hidden');
  }

  // ---------- 標題畫面：等級列 + 夜市幣 ----------
  function renderTitleMeta() {
    const L = Progress.level();
    const el = $('meta-bar');
    if (!el) return;
    const t = Progress.equippedItem('title');
    el.innerHTML =
      `<div class="meta-lv">LV <b>${L.level}</b></div>` +
      `<div class="meta-xp" title="${L.into} / ${L.need} XP">` +
        `<div class="meta-xp-fill" style="width:${Math.round(L.into / L.need * 100)}%"></div>` +
        `<span class="meta-xp-t">${L.into} / ${L.need}</span></div>` +
      `<div class="meta-coins"><b>${Progress.coins}</b> 夜市幣</div>` +
      (t ? `<div class="meta-title">${t.cn}</div>` : '') +
      (Save.persistent ? '' : `<div class="meta-warn">此瀏覽器無法存檔，紀錄只保留到關閉視窗</div>`);
  }

  // ---------- 怎麼玩 ----------
  const HOWTO = [
    { icon: '⚔', cn: '目標', en: 'Goal',
      body: '打倒場上所有對手就贏了。你的血量歸零就輸。<br>每一場都是獨立的一局，隨時可以再來一次。' },
    { icon: '🕹', cn: '操作', en: 'Controls',
      body: '<b>W A S D</b> 移動 · <b>滑鼠</b> 瞄準 · <b>點左鍵</b> 攻擊<br><b>Q E R</b> 三個技能 · 手機則是左邊搖桿 + 右邊按鈕' },
    { icon: '✨', cn: '技能', en: 'Abilities',
      body: '每位英雄有三個技能，用完要等冷卻。<br>血條下方的方塊會告訴你好了沒。' },
    { icon: '🍜', cn: '回血', en: 'Healing',
      body: '地圖角落有小吃攤，走過去就回血。<br>用過要等 9 秒才會再亮起來。' },
    { icon: '🎲', cn: '賠注', en: 'Odds',
      body: '人越少，每個敵人越強。<br><b>1v1</b> 硬碰硬 · <b>1v3</b> 敵人弱但會包圍你 · <b>魔王</b> 單挑滷味鍋大王。' },
    { icon: '🪙', cn: '夜市幣', en: 'Coins',
      body: '打完一場就有夜市幣和經驗值，贏了更多。<br>夜市幣可以去<b>攤位</b>換造型 — <b>不需要也不能用真錢</b>。' },
  ];
  function renderHowTo() {
    $('howto-body').innerHTML = HOWTO.map(h =>
      `<div class="ht-card"><div class="ht-ic">${h.icon}</div>` +
      `<div class="ht-h">${h.cn} <span>${h.en}</span></div>` +
      `<div class="ht-b">${h.body}</div></div>`).join('');
    Save.d.seenHowTo = true; Save.save();
  }

  // ---------- 成就 ----------
  function renderAch() {
    const got = ACHIEVEMENTS.filter(a => Progress.has(a.id)).length;
    $('ach-count').textContent = `${got} / ${ACHIEVEMENTS.length}`;
    $('ach-body').innerHTML = ACHIEVEMENTS.map(a => {
      const on = Progress.has(a.id);
      return `<div class="ach ${on ? 'on' : 'off'}">` +
        `<div class="ach-ic">${on ? a.icon : '?'}</div>` +
        `<div class="ach-tx"><div class="ach-n">${a.cn} <span>${a.en}</span></div>` +
        `<div class="ach-d">${on ? a.desc : '尚未解鎖'}</div></div></div>`;
    }).join('');
  }

  // ---------- 攤位（純造型，遊戲內幣）----------
  function renderShop() {
    $('shop-coins').textContent = Progress.coins;
    $('shop-body').innerHTML = SHOP_ITEMS.map(it => {
      const owned = Progress.owns(it.id);
      const unlocked = Progress.unlockedFor(it);
      const eq = Save.d.equipped[it.kind] === it.id;
      const afford = Progress.coins >= it.cost;
      let btn, cls;
      if (!unlocked) {
        cls = 'locked';
        btn = it.needAch ? `需要成就「${ACHIEVEMENTS.find(a => a.id === it.needAch).cn}」` : `需要 LV ${it.needLevel}`;
      } else if (owned) { cls = eq ? 'equipped' : 'owned'; btn = eq ? '使用中 · 點一下取消' : '點一下裝備'; }
      else { cls = afford ? 'buyable' : 'poor'; btn = `${it.cost} 夜市幣`; }
      const sw = it.kind === 'trail'
        ? `<div class="sw" style="background:${it.color};box-shadow:0 0 14px ${it.color}"></div>`
        : `<div class="sw sw-t">${it.cn}</div>`;
      return `<div class="shop-item ${cls}" data-id="${it.id}">${sw}` +
        `<div class="si-n">${it.cn}<span>${it.en}</span></div>` +
        `<div class="si-b">${btn}</div></div>`;
    }).join('');
    $('shop-body').querySelectorAll('.shop-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (Progress.owns(id)) { Progress.equip(id); Sound.ui(); }
        else if (Progress.buy(id)) { Sound.buff(); }
        else { Sound.uiBack(); return; }
        renderShop();
      });
    });
  }

  // ---------- 成就通知 ----------
  function toast(list) {
    if (!list || !list.length) return;
    const wrap = $('toast-wrap');
    list.forEach((a, i) => setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `<div class="t-ic">${a.icon}</div><div><div class="t-h">成就解鎖 · ACHIEVEMENT</div>` +
                     `<div class="t-n">${a.cn} <span>${a.en}</span></div></div>`;
      wrap.appendChild(el);
      Sound.heal();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 4600);
    }, i * 600));
  }

  // ---------- 結算畫面的獎勵區 ----------
  function showRewards(r) {
    const el = $('rewards');
    if (!el) return;
    el.innerHTML =
      `<div class="rw"><span class="rw-n">+${r.coins}</span> 夜市幣</div>` +
      `<div class="rw"><span class="rw-n">+${r.xp}</span> 經驗</div>` +
      (r.levelUp ? `<div class="rw up">升級！LEVEL ${r.level}</div>` : '');
    // S8：破紀錄要全畫面有感 —— 金色印章 + 標題發光
    const scr = $('end-screen');
    let st = $('record-stamp');
    if (!st && scr) { st = document.createElement('div'); st.id = 'record-stamp'; scr.appendChild(st); }
    if (scr) scr.classList.toggle('new-record', !!r.newRecord);
    if (st) {
      st.classList.toggle('hidden', !r.newRecord);
      if (r.newRecord) {
        st.innerHTML = '🏆 新紀錄！<small>' +
          (r.prevBest != null ? `之前最佳 ${r.prevBest.toFixed(1)}s → <b>${r.seconds.toFixed(1)}s</b>` : `首次通關 <b>${r.seconds.toFixed(1)}s</b>`) +
          '</small>';
        Sound.win();
      }
    }
    if (r.levelUp) Sound.win();
    toast(r.unlocked);
  }

  function showTutorialDone(unlocked) {
    $('end-screen').classList.remove('hidden');
    $('end-title').innerHTML = '教學完成<span class="end-en">TUTORIAL CLEAR</span>';
    $('end-title').className = 'end-title win';
    $('end-stats').innerHTML = '你已經學會全部基本操作了。<br>現在去擂台試試看吧！';
    $('rewards').innerHTML = '';
    toast(unlocked);
  }

  // ---------- 造型：拖尾特效（沿用既有粒子系統，不動繪圖層）----------
  let trailT = 0;
  function cosmeticTick(dt) {
    const it = Progress.equippedItem('trail');
    if (!it || state !== 'playing' || !player || player.dead) return;
    trailT += dt;
    if (trailT < 0.045) return;
    trailT = 0;
    spawnParticles(player.x, player.y + 6, 1, it.color, { speed: 0.4, life: 0.5, size: 3 });
  }

  return { backToTitle, openScreen, renderTitleMeta, renderHowTo, renderAch,
           renderShop, toast, showRewards, showTutorialDone, cosmeticTick };
})();
