# 让守灯人的灯塔真正亮起来

**结论先说：** 市场上做得好的同类游戏，并不比《守灯人》多很多系统，它们赢在三件事上。第一，**场景本身就是界面**：玩家点灯塔、点船、点岛来升级，菜单只是辅助。第二，**养成是"一层套一层"的阶梯**：里程碑、图鉴、成就、永久天赋树互相加成，玩家随时都有一个"马上就能达成"的小目标。第三，**画面靠"少形状、少颜色、一束强光"出效果，不靠精细插画**，这对用代码画画的游戏是好消息。《守灯人》现在的骨架（资源栏、场景、行动栏、升级卡、航行、海域转生）和主流放置游戏基本一致，"简陋"感主要来自四处：场景只能看不能点；升级只是数字变大，没有里程碑和图鉴这类"收集到了"的满足感；画面缺少颗粒、光晕、倒影、雾和小动物这些"质感层"；按钮和奖励缺少反馈动画。这些大部分可以直接用代码改。真正需要画师或 AI 美术的只有少数几样：有表情的人物和动物、图鉴里的鱼和漂流物插图、宣传图。灯塔题材的放置游戏在市场上几乎是空白，唯一相近的 Idyll Isle 刚上线就拿到 89% 好评，说明这个方向值得打磨。

## 成功的同类游戏卖的是"氛围加一个随时可回来的小世界"

先看谁做得好。Steam 上最亮眼的是钓鱼放置游戏 **Cast n Chill**，2025 年 6 月上线，售价 14.99 美元，**5,380 条英文评价中 95% 好评**，上线一年多后最近 30 天仍是 95% 好评 ([Steam](https://store.steampowered.com/app/3483740/Cast_n_Chill/))，媒体评分平均 87 ([OpenCritic](https://opencritic.com/game/18729/cast-n-chill))。它的卖点是可以缩在屏幕角落或第二块显示器上"挂着" ([Steam](https://store.steampowered.com/app/3483740/Cast_n_Chill/))。手机上规模最大的是 **Hooked Inc**（iOS 约 50.5 万条评分，均分 4.7）([App Store](https://apps.apple.com/app/id1436213906))。气氛上的标杆是 **Dredge**：团队原本希望第一年卖 10 万份，结果 24 小时就达到，2023 年 10 月已经卖出超过 100 万份 ([Game Developer](https://gamedeveloper.com/business/dredge-smashes-internal-expectations-after-topping-1-million-sales))。

和我们最接近的是 2026 年 7 月上线的单人开发作品 **Idyll Isle**：一个像素风放置小岛，**修好灯塔就点亮贸易航线、引来商人，并开启通往七片海域的远航**，目前 94 条评价中 89% 好评 ([Steam](https://store.steampowered.com/app/4209160/Idyll_Isle/))。另一款 2022 年的 Lighthouse Keeper 是修灯塔、驾船去 11 座岛的生存制作游戏，338 条评价中 80% 好评 ([Steam](https://store.steampowered.com/app/2023050))。除此之外，研究没有找到成功的"灯塔放置游戏"。这说明题材有空位，但也没有现成的需求证明。

这些游戏有一个共同点：玩家夸的几乎都是氛围和小细节，骂的几乎都是广告和卡关，很少骂画面。Cast n Chill 被评论称为"美得惊人的风景像素画"([OpenCritic](https://opencritic.com/game/18729/cast-n-chill))，Vice 专门夸了它像油画一样的水面、划船时的水声和那只会在好鱼靠近时叫的狗 ([Vice](https://www.vice.com/en/article/cast-n-chill-is-an-idle-and-active-fishing-game-that-has-become-my-new-go-to-when-i-want-to-relax-review/))。Hooked Inc 的玩家说"布局很好，简单的画风很可爱"([App Store](https://apps.apple.com/app/id1436213906))。可见"简单"本身不是问题，**"简单但没有生气、没有质感、没有反馈"才是"简陋"**。也有一个值得警惕的反例：Cast n Chill 最常见的批评是挂机模式收益太少，"更像屏保而不是玩法"([Gaming.net](https://www.gaming.net/reviews/cast-n-chill-review-pc))。《守灯人》要避免同样的问题，离线和挂机必须真的有收获。

## 界面：把菜单搬进场景，让每个按钮都会"说话"

主流放置游戏的屏幕结构和《守灯人》现在差不多：顶部一条资源栏，中间一个活的场景，底部一排操作。差距在于**场景里的东西能不能点**。Idle Miner Tycoon 的做法是直接点矿井上的等级按钮，再点绿色"升级"，并且可以选择一次买 1、10、50 或最大 ([BlueStacks](https://www.bluestacks.com/blog/game-guides/idle-miner-tycoon/idt-tips-tricks-en.html))。Idle Theme Park Tycoon 把大门、门票、停车费这些场景里的实物直接当成界面，每一步都能看见钱冒出来 ([Jurasek](https://martinjurasek.substack.com/p/900-seconds-with-idle-theme-park))。Cats & Soup 顶部一条简单进度和金钱栏，底部点食物图标卖钱，一个锤子图标打开分类升级菜单，还会**提示你下一个该升级哪个设施**，这一点在 App Store 被玩家专门夸过 ([DEV Community](https://dev.to/jpdengler/exploring-the-charming-uiux-design-of-catssoup-3l9a)；[App Store](https://apps.apple.com/us/app/id1581431235))。所以对《守灯人》来说，**点灯塔应该弹出灯塔的升级面板，点渔网、宝箱、船、岛上建筑也一样**，物体头上挂一个小等级牌。现在的三张升级卡可以保留，但应该和场景里的物体联动。

反面教材同样清楚。Idle Fish 2 一路加了附魔台、进化台、黑市、绿色市场、勋章市场、鱼塘等十几个单一用途的界面，玩家评价其中一些"没用或过时"，后期"很无聊"([App Store](https://apps.apple.com/US/app/id1534396279))。itch.io 上的玩家也反复抱怨菜单"太乱"、长列表重复 ([itch.io](https://itch.io/post/10500914))。《守灯人》现在三个行动按钮的规模是合适的，以后加功能时，分页最好控制在 3 到 4 个，例如"灯塔与渔网 / 船与航行 / 海岛 / 海域与星光"。

升级按钮是"简陋感"最集中的地方。玩家把"一次买到最大"和"按住连续买"称为放置游戏"非常标准的基础功能"，缺了就会抱怨 ([itch.io](https://itch.io/post/8825673))。他们还抱怨点了"买最大"之后没有任何反馈，不知道买没买、买了多少 ([itch.io](https://itch.io/post/8825673))；抱怨误触"买最大"把钱一次花光 ([itch.io](https://itch.io/post/14347709))；希望把"买了能多赚多少"直接写在按钮上 ([itch.io](https://itch.io/post/16038435))。按钮应该在买得起时亮起、买不起时变暗 ([SEELE](https://www.seeles.ai/resources/blogs/scratch-clicker-game-ui))。不过《守灯人》的渔网、宝箱、灯塔各只有 10 级，"买 10 个"的批量按钮意义不大。更实际的做法是：卡片上写清"下一级 +多少"、显示"还差多少 / 大约还要几分钟才买得起"、买得起时轻轻发光，等以后等级变多再加批量购买。

"手感"（行业里叫 juice）是另一块短板。做法很成熟：收钱时金币图标沿弧线飞向顶部资源栏，第一枚落地时数字开始跳，每次最多飞 10 个左右，避免大奖励时屏幕被几百个图标塞满 ([MarbleMaze devlog](https://sstyles93.github.io/blogs/mmgs_bezier))。原则是"任何东西都不能凭空出现"，都要有缓动、粒子或声音 ([Game Developer](https://gamedeveloper.com/design/3-game-juice-techniques-from-slime-road))。但第一天让人开心的奖励动画，到第三十天可能让人烦 ([DEV Community](https://dev.to/patilrb/the-reward-moment-is-the-product-43h6))，所以普通收集要轻、要快，只有转生和开新海域这样的大事才配大场面，并且要提供"减少动画"的开关。

回归弹窗方面，Egg, Inc. 把离线上限明明白白写出来，并且可以通过升级提高；PocketGamer.biz 认为提前讲清上限能赢得玩家好感 ([PocketGamer.biz](https://www.pocketgamer.biz/egg-inc-idle-games-gold-standard/))。弹窗不要叠着连续冒出来，玩家希望一个个确认 ([itch.io](https://itch.io/post/16640510))；也不要在玩家正在点东西时插进来，否则容易误触 ([CrazyGames](https://docs.crazygames.com/resources/monetizing-clicker/))。Hooked Inc 正是因为在抓到鱼、领完奖的瞬间插广告而被骂 ([App Store](https://apps.apple.com/app/id1436213906))。新手引导方面，Idle Theme Park 前三分钟引导很好，之后玩家"基本被扔下不管"，任务图标颜色太淡找不到 ([Jurasek](https://martinjurasek.substack.com/p/900-seconds-with-idle-theme-park))。对策是在资源栏下面常驻一条"下一个目标"提示，点一下就高亮对应的东西。

## 养成：从"三条等级线"变成"一张互相咬合的网"

研究放置游戏数学最权威的资料，是《AdVenture Capitalist》制作人 Anthony Pecorella 的系列文章。他指出成功的放置游戏都是几层循环叠在一起：最快的一层是"买东西、价格指数上涨"；第二层是到某个数量就翻倍的**里程碑**，定期打破价格曲线；第三层是转生，换取永久货币，用来买永久升级；最外层是研究、图鉴、成就这类走自己时钟的支线 ([Pecorella Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i))。他特别提醒，光靠数字变大已经不能让玩家惊喜，深度来自各层之间的配合和节奏的快慢变化 ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii))。

对照来看，《守灯人》已经有了第一层（渔网、宝箱、灯塔升级）、一个空间解锁层（灯塔→航行→海岛→建筑）和转生（海域→星光），**缺的是里程碑、支线收集和真正的永久天赋树**。现在星光只是"每颗 +3% 产量"，这是最平的一种转生奖励。

**里程碑**是最便宜、效果最好的一项。AdVenture Capitalist 的每种生意在 25、50、100、200、300、400 个时，生产周期减半，所有生意都达到同一数量时还会再减半一次 ([AdCap wiki](https://adventure-capitalist.fandom.com/wiki/Businesses))。玩家会自然地以 25、50、100 这样的整数为目标 ([Steam 攻略](https://steamcommunity.com/app/346900/discussions/0/618458030681519409))，购买集中在里程碑附近，因为那一刻那项生意"特别划算"([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i))。Pecorella 还指出一个常见问题：最新的产出项几乎总是最强，旧的就没人管了；办法是给不同产出项设不同的里程碑门槛，让"最值得升级的那个"一直在变 ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i))。《守灯人》的岛上建筑只有 1 到 5 级，三大升级只有 10 级，等级线偏短。这里有一个判断，属于推断而非资料结论：要么把建筑等级延长（比如到 25 级，每 5 级一个"星"），要么在现有等级上做"全岛三座建筑都到 3 级/5 级时整岛加成"，后者改动最小，就是 AdCap"所有生意达标再翻倍"的翻版。

**图鉴和稀有收集**是钓鱼类游戏的核心长线动力。Cast n Chill 有 16 个钓点、50 多种鱼外加 16 种传说级渔获，有些鱼只咬特定鱼饵，玩家还能把钓到的鱼做成标本挂在自己修好的小屋里 ([Steam](https://store.steampowered.com/app/3483740/Cast_n_Chill/)；[Vice](https://www.vice.com/en/article/cast-n-chill-is-an-idle-and-active-fishing-game-that-has-become-my-new-go-to-when-i-want-to-relax-review/))。Hooked Inc 用"未知海域"和"那条大家伙"作为终极追求 ([App Store](https://apps.apple.com/app/id1436213906))。Cats & Soup 的长线吸引力也主要来自收集猫的品种、帽子和服装 ([Metaphors and Moonlight](https://metaphorsandmoonlight.com/game-review-cats-soup-by-hidea/))。《守灯人》已经有"漂流物"和"三片海域"，天然适合做一本**漂流物图鉴**：每片海有自己的普通物品和两三件传说级物品，有些只有渔网到某级、灯塔亮到某级才会出现；集满一页给永久加成；稀有物品可以摆在灯塔里的展示架上。

**让各系统互相喂养**是"丰富感"的来源。Cookie Clicker 有 622 个普通成就，每个成就都提高"牛奶"值，牛奶又放大小猫升级这一主要倍率 ([Cookie Clicker wiki](https://cookieclicker.wiki.gg/wiki/Achievement))。Egg, Inc. 的奖杯给预言之蛋，每颗为转生加成 +5% ([Egg Inc wiki](https://egg-inc.fandom.com/wiki/Egg_of_Prophecy?oldid=7373))。Antimatter Dimensions 把"自动购买"作为完成挑战的奖励，让自动化本身成为进度 ([AD wiki](https://antimatter-dimensions.fandom.com/wiki/Guide))。Realm Grinder 的研究按转生次数分层解锁 ([RG wiki](https://realm-grinder.fandom.com/wiki/Research))。对应到《守灯人》：成就可以点亮"灯塔光辉"，每个 +1% 产量；自动收网、自动派船、自动收宝箱应该作为星光树或挑战的奖励，而不是一开始就送；星光应该花在一棵有分支的树上（经济、航行速度、离线时长、图鉴运气），而不只是自动生效的 +3%。

**转生公式**也值得调整。不同游戏的转生货币算法差别很大：Realm Grinder 按"本轮最高收入"开平方，在同一个位置重开拿不到更多货币，想翻倍大约要多赚 4 倍；Egg, Inc. 用约 1/7 次方，非常偏向主动玩 ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii))。对一个休闲、目标玩两三个月的网页游戏，开平方的"本轮最高收入"算法能防止玩家反复早早重开刷星光，比较合适。这是推断，最终要靠试玩调。

**节奏**要先快后慢、波浪式起伏。Gold & Goblins 早期计时短、奖励密，之后拉长，难度"上升—回落给喘息—再上升"，被长计时主导时留存会下降 ([PocketGamer.biz](https://www.pocketgamer.biz/deconstructing-a-100m-idle-game-what-5-years-of-gold-and-goblins-reveals-about-live-ops-and-retention/))。itch.io 玩家最常见的抱怨之一，是第一个升级要攒太久 ([itch.io](https://itch.io/post/12788343))。放置游戏玩家平均每天打开 5.3 次，每次约 8 分钟 ([GameAnalytics](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game))，所以**每次打开都应该有一件几分钟内就能完成的事**：下一个里程碑、下一件图鉴、下一艘船回港。离线回来时，Gold & Goblins 让玩家收钱、合成、拿一点进度加成，用"有事可做"强化回归 ([PocketGamer.biz](https://www.pocketgamer.biz/deconstructing-a-100m-idle-game-what-5-years-of-gold-and-goblins-reveals-about-live-ops-and-retention/))。《守灯人》的航行本来就是 15 分钟到 8 小时，离线弹窗可以从"一个数字"变成"一份到港清单"：哪几艘船回来了、带回什么、图鉴新增了什么，再高亮一个现在买得起的升级。宝箱容量可以顺势成为"离线上限"，让宝箱升级有了"能离开更久"的意义。

## 画面：少形状、少颜色、一束光，再加一层"质感"和"生气"

画面受称赞的独立游戏，走的几乎都是"做减法加氛围"的路线。Alto's Odyssey 的美术把形体削减到"只剩本质"，团队说"环境就是主角"([Game Developer](https://www.gamedeveloper.com/business/road-to-the-igf-team-alto-s-i-alto-s-odyssey-i-))，远景用更灰的颜色和前景拉开层次 ([Dice](https://www.dice.com/career-advice/altos-odyssey-winning-mobile-game))。Sky 光遇的环境美术会先在接近黑白的状态下检查画面，保证只有一个最亮、对比最强的焦点，周围都更暗；烛光让座位区显得亲密，暖色材质中和冷色石头 ([80.lv](https://80.lv/articles/how-to-design-emotional-game-environments-for-sky-children-of-the-light/))。Dredge 的夜晚靠"减法"制造气氛：视野只剩几米，音乐撤掉只留船吱呀声和浪声，码头和水面上的灯光把玩家吸引过去；它的水只用简单的正弦波，每个区域只用一张很小的渐变贴图，低多边形风格是"时间所迫"的选择 ([Unity](https://unity.com/resources/crafting-dredge-cozy-atmospheric-horror))。**这些昂贵的精细插画，恰恰是它们刻意省掉的部分**，所以《守灯人》用 SVG 和 canvas 画是可行的路线。

用代码画最大的风险是"平"。Alba 的画面虽然整体口碑不错（媒体平均 82），但有评论说物体看起来像"用画图软件的油漆桶填出来的，没有花纹和细节"([Flickering Myth](https://www.flickeringmyth.com/video-game-review-alba-a-wildlife-adventure/))。解决方法很具体：渐变是给纯色矢量形状增加立体感"简单又稳妥"的办法，在上面叠一层低透明度的噪点颗粒，就有版画般的质感 ([Shutterstock](https://www.shutterstock.com/blog/techniques-transform-flat-design-vectors))。另一条路是 A Short Hike 的做法：先画到很小的画布上再放大，低分辨率会产生"印象派效果，让大脑自己补全细节"([Uppercut Crit](https://uppercutcrit.com/?p=5137))。这一招能把所有代码画的东西统一成像素风，掩盖"剪贴画"感，同时和 Cast n Chill、Idyll Isle 这批成功作品同一路线。

具体到《守灯人》，下面这些都是代码能做的（属于根据资料推出的做法）。**调色板集中管理**：每个时段（黄昏、蓝调、深夜、黎明）5 到 7 种颜色，背景饱和度和亮度低，**灯塔的琥珀色暖光只给灯用**，别处都不用。**大气透视**：远岛、中景礁石、近景岩石、海面分 4 到 6 层剪影，越远越接近天空颜色，并随时间缓慢漂移形成视差。**光**：旋转的光束用带透明度衰减的渐变扇形，叠加模式提亮，再加一份模糊副本做光晕；塔身和礁石朝灯一侧描 1 到 2 像素的亮边。**水**：几层正弦波带，加上压扁、半透明、左右轻晃的灯塔与光束倒影，倒影上撒几点闪光。**雾**：在雾夜海域用渐变遮罩让远处变淡，光束在雾里显出光柱；灯塔越亮，雾退得越远，让升级在画面上看得见。**黑白检查**：做一个调试开关把画面转灰，确认灯和光束是最亮的地方。颗粒层要预先生成成图片再叠，因为实时滤镜在手机上很慢。

"生气"来自小而持续的东西，而不是大场面。Townscaper 里，鸽子在你建房时落在屋顶上，你再放东西就飞走，过一会儿又回来；蝴蝶只在草丛附近出现 ([Retroware](https://articles.retroware.com/2021/12/24/townscaper-and-the-art-of-minimalism/))。Usagi Shima 把岛上的昼夜和玩家现实时间同步，白天晴朗、晚上点灯笼 ([Siliconera](https://www.siliconera.com/review-usagi-shiima-improves-on-the-neko-atsume-formula/))。Cats & Soup 的玩家说光是看猫做饭、看鱼在缸里游就很享受 ([App Store](https://apps.apple.com/us/app/id1581431235))。Cast n Chill 那只狗证明一个陪伴动物就足以让画面"有人在"([Vice](https://www.vice.com/en/article/cast-n-chill-is-an-idle-and-active-fishing-game-that-has-become-my-new-go-to-when-i-want-to-relax-review/))。《守灯人》可以加：停在栏杆上、一点就飞散的海鸥；睡在灯室窗台的猫；夜里水中的荧光浮游生物；远处亮着航行灯缓缓驶过的船；围着灯打转的飞蛾；亮着的窗户里移动的守灯人剪影（擦镜片、写日志、泡茶冒热气）。另外要限制同时出现的数量，Kingdom 就因为场面太挤被批成"一锅像素粥"([GameGeeker](https://gamegeeker.com/games/kingdom-two-crowns-701160/review?market=DE))。

**成长要画在场景里。** Idyll Isle 的核心画面就是灯塔被修好、航线亮起、商人到来 ([Steam](https://store.steampowered.com/app/4209160/Idyll_Isle/))；Cast n Chill 是小屋被修好、码头建起、墙上挂满标本 ([Steam](https://store.steampowered.com/app/3483740/Cast_n_Chill/))；Hooked Inc 从近岸小船一路升到超级游艇 ([App Store](https://apps.apple.com/app/id1436213906))。《守灯人》的灯塔 10 级已经各不相同，下一步是让**整个画面随进度"从黑暗变成点点暖光"**：岛上逐渐出现小屋、晾衣绳、码头，海上出现亮着的浮标、远方回应你信号的第二座灯塔，过往船只越来越多；船从小划艇升成帆船再到小汽船；四座岛在海图和远景里从光秃礁石变成有灯火的村落。三片海域也要各有鲜明身份，就像 Dredge 每个区域有自己的样貌和怪物 ([Game Developer](https://www.gamedeveloper.com/design/trawling-in-the-deep-how-black-salt-games-made-spooky-fishing-rpg-i-dredge-i-))。最后要保护氛围：界面用半透明、低饱和的面板，不要在夜景上弹出刺眼的奖励窗。

代码擅长天空、海、光、剪影和粒子，**不擅长让角色可爱**。有表情的守灯人、猫和动物、图鉴里几十件鱼和漂流物的插图、带纹理的界面边框、商店宣传图，这些才是需要画师或 AI 生成图的地方。研究笔记没有覆盖 AI 生成美术的流程和风格一致性问题，这部分是不确定的，建议先小批量试做，再决定雇画师还是用 AI。

## 优先级清单：先改手感和目标，再改质感，最后补美术资源

工作量按"让 Claude 改代码"来估：**小**指一次对话、半天左右能完成；**中**指需要几次对话、两三天，要反复试玩调整；**大**指一周以上，涉及新系统和数值平衡。顺序按"玩家最先感受到的简陋感"排，前面的投入小、见效快。

### 第一部分：用代码就能做的改动

| 优先级 | 改什么 | 为什么 | 参考来源 | 工作量 |
|---|---|---|---|---|
| 1 | 升级按钮分"买得起 / 快买得起 / 买不起"三种状态，买得起时轻微发光；卡片写明"下一级 +多少"和"还要约几分钟" | 按钮不会"说话"是玩家最常见的抱怨之一 | itch.io 玩家反馈、SEELE 指南 | 小 |
| 2 | 收集和购买的手感：金币沿弧线飞向资源栏、数字跳动、卡片轻弹、灯塔光束在升级时闪一下、加一个"减少动画"开关 | "什么都不能凭空出现"，这是最便宜的去简陋手段 | MarbleMaze 开发日志、Slime Road、Cats & Soup | 小 |
| 3 | 场景物体可点：点灯塔、渔网、宝箱、船、岛直接打开对应升级，物体上挂小等级牌，有可升级时冒小红点（别常驻） | 场景"只能看"是和头部游戏最大的差距 | Idle Miner Tycoon、Idle Theme Park、Cats & Soup | 中 |
| 4 | 常驻"下一个目标"提示条，点一下高亮对应物体；首次游戏做 3 步引导 | 每次打开都有一件马上能做完的事 | Cats & Soup 推荐升级、Idle Theme Park 反面案例、Unity FTUE 建议 | 小 |
| 5 | 画面质感层：颗粒噪点、远近 4–6 层大气透视和视差、光束光晕、塔身亮边、水面倒影和闪光、黑白检查开关 | 直接解决"油漆桶填色"式的平 | Alto's Odyssey、Sky 光遇、Dredge、Alba 的反例 | 中 |
| 6 | 生气小元素：海鸥（点了会飞）、窗台的猫、夜里的荧光浮游生物、远处驶过的船灯、飞蛾、窗内守灯人剪影；限制同屏数量 | "有人在家"的感觉来自小而持续的动作 | Townscaper、Cast n Chill 的狗、Cats & Soup、Kingdom 的反例 | 中 |
| 7 | 离线弹窗改成"到港清单"：离开多久、哪些船回港带回什么、图鉴新增、上限多少（宝箱等级决定），并高亮一个买得起的升级；弹窗排队逐个出现 | 一个数字不如几份"礼物"；讲清上限赢得好感 | Gold & Goblins、Egg, Inc.、itch.io 反馈 | 小到中 |
| 8 | 里程碑：全岛三座建筑都到 3 级/5 级时整岛加成；不同建筑设不同门槛；卡片显示"距下个里程碑"进度条 | 最便宜的养成深度，让"该升哪个"一直在变 | AdVenture Capitalist、Pecorella | 中 |
| 9 | 漂流物图鉴：每片海若干普通和 2–3 件传说物品，部分需特定渔网/灯塔等级才出现；集满一页永久加成；稀有物品摆上灯塔展示架 | 钓鱼类游戏最核心的长线追求 | Cast n Chill、Hooked Inc、Cats & Soup | 中到大（代码部分；插图见下表） |
| 10 | 成长画在场景里：岛上逐步出现小屋、码头、晾衣绳；海上出现浮标、远方第二座灯塔、更多船；船外形随等级变；雾夜海域里灯越亮雾退越远 | 让升级改变轮廓和光，而不只是数字 | Idyll Isle、Cast n Chill、Hooked Inc、Dredge | 中到大 |
| 11 | 星光天赋树：把"每颗 +3%"改成有分支的树（经济、航行速度、离线时长、图鉴运气），部分节点要通关更多海域才开；自动收网/派船/收宝箱作为树上奖励；转生公式改成"本轮最高收入开平方" | 现在的转生奖励太平，缺少"爬梯子"的感觉 | Realm Grinder、Egg, Inc.、Antimatter Dimensions、Pecorella | 大 |
| 12 | 成就系统，每个成就给"灯塔光辉" +1% 产量 | 让成就有经济意义，把各系统串起来 | Cookie Clicker、Egg, Inc. | 中 |
| 13 | 昼夜与玩家本地时间同步；增加晴、雾、雨、风暴几种天气 | 每次回来看到的海都不一样，几乎不花美术成本 | Usagi Shima、Dredge、Kingdom | 中 |
| 14 | 可选"像素模式"：先画到小画布再放大，统一代码画面的风格 | 掩盖矢量"剪贴画"感，向 Cast n Chill 一类靠拢 | A Short Hike、Kingdom、Cast n Chill | 中（需试看效果再决定） |
| 15 | 挑战模式：在某片海加限制条件（如不能升渔网）重玩，奖励自动化或稀有物品 | 复用已有内容制造新鲜感 | Antimatter Dimensions | 大 |
| 16 | 网页"窄条模式"：只剩海景、灯塔和一个收入数字，适合挂在屏幕一角 | 这是 Steam 上钓鱼放置爆款的核心卖点 | Cast n Chill、Rusty's Retirement、Idyll Isle | 中 |

### 第二部分：需要雇画师或用 AI 生成的美术

| 优先级 | 需要什么 | 为什么代码做不好 | 参考来源 | 工作量 / 建议 |
|---|---|---|---|---|
| 1 | 图鉴插图：每片海的鱼、贝壳、漂流物，含传说物品（估计 30–50 张小图，同一风格） | 图鉴的满足感来自"好看的收藏"，代码画的图标很难有辨识度 | Cast n Chill（鱼看一眼就能认出来）、Cats & Soup | 中到大；适合先用 AI 生成试一批，看风格能否统一 |
| 2 | 陪伴动物（猫或海鸥）的几帧小动画：睡觉、伸懒腰、被点时的反应 | 角色"可爱"是代码最难做到的 | Cast n Chill 的狗、Cats & Soup、Usagi Shima | 中；动画帧建议找画师 |
| 3 | 守灯人形象：小尺寸剪影或简单角色，含擦镜片、写日志、泡茶几个动作 | 有人味的角色需要手绘 | Usagi Shima、Cats & Soup | 中 |
| 4 | 宣传主图和商店封面（如以后上 Steam 或网页游戏平台） | 第一印象决定点击，需要完整插画 | Dredge 的灯塔风暴主图 | 中；画师更稳妥 |
| 5 | 有纹理的界面边框和面板（木纹、旧纸、黄铜） | 能让界面摆脱"网页表单"感，但代码渐变也能做到七八成 | Cats & Soup | 小到中；排在最后，可先用代码试 |

## 结论

这次研究最重要的发现是：《守灯人》的"简陋"不是功能少，而是**缺少反馈和关联**。系统各自成立，却没有互相咬合；画面有了形状，却没有光晕、颗粒、倒影和小动物这层质感；升级改了数字，却很少改变玩家眼前的世界。好在补上这些几乎都是代码工作，而且正好是 Claude 擅长的部分。建议的顺序是：先用一两周时间完成清单前七项（按钮状态、手感、场景可点、目标提示、画面质感、生气元素、到港清单），这一步就能明显改变第一印象；再做里程碑、图鉴和星光树，解决"玩几天就没东西追"的问题；美术资源等图鉴系统做出来、确定需要多少张图之后再一次性找人或生成。

还有一点值得记住：Idyll Isle 证明"修灯塔、点亮航线"这个画面本身就能打动玩家，而市面上几乎没有专门的灯塔放置游戏。《守灯人》最该放大的，正是**"灯越亮，海就越热闹"**这条视觉主线：每一次升级都让黑暗的海上多一点暖光、多一艘船、多一个回应的信号。需要说明的不确定性有两点：研究没有拿到 Cast n Chill 等游戏逐屏的界面细节，以上布局建议部分是根据资料推断；节奏时间表和转生公式的选择也是推断，最终都要靠实际试玩来调。
