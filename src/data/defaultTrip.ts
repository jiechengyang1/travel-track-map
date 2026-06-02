import { TripData } from '../types';

export const defaultTrip: TripData = {
  tripName: "此生必驾：G318川藏公路极限风光之旅 (成都 - 拉萨)",
  startDate: "2026-06-01",
  endDate: "2026-06-08",
  totalDistance: "1800公里",
  description: "沿着世界级绝美景观天路——G318国道川藏线，从温婉繁华的“天府之国”成都启程，穿越苍茫壮阔的川西高寒草甸，翻越经典折多山、理塘千户藏寨与震撼人心的怒江七十二拐。途经如镜面般澄清的然乌湖与幽深来古冰川，最终抵达神圣庄严的世界屋脊——圣城拉萨布达拉宫，是一生必经历一次的朝圣飞驰之旅。",
  routes: [
    [104.0665, 30.5723], // 1. 成都
    [103.5012, 30.2211],
    [102.8541, 29.9854],
    [102.2355, 29.9142], // 2. 泸定
    [101.9612, 30.0522],
    [101.8021, 30.0984], // 3. 折多山垭口
    [101.5204, 30.0315], // 4. 新都桥
    [101.3522, 30.0123], // 5. 黑石城/高尔寺
    [100.8841, 30.0123],
    [100.2705, 30.0381], // 6. 理塘
    [99.7212, 30.0841],
    [99.3562, 30.1251], // 7. 姊妹湖
    [99.0121, 30.0122],
    [98.6811, 29.6841],
    [98.2411, 29.6121],
    [97.8411, 29.6741],
    [97.8322, 29.6644],
    [97.8122, 29.6722],
    [97.1085, 30.0812], // 8. 怒江七十二拐
    [96.9205, 30.0521], // 9. 八宿
    [96.7905, 29.4678], // 10. 然乌湖
    [96.9534, 29.2811], // 11. 来古冰川
    [96.3811, 29.6122],
    [95.7725, 29.8596], // 12. 波密
    [95.3122, 29.8911],
    [94.7312, 29.7422], // 13. 鲁朗林海
    [95.0354, 29.6322], // 14. 南迦巴瓦峰
    [94.3611, 29.6541], // 15. 林芝
    [93.5211, 29.8455],
    [92.8122, 29.9841],
    [92.0521, 29.8122],
    [91.6421, 29.7121],
    [91.1172, 29.6469]  // 16. 拉萨
  ],
  waypoints: [
    {
      id: "1",
      name: "成都天府广场 (318起点)",
      day: 1,
      time: "09:00",
      coordinate: [104.0665, 30.5723],
      description: "318此生必驾的零公里起点就在附近！我们从繁华温润的“天府之国”成都出发。带上行囊、检查车辆，一路上巴蜀盆地的青山绿水会慢慢过渡为白雪皑皑的世界屋脊。",
      category: "scenic",
      rating: 4.8,
      elevation: 500,
      distanceFromStart: 0,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1541060228005-70f25d3a3015?auto=format&fit=crop&w=1200&q=80",
          title: "烟火成都：锦里竹林夜色",
          description: "古色古香的红墙、高挂的红灯笼、竹林斑驳的光影，这里是318国道的起点站。",
          takenAt: "2026-06-01 08:15",
          camera: "Fujifilm X-T5, 35mm f/1.4",
          coordinates: [104.0665, 30.5723]
        },
        {
          url: "https://images.unsplash.com/photo-1527685216219-c7ded4667ee8?auto=format&fit=crop&w=1200&q=80",
          title: "老川茶馆的热茶香气",
          description: "出发前泡上一碗盖碗茶，感受天府之国特有的悠闲火候。",
          takenAt: "2026-06-01 08:45",
          camera: "Fujifilm X-T5, 18-55mm",
          coordinates: [104.0681, 30.5711]
        }
      ]
    },
    {
      id: "2",
      name: "折多山垭口 (康巴第一关)",
      day: 2,
      time: "11:30",
      coordinate: [101.8021, 30.0984],
      description: "翻越川藏线上的‘康巴第一关’——折多山垭口。海拔4298米，狂风呼啸，藏式彩绘牌楼巍然耸立，满山经幡漫天飞舞。这是整条路线上攀登的第一座高海拔大山，标志着我们正式走进了圣洁的藏区雪域。",
      category: "scenic",
      rating: 4.7,
      elevation: 4298,
      distanceFromStart: 320,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
          title: "折多山顶的漫天经幡",
          description: "海拔4298米，五彩经幡长廊在烈烈狂风中飞舞，传递着世人的祈福与心愿。",
          takenAt: "2026-06-02 11:35",
          camera: "Sony Alpha 7R V, 16-35mm F4 G",
          coordinates: [101.8021, 30.0984]
        }
      ]
    },
    {
      id: "3",
      name: "新都桥 (光与影的天堂)",
      day: 2,
      time: "16:45",
      coordinate: [101.5204, 30.0315],
      description: "新都桥是令人沉醉的‘摄影家天堂’。神奇的光线照射在层叠的远山、平缓的溪流、挺拔的金黄白桦林和散落的藏式民居间。牧童赶着牦牛穿过金色斜阳，随便一按快门都是宁静壮美的田园巨作。",
      category: "scenic",
      rating: 4.9,
      elevation: 3300,
      distanceFromStart: 395,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
          title: "金色新都桥的黄昏白桦林",
          description: "落日余晖洒在溪流平坦的浅滩上，藏式碉房反射出温暖祥和的光亮。",
          takenAt: "2026-06-02 17:15",
          camera: "Sony Alpha 7R V, 24-70mm GM",
          coordinates: [101.5204, 30.0315]
        }
      ]
    },
    {
      id: "4",
      name: "黑石城原木庄园",
      day: 2,
      time: "19:30",
      coordinate: [101.3522, 30.0123],
      description: "傍晚入住新都桥附近的地道藏族野奢客栈。客房内木雕厚重华丽，暖炉熊熊，屋外可望见神秘无垠的西藏神山。喝上一碗热气腾腾的青稞美酒，浑身暖和惬意。",
      category: "hotel",
      rating: 4.6,
      elevation: 3450,
      distanceFromStart: 440,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
          title: "温暖的藏房壁炉与牦牛热汤",
          description: "藏式原木雕花卧床，窗外便是雪山下的夜幕，静谧入梦。",
          takenAt: "2026-06-02 20:30",
          camera: "Sony Alpha 7R V, 16-35mm F4 G",
          coordinates: [101.3522, 30.0123]
        }
      ]
    },
    {
      id: "5",
      name: "理塘千户藏寨 (世界高城)",
      day: 3,
      time: "11:20",
      coordinate: [100.2705, 30.0381],
      description: "这里是世界上海拔最高的城市之一。在广袤的毛垭大草原边缘，千百年来静修于此。漫步在大理石铺就的藏寨老街上，阳光毫无遮挡地倾泻下来，勒通古镇的白塔、转经筒、藏族小伙明净清澈的笑脸，构成了最动人的画面。",
      category: "scenic",
      rating: 4.8,
      elevation: 4014,
      distanceFromStart: 590,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&w=1200&q=80",
          title: "勒通古城白塔晨曦",
          description: "无数经筒徐徐拉开，远道而来的信徒合十诵经，神山之下信仰永恒。",
          takenAt: "2026-06-03 10:15",
          camera: "Fujifilm X-T5, 23mm F1.4",
          coordinates: [100.2705, 30.0381]
        }
      ]
    },
    {
      id: "6",
      name: "巴塘姊妹湖 (雪山之眼)",
      day: 3,
      time: "16:00",
      coordinate: [99.3562, 30.1251],
      description: "姊妹湖位于海子山脚下，紧邻G318国道旁。当翻过冰封的垭口，两个并蒂相连的蔚蓝湖泊突兀呈现眼底。绿松石般的湖水清澈得可以直接看见水底的冰晶，背衬巍峨的雪峰，如同跌落人间的两颗绝美蓝宝石。",
      category: "scenic",
      rating: 4.8,
      elevation: 4680,
      distanceFromStart: 720,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
          title: "海子山姊妹湖雪峰倒影",
          description: "蓝天映衬在澄清的水面上，宁静得如同少女的纯真明眸。",
          takenAt: "2026-06-03 16:15",
          camera: "Fujifilm X-T5, 56mm f/1.2",
          coordinates: [99.3562, 30.1251]
        }
      ]
    },
    {
      id: "7",
      name: "怒江七十二拐 (天路奇迹)",
      day: 4,
      time: "14:15",
      coordinate: [97.1085, 30.0812],
      description: "又称川藏公路‘九十九道弯’，是川藏线上最险峻、最让人荡气回肠的奇迹路线。我们要从海拔4658米的业拉山垭口直坠到2740米的怒江河谷，二十多公里内近七十个激进的回头弯层叠盘旋在光秃山崖上，见证了修路先辈们无畏的意志。",
      category: "scenic",
      rating: 4.9,
      elevation: 4120,
      distanceFromStart: 960,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80",
          title: "俯瞰怒江七十二拐天路奇画",
          description: "极致的发卡弯线条如游龙般雕刻在陡峻干涸的岩壁峭壁间，壮怀激烈。",
          takenAt: "2026-06-04 14:40",
          camera: "Rolleiflex 606G, 80mm",
          coordinates: [97.1085, 30.0812]
        }
      ]
    },
    {
      id: "8",
      name: "然乌湖 (藏东明珠)",
      day: 5,
      time: "10:30",
      coordinate: [96.7905, 29.4678],
      description: "藏东最大的高山峡谷堰塞湖。然乌湖长条延绵，平滑如镜。周围云雾缭绕，葱郁的松林、盛开的杜鹃花与周围巍峨圣洁的雪山共同拥抱着这汪清澈的圣水。幽蓝倒影中，天地寂静无声。",
      category: "scenic",
      rating: 4.8,
      elevation: 3850,
      distanceFromStart: 1100,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1472214222541-d510753a8707?auto=format&fit=crop&w=1200&q=80",
          title: "然乌湖镜面雪峰倒影",
          description: "清晨水汽弥漫，松林与冰川仿佛画卷般重合在这汪镜花水月中。",
          takenAt: "2026-06-05 09:30",
          camera: "Sony Alpha 7R V, 24-70mm GM",
          coordinates: [96.7905, 29.4678]
        }
      ]
    },
    {
      id: "9",
      name: "来古冰川野奢木屋",
      day: 5,
      time: "18:30",
      coordinate: [96.9534, 29.2811],
      description: "住在紧靠来古冰川舌部的野奢民宿。推开全景落地窗，眼前就是泛着幽蓝荧光的古老冰川。夜晚在高原温暖厚实的暖气客栈里品尝热腾腾的藏式石锅鸡，仰星空璀璨、冰川幽深。",
      category: "hotel",
      rating: 4.7,
      elevation: 4050,
      distanceFromStart: 1140,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=1200&q=80",
          title: "来古冰川畔温暖卧榻",
          description: "窗外冰原在冰河纪的叹息中散发幽蓝，屋内温暖惬意，体验极致野奢。",
          takenAt: "2026-06-05 21:00",
          camera: "Sony Alpha 7R V, 16-35mm F4 G",
          coordinates: [96.9534, 29.2811]
        }
      ]
    },
    {
      id: "10",
      name: "鲁朗林海 (舌尖上的石锅鸡)",
      day: 6,
      time: "13:20",
      coordinate: [94.7312, 29.7422],
      description: "林芝鲁朗是一片典型的高原原始林海，两层山坡布满了高大挺拔的云杉松树，溪流清泉穿行在漫山遍原的野花甸中。这里不仅有媲美瑞士的纯净风光，更是著名的‘鲁朗石锅鸡’发源地！我们在石锅中炖足藏香鸡与灵芝山珍，飘香十里。",
      category: "dining",
      rating: 4.9,
      elevation: 3700,
      distanceFromStart: 1350,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
          title: "滋滋作响的高原石锅野菌藏鸡",
          description: "特制皂石古锅熬炖数小时，鸡汤奶白粘稠，滋补鲜美异常。",
          takenAt: "2026-06-06 13:30",
          camera: "Sony Alpha 7R V, 50mm F1.2",
          coordinates: [94.7312, 29.7422]
        },
        {
          url: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80",
          title: "漫步鲁朗的高山云杉林海",
          description: "林中云雾雾气缭绕，苔藓在古树上扎根，清爽欲醉的高原氧吧。",
          takenAt: "2026-06-06 15:00",
          camera: "Fujifilm X-T5, 18-55mm",
          coordinates: [94.7299, 29.7411]
        }
      ]
    },
    {
      id: "11",
      name: "南迦巴瓦峰 (神仙直刺长矛)",
      day: 6,
      time: "17:40",
      coordinate: [95.0354, 29.6322],
      description: "林芝最负盛名的神山，海拔7782米，被称为‘直刺天空的长矛’，因终年云迷雾锁，极难一睹真容，又被称为‘羞女峰’。在最经典的索松村观景台，当残阳如血染红高耸尖锐的三角形峰顶，那一瞬的神山大观令人永生难忘！",
      category: "scenic",
      rating: 5.0,
      elevation: 3120,
      distanceFromStart: 1380,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
          title: "真容难睹的南迦巴瓦峰夕照",
          description: "三角形雪尖直指苍穹，在血色斜晖中绽放，一生一遇的日落奇观。",
          takenAt: "2026-06-06 18:00",
          camera: "Sony Alpha 7R V, 70-200mm GM II",
          coordinates: [95.0354, 29.6322]
        }
      ]
    },
    {
      id: "12",
      name: "布达拉宫 & 药王山 (终极圣地)",
      day: 7,
      time: "15:30",
      coordinate: [91.1172, 29.6469],
      description: "历经七天两千公里的颠簸与攀越，我们的车辆缓缓驶入拉萨老城。圣殿布达拉宫金顶反射着高原澄澈的阳光，红白相间的雄伟殿宇拔地而起。站在药王山观景台拿着五十元纸币合影，听着转经人厚重的吟念声。此生必驾，圆满成功！",
      category: "scenic",
      rating: 5.0,
      elevation: 3650,
      distanceFromStart: 1800,
      photos: [
        {
          url: "https://images.unsplash.com/photo-1624314138470-5aa2f6e62c41?auto=format&fit=crop&w=1200&q=80",
          title: "泰然耸立的红白圣殿布达拉宫",
          description: "在拉萨日光城骄阳照射下，巍峨的布达拉宫神圣不可侵染，信仰的光亮照进心扉。",
          takenAt: "2026-06-07 16:45",
          camera: "Fujifilm X-T5, 23mm F1.4",
          coordinates: [91.1172, 29.6469]
        },
        {
          url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80",
          title: "大昭寺广场转经道袅袅桑烟",
          description: "朝圣者在这里虔诚五体投地，松柏桑烟在蔚蓝长空中绽放，带来无尽升华。",
          takenAt: "2026-06-07 18:20",
          camera: "Sony Alpha 7R V, 50mm F1.2",
          coordinates: [91.1202, 29.6455]
        }
      ]
    }
  ]
};
