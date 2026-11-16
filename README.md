# 夜市擂台 · Night Market Arena

> 挑一位小吃英雄，選一場硬仗，在 1v1、1v2、1v3 的擂台上開打。
> *Pick your food hero, pick your odds, and brawl the night-market roster.*

一款以**台灣夜市小吃**為主題的瀏覽器動作對戰遊戲。純 HTML + CSS + JavaScript，免安裝、免帳號、無廣告、無內購、無連線——雙擊就能玩。

---

## 🎮 快速開始 · Quick Start

1. 下載或 clone 這個 repo
   ```bash
   git clone https://github.com/ryanchrischen666-web/night-market-arena.git
   ```
2. 直接用瀏覽器打開 `night-market-arena_12.html`
3. 進入擂台 → 選英雄 → 選模式 → 開打！

> 支援 `file://` 直接開啟。沒有網路時字型會改用備用字型，但遊戲照常運作。
> 手機版請**橫向**遊玩，有虛擬搖桿與自動瞄準。

---

## 🥢 英雄 · Heroes

八位小吃英雄全部開放，每位都有一般攻擊和三個技能（Q / E / R）。

| 英雄 | English | 定位 | 外號 | 技能 Q / E / R |
|---|---|---|---|---|
| 🥞 蔥油餅 | Scallion Pancake | 坦克 Tank | 鐵板上的老大哥 | 五香 / 油爆 / 麵皮裹 |
| 🦑 烤魷魚 | Grilled Squid | 遠程 Ranged | 海風來的長手 | 觸手鞭 / 纏絲 / 潑墨 |
| 🟫 臭豆腐 | Stinky Tofu | 控場 Zone | 越臭越驕傲 | 酥脆衝 / 脆殼盾 / 臭氣彈 |
| 🧋 珍珠奶茶 | Bubble Tea | 輸出 DPS | 台中來的甜風暴 | 糖衝 / 冰擲 / 珍珠風暴 |
| 🌭 大腸包小腸 | Sausage Wrap | 衝鋒 Charger | 衝鋒的糯米硬漢 | 炭火 / 糯米陷阱 / 機車衝 |
| 🍡 糖葫蘆 | Candied Hawthorn | 刺客 Assassin | 糖衣裡的利刃 | 糖晶碎 / 紅閃 / 糖葫蘆擊 |
| 🍳 蚵仔煎 | Oyster Omelet | 鬥士 Bruiser | 海口的暖心硬漢 | 蛋補 / 追蹤 / 滑溜區 |
| 🍲 藥燉排骨 | Pork Ribs Soup | 輔助 Support | 漢方的老師傅 | 藥煙 / 飛骨 / 補湯鍋 |

---

## ⚔️ 模式 · Modes

| 模式 | 說明 | 敵人數值 |
|---|---|---|
| **1v1 對決 Duel** | 單挑一位強化過的勁敵 | HP ×1.5、傷害 ×1.15 |
| **1v2** | 以一敵二 | HP ×1.0、傷害 ×0.95 |
| **1v3** | 以一敵三 | HP ×0.65、傷害 ×0.75 |
| **魔王戰 Boss** | 挑戰滷味鍋大王，兩階段、四種招式，血量剩一半進入暴怒 | — |

所有模式都可開啟**本地雙人（2P）**，兩人共用一個鍵盤合作。

---

## ⌨️ 操作 · Controls

| 動作 | 玩家 1 (P1) | 玩家 2 (P2) |
|---|---|---|
| 移動 | `W` `A` `S` `D` | 方向鍵 |
| 瞄準 | 滑鼠 | 面向方向 |
| 攻擊 | 滑鼠左鍵 | 右 `Shift` |
| 技能 1 / 2 / 3 | `Q` / `E` / `R` | `,` / `.` / `/` |

| 其他 | 按鍵 |
|---|---|
| 開關音樂 | `M`（或右上角 MUSIC 按鈕） |
| 開關音效 | 右上角 SFX 按鈕 |

地圖上有回血道具，每 9 秒充能一次，可回復 22 HP。

---

## 📁 專案結構 · Project Structure

```
night-market-arena/
├── night-market-arena_12.html   # 遊戲入口
├── css/
│   ├── base.css                 # 基本樣式
│   ├── screens.css              # 標題、選角、選模式畫面
│   ├── hud.css                  # 遊戲中 HUD
│   └── mobile.css               # 手機版（橫向、虛擬搖桿）
├── js/                          # 依檔名數字順序載入
│   ├── 00-abilities.js          # 24 個玩家技能
│   ├── 01-heroes.js             # 8 位英雄數值與中英文介紹
│   ├── 02-modes.js              # 模式難度倍率
│   ├── 03-state.js              # 全域遊戲狀態
│   ├── 04-input.js              # 鍵盤 / 滑鼠輸入
│   ├── 05-util.js               # 工具函式
│   ├── 06-sound.js              # 音效與音樂
│   ├── 07-enemy-ai.js           # 敵人 AI
│   ├── 08-ui-select.js          # 選角 / 選模式介面
│   ├── 09-match.js              # 對戰開始與結算
│   ├── 10-update.js             # 每幀更新邏輯、P1/P2 操作
│   ├── 11-map.js                # 地圖
│   ├── 12-render.js             # 繪圖
│   ├── 13-art.js                # 角色美術
│   ├── 14-boss.js               # 魔王戰
│   ├── 15-draw.js               # 特效繪製
│   └── 16-main.js               # 主迴圈與初始化
├── all.js / all.css             # 合併版（單檔）
└── text.md                      # 受眾分析與設計筆記
```

---

## 🗺️ 待辦 · Roadmap

設計分析詳見 [`text.md`](text.md)。

- [ ] **暫停鍵** — 讓玩家和老師可以隨時中斷
- [ ] **小吃介紹** — 英雄卡加上「這是什麼食物」的中英說明
- [ ] **P2 自動瞄準** — 讓沒有滑鼠的第二位玩家也打得準
- [ ] **最佳紀錄** — 用 `localStorage` 存每個角色 × 模式的通關時間與徽章
- [ ] **新手教學** — 第一次遊玩的操作說明

**設計原則：** 不加載入畫面、不加帳號、不依賴精準指向，保持「打開就玩、隨時能關」。

---

## 🛠️ 技術 · Tech

- 原生 HTML5 Canvas + JavaScript（無框架、無建置工具）
- 字型：Bungee、Noto Serif TC、Space Mono（Google Fonts）
- 音效以 Web Audio 產生
