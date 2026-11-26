# 公开资源调研：美术 + 玩法（2026-11-27 夜间）

> 作者要求：去 GitHub、游戏网站、Steam 上找更多公开资源，美术和玩法都要。
> 本轮**只调研、不接入**：画面之后统一改，这里列出哪些资源适合那次大改。
> 所有美术资源都按"可商用"筛选；许可证以下载包里的 License 文件或资源页为准。

## 一、结论（先看这三条）

1. **最适合"岛变成小镇"的美术包：Quaternius 中世纪村庄 MegaKit + 自然 MegaKit**（都是 CC0，可商用、不用署名）。
   - 村庄包有 176 个模块件（墙、门、窗、阳台、屋顶、楼梯），可以拼出"山城"那种层层叠叠的房子。
   - 自然包有 68 个件（树、灌木、花、草、蘑菇、石子），风格统一、偏柔和。
   - 两个包都有 glTF 格式，three.js 直接能读。
2. **画面"不自然"的主要原因在地形和水，不只是模型**。可参考的做法：卡通水面着色器（Roystan 的 toon water，许可宽松）、地形用"台地 + 石墙"分层（Townscaper、Islanders 的做法）。
3. **玩法参考里最值得借的两点**：
   - 转生（传光）应该"改变规则"，而不只是"数字变大"（GDC 讲座 Idle Chatter）。我们三片海已经各有规则，方向对。
   - 摆放类游戏的"放下去就有反馈、没有失败"（Islanders / Townscaper / Dorfromantik），对应我们以后"点岛建设"的手感。

## 二、美术资源（已下载并检查过的）

下载的包在本次会话的临时目录里（没有放进项目，等改画面时再挑）。

| 资源 | 许可 | 格式 | 内容 | 适合做什么 |
|---|---|---|---|---|
| [Quaternius 中世纪村庄 MegaKit（免费版）](https://opengameart.org/content/medieval-village-megakit) | CC0 | glTF / FBX / OBJ | 176 个件：墙角、门框、门、地板、阳台、屋顶、楼梯等 | **小镇的房子**：模块化拼装，可以按等级拼出越来越大的房子 |
| [Quaternius 自然 MegaKit（免费版）](https://opengameart.org/content/stylized-nature-megakit) | CC0 | glTF / FBX / OBJ | 68 个件：普通树 ×5、枯树 ×5、灌木、花、草、蕨、蘑菇、圆石/方石 | **岛上植被**：比现在的混搭模型风格更统一 |
| [Quaternius 奇幻道具 MegaKit（免费版）](https://opengameart.org/content/fantasy-props-megakit) | CC0 | glTF / FBX / OBJ | 94 个件：木桶、苹果桶、旗帜、长椅、书、蜡烛、铁砧、水桶、笼子等 | **码头和街道小物**、守灯人小屋内景 |
| [Quaternius 低模船包](https://opengameart.org/content/lowpoly-ship-pack) | CC0 | FBX / OBJ（无 glTF，需转换） | 6 艘：小船、帆船、救生艇、帆船大船、维京船、游轮 | **夜里经过的船**、第二艘船的外观 |
| [Kenney 商业城市 Kit 2.1](https://opengameart.org/content/city-kit-commercial) | CC0 | glTF 等 | 约 170 个现代楼房件 | 风格偏现代城市，**不太适合**海边小镇，只作备用 |

注意：Quaternius 的三个 MegaKit 都是**免费版**，只含部分模型；付费版（PRO）有完整件数，需要时可以考虑购买。

## 三、美术资源（只看了资源页，没下载）

| 资源 | 许可 | 说明 |
|---|---|---|
| [KayKit City Builder Bits](https://kaylousberg.itch.io/city-builder-bits) | CC0 | glTF，城市建造用的路、房子、树；色调明快 |
| [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) + [角色动画](https://kaylousberg.itch.io/kaykit-character-animations) | CC0 | 带动画的小人，可以做**小镇行人、守灯人**（现在行人不会走路动画） |
| [Kenney City Kit Suburban](https://kenney-assets.itch.io/city-kit-suburban) | CC0 | 郊区小房子，比商业 Kit 更接近小镇 |
| [Quaternius LowPoly 合集](https://quaternius.itch.io/quaternius-lowpoly-bundle) | CC0 | 多个包合集 |
| [Polytropic Town](https://zero-bit-inc.itch.io/polytropic-town) | 写的是"免版税"，**许可要再核对** | 风格很像我们想要的海边小镇，用之前先读许可 |

**声音（CC0）**
- [海浪 + 海鸥（Big Sound Bank）](https://bigsoundbank.com:443/sea-waves-and-seagulls-s0267.html)：可以做背景环境音。
- [单只海鸥音效（OpenGameArt）](https://opengameart.org/content/solo-seagull-sound-effects)：点击、船回港时用。

**字体（OFL，可商用、可嵌入）**
- jf 粉圆（open-huninn）：圆体，适合温柔的画风；它是繁体字形，简体覆盖要再确认。
- Resource Han Rounded CN（基于思源黑体的圆体）：简体，需要再核实许可与字重。

**水面与画面技术参考（代码，不是素材）**
- Roystan 卡通水面着色器（Unlicense，可随意用）：岸边白色泡沫线 + 深浅渐变，正好解决"岛和海的交界不自然"。
- [Tuts+：在网页上做卡通水面](https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t)：three.js 版本的教程。
- [jbouny/ocean](https://awesome.ecosyste.ms/projects/github.com%2Fjbouny%2Focean)（MIT）：写实海面，比较旧，只作参考。

## 四、玩法参考

**同类游戏（Steam）**

| 作品 | 和我们像在哪里 | 可借鉴 |
|---|---|---|
| [Idyll Isle](https://store.steampowered.com/app/4209160/Idyll_Isle/) | 修灯塔点亮航线、派队伍出海 | 航线分近/中/远，"满载或空手"的结果反差 |
| [Lighthouse Keeper](https://store.steampowered.com/app/2023050) | 守灯人题材 | 夜里的氛围、照船的手感 |
| Little Idle Isle、Cozy Tide、Cozy Island、Enclaved | 小岛放置、慢节奏 | 岛会长大、离线回来看变化 |

**岛屿建造类（不是放置，但手感值得学）**
- Islanders、Townscaper、Dorfromantik：压力低、放下去马上有反馈、没有失败。
  - 对我们的意义：以后"点小镇 → 建设"时，每买一样东西要在岛上**立刻看到**它出现，并有一个小动画。
  - 参考：[Kotaku 评 Islanders](https://kotaku.com/islanders-is-almost-the-perfect-city-building-game-1833729123)。

**放置游戏设计文章**
- Anthony Pecorella（Kongregate），GDC 2016《Idle Chatter》（[幻灯片](https://pt.slideshare.net/AnthonyPecorella/idle-chatter-gdc-2016-59734260)）：
  - 转生要带来新规则，不只是倍率；
  - 离线收益是回访的主要动力。
  - 我们：三片海各有规则（雾要更亮、冰要破冰）、到港清单，都符合。
- [Game Developer：放置游戏的数学（第三部分）](https://gamedeveloper.com/design/the-math-of-idle-games-part-iii)：成本增长和收益增长的配比，我们的模拟器已经按这个思路在调。
- [Eric Guan：放置游戏设计原则](https://ericguan.substack.com/p/idle-game-design-principles)：每次打开都要有"可以买的东西"和"下一个目标"。我们的数值检查（每次打开能买到东西 94% / 100% / 91%）达标。

**开源放置游戏代码（参考结构，不直接用）**
- The Modding Tree（放置树框架）、[idle-js-games](https://github.com/idle-js-games)、[button-clicker](https://www.github.com/remarkablegames/button-clicker)（MIT）。
- 结论：我们的"纯规则层 + 模拟器 + 节奏测试"结构比这些开源项目更完整，不需要换框架。

## 五、建议：以后统一改画面时怎么用

1. **先改地形和水**（最影响"自然感"）：卡通水面 + 岸边泡沫；地形台地边用石墙模型代替陡坡色块。
2. **再换房子**：用中世纪村庄 MegaKit 的模块拼 3–4 种房型 × 3 个等级，替换现在小镇里混搭的房子。
3. **植被统一**：全部换成自然 MegaKit，一个包一种风格。
4. **小人**：KayKit 角色 + 动画做行人和守灯人。
5. 换模型时一并更新 `CREDITS`（CC0 不强制署名，但写上来源方便以后查）。

## 六、没核实的地方

- Polytropic Town 的许可、两款中文圆体字体的简体覆盖和许可，需要在用之前再读一遍原文。
- Steam 同类游戏只看了商店页面，没有销量或留存数据。
- 下载的包放在会话临时目录，会话结束会被清掉；真要用时从上面的链接重新下载。

## 七、GitHub 公共仓库补充搜索（2026-11-27 白天）

用 GitHub 搜索按星数排序查了：放置/增量游戏、three.js 小岛、卡通水面、CC0 素材清单、远征类放置游戏。

**素材清单（找素材时的入口，都是 CC0）**

| 仓库 | 星数 | 用途 |
|---|---|---|
| [madjin/awesome-cc0](https://github.com/madjin/awesome-cc0) | 564 | 全网 CC0 素材站点清单：3D、贴图、音效、音乐 |
| [devanshutak25/3d-resources](https://github.com/devanshutak25/3d-resources) | 1037 | 3D/游戏开发资源索引（4800+ 条），按类别分 |
| [iwenzhou/kenney](https://github.com/iwenzhou/kenney) | 7 | Kenney 全套素材包的镜像（CC0），以后可以从这里批量取 |

**开源放置游戏（看玩法和结构，不拿代码）**

| 仓库 | 许可 | 值得看的地方 |
|---|---|---|
| [IvarK/AntimatterDimensionsSourceCode](https://github.com/IvarK/AntimatterDimensionsSourceCode) | MIT | 最成功的网页放置游戏之一：多层转生、每层换规则、离线进度、新手引导节奏 |
| [pmotschmann/Evolve](https://github.com/pmotschmann/Evolve) | MPL-2.0 | 文明演化放置：资源种类多但界面分层展示，参考"信息不过载" |
| [ihtasham42/progress-knight](https://github.com/ihtasham42/progress-knight) | Unlicense | 极简放置：一生结束后带着经验重来，和我们"传光"很像 |
| [particle-clicker/particle-clicker](https://github.com/particle-clicker/particle-clicker) | MIT | 每次升级附一小段科普文字，类似我们的航海日志 |
| [Flaque/merchant.js](https://github.com/Flaque/merchant.js) | MIT | 放置游戏的资源/价格小框架；我们已有自己的规则层，不需要 |
| [Patashu/break_infinity.js](https://github.com/Patashu/break_infinity.js) | MIT | 超大数字库；我们的数字不超过普通范围，暂不需要 |

**three.js 小岛 / 水面（以后改画面时参考）**
- [nicksonthc/ghibli-threejs](https://github.com/nicksonthc/ghibli-threejs)（MIT）：手绘/吉卜力风格的 three.js 场景做法，包括水面、草、光照。
- [ywsfAS/IslandAS](https://github.com/ywsfAS/IslandAS)（MIT）：three.js + TypeScript 的风格化小岛，自写 GLSL 着色器。
- [StarKnightt/tiny-planet](https://github.com/StarKnightt/tiny-planet)（MIT）：小星球上的海、沙滩、起伏的山，地形和海岸线的处理可参考。

**结论**：GitHub 上没有"拿来就能用"的灯塔/小岛放置游戏素材；有用的是 CC0 素材清单（找素材的入口）和几个开源放置游戏（参考转生和新手节奏）。我们的规则层 + 模拟器已经比这些项目的结构更完整，不需要换框架。
