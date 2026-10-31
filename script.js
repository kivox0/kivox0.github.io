/* ############################################################
   1. Язык страницы: английский / русский (был <script id="i18n">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ЯЗЫК СТРАНИЦЫ / PAGE LANGUAGE (English · Русский)
   Английский — основной язык; выбор запоминается в localStorage.
   - tr("русский текст", "English text") — текст на текущем языке;
   - статический текст: английский записан прямо в HTML, русский —
     рядом, в атрибутах data-ru (содержимое элемента) и
     data-ru-placeholder / data-ru-aria-label / data-ru-title;
   - AtomixI18n.on(fn) — fn вызывается после каждого переключения,
     и каждая часть страницы перерисовывает себя на новом языке.
   ============================================================ */
(function () {
  "use strict";
  const KEY = "atomix-lang";
  const ATTRS = ["placeholder", "aria-label", "title"];
  let lang = "en";
  try { const saved = localStorage.getItem(KEY); if (saved === "ru" || saved === "en") lang = saved; } catch (e) {}
  const listeners = [];

  function tr(ru, en) { return lang === "en" ? en : ru; }
  // склонение по числу: plural(5, "reaction", "reactions", "реакция", "реакции", "реакций")
  function plural(n, en1, enMany, ru1, ru2, ru5) {
    if (lang === "en") return n === 1 ? en1 : enMany;
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? ru1 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? ru2 : ru5;
  }
  function num(x, opts) { return x.toLocaleString(lang === "en" ? "en-US" : "ru-RU", opts); }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = tr("ATOMIX LAB — интерактивная таблица Менделеева и химические уравнения", "ATOMIX LAB — Interactive Periodic Table and Chemical Equations");
    document.querySelectorAll("[data-ru]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === "en" ? el.dataset.en : el.dataset.ru;
    });
    ATTRS.forEach(function (a) {
      document.querySelectorAll("[data-ru-" + a + "]").forEach(function (el) {
        if (!el.hasAttribute("data-en-" + a)) el.setAttribute("data-en-" + a, el.getAttribute(a) || "");
        el.setAttribute(a, el.getAttribute((lang === "en" ? "data-en-" : "data-ru-") + a));
      });
    });
    const btn = document.getElementById("lang-btn");
    if (btn) {
      btn.dataset.lang = lang;
      const word = btn.querySelector(".lang-word");
      word.textContent = tr("язык", "language");
      word.lang = lang;
      btn.setAttribute("aria-label", tr("Язык: русский. Переключить на английский", "Language: English. Switch to Russian"));
      btn.title = tr("Switch to English", "Переключить на русский");
    }
  }

  function set(next) {
    if ((next !== "en" && next !== "ru") || next === lang) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyStatic();
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }

  window.AtomixI18n = {
    get lang() { return lang; },
    tr: tr,
    plural: plural,
    num: num,
    set: set,
    on: function (fn) { listeners.push(fn); }
  };
  window.tr = tr;
  applyStatic();
  const btn = document.getElementById("lang-btn");
  if (btn) btn.addEventListener("click", function () { set(lang === "en" ? "ru" : "en"); });
})();

/* ############################################################
   2. Таблица Менделеева: данные элементов, сетка, фильтры, поиск, карточка, тема
   ############################################################ */
(function () {
// DATA START
const SYMS = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
const NAMES = "Водород Гелий Литий Бериллий Бор Углерод Азот Кислород Фтор Неон Натрий Магний Алюминий Кремний Фосфор Сера Хлор Аргон Калий Кальций Скандий Титан Ванадий Хром Марганец Железо Кобальт Никель Медь Цинк Галлий Германий Мышьяк Селен Бром Криптон Рубидий Стронций Иттрий Цирконий Ниобий Молибден Технеций Рутений Родий Палладий Серебро Кадмий Индий Олово Сурьма Теллур Йод Ксенон Цезий Барий Лантан Церий Празеодим Неодим Прометий Самарий Европий Гадолиний Тербий Диспрозий Гольмий Эрбий Тулий Иттербий Лютеций Гафний Тантал Вольфрам Рений Осмий Иридий Платина Золото Ртуть Таллий Свинец Висмут Полоний Астат Радон Франций Радий Актиний Торий Протактиний Уран Нептуний Плутоний Америций Кюрий Берклий Калифорний Эйнштейний Фермий Менделевий Нобелий Лоуренсий Резерфордий Дубний Сиборгий Борий Хассий Мейтнерий Дармштадтий Рентгений Коперниций Нихоний Флеровий Московий Ливерморий Теннессин Оганесон".split(" ");
const NAMES_EN = "Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminium Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Caesium Barium Lanthanum Cerium Praseodymium Neodymium Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson".split(" ");
const MASSES = "1,008 4,0026 6,94 9,0122 10,81 12,011 14,007 15,999 18,998 20,180 22,990 24,305 26,982 28,085 30,974 32,06 35,45 39,948 39,098 40,078 44,956 47,867 50,942 51,996 54,938 55,845 58,933 58,693 63,546 65,38 69,723 72,630 74,922 78,971 79,904 83,798 85,468 87,62 88,906 91,224 92,906 95,95 [98] 101,07 102,91 106,42 107,87 112,41 114,82 118,71 121,76 127,60 126,90 131,29 132,91 137,33 138,91 140,12 140,91 144,24 [145] 150,36 151,96 157,25 158,93 162,50 164,93 167,26 168,93 173,05 174,97 178,49 180,95 183,84 186,21 190,23 192,22 195,08 196,97 200,59 204,38 207,2 208,98 [209] [210] [222] [223] [226] [227] 232,04 231,04 238,03 [237] [244] [243] [247] [247] [251] [252] [257] [258] [259] [266] [267] [268] [269] [270] [277] [278] [281] [282] [285] [286] [289] [290] [293] [294] [294]".split(" ");
const GAS = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86];
const LIQUID = [35, 80];

function catOf(z) {
  if ([3, 11, 19, 37, 55, 87].includes(z)) return "alkali";
  if ([4, 12, 20, 38, 56, 88].includes(z)) return "alkaline";
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  if ([9, 17, 35, 53, 85].includes(z)) return "halogen";
  if ([2, 10, 18, 36, 54, 86].includes(z)) return "noble";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metalloid";
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return "nonmetal";
  if ([13, 31, 49, 50, 81, 82, 83, 84].includes(z)) return "post";
  if (z >= 109) return "unknown";
  return "transition";
}
function stOf(z) {
  if (GAS.includes(z)) return "gas";
  if (LIQUID.includes(z)) return "liquid";
  if (z >= 104) return "unknown";
  return "solid";
}
// grid row: 1 = group numbers, periods 1-7 = rows 2-8, rows 10-11 = lanthanides and actinides
// grid column: 1 = period numbers, groups 1-18 = columns 2-19
function posOf(z) {
  if (z === 1) return { p: 1, g: 1, row: 2, col: 2 };
  if (z === 2) return { p: 1, g: 18, row: 2, col: 19 };
  let p, g;
  if (z <= 4) { p = 2; g = z - 2; }
  else if (z <= 10) { p = 2; g = z + 8; }
  else if (z <= 12) { p = 3; g = z - 10; }
  else if (z <= 18) { p = 3; g = z; }
  else if (z <= 36) { p = 4; g = z - 18; }
  else if (z <= 54) { p = 5; g = z - 36; }
  else if (z <= 56) { p = 6; g = z - 54; }
  else if (z <= 71) { return { p: 6, g: null, row: 10, col: z - 56 + 3 }; }
  else if (z <= 86) { p = 6; g = z - 68; }
  else if (z <= 88) { p = 7; g = z - 86; }
  else if (z <= 103) { return { p: 7, g: null, row: 11, col: z - 88 + 3 }; }
  else { p = 7; g = z - 100; }
  return { p: p, g: g, row: p + 1, col: g + 1 };
}
const PROPS = [{"m":-259,"b":-253,"d":0.00008988,"en":2.2,"ea":72.769,"ie":1312,"r":53,"c":"1s1","s":"1s1","pr":0,"sh":[1]},{"m":-272,"b":-269,"d":0.0001786,"en":null,"ea":-48,"ie":2372.3,"r":31,"c":"1s2","s":"1s2","pr":0,"sh":[2]},{"m":181,"b":1330,"d":0.534,"en":0.98,"ea":59.6326,"ie":520.2,"r":167,"c":"1s2 2s1","s":"[He] 2s1","pr":0,"sh":[2,1]},{"m":1287,"b":2469,"d":1.85,"en":1.57,"ea":-48,"ie":899.5,"r":112,"c":"1s2 2s2","s":"[He] 2s2","pr":0,"sh":[2,2]},{"m":2076,"b":3927,"d":2.08,"en":2.04,"ea":26.989,"ie":800.6,"r":87,"c":"1s2 2s2 2p1","s":"[He] 2s2 2p1","pr":0,"sh":[2,3]},{"m":4327,"b":null,"d":1.821,"en":2.55,"ea":121.7763,"ie":1086.5,"r":67,"c":"1s2 2s2 2p2","s":"[He] 2s2 2p2","pr":0,"sh":[2,4]},{"m":-210,"b":-196,"d":0.001251,"en":3.04,"ea":-6.8,"ie":1402.3,"r":56,"c":"1s2 2s2 2p3","s":"[He] 2s2 2p3","pr":0,"sh":[2,5]},{"m":-219,"b":-183,"d":0.001429,"en":3.44,"ea":140.976,"ie":1313.9,"r":48,"c":"1s2 2s2 2p4","s":"[He] 2s2 2p4","pr":0,"sh":[2,6]},{"m":-220,"b":-188,"d":0.001696,"en":3.98,"ea":328.1649,"ie":1681,"r":42,"c":"1s2 2s2 2p5","s":"[He] 2s2 2p5","pr":0,"sh":[2,7]},{"m":-249,"b":-246,"d":0.0009002,"en":null,"ea":-116,"ie":2080.7,"r":38,"c":"1s2 2s2 2p6","s":"[He] 2s2 2p6","pr":0,"sh":[2,8]},{"m":97.8,"b":883,"d":0.968,"en":0.93,"ea":52.867,"ie":495.8,"r":190,"c":"1s2 2s2 2p6 3s1","s":"[Ne] 3s1","pr":0,"sh":[2,8,1]},{"m":650,"b":1090,"d":1.738,"en":1.31,"ea":-40,"ie":737.7,"r":145,"c":"1s2 2s2 2p6 3s2","s":"[Ne] 3s2","pr":0,"sh":[2,8,2]},{"m":660,"b":2470,"d":2.7,"en":1.61,"ea":41.762,"ie":577.5,"r":118,"c":"1s2 2s2 2p6 3s2 3p1","s":"[Ne] 3s2 3p1","pr":0,"sh":[2,8,3]},{"m":1414,"b":3265,"d":2.329,"en":1.9,"ea":134.0684,"ie":786.5,"r":111,"c":"1s2 2s2 2p6 3s2 3p2","s":"[Ne] 3s2 3p2","pr":0,"sh":[2,8,4]},{"m":44.2,"b":null,"d":1.823,"en":2.19,"ea":72.037,"ie":1011.8,"r":98,"c":"1s2 2s2 2p6 3s2 3p3","s":"[Ne] 3s2 3p3","pr":0,"sh":[2,8,5]},{"m":115,"b":445,"d":2.07,"en":2.58,"ea":200.4101,"ie":999.6,"r":88,"c":"1s2 2s2 2p6 3s2 3p4","s":"[Ne] 3s2 3p4","pr":0,"sh":[2,8,6]},{"m":-102,"b":-34,"d":0.0032,"en":3.16,"ea":348.575,"ie":1251.2,"r":79,"c":"1s2 2s2 2p6 3s2 3p5","s":"[Ne] 3s2 3p5","pr":0,"sh":[2,8,7]},{"m":-189,"b":-186,"d":0.001784,"en":null,"ea":-96,"ie":1520.6,"r":71,"c":"1s2 2s2 2p6 3s2 3p6","s":"[Ne] 3s2 3p6","pr":0,"sh":[2,8,8]},{"m":63.6,"b":759,"d":0.862,"en":0.82,"ea":48.383,"ie":418.8,"r":243,"c":"1s2 2s2 2p6 3s2 3p6 4s1","s":"[Ar] 4s1","pr":0,"sh":[2,8,8,1]},{"m":842,"b":1484,"d":1.55,"en":1,"ea":2.37,"ie":589.8,"r":194,"c":"1s2 2s2 2p6 3s2 3p6 4s2","s":"[Ar] 4s2","pr":0,"sh":[2,8,8,2]},{"m":1541,"b":2836,"d":2.985,"en":1.36,"ea":18,"ie":633.1,"r":184,"c":"1s2 2s2 2p6 3s2 3p6 3d1 4s2","s":"[Ar] 3d1 4s2","pr":0,"sh":[2,8,9,2]},{"m":1668,"b":3287,"d":4.506,"en":1.54,"ea":7.289,"ie":658.8,"r":176,"c":"1s2 2s2 2p6 3s2 3p6 3d2 4s2","s":"[Ar] 3d2 4s2","pr":0,"sh":[2,8,10,2]},{"m":1910,"b":3407,"d":6,"en":1.63,"ea":50.911,"ie":650.9,"r":171,"c":"1s2 2s2 2p6 3s2 3p6 3d3 4s2","s":"[Ar] 3d3 4s2","pr":0,"sh":[2,8,11,2]},{"m":1907,"b":2671,"d":7.19,"en":1.66,"ea":65.21,"ie":652.9,"r":166,"c":"1s2 2s2 2p6 3s2 3p6 3d5 4s1","s":"[Ar] 3d5 4s1","pr":0,"sh":[2,8,13,1]},{"m":1246,"b":2061,"d":7.21,"en":1.55,"ea":-50,"ie":717.3,"r":161,"c":"1s2 2s2 2p6 3s2 3p6 3d5 4s2","s":"[Ar] 3d5 4s2","pr":0,"sh":[2,8,13,2]},{"m":1538,"b":2861,"d":7.874,"en":1.83,"ea":14.785,"ie":762.5,"r":156,"c":"1s2 2s2 2p6 3s2 3p6 3d6 4s2","s":"[Ar] 3d6 4s2","pr":0,"sh":[2,8,14,2]},{"m":1495,"b":2927,"d":8.9,"en":1.88,"ea":63.898,"ie":760.4,"r":152,"c":"1s2 2s2 2p6 3s2 3p6 3d7 4s2","s":"[Ar] 3d7 4s2","pr":0,"sh":[2,8,15,2]},{"m":1455,"b":2730,"d":8.908,"en":1.91,"ea":111.65,"ie":737.1,"r":149,"c":"1s2 2s2 2p6 3s2 3p6 3d8 4s2","s":"[Ar] 3d8 4s2","pr":0,"sh":[2,8,16,2]},{"m":1085,"b":2562,"d":8.96,"en":1.9,"ea":119.235,"ie":745.5,"r":145,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s1","s":"[Ar] 3d10 4s1","pr":0,"sh":[2,8,18,1]},{"m":420,"b":907,"d":7.14,"en":1.65,"ea":-58,"ie":906.4,"r":142,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2","s":"[Ar] 3d10 4s2","pr":0,"sh":[2,8,18,2]},{"m":29.8,"b":2400,"d":5.91,"en":1.81,"ea":41,"ie":578.8,"r":136,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p1","s":"[Ar] 3d10 4s2 4p1","pr":0,"sh":[2,8,18,3]},{"m":938,"b":2833,"d":5.323,"en":2.01,"ea":118.9352,"ie":762,"r":125,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p2","s":"[Ar] 3d10 4s2 4p2","pr":0,"sh":[2,8,18,4]},{"m":817,"b":null,"d":5.727,"en":2.18,"ea":77.65,"ie":947,"r":114,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p3","s":"[Ar] 3d10 4s2 4p3","pr":0,"sh":[2,8,18,5]},{"m":221,"b":685,"d":4.81,"en":2.55,"ea":194.9587,"ie":941,"r":103,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p4","s":"[Ar] 3d10 4s2 4p4","pr":0,"sh":[2,8,18,6]},{"m":-7.3,"b":58.9,"d":3.1028,"en":2.96,"ea":324.537,"ie":1139.9,"r":94,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p5","s":"[Ar] 3d10 4s2 4p5","pr":0,"sh":[2,8,18,7]},{"m":-157,"b":-153,"d":0.003749,"en":3,"ea":-96,"ie":1350.8,"r":88,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6","s":"[Ar] 3d10 4s2 4p6","pr":0,"sh":[2,8,18,8]},{"m":39.3,"b":688,"d":1.532,"en":0.82,"ea":46.884,"ie":403,"r":265,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 5s1","s":"[Kr] 5s1","pr":0,"sh":[2,8,18,8,1]},{"m":777,"b":1377,"d":2.64,"en":0.95,"ea":5.023,"ie":549.5,"r":219,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 5s2","s":"[Kr] 5s2","pr":0,"sh":[2,8,18,8,2]},{"m":1526,"b":2930,"d":4.472,"en":1.22,"ea":29.6,"ie":600,"r":212,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d1 5s2","s":"[Kr] 4d1 5s2","pr":0,"sh":[2,8,18,9,2]},{"m":1855,"b":4377,"d":6.52,"en":1.33,"ea":41.806,"ie":640.1,"r":206,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d2 5s2","s":"[Kr] 4d2 5s2","pr":0,"sh":[2,8,18,10,2]},{"m":2477,"b":4744,"d":8.57,"en":1.6,"ea":88.516,"ie":652.1,"r":198,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d4 5s1","s":"[Kr] 4d4 5s1","pr":0,"sh":[2,8,18,12,1]},{"m":2623,"b":4639,"d":10.28,"en":2.16,"ea":72.1,"ie":684.3,"r":190,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d5 5s1","s":"[Kr] 4d5 5s1","pr":0,"sh":[2,8,18,13,1]},{"m":2157,"b":4265,"d":11,"en":1.9,"ea":53,"ie":702,"r":183,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d5 5s2","s":"[Kr] 4d5 5s2","pr":0,"sh":[2,8,18,13,2]},{"m":2334,"b":4150,"d":12.45,"en":2.2,"ea":100.96,"ie":710.2,"r":178,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d7 5s1","s":"[Kr] 4d7 5s1","pr":0,"sh":[2,8,18,15,1]},{"m":1964,"b":3695,"d":12.41,"en":2.28,"ea":110.27,"ie":719.7,"r":173,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d8 5s1","s":"[Kr] 4d8 5s1","pr":0,"sh":[2,8,18,16,1]},{"m":1555,"b":2963,"d":12.023,"en":2.2,"ea":54.24,"ie":804.4,"r":169,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10","s":"[Kr] 4d10","pr":0,"sh":[2,8,18,18]},{"m":962,"b":2162,"d":10.49,"en":1.93,"ea":125.862,"ie":731,"r":165,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s1","s":"[Kr] 4d10 5s1","pr":0,"sh":[2,8,18,18,1]},{"m":321,"b":767,"d":8.65,"en":1.69,"ea":-68,"ie":867.8,"r":161,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2","s":"[Kr] 4d10 5s2","pr":0,"sh":[2,8,18,18,2]},{"m":157,"b":2072,"d":7.31,"en":1.78,"ea":37.043,"ie":558.3,"r":156,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p1","s":"[Kr] 4d10 5s2 5p1","pr":0,"sh":[2,8,18,18,3]},{"m":232,"b":2602,"d":7.365,"en":1.96,"ea":107.2984,"ie":708.6,"r":145,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p2","s":"[Kr] 4d10 5s2 5p2","pr":0,"sh":[2,8,18,18,4]},{"m":631,"b":1635,"d":6.697,"en":2.05,"ea":101.059,"ie":834,"r":133,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p3","s":"[Kr] 4d10 5s2 5p3","pr":0,"sh":[2,8,18,18,5]},{"m":450,"b":988,"d":6.24,"en":2.1,"ea":190.161,"ie":869.3,"r":123,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p4","s":"[Kr] 4d10 5s2 5p4","pr":0,"sh":[2,8,18,18,6]},{"m":114,"b":184,"d":4.933,"en":2.66,"ea":295.1531,"ie":1008.4,"r":115,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p5","s":"[Kr] 4d10 5s2 5p5","pr":0,"sh":[2,8,18,18,7]},{"m":-112,"b":-108,"d":0.005894,"en":2.6,"ea":-77,"ie":1170.4,"r":108,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6","s":"[Kr] 4d10 5s2 5p6","pr":0,"sh":[2,8,18,18,8]},{"m":28.6,"b":671,"d":1.93,"en":0.79,"ea":45.505,"ie":375.7,"r":298,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 6s1","s":"[Xe] 6s1","pr":0,"sh":[2,8,18,18,8,1]},{"m":727,"b":1845,"d":3.51,"en":0.89,"ea":13.954,"ie":502.9,"r":253,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 6s2","s":"[Xe] 6s2","pr":0,"sh":[2,8,18,18,8,2]},{"m":920,"b":3464,"d":6.162,"en":1.1,"ea":53,"ie":538.1,"r":226,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 5d1 6s2","s":"[Xe] 5d1 6s2","pr":0,"sh":[2,8,18,18,9,2]},{"m":795,"b":3443,"d":6.77,"en":1.12,"ea":55,"ie":534.4,"r":210,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f1 5s2 5p6 5d1 6s2","s":"[Xe] 4f1 5d1 6s2","pr":0,"sh":[2,8,18,19,9,2]},{"m":935,"b":3130,"d":6.77,"en":1.13,"ea":93,"ie":527,"r":247,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f3 5s2 5p6 6s2","s":"[Xe] 4f3 6s2","pr":0,"sh":[2,8,18,21,8,2]},{"m":1024,"b":3074,"d":7.01,"en":1.14,"ea":184.87,"ie":533.1,"r":206,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f4 5s2 5p6 6s2","s":"[Xe] 4f4 6s2","pr":0,"sh":[2,8,18,22,8,2]},{"m":1042,"b":3000,"d":7.26,"en":1.13,"ea":12.45,"ie":540,"r":205,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f5 5s2 5p6 6s2","s":"[Xe] 4f5 6s2","pr":0,"sh":[2,8,18,23,8,2]},{"m":1072,"b":1900,"d":7.52,"en":1.17,"ea":15.63,"ie":544.5,"r":238,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f6 5s2 5p6 6s2","s":"[Xe] 4f6 6s2","pr":0,"sh":[2,8,18,24,8,2]},{"m":826,"b":1529,"d":5.264,"en":1.2,"ea":11.2,"ie":547.1,"r":231,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f7 5s2 5p6 6s2","s":"[Xe] 4f7 6s2","pr":0,"sh":[2,8,18,25,8,2]},{"m":1312,"b":3000,"d":7.9,"en":1.2,"ea":13.22,"ie":593.4,"r":233,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f7 5s2 5p6 5d1 6s2","s":"[Xe] 4f7 5d1 6s2","pr":0,"sh":[2,8,18,25,9,2]},{"m":1356,"b":3123,"d":8.23,"en":1.1,"ea":112.4,"ie":565.8,"r":225,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f9 5s2 5p6 6s2","s":"[Xe] 4f9 6s2","pr":0,"sh":[2,8,18,27,8,2]},{"m":1407,"b":2567,"d":8.54,"en":1.22,"ea":33.96,"ie":573,"r":228,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f10 5s2 5p6 6s2","s":"[Xe] 4f10 6s2","pr":0,"sh":[2,8,18,28,8,2]},{"m":1461,"b":2600,"d":8.79,"en":1.23,"ea":32.61,"ie":581,"r":226,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f11 5s2 5p6 6s2","s":"[Xe] 4f11 6s2","pr":0,"sh":[2,8,18,29,8,2]},{"m":1529,"b":2868,"d":9.066,"en":1.24,"ea":30.1,"ie":589.3,"r":226,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f12 5s2 5p6 6s2","s":"[Xe] 4f12 6s2","pr":0,"sh":[2,8,18,30,8,2]},{"m":1545,"b":1950,"d":9.32,"en":1.25,"ea":99,"ie":596.7,"r":222,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f13 5s2 5p6 6s2","s":"[Xe] 4f13 6s2","pr":0,"sh":[2,8,18,31,8,2]},{"m":824,"b":1196,"d":6.9,"en":1.1,"ea":-1.93,"ie":603.4,"r":222,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 6s2","s":"[Xe] 4f14 6s2","pr":0,"sh":[2,8,18,32,8,2]},{"m":1652,"b":3402,"d":9.841,"en":1.27,"ea":33.4,"ie":523.5,"r":217,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d1 6s2","s":"[Xe] 4f14 5d1 6s2","pr":0,"sh":[2,8,18,32,9,2]},{"m":2233,"b":4603,"d":13.31,"en":1.3,"ea":17.18,"ie":658.5,"r":208,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d2 6s2","s":"[Xe] 4f14 5d2 6s2","pr":0,"sh":[2,8,18,32,10,2]},{"m":3017,"b":5458,"d":16.69,"en":1.5,"ea":31,"ie":761,"r":200,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d3 6s2","s":"[Xe] 4f14 5d3 6s2","pr":0,"sh":[2,8,18,32,11,2]},{"m":3422,"b":5930,"d":19.25,"en":2.36,"ea":78.76,"ie":770,"r":193,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d4 6s2","s":"[Xe] 4f14 5d4 6s2","pr":0,"sh":[2,8,18,32,12,2]},{"m":3186,"b":5596,"d":21.02,"en":1.9,"ea":5.8273,"ie":760,"r":188,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d5 6s2","s":"[Xe] 4f14 5d5 6s2","pr":0,"sh":[2,8,18,32,13,2]},{"m":3033,"b":5012,"d":22.59,"en":2.2,"ea":103.99,"ie":840,"r":185,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d6 6s2","s":"[Xe] 4f14 5d6 6s2","pr":0,"sh":[2,8,18,32,14,2]},{"m":2446,"b":4130,"d":22.56,"en":2.2,"ea":150.94,"ie":880,"r":180,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d7 6s2","s":"[Xe] 4f14 5d7 6s2","pr":0,"sh":[2,8,18,32,15,2]},{"m":1768,"b":3825,"d":21.45,"en":2.28,"ea":205.041,"ie":870,"r":177,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d9 6s1","s":"[Xe] 4f14 5d9 6s1","pr":0,"sh":[2,8,18,32,17,1]},{"m":1064,"b":2970,"d":19.3,"en":2.54,"ea":222.747,"ie":890.1,"r":174,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s1","s":"[Xe] 4f14 5d10 6s1","pr":0,"sh":[2,8,18,32,18,1]},{"m":-38.8,"b":357,"d":13.534,"en":2,"ea":-48,"ie":1007.1,"r":171,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2","s":"[Xe] 4f14 5d10 6s2","pr":0,"sh":[2,8,18,32,18,2]},{"m":304,"b":1473,"d":11.85,"en":1.62,"ea":36.4,"ie":589.4,"r":156,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p1","s":"[Xe] 4f14 5d10 6s2 6p1","pr":0,"sh":[2,8,18,32,18,3]},{"m":327,"b":1749,"d":11.34,"en":1.87,"ea":34.4204,"ie":715.6,"r":154,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p2","s":"[Xe] 4f14 5d10 6s2 6p2","pr":0,"sh":[2,8,18,32,18,4]},{"m":272,"b":1564,"d":9.78,"en":2.02,"ea":90.924,"ie":703,"r":143,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p3","s":"[Xe] 4f14 5d10 6s2 6p3","pr":0,"sh":[2,8,18,32,18,5]},{"m":254,"b":962,"d":9.196,"en":2,"ea":136,"ie":812.1,"r":135,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p4","s":"[Xe] 4f14 5d10 6s2 6p4","pr":0,"sh":[2,8,18,32,18,6]},{"m":302,"b":337,"d":6.35,"en":2.2,"ea":233,"ie":899.003,"r":127,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p5","s":"[Xe] 4f14 5d10 6s2 6p5","pr":0,"sh":[2,8,18,32,18,7]},{"m":-71.1,"b":-61.6,"d":0.00973,"en":2.2,"ea":-68,"ie":1037,"r":120,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6","s":"[Xe] 4f14 5d10 6s2 6p6","pr":0,"sh":[2,8,18,32,18,8]},{"m":26.9,"b":677,"d":1.87,"en":0.79,"ea":46.89,"ie":380,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6 7s1","s":"[Rn] 7s1","pr":0,"sh":[2,8,18,32,18,8,1]},{"m":960,"b":1737,"d":5.5,"en":0.9,"ea":9.6485,"ie":509.3,"r":215,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6 7s2","s":"[Rn] 7s2","pr":0,"sh":[2,8,18,32,18,8,2]},{"m":1227,"b":3227,"d":10,"en":1.1,"ea":33.77,"ie":499,"r":195,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6 6d1 7s2","s":"[Rn] 6d1 7s2","pr":0,"sh":[2,8,18,32,18,9,2]},{"m":1750,"b":4788,"d":11.724,"en":1.3,"ea":112.72,"ie":587,"r":180,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 6s2 6p6 6d2 7s2","s":"[Rn] 6d2 7s2","pr":0,"sh":[2,8,18,32,18,10,2]},{"m":1568,"b":4027,"d":15.37,"en":1.5,"ea":53.03,"ie":568,"r":180,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f2 6s2 6p6 6d1 7s2","s":"[Rn] 5f2 6d1 7s2","pr":0,"sh":[2,8,18,32,20,9,2]},{"m":1132,"b":4131,"d":19.1,"en":1.38,"ea":50.94,"ie":597.6,"r":175,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f3 6s2 6p6 6d1 7s2","s":"[Rn] 5f3 6d1 7s2","pr":0,"sh":[2,8,18,32,21,9,2]},{"m":639,"b":4174,"d":20.45,"en":1.36,"ea":45.85,"ie":604.5,"r":175,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f4 6s2 6p6 6d1 7s2","s":"[Rn] 5f4 6d1 7s2","pr":0,"sh":[2,8,18,32,22,9,2]},{"m":639,"b":3232,"d":19.816,"en":1.28,"ea":-48.33,"ie":584.7,"r":175,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f6 6s2 6p6 7s2","s":"[Rn] 5f6 7s2","pr":0,"sh":[2,8,18,32,24,8,2]},{"m":1176,"b":2607,"d":12,"en":1.13,"ea":9.93,"ie":578,"r":175,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f7 6s2 6p6 7s2","s":"[Rn] 5f7 7s2","pr":0,"sh":[2,8,18,32,25,8,2]},{"m":1340,"b":3110,"d":13.51,"en":1.28,"ea":27.17,"ie":581,"r":176,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f7 6s2 6p6 6d1 7s2","s":"[Rn] 5f7 6d1 7s2","pr":0,"sh":[2,8,18,32,25,9,2]},{"m":986,"b":2627,"d":14.78,"en":1.3,"ea":-165.24,"ie":601,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f9 6s2 6p6 7s2","s":"[Rn] 5f9 7s2","pr":0,"sh":[2,8,18,32,27,8,2]},{"m":900,"b":1470,"d":15.1,"en":1.3,"ea":-97.31,"ie":608,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f10 6s2 6p6 7s2","s":"[Rn] 5f10 7s2","pr":0,"sh":[2,8,18,32,28,8,2]},{"m":860,"b":996,"d":8.84,"en":1.3,"ea":-28.6,"ie":619,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f11 6s2 6p6 7s2","s":"[Rn] 5f11 7s2","pr":0,"sh":[2,8,18,32,29,8,2]},{"m":1527,"b":null,"d":null,"en":1.3,"ea":33.96,"ie":627,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f12 6s2 6p6 7s2","s":"[Rn] 5f12 7s2","pr":0,"sh":[2,8,18,32,30,8,2]},{"m":827,"b":null,"d":null,"en":1.3,"ea":93.91,"ie":635,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f13 6s2 6p6 7s2","s":"[Rn] 5f13 7s2","pr":0,"sh":[2,8,18,32,31,8,2]},{"m":827,"b":null,"d":null,"en":1.3,"ea":-223.22,"ie":642,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 7s2","s":"[Rn] 5f14 7s2","pr":0,"sh":[2,8,18,32,32,8,2]},{"m":1627,"b":null,"d":null,"en":1.3,"ea":-30.04,"ie":470,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 7s2 7p1","s":"[Rn] 5f14 7s2 7p1","pr":0,"sh":[2,8,18,32,32,8,3]},{"m":2127,"b":5527,"d":23.2,"en":null,"ea":null,"ie":580,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d2 7s2","s":"[Rn] 5f14 6d2 7s2","pr":0,"sh":[2,8,18,32,32,10,2]},{"m":null,"b":null,"d":29.3,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d3 7s2","s":"[Rn] 5f14 6d3 7s2","pr":1,"sh":[2,8,18,32,32,11,2]},{"m":null,"b":null,"d":35,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d4 7s2","s":"[Rn] 5f14 6d4 7s2","pr":1,"sh":[2,8,18,32,32,12,2]},{"m":null,"b":null,"d":37.1,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d5 7s2","s":"[Rn] 5f14 6d5 7s2","pr":1,"sh":[2,8,18,32,32,13,2]},{"m":null,"b":null,"d":40.7,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d6 7s2","s":"[Rn] 5f14 6d6 7s2","pr":1,"sh":[2,8,18,32,32,14,2]},{"m":null,"b":null,"d":37.4,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d7 7s2","s":"[Rn] 5f14 6d7 7s2","pr":1,"sh":[2,8,18,32,32,15,2]},{"m":null,"b":null,"d":34.8,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d8 7s2","s":"[Rn] 5f14 6d9 7s1","pr":1,"sh":[2,8,18,32,32,16,2]},{"m":null,"b":null,"d":28.7,"en":null,"ea":151,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d9 7s2","s":"[Rn] 5f14 6d10 7s1","pr":1,"sh":[2,8,18,32,32,17,2]},{"m":9.9,"b":66.9,"d":14,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2","s":"[Rn] 5f14 6d10 7s2","pr":1,"sh":[2,8,18,32,32,18,2]},{"m":427,"b":1157,"d":16,"en":null,"ea":66.6,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p1","s":"[Rn] 5f14 6d10 7s2 7p1","pr":1,"sh":[2,8,18,32,32,18,3]},{"m":66.9,"b":147,"d":14,"en":null,"ea":null,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p2","s":"[Rn] 5f14 6d10 7s2 7p2","pr":1,"sh":[2,8,18,32,32,18,4]},{"m":397,"b":1127,"d":13.5,"en":null,"ea":35.3,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p3","s":"[Rn] 5f14 6d10 7s2 7p3","pr":1,"sh":[2,8,18,32,32,18,5]},{"m":436,"b":812,"d":12.9,"en":null,"ea":74.9,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p4","s":"[Rn] 5f14 6d10 7s2 7p4","pr":1,"sh":[2,8,18,32,32,18,6]},{"m":450,"b":610,"d":7.17,"en":null,"ea":165.9,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p5","s":"[Rn] 5f14 6d10 7s2 7p5","pr":1,"sh":[2,8,18,32,32,18,7]},{"m":null,"b":76.9,"d":4.95,"en":null,"ea":5.40318,"ie":null,"r":null,"c":"1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 4f14 5s2 5p6 5d10 5f14 6s2 6p6 6d10 7s2 7p6","s":"[Rn] 5f14 6d10 7s2 7p6","pr":1,"sh":[2,8,18,32,32,18,8]}];
// DATA END
// эти данные нужны составителю уравнений (он подключается ниже отдельным скриптом)
window.AtomixTable = { symbols: SYMS, names: NAMES, namesEn: NAMES_EN, masses: MASSES };
const I18N = window.AtomixI18n;
const tr = I18N.tr;

// [ключ, по-русски, по-английски]
const CATS = [
  ["alkali", "Щелочные металлы", "Alkali metals"],
  ["alkaline", "Щёлочноземельные металлы", "Alkaline earth metals"],
  ["transition", "Переходные металлы", "Transition metals"],
  ["post", "Постпереходные металлы", "Post-transition metals"],
  ["metalloid", "Металлоиды", "Metalloids"],
  ["nonmetal", "Неметаллы", "Nonmetals"],
  ["halogen", "Галогены", "Halogens"],
  ["noble", "Благородные газы", "Noble gases"],
  ["lanthanide", "Лантаноиды", "Lanthanides"],
  ["actinide", "Актиноиды", "Actinides"],
  ["unknown", "Свойства не изучены", "Properties unknown"]
];
const STATES = [
  ["gas", "Газы", "Gases"],
  ["liquid", "Жидкости", "Liquids"],
  ["solid", "Твёрдые тела", "Solids"],
  ["unknown", "Нет данных", "No data"]
];
const CAT_NAME = {};
CATS.forEach(function (c) { CAT_NAME[c[0]] = c; });
const ST_NAME = { gas: ["Газ", "Gas"], liquid: ["Жидкость", "Liquid"], solid: ["Твёрдое тело", "Solid"], unknown: ["Нет данных", "No data"] };
function catName(cat) { return tr(CAT_NAME[cat][1], CAT_NAME[cat][2]); }
function stName(st) { return tr(ST_NAME[st][0], ST_NAME[st][1]); }

const els = SYMS.map(function (sym, i) {
  const z = i + 1;
  return Object.assign({ z: z, sym: sym, nameRu: NAMES[i], nameEn: NAMES_EN[i], mass: MASSES[i], cat: catOf(z), st: stOf(z), prop: PROPS[i] }, posOf(z));
});
function elName(e) { return tr(e.nameRu, e.nameEn); }
// масса: в русском тексте десятичная запятая, в английском — точка
function massText(e) { return tr(e.mass, e.mass.replace(",", ".")); }

const state = { cat: null, st: null, mode: "props", q: "" };
const grid = document.getElementById("grid");

// build the grid
let html = "";
for (let g = 1; g <= 18; g++) html += '<div class="glabel" style="grid-row:1;grid-column:' + (g + 1) + '">' + g + "</div>";
for (let p = 1; p <= 7; p++) html += '<div class="plabel" style="grid-row:' + (p + 1) + ';grid-column:1">' + p + "</div>";
html += '<div class="detail detail--grid" aria-live="polite"></div>';
html += '<div class="ph c-lanthanide" data-ph="lanthanide" style="grid-row:7;grid-column:4">57–71</div>';
html += '<div class="ph c-actinide" data-ph="actinide" style="grid-row:8;grid-column:4">89–103</div>';
html += '<div class="flab" data-flab="lanthanide" style="grid-row:10;grid-column:1 / 4"></div>';
html += '<div class="flab" data-flab="actinide" style="grid-row:11;grid-column:1 / 4"></div>';
els.forEach(function (e) {
  html += '<button type="button" class="el c-' + e.cat + '" data-z="' + e.z + '" style="grid-row:' + e.row + ";grid-column:" + e.col + '">' +
    '<span class="n">' + e.z + '</span><span class="s">' + e.sym + '</span><span class="nm"></span></button>';
});
grid.innerHTML = html;
els.forEach(function (e) { e.node = grid.querySelector('[data-z="' + e.z + '"]'); e.nmNode = e.node.querySelector(".nm"); });
const phs = Array.from(grid.querySelectorAll(".ph"));
// названия элементов на клетках — на текущем языке
function labelGrid() {
  els.forEach(function (e) {
    e.nmNode.textContent = elName(e);
    e.node.setAttribute("aria-label", elName(e) + tr(", номер ", ", number ") + e.z);
  });
  grid.querySelectorAll("[data-flab]").forEach(function (f) { f.textContent = catName(f.dataset.flab); });
}
labelGrid();

// build the filter chips
function count(key, val) { return els.filter(function (e) { return e[key] === val; }).length; }
document.getElementById("cat-chips").innerHTML = CATS.map(function (c) {
  return '<button type="button" class="chip cat c-' + c[0] + '" data-cat="' + c[0] + '" aria-pressed="false"><i class="dot"></i><span class="cl"></span><span class="n">' + count("cat", c[0]) + "</span></button>";
}).join("");
document.getElementById("st-chips").innerHTML = STATES.map(function (s) {
  return '<button type="button" class="chip" data-st="' + s[0] + '" aria-pressed="false"><span class="cl"></span><span class="n">' + count("st", s[0]) + "</span></button>";
}).join("");
function labelChips() {
  document.querySelectorAll("#cat-chips .chip").forEach(function (b) { b.querySelector(".cl").textContent = catName(b.dataset.cat); });
  document.querySelectorAll("#st-chips .chip").forEach(function (b) {
    const st = STATES.find(function (x) { return x[0] === b.dataset.st; });
    b.querySelector(".cl").textContent = tr(st[1], st[2]);
  });
}
labelChips();

const chipEls = Array.from(document.querySelectorAll(".chip"));
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");

function apply() {
  const active = !!(state.cat || state.st || state.q);
  let n = 0;
  els.forEach(function (e) {
    const hit = (!state.cat || e.cat === state.cat) && (!state.st || e.st === state.st) && matchQ(e);
    if (hit) n++;
    e.node.classList.toggle("hit", active && hit);
    e.node.classList.toggle("dim", active && !hit);
  });
  phs.forEach(function (ph) {
    const hit = (!state.cat || state.cat === ph.dataset.ph) && !state.st && !state.q;
    ph.classList.toggle("dim", active && !hit);
  });
  chipEls.forEach(function (c) {
    const on = c.dataset.mode ? c.dataset.mode === state.mode : c.dataset.cat ? c.dataset.cat === state.cat : c.dataset.st === state.st;
    c.setAttribute("aria-pressed", on ? "true" : "false");
  });
  statusEl.textContent = active
    ? (n === 0 ? (state.q && !els.some(matchQ) ? "" : tr("Ничего не найдено", "Nothing found")) : tr("Подсвечено: " + n + " из 118 элементов", "Highlighted: " + n + " of 118 elements"))
    : tr("Показаны все категории", "All categories shown");
  resetBtn.hidden = !active;
  searchFeedback();
}

const NA = '<span class="na">—</span>';
function nf(x, o) { return I18N.num(x, o); }
function num(x, max) { return nf(x, { maximumFractionDigits: max }); }
function unit(u) { return '<span class="u">' + u + "</span>"; }
function fact(label, html, cls) {
  return "<div" + (cls ? ' class="' + cls + '"' : "") + "><dt>" + label + "</dt><dd>" + html + "</dd></div>";
}
function density(e) {
  const d = e.prop.d;
  if (d === null) return NA;
  return e.st === "gas"
    ? nf(d * 1000, { maximumSignificantDigits: 4 }) + unit(tr("г/л", "g/L"))
    : nf(d, { maximumSignificantDigits: 4 }) + unit(tr("г/см³", "g/cm³"));
}

// вид «Свойства»
function propsHTML(e) {
  const p = e.prop;
  // у элементов 104–118 ничего не измерено, их значения расчётные, поэтому перед числом стоит «≈»
  const ap = function (html) { return html === NA || e.st !== "unknown" ? html : "≈ " + html; };
  const temp = function (x) { return x === null ? NA : ap(num(x, e.st === "unknown" ? 0 : 1) + unit("°C")); };
  const kj = function (x) { return x === null ? NA : ap(num(x, e.st === "unknown" ? 0 : 1) + unit(tr("кДж/моль", "kJ/mol"))); };
  return '<dl class="facts">' +
    fact(tr("Масса, а. е. м.", "Atomic mass, u"), massText(e)) +
    fact(tr("При 20 °C", "At 20 °C"), stName(e.st)) +
    fact(tr("Группа · период", "Group · period"), (e.g === null ? "—" : e.g) + " · " + e.p) +
    fact(tr("Плотность", "Density"), ap(density(e))) +
    fact(tr("Плавление", "Melting point"), temp(p.m)) +
    fact(tr("Кипение", "Boiling point"), temp(p.b)) +
    fact(tr("Электро&shy;отрицательность", "Electro&shy;negativity"), p.en === null ? NA : ap(num(p.en, 2))) +
    fact(tr("Сродство к электрону", "Electron affinity"), kj(p.ea)) +
    fact(tr("Энергия ионизации", "Ionization energy"), kj(p.ie)) +
    fact(tr("Радиус атома", "Atomic radius"), p.r === null ? NA : ap(num(p.r, 0) + unit(tr("пм", "pm")))) +
    fact(tr("Электронов в слоях", "Electrons per shell"), p.sh.join(" · "), "wide") +
    "</dl>";
}

// вид «Электроны»: формула со степенями и схема слоёв
function formula(str) {
  return str.split(" ").map(function (t) {
    const m = t.match(/^(\d[spdf])(\d+)$/);
    return '<span class="o">' + (m ? m[1] + "<sup>" + m[2] + "</sup>" : t) + "</span>";
  }).join(" ");
}
function block(label, html, strong) {
  return '<div class="blk"><div class="lab">' + label + '</div><div class="val' + (strong ? " strong" : "") + '">' + html + "</div></div>";
}
function elecHTML(e) {
  const p = e.prop;
  const same = p.s === p.c;
  const note = p.pr ? tr(" (расчётная)", " (predicted)") : "";
  return '<div class="blocks">' +
    (same ? "" : block(tr("Сокращённая формула", "Short configuration") + note, formula(p.s), true)) +
    block(tr("Электронная формула", "Electron configuration") + (same ? note : ""), formula(p.c), same) +
    block(tr("Электронов в слоях", "Electrons per shell"), p.sh.join(" · ")) +
    "</div>";
}
function bohr(sh) {
  let svg = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="nuc" cx="50" cy="50" r="5"/>';
  const step = sh.length > 1 ? Math.min(12, 36 / (sh.length - 1)) : 0;
  const dot = sh.length <= 4 ? 2.1 : 1.7;
  sh.forEach(function (n, i) {
    const r = sh.length > 1 ? 10 + i * step : 20;
    svg += '<circle class="ring" cx="50" cy="50" r="' + r + '"/>';
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI - Math.PI / 2 + (i % 2 ? Math.PI / n : 0);
      svg += '<circle class="ed" cx="' + (50 + r * Math.cos(a)).toFixed(2) + '" cy="' + (50 + r * Math.sin(a)).toFixed(2) + '" r="' + dot + '"/>';
    }
  });
  return svg + "</svg>";
}

function detailHTML(e) {
  const elec = state.mode === "elec";
  const left = '<div class="big c-' + e.cat + '"><span class="z">' + e.z + "</span>" +
    (elec ? bohr(e.prop.sh) : '<span class="sym">' + e.sym + "</span>") + "</div>";
  return left +
    '<div class="info"><div class="head"><span class="hsym c-' + e.cat + '"><i>' + e.z + "</i>" + e.sym + "</span><h2>" + elName(e) +
    '</h2><span class="catline c-' + e.cat + '"><i class="dot"></i>' + catName(e.cat) + "</span>" +
    (!elec && e.st === "unknown" ? '<span class="pmark">' + tr("≈ расчётные", "≈ predicted") + "</span>" : "") + "</div>" +
    (elec ? elecHTML(e) : propsHTML(e)) + "</div>";
}

const gridCard = grid.querySelector(".detail--grid");
const stackCard = document.querySelector(".detail--stack");
const HOVER_DELAY = 120; // сколько миллисекунд курсор должен постоять на элементе, чтобы появилась плашка
let timer = null;
let lastPointer = "mouse";

let cur = null; // номер элемента, который сейчас показан в плашке
function render() {
  if (cur === null) return;
  const html = detailHTML(els[cur - 1]);
  gridCard.innerHTML = html;
  stackCard.innerHTML = html;
  stackCard.classList.toggle("is-elec", state.mode === "elec");
}
function show(z) {
  cur = z;
  render();
  gridCard.classList.add("is-on");
  stackCard.classList.add("is-on");
}
function hide() {
  clearTimeout(timer);
  cur = null;
  gridCard.classList.remove("is-on");
  stackCard.classList.remove("is-on");
}

// мышь: плашка появляется, когда курсор задержался на элементе, и пропадает, когда он ушёл
grid.addEventListener("pointerover", function (ev) {
  if (ev.pointerType !== "mouse") return;
  const b = ev.target.closest(".el");
  if (!b || b.contains(ev.relatedTarget)) return;
  clearTimeout(timer);
  timer = setTimeout(function () { show(Number(b.dataset.z)); }, HOVER_DELAY);
});
grid.addEventListener("pointerout", function (ev) {
  if (ev.pointerType !== "mouse") return;
  const b = ev.target.closest(".el");
  if (!b || b.contains(ev.relatedTarget)) return;
  hide();
});

// клавиатура: плашка показывается, пока элемент в фокусе
let kbdShown = false;
grid.addEventListener("focusin", function (ev) {
  const b = ev.target.closest(".el");
  if (b && b.matches(":focus-visible")) {
    kbdShown = true;
    show(Number(b.dataset.z));
  }
});
grid.addEventListener("focusout", function () {
  if (kbdShown) {
    kbdShown = false;
    hide();
  }
});

// сенсорный экран: нажатие показывает плашку, нажатие в другом месте убирает
document.addEventListener("pointerdown", function (ev) {
  lastPointer = ev.pointerType;
  if (ev.pointerType !== "mouse" && !ev.target.closest(".el") && !ev.target.closest(".detail") && !ev.target.closest(".chip") && !ev.target.closest(".search")) hide();
});
// на узком экране карточка выезжает снизу: прокручиваем страницу так, чтобы элемент остался над ней
function revealAboveSheet(node) {
  if (!window.matchMedia("(max-width: 899px)").matches) return;
  const sheetH = stackCard.getBoundingClientRect().height;
  const r = node.getBoundingClientRect();
  const limit = window.innerHeight - sheetH - 14;
  if (r.bottom > limit) window.scrollBy({ top: r.bottom - limit, behavior: "smooth" });
  else if (r.top < 10) window.scrollBy({ top: r.top - 60, behavior: "smooth" });
}
grid.addEventListener("click", function (ev) {
  const b = ev.target.closest(".el");
  if (!b || lastPointer === "mouse") return;
  const z = Number(b.dataset.z);
  if (cur === z) {
    hide();
  } else {
    show(z);
    revealAboveSheet(b);
  }
});
document.querySelector(".filters").addEventListener("click", function (ev) {
  const b = ev.target.closest(".chip");
  if (!b) return;
  if (b.dataset.mode) {
    state.mode = b.dataset.mode;
    apply();
    render();
    return;
  }
  if (b.dataset.cat) state.cat = state.cat === b.dataset.cat ? null : b.dataset.cat;
  else state.st = state.st === b.dataset.st ? null : b.dataset.st;
  apply();
});
resetBtn.addEventListener("click", function () {
  state.cat = null;
  state.st = null;
  state.q = "";
  searchEl.value = "";
  apply();
});

// поиск по названию, символу или номеру
const searchEl = document.getElementById("q");
function norm(t) { return t.toLowerCase().replace(/ё/g, "е").trim(); }
// другие английские написания: американские и старые
const ALT_EN = { Al: "aluminum", Cs: "cesium", S: "sulphur" };
els.forEach(function (e) {
  e.nkeys = [norm(e.nameEn), norm(e.nameRu)];
  if (ALT_EN[e.sym]) e.nkeys.push(ALT_EN[e.sym]);
  e.skey = e.sym.toLowerCase();
});
function matchQ(e) {
  const q = state.q;
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(e.z) === q;
  return e.nkeys.some(function (k) { return k.indexOf(q) === 0 || (q.length >= 3 && k.indexOf(q) !== -1); }) || e.skey.indexOf(q) === 0;
}
const errEl = document.getElementById("q-err");
// расстояние между словами: сколько букв нужно изменить, чтобы получить другое слово
function dist(a, b) {
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}
// подсказка при опечатке: ближайшее по написанию название (сравниваем и с началом названия)
function suggest(q) {
  const limit = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;
  let best = null;
  let bd = 99;
  els.forEach(function (e) {
    const k = norm(elName(e));
    const d = Math.min(dist(q, k), dist(q, k.slice(0, q.length)));
    if (d < bd) { bd = d; best = e; }
  });
  return bd <= limit ? best : null;
}
// ошибка рядом с полем, если такого элемента нет
function searchFeedback() {
  const miss = state.q !== "" && !els.some(matchQ);
  searchEl.setAttribute("aria-invalid", miss ? "true" : "false");
  errEl.hidden = !miss;
  errEl.textContent = "";
  if (!miss) return;
  if (/^\d+$/.test(state.q)) {
    errEl.textContent = tr("Такого номера нет. В таблице элементы с 1 по 118.", "There is no such number. The table has elements 1 to 118.");
    return;
  }
  errEl.appendChild(document.createTextNode(tr("Элемента «" + searchEl.value.trim() + "» нет в таблице. ", "There is no element “" + searchEl.value.trim() + "” in the table. ")));
  const sug = state.q.length >= 3 ? suggest(state.q) : null;
  if (sug) {
    errEl.appendChild(document.createTextNode(tr("Возможно, вы искали: ", "Did you mean ")));
    const b = document.createElement("button");
    b.type = "button";
    b.className = "link";
    b.textContent = elName(sug);
    b.addEventListener("click", function () {
      searchEl.value = elName(sug);
      state.q = norm(elName(sug));
      apply();
      searchEl.focus();
    });
    errEl.appendChild(b);
    errEl.appendChild(document.createTextNode("?"));
  } else {
    errEl.appendChild(document.createTextNode(tr("Введите название элемента, символ (например, Fe) или номер от 1 до 118.", "Type an element name, a symbol (for example, Fe) or a number from 1 to 118.")));
  }
}
searchEl.addEventListener("input", function () {
  state.q = norm(searchEl.value);
  apply();
});
searchEl.addEventListener("keydown", function (ev) {
  if (ev.key === "Enter") {
    // Enter открывает карточку первого найденного элемента
    const first = els.find(function (e) {
      return matchQ(e) && (!state.cat || e.cat === state.cat) && (!state.st || e.st === state.st);
    });
    if (first && state.q) {
      show(first.z);
      first.node.scrollIntoView({ block: "nearest" });
      revealAboveSheet(first.node);
      searchEl.blur();
    }
  } else if (ev.key === "Escape") {
    searchEl.value = "";
    state.q = "";
    apply();
    hide();
  }
});

hide();
apply();

// переключатель темы: по умолчанию тема берётся из настроек устройства, выбор вручную запоминается
const themeBtn = document.getElementById("theme-btn");
const root = document.documentElement;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
function nowTheme() {
  return root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light");
}
function syncThemeBtn() {
  const t = nowTheme();
  themeBtn.setAttribute("data-now", t);
  themeBtn.setAttribute("aria-label", t === "dark" ? tr("Включить светлую тему", "Switch to light theme") : tr("Включить тёмную тему", "Switch to dark theme"));
}
try {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
} catch (e) {}
themeBtn.addEventListener("click", function () {
  const next = nowTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch (e) {}
  syncThemeBtn();
});
darkQuery.addEventListener("change", syncThemeBtn);
syncThemeBtn();

// смена языка: подписи таблицы, фильтры, плашка и подсказки поиска перерисовываются
I18N.on(function () {
  labelGrid();
  labelChips();
  apply();
  render();
  syncThemeBtn();
});
})();

/* ############################################################
   3. Данные для составителя уравнений: вещества, реакции, ионы (был <script id="chem-data">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ДАННЫЕ ДЛЯ СОСТАВИТЕЛЯ УРАВНЕНИЙ
   Здесь только данные, без логики и без интерфейса.

   substances — справочник веществ: формула (f), название (n),
                другие названия (a). Нужен для подсказок при вводе
                и чтобы называть вещества по-русски.
   reactions  — реакции школьного курса, проверенные вручную.
                eq    — уравнение («->» обычная, «<=>» обратимая);
                type  — соединение | разложение | замещение | обмен | другое;
                note  — уточнение типа (для «другое» обязательно);
                tags  — дополнительные признаки;
                cond  — условия (пустая строка, если надёжных данных нет);
                desc  — что происходит, простыми словами.

   Чтобы добавить реакцию, допишите объект в конец списка reactions.
   Все формулы из реакций должны быть в справочнике substances —
   это проверяется автоматически при загрузке страницы (см. консоль).
   ============================================================ */
window.ATOMIX_CHEM_DATA = {
  packs: [],   // пакеты по темам 10–11 класса и ЕГЭ добавляются из файлов data/*.js
  ions: [],    // таблица ионов — в data/00-ions.js
  substances: [
    // простые вещества
    { f: "H2", n: "водород" },
    { f: "O2", n: "кислород" },
    { f: "O3", n: "озон" },
    { f: "N2", n: "азот" },
    { f: "Cl2", n: "хлор" },
    { f: "F2", n: "фтор" },
    { f: "Br2", n: "бром" },
    { f: "I2", n: "йод", a: ["иод"] },
    { f: "S", n: "сера" },
    { f: "C", n: "углерод", a: ["уголь"] },
    { f: "P", n: "фосфор" },
    { f: "Si", n: "кремний" },
    { f: "Li", n: "литий" },
    { f: "Na", n: "натрий" },
    { f: "K", n: "калий" },
    { f: "Mg", n: "магний" },
    { f: "Ca", n: "кальций" },
    { f: "Al", n: "алюминий" },
    { f: "Fe", n: "железо" },
    { f: "Cu", n: "медь" },
    { f: "Zn", n: "цинк" },
    { f: "Ag", n: "серебро" },
    { f: "Hg", n: "ртуть" },
    { f: "W", n: "вольфрам" },
    // водородные соединения и органика
    { f: "H2O", n: "вода" },
    { f: "H2O2", n: "пероксид водорода", a: ["перекись водорода"] },
    { f: "HCl", n: "хлороводород", a: ["соляная кислота"] },
    { f: "HF", n: "фтороводород", a: ["плавиковая кислота"] },
    { f: "H2S", n: "сероводород" },
    { f: "NH3", n: "аммиак" },
    { f: "NaH", n: "гидрид натрия" },
    { f: "CaH2", n: "гидрид кальция" },
    { f: "CH4", n: "метан", a: ["природный газ"] },
    { f: "C3H8", n: "пропан" },
    { f: "C4H10", n: "бутан" },
    { f: "C2H2", n: "ацетилен" },
    { f: "C2H5OH", n: "этанол", a: ["этиловый спирт", "спирт"] },
    { f: "CH3COOH", n: "уксусная кислота", a: ["уксус"] },
    { f: "CH3COONa", n: "ацетат натрия" },
    { f: "C6H12O6", n: "глюкоза", a: ["виноградный сахар"] },
    // оксиды
    { f: "CO", n: "оксид углерода(II)", a: ["угарный газ"] },
    { f: "CO2", n: "оксид углерода(IV)", a: ["углекислый газ", "диоксид углерода"] },
    { f: "SO2", n: "оксид серы(IV)", a: ["сернистый газ"] },
    { f: "SO3", n: "оксид серы(VI)", a: ["серный ангидрид"] },
    { f: "NO", n: "оксид азота(II)" },
    { f: "NO2", n: "оксид азота(IV)", a: ["бурый газ", "диоксид азота"] },
    { f: "P2O5", n: "оксид фосфора(V)" },
    { f: "SiO2", n: "оксид кремния(IV)", a: ["кварц", "кремнезём", "песок"] },
    { f: "Li2O", n: "оксид лития" },
    { f: "Na2O", n: "оксид натрия" },
    { f: "Na2O2", n: "пероксид натрия" },
    { f: "K2O", n: "оксид калия" },
    { f: "MgO", n: "оксид магния", a: ["жжёная магнезия"] },
    { f: "CaO", n: "оксид кальция", a: ["негашёная известь"] },
    { f: "BaO", n: "оксид бария" },
    { f: "Al2O3", n: "оксид алюминия", a: ["глинозём"] },
    { f: "CuO", n: "оксид меди(II)" },
    { f: "Fe2O3", n: "оксид железа(III)", a: ["гематит"] },
    { f: "Fe3O4", n: "оксид железа(II,III)", a: ["железная окалина", "магнетит"] },
    { f: "HgO", n: "оксид ртути(II)" },
    { f: "MnO2", n: "оксид марганца(IV)" },
    { f: "Cr2O3", n: "оксид хрома(III)" },
    { f: "WO3", n: "оксид вольфрама(VI)" },
    // основания
    { f: "LiOH", n: "гидроксид лития" },
    { f: "NaOH", n: "гидроксид натрия", a: ["едкий натр", "каустическая сода"] },
    { f: "KOH", n: "гидроксид калия", a: ["едкое кали"] },
    { f: "Ca(OH)2", n: "гидроксид кальция", a: ["гашёная известь", "известковая вода"] },
    { f: "Ba(OH)2", n: "гидроксид бария" },
    { f: "Mg(OH)2", n: "гидроксид магния" },
    { f: "Cu(OH)2", n: "гидроксид меди(II)" },
    { f: "Fe(OH)2", n: "гидроксид железа(II)" },
    { f: "Fe(OH)3", n: "гидроксид железа(III)" },
    { f: "Al(OH)3", n: "гидроксид алюминия" },
    // кислоты
    { f: "H2SO4", n: "серная кислота" },
    { f: "H2SO3", n: "сернистая кислота" },
    { f: "HNO3", n: "азотная кислота" },
    { f: "H3PO4", n: "фосфорная кислота", a: ["ортофосфорная кислота"] },
    { f: "H2CO3", n: "угольная кислота" },
    { f: "HClO", n: "хлорноватистая кислота" },
    // соли
    { f: "NaCl", n: "хлорид натрия", a: ["поваренная соль", "соль"] },
    { f: "KCl", n: "хлорид калия" },
    { f: "KBr", n: "бромид калия" },
    { f: "KI", n: "иодид калия", a: ["йодид калия"] },
    { f: "MgCl2", n: "хлорид магния" },
    { f: "CaCl2", n: "хлорид кальция" },
    { f: "BaCl2", n: "хлорид бария" },
    { f: "ZnCl2", n: "хлорид цинка" },
    { f: "FeCl2", n: "хлорид железа(II)" },
    { f: "FeCl3", n: "хлорид железа(III)" },
    { f: "CuCl2", n: "хлорид меди(II)" },
    { f: "AlCl3", n: "хлорид алюминия" },
    { f: "MnCl2", n: "хлорид марганца(II)" },
    { f: "NH4Cl", n: "хлорид аммония", a: ["нашатырь"] },
    { f: "AgCl", n: "хлорид серебра" },
    { f: "AgBr", n: "бромид серебра" },
    { f: "PbI2", n: "иодид свинца(II)", a: ["йодид свинца"] },
    { f: "Pb(NO3)2", n: "нитрат свинца(II)" },
    { f: "KNO3", n: "нитрат калия", a: ["калийная селитра"] },
    { f: "KNO2", n: "нитрит калия" },
    { f: "NaNO3", n: "нитрат натрия", a: ["натриевая селитра"] },
    { f: "NaNO2", n: "нитрит натрия" },
    { f: "AgNO3", n: "нитрат серебра", a: ["ляпис"] },
    { f: "Cu(NO3)2", n: "нитрат меди(II)" },
    { f: "NH4NO3", n: "нитрат аммония", a: ["аммиачная селитра"] },
    { f: "Na2SO4", n: "сульфат натрия" },
    { f: "ZnSO4", n: "сульфат цинка" },
    { f: "FeSO4", n: "сульфат железа(II)" },
    { f: "MgSO4", n: "сульфат магния" },
    { f: "CuSO4", n: "сульфат меди(II)" },
    { f: "CuSO4·5H2O", n: "медный купорос", a: ["пентагидрат сульфата меди"] },
    { f: "BaSO4", n: "сульфат бария" },
    { f: "Na2SO3", n: "сульфит натрия" },
    { f: "Na2CO3", n: "карбонат натрия", a: ["кальцинированная сода", "сода"] },
    { f: "NaHCO3", n: "гидрокарбонат натрия", a: ["пищевая сода", "питьевая сода", "сода"] },
    { f: "CaCO3", n: "карбонат кальция", a: ["мел", "мрамор", "известняк"] },
    { f: "Ca(HCO3)2", n: "гидрокарбонат кальция" },
    { f: "Cu2(OH)2CO3", n: "гидроксокарбонат меди(II)", a: ["малахит"] },
    { f: "KMnO4", n: "перманганат калия", a: ["марганцовка"] },
    { f: "K2MnO4", n: "манганат калия" },
    { f: "KClO3", n: "хлорат калия", a: ["бертолетова соль"] },
    { f: "(NH4)2Cr2O7", n: "дихромат аммония" },
    { f: "Na3PO4", n: "фосфат натрия" },
    { f: "Na2SiO3", n: "силикат натрия", a: ["жидкое стекло"] },
    { f: "CaSiO3", n: "силикат кальция" },
    { f: "Na[Al(OH)4]", n: "тетрагидроксоалюминат натрия" },
    { f: "FeS", n: "сульфид железа(II)" },
    { f: "ZnS", n: "сульфид цинка" },
    { f: "Al2S3", n: "сульфид алюминия" },
    { f: "Ag2S", n: "сульфид серебра" },
    { f: "Mg3N2", n: "нитрид магния" },
    { f: "Li3N", n: "нитрид лития" }
  ],

  reactions: [
    // ---------- СОЕДИНЕНИЕ ----------
    { eq: "2H2 + O2 -> 2H2O", type: "соединение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание. Смесь водорода с кислородом (2 : 1) называют «гремучим газом» — она взрывается.",
      desc: "Водород сгорает в кислороде, и получается вода. Выделяется много тепла." },
    { eq: "H2 + Cl2 -> 2HCl", type: "соединение", tags: ["ОВР"],
      cond: "На свету или при поджигании. На ярком свету смесь может взорваться.",
      desc: "Водород соединяется с хлором, получается газ хлороводород. Его раствор в воде — соляная кислота." },
    { eq: "N2 + 3H2 <=> 2NH3", type: "соединение", tags: ["ОВР", "каталитическая", "экзотермическая"],
      cond: "Катализатор (железо), температура около 400–500 °C и высокое давление. Так аммиак получают в промышленности.",
      desc: "Азот соединяется с водородом, получается аммиак. Реакция обратимая: часть аммиака снова распадается на азот и водород." },
    { eq: "2Na + Cl2 -> 2NaCl", type: "соединение", tags: ["ОВР", "экзотермическая"],
      cond: "Нагретый натрий горит в хлоре ярким жёлтым пламенем.",
      desc: "Мягкий металл натрий соединяется с ядовитым газом хлором — и получается обычная поваренная соль, хлорид натрия." },
    { eq: "4Na + O2 -> 2Na2O", type: "соединение", tags: ["ОВР"],
      cond: "Медленное окисление натрия кислородом при обычной температуре.",
      desc: "Натрий соединяется с кислородом, получается оксид натрия. Поэтому свежий срез натрия быстро тускнеет." },
    { eq: "2Na + O2 -> Na2O2", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Горение натрия в кислороде или на воздухе.",
      desc: "При горении натрия получается в основном не оксид, а пероксид натрия Na₂O₂." },
    { eq: "4Li + O2 -> 2Li2O", type: "соединение", tags: ["ОВР", "горение"],
      cond: "При нагревании литий загорается.",
      desc: "Литий соединяется с кислородом, получается оксид лития. В отличие от натрия, при горении лития образуется обычный оксид." },
    { eq: "2Mg + O2 -> 2MgO", type: "соединение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание. Магний горит ослепительно белым пламенем — смотреть прямо на него нельзя.",
      desc: "Магний сгорает и превращается в белый порошок — оксид магния." },
    { eq: "2Ca + O2 -> 2CaO", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Кальций соединяется с кислородом, получается оксид кальция — негашёная известь." },
    { eq: "4Al + 3O2 -> 2Al2O3", type: "соединение", tags: ["ОВР", "экзотермическая"],
      cond: "При нагревании (порошок алюминия горит). При обычной температуре алюминий покрывается тонкой прочной плёнкой оксида, которая его защищает.",
      desc: "Алюминий соединяется с кислородом, получается оксид алюминия." },
    { eq: "3Fe + 2O2 -> Fe3O4", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Раскалённая железная проволока горит в чистом кислороде и разбрасывает искры.",
      desc: "При горении железа в кислороде получается железная окалина Fe₃O₄ — оксид, в котором атомы железа находятся в двух разных степенях окисления." },
    { eq: "4Fe + 3O2 -> 2Fe2O3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании. Это упрощённая запись, которую часто используют в школьных задачах.",
      desc: "Железо соединяется с кислородом, получается оксид железа(III). Учтите: при горении железа в чистом кислороде основной продукт — окалина Fe₃O₄, а ржавчина образуется только при участии воды и имеет более сложный состав." },
    { eq: "2Cu + O2 -> 2CuO", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Красная медь при нагревании на воздухе покрывается чёрным налётом — оксидом меди(II)." },
    { eq: "C + O2 -> CO2", type: "соединение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание, кислорода достаточно.",
      desc: "Углерод (например, уголь) сгорает, получается углекислый газ." },
    { eq: "2C + O2 -> 2CO", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Горение при недостатке кислорода.",
      desc: "Если кислорода мало, вместо углекислого газа получается угарный газ CO. Он очень ядовит и не имеет запаха." },
    { eq: "S + O2 -> SO2", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Поджигание. Сера горит синим пламенем.",
      desc: "Сера сгорает, получается сернистый газ SO₂ с резким запахом." },
    { eq: "4P + 5O2 -> 2P2O5", type: "соединение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание (белый фосфор может самовоспламениться на воздухе).",
      desc: "Фосфор горит и образует густой белый дым — оксид фосфора(V). Настоящая молекула этого оксида — P₄O₁₀, но в школьном курсе пишут простейшую формулу P₂O₅." },
    { eq: "2CO + O2 -> 2CO2", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Поджигание. Угарный газ горит синим пламенем.",
      desc: "Угарный газ сгорает и превращается в углекислый газ." },
    { eq: "2SO2 + O2 <=> 2SO3", type: "соединение", tags: ["ОВР", "каталитическая", "экзотермическая"],
      cond: "Катализатор — оксид ванадия(V) V₂O₅, температура около 400–500 °C. Это стадия промышленного получения серной кислоты.",
      desc: "Сернистый газ окисляется кислородом до оксида серы(VI). Реакция обратимая." },
    { eq: "N2 + O2 <=> 2NO", type: "соединение", tags: ["ОВР", "эндотермическая"],
      cond: "Очень высокая температура — в электрическом разряде (например, при ударе молнии) или в двигателях.",
      desc: "Азот и кислород воздуха соединяются только при очень сильном нагреве, получается оксид азота(II). Тепло при этом поглощается." },
    { eq: "2NO + O2 -> 2NO2", type: "соединение", tags: ["ОВР"],
      cond: "Идёт при обычных условиях.",
      desc: "Бесцветный оксид азота(II) на воздухе быстро превращается в бурый газ — оксид азота(IV)." },
    { eq: "3O2 -> 2O3", type: "другое", note: "превращение одной аллотропной формы кислорода в другую (не ОВР)", tags: ["эндотермическая"],
      cond: "В электрическом разряде (например, во время грозы) или под действием ультрафиолета.",
      desc: "Из обычного кислорода O₂ получается озон O₃ — другая форма того же элемента. Озон есть в верхних слоях атмосферы и защищает Землю от ультрафиолета." },
    { eq: "Fe + S -> FeS", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании смеси порошков.",
      desc: "Железо и сера соединяются, получается сульфид железа(II). После реакции железо уже нельзя отделить магнитом — это новое вещество." },
    { eq: "Zn + S -> ZnS", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Цинк соединяется с серой, получается сульфид цинка." },
    { eq: "2Al + 3S -> Al2S3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Алюминий соединяется с серой, получается сульфид алюминия." },
    { eq: "H2 + S -> H2S", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Водород соединяется с серой, получается сероводород — ядовитый газ с запахом тухлых яиц." },
    { eq: "2Fe + 3Cl2 -> 2FeCl3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании железо горит в хлоре.",
      desc: "С хлором железо образует хлорид железа(III): хлор — сильный окислитель. (С соляной кислотой получается другой продукт — FeCl₂.)" },
    { eq: "Cu + Cl2 -> CuCl2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Медь соединяется с хлором, получается хлорид меди(II)." },
    { eq: "2Al + 3Cl2 -> 2AlCl3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Алюминий соединяется с хлором, получается хлорид алюминия." },
    { eq: "2K + Cl2 -> 2KCl", type: "соединение", tags: ["ОВР"],
      cond: "",
      desc: "Калий соединяется с хлором, получается хлорид калия." },
    { eq: "3Mg + N2 -> Mg3N2", type: "соединение", tags: ["ОВР"],
      cond: "При горении магния — на воздухе часть магния соединяется не с кислородом, а с азотом.",
      desc: "Магний соединяется с азотом, получается нитрид магния." },
    { eq: "6Li + N2 -> 2Li3N", type: "соединение", tags: ["ОВР"],
      cond: "Идёт уже при комнатной температуре — литий единственный щелочной металл, который так реагирует с азотом.",
      desc: "Литий соединяется с азотом, получается нитрид лития." },
    { eq: "2Na + H2 -> 2NaH", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Натрий соединяется с водородом, получается гидрид натрия. Здесь водород выступает окислителем." },
    { eq: "Ca + H2 -> CaH2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Кальций соединяется с водородом, получается гидрид кальция." },
    { eq: "Si + O2 -> SiO2", type: "соединение", tags: ["ОВР"],
      cond: "При сильном нагревании.",
      desc: "Кремний соединяется с кислородом, получается оксид кремния(IV) — из него в основном состоят кварц и песок." },
    { eq: "CO2 + C -> 2CO", type: "соединение", tags: ["ОВР", "эндотермическая"],
      cond: "При высокой температуре (раскалённый уголь).",
      desc: "Углекислый газ, проходя через раскалённый уголь, превращается в угарный газ. Так CO образуется в доменной печи." },
    { eq: "CaO + H2O -> Ca(OH)2", type: "соединение", tags: ["экзотермическая"],
      cond: "При обычных условиях; смесь сильно разогревается.",
      desc: "Негашёная известь соединяется с водой, получается гашёная известь — гидроксид кальция. Этот процесс называют гашением извести." },
    { eq: "Li2O + H2O -> 2LiOH", type: "соединение", tags: [],
      cond: "",
      desc: "Оксид лития реагирует с водой, получается щёлочь — гидроксид лития." },
    { eq: "Na2O + H2O -> 2NaOH", type: "соединение", tags: [],
      cond: "",
      desc: "Оксид натрия реагирует с водой, получается щёлочь — гидроксид натрия." },
    { eq: "K2O + H2O -> 2KOH", type: "соединение", tags: [],
      cond: "",
      desc: "Оксид калия реагирует с водой, получается щёлочь — гидроксид калия." },
    { eq: "BaO + H2O -> Ba(OH)2", type: "соединение", tags: [],
      cond: "",
      desc: "Оксид бария реагирует с водой, получается щёлочь — гидроксид бария." },
    { eq: "CO2 + H2O <=> H2CO3", type: "соединение", tags: [],
      cond: "Только малая часть растворённого углекислого газа превращается в кислоту.",
      desc: "Углекислый газ соединяется с водой, получается угольная кислота. Она очень неустойчива и легко распадается обратно — поэтому газировка выдыхается." },
    { eq: "SO2 + H2O <=> H2SO3", type: "соединение", tags: [],
      cond: "",
      desc: "Сернистый газ соединяется с водой, получается сернистая кислота. Она неустойчива, реакция обратимая." },
    { eq: "SO3 + H2O -> H2SO4", type: "соединение", tags: ["экзотермическая"],
      cond: "В промышленности SO₃ поглощают не водой, а концентрированной серной кислотой: с водой образуется туман, который плохо улавливается.",
      desc: "Оксид серы(VI) соединяется с водой, получается серная кислота. Выделяется очень много тепла." },
    { eq: "P2O5 + 3H2O -> 2H3PO4", type: "соединение", tags: [],
      cond: "При нагревании с избытком воды.",
      desc: "Оксид фосфора(V) соединяется с водой, получается фосфорная кислота." },
    { eq: "CaO + CO2 -> CaCO3", type: "соединение", tags: [],
      cond: "",
      desc: "Основный оксид кальция соединяется с кислотным оксидом — углекислым газом, получается карбонат кальция (мел)." },
    { eq: "Na2O + CO2 -> Na2CO3", type: "соединение", tags: [],
      cond: "",
      desc: "Оксид натрия соединяется с углекислым газом, получается карбонат натрия (сода)." },
    { eq: "SiO2 + CaO -> CaSiO3", type: "соединение", tags: [],
      cond: "При сплавлении (высокая температура).",
      desc: "Кислотный оксид кремния соединяется с основным оксидом кальция, получается силикат кальция." },
    { eq: "NH3 + HCl -> NH4Cl", type: "соединение", tags: [],
      cond: "Идёт при обычных условиях прямо между газами.",
      desc: "Газы аммиак и хлороводород встречаются и образуют белый дым — мельчайшие кристаллы хлорида аммония (нашатыря)." },
    { eq: "NH3 + HNO3 -> NH4NO3", type: "соединение", tags: [],
      cond: "",
      desc: "Аммиак реагирует с азотной кислотой, получается нитрат аммония — азотное удобрение (аммиачная селитра)." },
    { eq: "4NO2 + O2 + 2H2O -> 4HNO3", type: "соединение", tags: ["ОВР"],
      cond: "Стадия промышленного получения азотной кислоты.",
      desc: "Бурый газ NO₂ в присутствии кислорода поглощается водой, получается азотная кислота." },
    { eq: "CuSO4 + 5H2O -> CuSO4·5H2O", type: "соединение", tags: [],
      cond: "При обычных условиях.",
      desc: "Белый безводный сульфат меди(II) присоединяет воду и синеет — получается медный купорос. Так можно обнаружить воду." },
    { eq: "Al(OH)3 + NaOH -> Na[Al(OH)4]", type: "соединение", tags: [],
      cond: "В растворе щёлочи.",
      desc: "Гидроксид алюминия растворяется в щёлочи: он амфотерный, то есть реагирует и с кислотами, и со щелочами. Получается комплексная соль." },
    { eq: "CaCO3 + H2O + CO2 <=> Ca(HCO3)2", type: "соединение", tags: [],
      cond: "Вода, насыщенная углекислым газом. Обратная реакция идёт при нагревании или испарении воды.",
      desc: "Известняк медленно растворяется в воде с углекислым газом, получается растворимый гидрокарбонат кальция. Так в природе образуются карстовые пещеры, а при обратном процессе растут сталактиты." },

    // ---------- РАЗЛОЖЕНИЕ ----------
    { eq: "2H2O -> 2H2 + O2", type: "разложение", tags: ["ОВР", "электролиз", "эндотермическая"],
      cond: "Под действием электрического тока (электролиз). Чтобы вода лучше проводила ток, в неё добавляют немного щёлочи или серной кислоты.",
      desc: "Электрический ток разлагает воду на водород и кислород. Водорода получается по объёму вдвое больше, чем кислорода." },
    { eq: "2NaCl -> 2Na + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава хлорида натрия (около 800 °C). В растворе процесс идёт иначе.",
      desc: "Электрический ток разлагает расплавленную соль на металлический натрий и хлор. Так натрий получают в промышленности." },
    { eq: "2H2O2 -> 2H2O + O2", type: "разложение", tags: ["ОВР", "каталитическая", "экзотермическая"],
      cond: "Катализатор — оксид марганца(IV) MnO₂. Без катализатора реакция идёт медленно; ускоряется на свету и при нагревании.",
      desc: "Пероксид водорода разлагается на воду и кислород. Тлеющая лучинка в выделяющемся газе ярко вспыхивает." },
    { eq: "2KMnO4 -> K2MnO4 + MnO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании. Лабораторный способ получения кислорода.",
      desc: "Перманганат калия (марганцовка) при нагревании разлагается, выделяется кислород." },
    { eq: "2KClO3 -> 2KCl + 3O2", type: "разложение", tags: ["ОВР", "каталитическая"],
      cond: "При нагревании, катализатор — оксид марганца(IV) MnO₂.",
      desc: "Бертолетова соль разлагается на хлорид калия и кислород." },
    { eq: "2HgO -> 2Hg + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании. Пары ртути ядовиты!",
      desc: "Красный оксид ртути разлагается на ртуть и кислород. Именно так кислород открыли в XVIII веке." },
    { eq: "CaCO3 -> CaO + CO2", type: "разложение", tags: ["эндотермическая"],
      cond: "При сильном нагревании (около 900 °C). Так в промышленности обжигают известняк.",
      desc: "Карбонат кальция (известняк, мел) разлагается на негашёную известь и углекислый газ." },
    { eq: "Cu(OH)2 -> CuO + H2O", type: "разложение", tags: [],
      cond: "При нагревании.",
      desc: "Голубой гидроксид меди(II) при нагревании чернеет: он разлагается на чёрный оксид меди(II) и воду." },
    { eq: "2Fe(OH)3 -> Fe2O3 + 3H2O", type: "разложение", tags: [],
      cond: "При нагревании.",
      desc: "Бурый гидроксид железа(III) разлагается на оксид железа(III) и воду." },
    { eq: "2Al(OH)3 -> Al2O3 + 3H2O", type: "разложение", tags: [],
      cond: "При нагревании.",
      desc: "Гидроксид алюминия разлагается на оксид алюминия и воду." },
    { eq: "Ca(OH)2 -> CaO + H2O", type: "разложение", tags: [],
      cond: "При сильном нагревании.",
      desc: "Гашёная известь разлагается на оксид кальция и воду." },
    { eq: "H2CO3 -> H2O + CO2", type: "разложение", tags: [],
      cond: "Идёт самопроизвольно: угольная кислота очень неустойчива.",
      desc: "Угольная кислота распадается на воду и углекислый газ." },
    { eq: "2NaHCO3 -> Na2CO3 + H2O + CO2", type: "разложение", tags: [],
      cond: "При нагревании.",
      desc: "Пищевая сода разлагается, выделяется углекислый газ. Поэтому её используют как разрыхлитель теста." },
    { eq: "NH4Cl -> NH3 + HCl", type: "разложение", tags: [],
      cond: "При нагревании. На холодных стенках пробирки газы снова соединяются в NH₄Cl.",
      desc: "Хлорид аммония разлагается на аммиак и хлороводород. Со стороны похоже на возгонку, но это химическая реакция." },
    { eq: "2NaNO3 -> 2NaNO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Нитрат натрия разлагается на нитрит натрия и кислород." },
    { eq: "2KNO3 -> 2KNO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Нитрат калия (калийная селитра) разлагается на нитрит калия и кислород." },
    { eq: "2Cu(NO3)2 -> 2CuO + 4NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании. Выделяется ядовитый бурый газ NO₂.",
      desc: "Нитрат меди(II) разлагается на оксид меди(II), оксид азота(IV) и кислород." },
    { eq: "2AgNO3 -> 2Ag + 2NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Нитрат серебра разлагается до металлического серебра, бурого газа NO₂ и кислорода." },
    { eq: "(NH4)2Cr2O7 -> Cr2O3 + N2 + 4H2O", type: "разложение", tags: ["ОВР", "экзотермическая"],
      cond: "При поджигании. Опыт «химический вулкан» проводят только под тягой: дихромат аммония ядовит.",
      desc: "Оранжевые кристаллы дихромата аммония разлагаются с искрами — получаются рыхлый зелёный оксид хрома(III), азот и водяной пар." },
    { eq: "Cu2(OH)2CO3 -> 2CuO + H2O + CO2", type: "разложение", tags: [],
      cond: "При нагревании.",
      desc: "Зелёный малахит (гидроксокарбонат меди(II)) разлагается на чёрный оксид меди(II), воду и углекислый газ." },
    { eq: "C6H12O6 -> 2C2H5OH + 2CO2", type: "разложение", note: "спиртовое брожение — идёт под действием ферментов", tags: [],
      cond: "Под действием ферментов дрожжей, без доступа воздуха.",
      desc: "Дрожжи превращают глюкозу в этиловый спирт и углекислый газ. Пузырьки этого газа поднимают тесто." },

    // ---------- ЗАМЕЩЕНИЕ ----------
    { eq: "Zn + 2HCl -> ZnCl2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.",
      desc: "Цинк вытесняет водород из соляной кислоты: на металле появляются пузырьки водорода, получается хлорид цинка." },
    { eq: "Fe + 2HCl -> FeCl2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.",
      desc: "Железо вытесняет водород из соляной кислоты, получается хлорид железа(II). С кислотой образуется именно FeCl₂, а не FeCl₃." },
    { eq: "Mg + 2HCl -> MgCl2 + H2", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "При обычных условиях.",
      desc: "Магний активно реагирует с соляной кислотой: выделяется водород, раствор нагревается." },
    { eq: "2Al + 6HCl -> 2AlCl3 + 3H2", type: "замещение", tags: ["ОВР"],
      cond: "Реакция может начаться не сразу: сначала кислота растворяет защитную оксидную плёнку.",
      desc: "Алюминий вытесняет водород из соляной кислоты, получается хлорид алюминия." },
    { eq: "Zn + H2SO4 -> ZnSO4 + H2", type: "замещение", tags: ["ОВР"],
      cond: "С разбавленной серной кислотой. Концентрированная кислота реагирует иначе — водород не выделяется.",
      desc: "Цинк вытесняет водород из разбавленной серной кислоты, получается сульфат цинка. Это частый лабораторный способ получения водорода." },
    { eq: "Fe + H2SO4 -> FeSO4 + H2", type: "замещение", tags: ["ОВР"],
      cond: "С разбавленной серной кислотой. Концентрированная серная кислота на холоде железо пассивирует, и реакция не идёт.",
      desc: "Железо вытесняет водород из разбавленной серной кислоты, получается сульфат железа(II)." },
    { eq: "Mg + H2SO4 -> MgSO4 + H2", type: "замещение", tags: ["ОВР"],
      cond: "С разбавленной серной кислотой.",
      desc: "Магний вытесняет водород из разбавленной серной кислоты, получается сульфат магния." },
    { eq: "2Na + 2H2O -> 2NaOH + H2", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "При обычных условиях, бурно. Опыт проводят с маленьким кусочком натрия.",
      desc: "Натрий бегает по воде, плавится в шарик и шипит: выделяется водород, а в воде образуется щёлочь NaOH." },
    { eq: "2K + 2H2O -> 2KOH + H2", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "Очень бурно: выделяющийся водород загорается фиолетовым пламенем.",
      desc: "Калий реагирует с водой ещё активнее натрия, получаются щёлочь KOH и водород." },
    { eq: "2Li + 2H2O -> 2LiOH + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях; спокойнее, чем натрий.",
      desc: "Литий реагирует с водой, получаются щёлочь LiOH и водород." },
    { eq: "Ca + 2H2O -> Ca(OH)2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.",
      desc: "Кальций реагирует с водой: выделяется водород, а раствор мутнеет от малорастворимого гидроксида кальция." },
    { eq: "Mg + 2H2O -> Mg(OH)2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "С горячей водой; с холодной почти не идёт.",
      desc: "Магний медленно вытесняет водород из горячей воды." },
    { eq: "3Fe + 4H2O -> Fe3O4 + 4H2", type: "замещение", tags: ["ОВР"],
      cond: "Раскалённое железо и водяной пар (высокая температура).",
      desc: "Раскалённое железо отнимает кислород у водяного пара — получаются железная окалина и водород. Это старинный способ получения водорода." },
    { eq: "Fe + CuSO4 -> FeSO4 + Cu", type: "замещение", tags: ["ОВР"],
      cond: "В растворе, при обычных условиях.",
      desc: "Железный гвоздь в растворе медного купороса покрывается красным налётом меди: более активное железо вытесняет медь из соли." },
    { eq: "Zn + CuSO4 -> ZnSO4 + Cu", type: "замещение", tags: ["ОВР"],
      cond: "В растворе, при обычных условиях.",
      desc: "Цинк вытесняет медь из раствора сульфата меди(II): голубой раствор светлеет, на цинке оседает медь." },
    { eq: "Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag", type: "замещение", tags: ["ОВР"],
      cond: "В растворе, при обычных условиях.",
      desc: "Медь вытесняет серебро из раствора нитрата серебра: на меди появляются кристаллы серебра, раствор голубеет." },
    { eq: "Cl2 + 2KBr -> 2KCl + Br2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.",
      desc: "Хлор активнее брома и вытесняет его из бромида: раствор окрашивается в жёлто-бурый цвет брома." },
    { eq: "Cl2 + 2KI -> 2KCl + I2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.",
      desc: "Хлор вытесняет йод из иодида калия, раствор буреет от выделившегося йода." },
    { eq: "Br2 + 2KI -> 2KBr + I2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.",
      desc: "Бром активнее йода и вытесняет его из иодида калия." },
    { eq: "CuO + H2 -> Cu + H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Водород отнимает кислород у оксида меди(II): чёрный порошок становится красным — это медь, а на стенках появляются капли воды." },
    { eq: "Fe2O3 + 3H2 -> 2Fe + 3H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Водород восстанавливает железо из оксида железа(III)." },
    { eq: "WO3 + 3H2 -> W + 3H2O", type: "замещение", tags: ["ОВР"],
      cond: "При высокой температуре. Так получают чистый вольфрам для нитей ламп.",
      desc: "Водород восстанавливает вольфрам из его оксида." },
    { eq: "Fe2O3 + 2Al -> Al2O3 + 2Fe", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "Смесь (термит) поджигают; температура поднимается так высоко, что железо получается расплавленным.",
      desc: "Алюминий отнимает кислород у оксида железа(III). Это алюмотермия — так, например, сваривают рельсы." },
    { eq: "2CuO + C -> 2Cu + CO2", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.",
      desc: "Углерод восстанавливает медь из оксида меди(II), выделяется углекислый газ." },
    { eq: "2Mg + CO2 -> 2MgO + C", type: "замещение", tags: ["ОВР"],
      cond: "Горящий магний продолжает гореть в углекислом газе.",
      desc: "Магний отнимает кислород даже у углекислого газа: получаются оксид магния и сажа (углерод). Поэтому горящий магний нельзя тушить углекислотным огнетушителем." },
    { eq: "2F2 + 2H2O -> 4HF + O2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.",
      desc: "Фтор настолько активен, что вытесняет кислород из воды." },
    { eq: "2H2S + O2 -> 2S + 2H2O", type: "замещение", tags: ["ОВР"],
      cond: "При недостатке кислорода.",
      desc: "Если кислорода мало, сероводород окисляется только до серы — на холодных предметах оседает жёлтый налёт." },

    // ---------- ОБМЕН ----------
    { eq: "NaOH + HCl -> NaCl + H2O", type: "обмен", tags: ["нейтрализация", "экзотермическая"],
      cond: "В растворе, при обычных условиях.",
      desc: "Щёлочь и кислота нейтрализуют друг друга: получаются соль (хлорид натрия) и вода." },
    { eq: "2NaOH + H2SO4 -> Na2SO4 + 2H2O", type: "обмен", tags: ["нейтрализация", "экзотермическая"],
      cond: "В растворе, при обычных условиях.",
      desc: "Гидроксид натрия нейтрализует серную кислоту, получаются сульфат натрия и вода." },
    { eq: "KOH + HNO3 -> KNO3 + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе, при обычных условиях.",
      desc: "Гидроксид калия нейтрализует азотную кислоту, получаются нитрат калия и вода." },
    { eq: "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "",
      desc: "Гидроксид кальция нейтрализует соляную кислоту, получаются хлорид кальция и вода." },
    { eq: "3NaOH + H3PO4 -> Na3PO4 + 3H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "Щёлочи нужно втрое больше, чем кислоты; если щёлочи меньше, получаются кислые соли.",
      desc: "Гидроксид натрия полностью нейтрализует фосфорную кислоту, получается фосфат натрия." },
    { eq: "Ba(OH)2 + H2SO4 -> BaSO4 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "",
      desc: "Гидроксид бария реагирует с серной кислотой, выпадает белый осадок сульфата бария." },
    { eq: "Cu(OH)2 + 2HCl -> CuCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "",
      desc: "Голубой осадок гидроксида меди(II) растворяется в соляной кислоте, получается раствор хлорида меди(II)." },
    { eq: "Al(OH)3 + 3HCl -> AlCl3 + 3H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "",
      desc: "Гидроксид алюминия растворяется в кислоте, получаются хлорид алюминия и вода." },
    { eq: "CuO + 2HCl -> CuCl2 + H2O", type: "обмен", tags: [],
      cond: "При нагревании.",
      desc: "Чёрный оксид меди(II) растворяется в соляной кислоте, получаются раствор хлорида меди(II) и вода." },
    { eq: "CuO + H2SO4 -> CuSO4 + H2O", type: "обмен", tags: [],
      cond: "При нагревании.",
      desc: "Оксид меди(II) растворяется в серной кислоте, получается голубой раствор сульфата меди(II)." },
    { eq: "MgO + 2HCl -> MgCl2 + H2O", type: "обмен", tags: [],
      cond: "",
      desc: "Оксид магния растворяется в соляной кислоте, получаются хлорид магния и вода." },
    { eq: "Fe2O3 + 6HCl -> 2FeCl3 + 3H2O", type: "обмен", tags: [],
      cond: "",
      desc: "Оксид железа(III) растворяется в соляной кислоте, получается жёлто-бурый раствор хлорида железа(III). Поэтому кислоты растворяют ржавчину." },
    { eq: "CaCO3 + 2HCl -> CaCl2 + H2O + CO2", type: "обмен", tags: [],
      cond: "При обычных условиях.",
      desc: "Мел или мрамор «шипит» в соляной кислоте: выделяется углекислый газ. Образующаяся угольная кислота сразу распадается на воду и CO₂." },
    { eq: "Na2CO3 + 2HCl -> 2NaCl + H2O + CO2", type: "обмен", tags: ["качественная реакция"],
      cond: "При обычных условиях.",
      desc: "Карбонат натрия реагирует с соляной кислотой, выделяется углекислый газ. Так обнаруживают карбонаты." },
    { eq: "NaHCO3 + HCl -> NaCl + H2O + CO2", type: "обмен", tags: [],
      cond: "При обычных условиях.",
      desc: "Пищевая сода реагирует с соляной кислотой, выделяется углекислый газ." },
    { eq: "NaHCO3 + CH3COOH -> CH3COONa + H2O + CO2", type: "обмен", tags: [],
      cond: "При обычных условиях — например, когда соду «гасят» уксусом.",
      desc: "Пищевая сода реагирует с уксусной кислотой, и смесь вспенивается от углекислого газа." },
    { eq: "AgNO3 + NaCl -> AgCl + NaNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает белый творожистый осадок хлорида серебра. Так обнаруживают хлорид-ионы." },
    { eq: "AgNO3 + KBr -> AgBr + KNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает светло-жёлтый осадок бромида серебра. Так обнаруживают бромид-ионы." },
    { eq: "BaCl2 + H2SO4 -> BaSO4 + 2HCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает белый осадок сульфата бария, который не растворяется в кислотах. Так обнаруживают сульфат-ионы." },
    { eq: "BaCl2 + Na2SO4 -> BaSO4 + 2NaCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Хлорид бария и сульфат натрия обмениваются составными частями, выпадает белый осадок сульфата бария." },
    { eq: "CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает голубой осадок гидроксида меди(II). Так обнаруживают ионы меди(II)." },
    { eq: "FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает бурый осадок гидроксида железа(III). Так обнаруживают ионы железа(III)." },
    { eq: "FeSO4 + 2NaOH -> Fe(OH)2 + Na2SO4", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.",
      desc: "Выпадает светло-зелёный осадок гидроксида железа(II); на воздухе он постепенно буреет, окисляясь." },
    { eq: "Pb(NO3)2 + 2KI -> PbI2 + 2KNO3", type: "обмен", tags: [],
      cond: "В растворе. Соединения свинца ядовиты.",
      desc: "Выпадает ярко-жёлтый осадок иодида свинца(II). Если растворить его в горячей воде и охладить, выпадают блестящие кристаллы — опыт «золотой дождь»." },
    { eq: "NH4Cl + NaOH -> NaCl + NH3 + H2O", type: "обмен", tags: ["качественная реакция"],
      cond: "При нагревании.",
      desc: "Выделяется аммиак с резким запахом; влажная красная лакмусовая бумажка синеет. Так обнаруживают ионы аммония." },
    { eq: "FeS + 2HCl -> FeCl2 + H2S", type: "обмен", tags: [],
      cond: "Только под тягой: сероводород ядовит.",
      desc: "Сульфид железа(II) реагирует с соляной кислотой, выделяется сероводород с запахом тухлых яиц. Лабораторный способ получения H₂S." },
    { eq: "Na2SO3 + 2HCl -> 2NaCl + H2O + SO2", type: "обмен", tags: [],
      cond: "",
      desc: "Сульфит натрия реагирует с соляной кислотой, выделяется сернистый газ с резким запахом." },

    // ---------- ДРУГИЕ РЕАКЦИИ ----------
    { eq: "Ca(OH)2 + CO2 -> CaCO3 + H2O", type: "другое", note: "щёлочь + кислотный оксид", tags: ["качественная реакция"],
      cond: "При обычных условиях.",
      desc: "Прозрачная известковая вода мутнеет: образуется нерастворимый карбонат кальция. Так обнаруживают углекислый газ — например, в выдыхаемом воздухе." },
    { eq: "2NaOH + CO2 -> Na2CO3 + H2O", type: "другое", note: "щёлочь + кислотный оксид", tags: [],
      cond: "",
      desc: "Щёлочь поглощает углекислый газ, получаются карбонат натрия и вода." },
    { eq: "SiO2 + 2NaOH -> Na2SiO3 + H2O", type: "другое", note: "щёлочь + кислотный оксид", tags: [],
      cond: "При сплавлении.",
      desc: "Оксид кремния(IV) при сплавлении со щёлочью образует силикат натрия — его раствор называют жидким стеклом." },
    { eq: "Cl2 + H2O <=> HCl + HClO", type: "другое", note: "хлор одновременно окислитель и восстановитель (диспропорционирование)", tags: ["ОВР"],
      cond: "При растворении хлора в воде (хлорная вода).",
      desc: "Часть хлора реагирует с водой, получаются соляная и хлорноватистая кислоты. Хлорноватистая кислота обеззараживает воду и отбеливает ткани." },
    { eq: "CH4 + 2O2 -> CO2 + 2H2O", type: "другое", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание. Смесь метана с воздухом взрывоопасна.",
      desc: "Метан (основная часть природного газа) сгорает, получаются углекислый газ и вода." },
    { eq: "C3H8 + 5O2 -> 3CO2 + 4H2O", type: "другое", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.",
      desc: "Пропан (газ в баллонах) сгорает до углекислого газа и воды." },
    { eq: "2C4H10 + 13O2 -> 8CO2 + 10H2O", type: "другое", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.",
      desc: "Бутан (газ в зажигалках) сгорает до углекислого газа и воды." },
    { eq: "2C2H2 + 5O2 -> 4CO2 + 2H2O", type: "другое", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.",
      desc: "Ацетилен горит очень горячим пламенем — его используют для сварки и резки металлов." },
    { eq: "C2H5OH + 3O2 -> 2CO2 + 3H2O", type: "другое", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.",
      desc: "Этиловый спирт горит почти бесцветным синеватым пламенем, получаются углекислый газ и вода." },
    { eq: "2H2S + 3O2 -> 2H2O + 2SO2", type: "другое", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание, кислорода достаточно.",
      desc: "Сероводород сгорает, получаются вода и сернистый газ." },
    { eq: "4NH3 + 3O2 -> 2N2 + 6H2O", type: "замещение", note: "горение", tags: ["ОВР", "горение"],
      cond: "Аммиак горит в чистом кислороде (на воздухе не горит), без катализатора.",
      desc: "При горении аммиака получаются азот и вода." },
    { eq: "4NH3 + 5O2 -> 4NO + 6H2O", type: "другое", note: "каталитическое окисление аммиака", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор — платина, высокая температура. Это первая стадия промышленного получения азотной кислоты.",
      desc: "На платиновом катализаторе аммиак окисляется не до азота, а до оксида азота(II)." },
    { eq: "C6H12O6 + 6O2 -> 6CO2 + 6H2O", type: "другое", note: "окисление глюкозы — суммарное уравнение клеточного дыхания", tags: ["ОВР", "экзотермическая"],
      cond: "В клетках живых организмов идёт постепенно, через много стадий, при участии ферментов.",
      desc: "Глюкоза окисляется кислородом до углекислого газа и воды. Выделяющаяся энергия нужна для жизни клетки." },
    { eq: "6CO2 + 6H2O -> C6H12O6 + 6O2", type: "другое", note: "фотосинтез — суммарное уравнение", tags: ["ОВР", "эндотермическая"],
      cond: "На свету, в зелёных частях растений, с участием хлорофилла.",
      desc: "Растения с помощью энергии света превращают углекислый газ и воду в глюкозу. Кислород выделяется в атмосферу." },
    { eq: "Fe2O3 + 3CO -> 2Fe + 3CO2", type: "другое", note: "восстановление металла угарным газом", tags: ["ОВР"],
      cond: "При высокой температуре в доменной печи.",
      desc: "Угарный газ отнимает кислород у оксида железа(III), и получается железо. Так выплавляют чугун." },
    { eq: "Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O", type: "другое", note: "металл + кислота-окислитель", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой. Выделяется ядовитый бурый газ — только под тягой.",
      desc: "Медь не вытесняет водород из кислот, но концентрированная азотная кислота окисляет её. Выделяется бурый газ NO₂, водорода нет." },
    { eq: "3Cu + 8HNO3 -> 3Cu(NO3)2 + 2NO + 4H2O", type: "другое", note: "металл + кислота-окислитель", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.",
      desc: "Разбавленная азотная кислота тоже окисляет медь, но выделяется бесцветный NO (на воздухе он буреет, превращаясь в NO₂)." },
    { eq: "Cu + 2H2SO4 -> CuSO4 + SO2 + 2H2O", type: "другое", note: "металл + кислота-окислитель", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, при нагревании. С разбавленной серной кислотой медь не реагирует.",
      desc: "Концентрированная серная кислота окисляет медь, выделяется сернистый газ." },
    { eq: "MnO2 + 4HCl -> MnCl2 + Cl2 + 2H2O", type: "другое", note: "окисление хлороводорода", tags: ["ОВР"],
      cond: "С концентрированной соляной кислотой, при нагревании. Хлор ядовит — только под тягой.",
      desc: "Оксид марганца(IV) окисляет хлороводород до хлора. Это лабораторный способ получения хлора." },
    { eq: "2Al + 2NaOH + 6H2O -> 2Na[Al(OH)4] + 3H2", type: "другое", note: "амфотерный металл + щёлочь", tags: ["ОВР"],
      cond: "В растворе щёлочи.",
      desc: "Алюминий растворяется в щёлочи с выделением водорода: щёлочь разрушает защитную оксидную плёнку, и проявляется амфотерность алюминия." },
    { eq: "4Ag + 2H2S + O2 -> 2Ag2S + 2H2O", type: "другое", note: "окисление металла", tags: ["ОВР"],
      cond: "Медленно, при обычных условиях, если в воздухе есть следы сероводорода.",
      desc: "Так темнеют серебряные украшения: на их поверхности образуется чёрный сульфид серебра." }
  ]
};
/* ============================================================
   ATOMIX LAB · ИОНЫ
   ions   — таблица ионов (f — формула, z — заряд, n — название,
            org: true — органический анион, который в формуле соли пишут
            первым: CH3COONa). По этой таблице программа раскладывает
            растворимые соли, кислоты и щёлочи на ионы и строит
            полные ионные уравнения.
   ionFor — сокращённые ионные уравнения для реакций базового курса.
   ============================================================ */
window.ATOMIX_CHEM_DATA.ions = [
  // катионы
  { f: "H", z: 1, n: "катион водорода" },
  { f: "Li", z: 1, n: "катион лития" },
  { f: "Na", z: 1, n: "катион натрия" },
  { f: "K", z: 1, n: "катион калия" },
  { f: "Rb", z: 1, n: "катион рубидия" },
  { f: "Cs", z: 1, n: "катион цезия" },
  { f: "NH4", z: 1, n: "катион аммония" },
  { f: "Ag", z: 1, n: "катион серебра" },
  { f: "Be", z: 2, n: "катион бериллия" },
  { f: "Mg", z: 2, n: "катион магния" },
  { f: "Ca", z: 2, n: "катион кальция" },
  { f: "Sr", z: 2, n: "катион стронция" },
  { f: "Ba", z: 2, n: "катион бария" },
  { f: "Zn", z: 2, n: "катион цинка" },
  { f: "Cu", z: 2, n: "катион меди(II)" },
  { f: "Fe", z: 2, n: "катион железа(II)" },
  { f: "Fe", z: 3, n: "катион железа(III)" },
  { f: "Mn", z: 2, n: "катион марганца(II)" },
  { f: "Ni", z: 2, n: "катион никеля(II)" },
  { f: "Co", z: 2, n: "катион кобальта(II)" },
  { f: "Pb", z: 2, n: "катион свинца(II)" },
  { f: "Sn", z: 2, n: "катион олова(II)" },
  { f: "Hg", z: 2, n: "катион ртути(II)" },
  { f: "Cd", z: 2, n: "катион кадмия" },
  { f: "Al", z: 3, n: "катион алюминия" },
  { f: "Cr", z: 3, n: "катион хрома(III)" },
  { f: "[Cu(NH3)4]", z: 2, n: "катион тетраамминмеди(II)" },
  { f: "[Ag(NH3)2]", z: 1, n: "катион диамминсеребра(I)" },
  { f: "[CH3NH3]", z: 1, n: "катион метиламмония" },
  { f: "[C2H5NH3]", z: 1, n: "катион этиламмония" },
  { f: "[(CH3)2NH2]", z: 1, n: "катион диметиламмония" },
  { f: "[C6H5NH3]", z: 1, n: "катион фениламмония" },
  { f: "[NH3CH2COOH]", z: 1, n: "протонированная форма глицина" },
  // анионы
  { f: "OH", z: -1, n: "гидроксид-ион" },
  { f: "F", z: -1, n: "фторид-ион" },
  { f: "Cl", z: -1, n: "хлорид-ион" },
  { f: "Br", z: -1, n: "бромид-ион" },
  { f: "I", z: -1, n: "иодид-ион" },
  { f: "S", z: -2, n: "сульфид-ион" },
  { f: "HS", z: -1, n: "гидросульфид-ион" },
  { f: "SO4", z: -2, n: "сульфат-ион" },
  { f: "HSO4", z: -1, n: "гидросульфат-ион" },
  { f: "SO3", z: -2, n: "сульфит-ион" },
  { f: "HSO3", z: -1, n: "гидросульфит-ион" },
  { f: "S2O3", z: -2, n: "тиосульфат-ион" },
  { f: "NO3", z: -1, n: "нитрат-ион" },
  { f: "NO2", z: -1, n: "нитрит-ион" },
  { f: "PO4", z: -3, n: "фосфат-ион" },
  { f: "HPO4", z: -2, n: "гидрофосфат-ион" },
  { f: "H2PO4", z: -1, n: "дигидрофосфат-ион" },
  { f: "CO3", z: -2, n: "карбонат-ион" },
  { f: "HCO3", z: -1, n: "гидрокарбонат-ион" },
  { f: "SiO3", z: -2, n: "силикат-ион" },
  { f: "CrO4", z: -2, n: "хромат-ион" },
  { f: "Cr2O7", z: -2, n: "дихромат-ион" },
  { f: "MnO4", z: -1, n: "перманганат-ион" },
  { f: "MnO4", z: -2, n: "манганат-ион" },
  { f: "ClO", z: -1, n: "гипохлорит-ион" },
  { f: "ClO3", z: -1, n: "хлорат-ион" },
  { f: "ClO4", z: -1, n: "перхлорат-ион" },
  { f: "SCN", z: -1, n: "тиоцианат-ион" },
  { f: "C2O4", z: -2, n: "оксалат-ион" },
  { f: "CH3COO", z: -1, n: "ацетат-ион", org: true },
  { f: "HCOO", z: -1, n: "формиат-ион", org: true },
  { f: "C6H5COO", z: -1, n: "бензоат-ион", org: true },
  { f: "C6H5O", z: -1, n: "фенолят-ион", org: true },
  { f: "C17H35COO", z: -1, n: "стеарат-ион", org: true },
  { f: "NH2CH2COO", z: -1, n: "глицинат-ион", org: true },
  { f: "[Al(OH)4]", z: -1, n: "тетрагидроксоалюминат-ион" },
  { f: "[Zn(OH)4]", z: -2, n: "тетрагидроксоцинкат-ион" },
  { f: "[Cr(OH)6]", z: -3, n: "гексагидроксохромат(III)-ион" },
  { f: "[Fe(CN)6]", z: -3, n: "гексацианоферрат(III)-ион" },
  { f: "[Fe(CN)6]", z: -4, n: "гексацианоферрат(II)-ион" }
];

window.ATOMIX_CHEM_DATA.packs.push({
  ionFor: {
    "NaOH + HCl -> NaCl + H2O": "H+ + OH- -> H2O",
    "2NaOH + H2SO4 -> Na2SO4 + 2H2O": "H+ + OH- -> H2O",
    "KOH + HNO3 -> KNO3 + H2O": "H+ + OH- -> H2O",
    "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O": "H+ + OH- -> H2O",
    "3NaOH + H3PO4 -> Na3PO4 + 3H2O": "H3PO4 + 3OH- -> PO4^3- + 3H2O",
    "Ba(OH)2 + H2SO4 -> BaSO4 + 2H2O": "Ba^2+ + 2OH- + 2H+ + SO4^2- -> BaSO4 + 2H2O",
    "Cu(OH)2 + 2HCl -> CuCl2 + 2H2O": "Cu(OH)2 + 2H+ -> Cu^2+ + 2H2O",
    "Al(OH)3 + 3HCl -> AlCl3 + 3H2O": "Al(OH)3 + 3H+ -> Al^3+ + 3H2O",
    "CuO + 2HCl -> CuCl2 + H2O": "CuO + 2H+ -> Cu^2+ + H2O",
    "CuO + H2SO4 -> CuSO4 + H2O": "CuO + 2H+ -> Cu^2+ + H2O",
    "MgO + 2HCl -> MgCl2 + H2O": "MgO + 2H+ -> Mg^2+ + H2O",
    "Fe2O3 + 6HCl -> 2FeCl3 + 3H2O": "Fe2O3 + 6H+ -> 2Fe^3+ + 3H2O",
    "CaCO3 + 2HCl -> CaCl2 + H2O + CO2": "CaCO3 + 2H+ -> Ca^2+ + H2O + CO2",
    "Na2CO3 + 2HCl -> 2NaCl + H2O + CO2": "CO3^2- + 2H+ -> H2O + CO2",
    "NaHCO3 + HCl -> NaCl + H2O + CO2": "HCO3- + H+ -> H2O + CO2",
    "NaHCO3 + CH3COOH -> CH3COONa + H2O + CO2": "HCO3- + CH3COOH -> CH3COO- + H2O + CO2",
    "AgNO3 + NaCl -> AgCl + NaNO3": "Ag+ + Cl- -> AgCl",
    "AgNO3 + KBr -> AgBr + KNO3": "Ag+ + Br- -> AgBr",
    "BaCl2 + H2SO4 -> BaSO4 + 2HCl": "Ba^2+ + SO4^2- -> BaSO4",
    "BaCl2 + Na2SO4 -> BaSO4 + 2NaCl": "Ba^2+ + SO4^2- -> BaSO4",
    "CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4": "Cu^2+ + 2OH- -> Cu(OH)2",
    "FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl": "Fe^3+ + 3OH- -> Fe(OH)3",
    "FeSO4 + 2NaOH -> Fe(OH)2 + Na2SO4": "Fe^2+ + 2OH- -> Fe(OH)2",
    "Pb(NO3)2 + 2KI -> PbI2 + 2KNO3": "Pb^2+ + 2I- -> PbI2",
    "NH4Cl + NaOH -> NaCl + NH3 + H2O": "NH4+ + OH- -> NH3 + H2O",
    "FeS + 2HCl -> FeCl2 + H2S": "FeS + 2H+ -> Fe^2+ + H2S",
    "Na2SO3 + 2HCl -> 2NaCl + H2O + SO2": "SO3^2- + 2H+ -> H2O + SO2",
    "Ca(OH)2 + CO2 -> CaCO3 + H2O": "Ca^2+ + 2OH- + CO2 -> CaCO3 + H2O",
    "2NaOH + CO2 -> Na2CO3 + H2O": "2OH- + CO2 -> CO3^2- + H2O",
    "Al(OH)3 + NaOH -> Na[Al(OH)4]": "Al(OH)3 + OH- -> [Al(OH)4]-",
    "NH3 + HNO3 -> NH4NO3": "NH3 + H+ -> NH4+",
    "Zn + 2HCl -> ZnCl2 + H2": "Zn + 2H+ -> Zn^2+ + H2",
    "Fe + 2HCl -> FeCl2 + H2": "Fe + 2H+ -> Fe^2+ + H2",
    "Mg + 2HCl -> MgCl2 + H2": "Mg + 2H+ -> Mg^2+ + H2",
    "2Al + 6HCl -> 2AlCl3 + 3H2": "2Al + 6H+ -> 2Al^3+ + 3H2",
    "Zn + H2SO4 -> ZnSO4 + H2": "Zn + 2H+ -> Zn^2+ + H2",
    "Fe + H2SO4 -> FeSO4 + H2": "Fe + 2H+ -> Fe^2+ + H2",
    "Mg + H2SO4 -> MgSO4 + H2": "Mg + 2H+ -> Mg^2+ + H2",
    "Fe + CuSO4 -> FeSO4 + Cu": "Fe + Cu^2+ -> Fe^2+ + Cu",
    "Zn + CuSO4 -> ZnSO4 + Cu": "Zn + Cu^2+ -> Zn^2+ + Cu",
    "Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag": "Cu + 2Ag+ -> Cu^2+ + 2Ag",
    "Cl2 + 2KBr -> 2KCl + Br2": "Cl2 + 2Br- -> 2Cl- + Br2",
    "Cl2 + 2KI -> 2KCl + I2": "Cl2 + 2I- -> 2Cl- + I2",
    "Br2 + 2KI -> 2KBr + I2": "Br2 + 2I- -> 2Br- + I2",
    "2Na + 2H2O -> 2NaOH + H2": "2Na + 2H2O -> 2Na+ + 2OH- + H2",
    "2K + 2H2O -> 2KOH + H2": "2K + 2H2O -> 2K+ + 2OH- + H2",
    "Cl2 + H2O <=> HCl + HClO": "Cl2 + H2O <=> H+ + Cl- + HClO",
    "2Al + 2NaOH + 6H2O -> 2Na[Al(OH)4] + 3H2": "2Al + 2OH- + 6H2O -> 2[Al(OH)4]- + 3H2",
    "Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O": "Cu + 4H+ + 2NO3- -> Cu^2+ + 2NO2 + 2H2O",
    "3Cu + 8HNO3 -> 3Cu(NO3)2 + 2NO + 4H2O": "3Cu + 8H+ + 2NO3- -> 3Cu^2+ + 2NO + 4H2O",
    "MnO2 + 4HCl -> MnCl2 + Cl2 + 2H2O": "MnO2 + 4H+ + 2Cl- -> Mn^2+ + Cl2 + 2H2O"
  }
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Галогены */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Галогены и их соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "HBr", n: "бромоводород", a: ["бромоводородная кислота"] },
    { f: "HI", n: "иодоводород", a: ["йодоводород", "иодоводородная кислота"] },
    { f: "NaF", n: "фторид натрия" },
    { f: "NaBr", n: "бромид натрия" },
    { f: "NaI", n: "иодид натрия", a: ["йодид натрия"] },
    { f: "AgI", n: "иодид серебра", a: ["йодид серебра"] },
    { f: "NaClO", n: "гипохлорит натрия" },
    { f: "NaClO3", n: "хлорат натрия" },
    { f: "Ca(ClO)2", n: "гипохлорит кальция" },
    { f: "KClO4", n: "перхлорат калия" },
    { f: "KIO3", n: "иодат калия" },
    { f: "HIO3", n: "иодноватая кислота" },
    { f: "OF2", n: "фторид кислорода" },
    { f: "CaF2", n: "фторид кальция", a: ["флюорит", "плавиковый шпат"] },
    { f: "CaSO4", n: "сульфат кальция", a: ["гипс безводный"] },
    { f: "SiF4", n: "фторид кремния(IV)" },
    { f: "K2SO4", n: "сульфат калия" },
    { f: "NaHSO4", n: "гидросульфат натрия" }
  ],
  reactions: [
    { eq: "H2 + F2 -> 2HF", type: "соединение", tags: ["ОВР", "экзотермическая"],
      cond: "Со взрывом даже в темноте и на холоду.", desc: "Фтор — самый активный неметалл: с водородом он реагирует мгновенно." },
    { eq: "H2 + Br2 -> 2HBr", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Бром соединяется с водородом менее активно, чем хлор, — нужен нагрев." },
    { eq: "H2 + I2 <=> 2HI", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании; реакция обратимая и до конца не идёт.", desc: "Активность галогенов падает сверху вниз по группе: йод соединяется с водородом хуже всех." },
    { eq: "Cl2 + 2NaOH -> NaCl + NaClO + H2O", type: "другое", note: "диспропорционирование хлора в щёлочи", tags: ["ОВР"],
      cond: "В холодном растворе щёлочи.", desc: "Хлор одновременно окисляется и восстанавливается: получаются хлорид и гипохлорит натрия. Такой раствор — отбеливатель.",
      ion: "Cl2 + 2OH- -> Cl- + ClO- + H2O" },
    { eq: "3Cl2 + 6NaOH -> 5NaCl + NaClO3 + 3H2O", type: "другое", note: "диспропорционирование хлора в горячей щёлочи", tags: ["ОВР"],
      cond: "В горячем растворе щёлочи.", desc: "При нагревании вместо гипохлорита получается хлорат.",
      ion: "3Cl2 + 6OH- -> 5Cl- + ClO3- + 3H2O" },
    { eq: "3Cl2 + 6KOH -> 5KCl + KClO3 + 3H2O", type: "другое", note: "диспропорционирование хлора в горячей щёлочи", tags: ["ОВР"],
      cond: "В горячем растворе щёлочи.", desc: "Так получают бертолетову соль KClO₃.",
      ion: "3Cl2 + 6OH- -> 5Cl- + ClO3- + 3H2O" },
    { eq: "2Cl2 + 2Ca(OH)2 -> CaCl2 + Ca(ClO)2 + 2H2O", type: "другое", note: "диспропорционирование хлора", tags: ["ОВР"],
      cond: "Хлор пропускают через гашёную известь.", desc: "Получается смесь хлорида и гипохлорита кальция — основа хлорной извести для дезинфекции." },
    { eq: "2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O", type: "другое", note: "окисление хлороводорода", tags: ["ОВР"],
      cond: "С концентрированной соляной кислотой, при обычной температуре. Только под тягой.", desc: "Перманганат калия окисляет хлорид-ионы до хлора — удобный лабораторный способ получения хлора.",
      ion: "2MnO4- + 16H+ + 10Cl- -> 2Mn^2+ + 5Cl2 + 8H2O" },
    { eq: "KClO3 + 6HCl -> KCl + 3Cl2 + 3H2O", type: "другое", note: "сопропорционирование хлора", tags: ["ОВР"],
      cond: "С концентрированной соляной кислотой.", desc: "Хлор из хлората (+5) и из хлороводорода (−1) переходит в одну степень окисления 0.",
      ion: "ClO3- + 6H+ + 5Cl- -> 3Cl2 + 3H2O" },
    { eq: "NaClO + 2HCl -> NaCl + Cl2 + H2O", type: "другое", note: "сопропорционирование хлора", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Отбеливатель с гипохлоритом нельзя смешивать с кислотными средствами: выделяется ядовитый хлор.",
      ion: "ClO- + 2H+ + Cl- -> Cl2 + H2O" },
    { eq: "Ca(ClO)2 + 4HCl -> CaCl2 + 2Cl2 + 2H2O", type: "другое", note: "сопропорционирование хлора", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Гипохлорит кальция с соляной кислотой тоже выделяет хлор." },
    { eq: "2NaCl + H2SO4 -> Na2SO4 + 2HCl", type: "обмен", tags: [],
      cond: "Твёрдая соль и концентрированная серная кислота, сильное нагревание.", desc: "Нелетучая серная кислота вытесняет летучий хлороводород. Лабораторный способ получения HCl." },
    { eq: "NaCl + H2SO4 -> NaHSO4 + HCl", type: "обмен", tags: [],
      cond: "Твёрдая соль и концентрированная серная кислота, слабое нагревание.", desc: "При слабом нагревании образуется кислая соль — гидросульфат натрия." },
    { eq: "CaF2 + H2SO4 -> CaSO4 + 2HF", type: "обмен", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Так из флюорита получают фтороводород." },
    { eq: "SiO2 + 4HF -> SiF4 + 2H2O", type: "другое", note: "кислотный оксид + фтороводород", tags: [],
      cond: "При обычных условиях.", desc: "Плавиковая кислота разъедает стекло — её хранят в пластиковой посуде, а реакцию используют для травления стекла." },
    { eq: "2KBr + 2H2SO4 -> K2SO4 + Br2 + SO2 + 2H2O", type: "другое", note: "окисление бромида концентрированной серной кислотой", tags: ["ОВР"],
      cond: "Твёрдый бромид и концентрированная серная кислота.", desc: "Бромид-ион — более сильный восстановитель, чем хлорид: серная кислота окисляет его до брома." },
    { eq: "8KI + 5H2SO4 -> 4K2SO4 + 4I2 + H2S + 4H2O", type: "другое", note: "окисление иодида концентрированной серной кислотой", tags: ["ОВР"],
      cond: "Твёрдый иодид и концентрированная серная кислота.", desc: "Иодид-ион — сильный восстановитель: серная кислота восстанавливается до сероводорода." },
    { eq: "2HBr + H2SO4 -> Br2 + SO2 + 2H2O", type: "другое", note: "окисление бромоводорода", tags: ["ОВР"],
      cond: "Концентрированная серная кислота.", desc: "Поэтому бромоводород нельзя получать из бромидов действием концентрированной серной кислоты." },
    { eq: "8HI + H2SO4 -> 4I2 + H2S + 4H2O", type: "другое", note: "окисление иодоводорода", tags: ["ОВР"],
      cond: "Концентрированная серная кислота.", desc: "Иодоводород восстанавливает серную кислоту до сероводорода." },
    { eq: "Cl2 + H2S -> S + 2HCl", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях (например, в растворе).", desc: "Хлор окисляет сероводород: выпадает жёлтая сера." },
    { eq: "4Cl2 + H2S + 4H2O -> H2SO4 + 8HCl", type: "другое", note: "окисление сероводорода избытком хлора", tags: ["ОВР"],
      cond: "Избыток хлорной воды.", desc: "При избытке хлора сера окисляется до максимальной степени окисления +6." },
    { eq: "Cl2 + SO2 + 2H2O -> H2SO4 + 2HCl", type: "другое", note: "окисление сернистого газа", tags: ["ОВР"],
      cond: "В водном растворе.", desc: "Хлор окисляет сернистый газ до серной кислоты." },
    { eq: "Br2 + SO2 + 2H2O -> H2SO4 + 2HBr", type: "другое", note: "окисление сернистого газа", tags: ["ОВР", "качественная реакция"],
      cond: "В водном растворе.", desc: "Бромная вода обесцвечивается — так можно обнаружить сернистый газ." },
    { eq: "I2 + SO2 + 2H2O -> H2SO4 + 2HI", type: "другое", note: "окисление сернистого газа", tags: ["ОВР"],
      cond: "В водном растворе.", desc: "Раствор йода обесцвечивается сернистым газом." },
    { eq: "I2 + H2S -> S + 2HI", type: "замещение", tags: ["ОВР"],
      cond: "В водном растворе.", desc: "Йод окисляет сероводород до серы." },
    { eq: "2HClO -> 2HCl + O2", type: "разложение", tags: ["ОВР"],
      cond: "На свету.", desc: "Хлорноватистая кислота неустойчива и на свету распадается, выделяя кислород." },
    { eq: "4KClO3 -> 3KClO4 + KCl", type: "разложение", note: "диспропорционирование", tags: ["ОВР"],
      cond: "Осторожное нагревание без катализатора.", desc: "Без катализатора бертолетова соль превращается в перхлорат и хлорид калия, кислород не выделяется." },
    { eq: "2NaBr + Cl2 -> 2NaCl + Br2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Хлор вытесняет бром из бромидов.", ion: "2Br- + Cl2 -> 2Cl- + Br2" },
    { eq: "2NaI + Cl2 -> 2NaCl + I2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Хлор вытесняет йод из иодидов.", ion: "2I- + Cl2 -> 2Cl- + I2" },
    { eq: "5Cl2 + I2 + 6H2O -> 2HIO3 + 10HCl", type: "другое", note: "окисление йода избытком хлора", tags: ["ОВР"],
      cond: "Избыток хлорной воды.", desc: "Если хлора много, выделившийся йод окисляется дальше — до иодноватой кислоты, и бурая окраска исчезает." },
    { eq: "3I2 + 6KOH -> 5KI + KIO3 + 3H2O", type: "другое", note: "диспропорционирование йода", tags: ["ОВР"],
      cond: "В растворе щёлочи при нагревании.", desc: "Йод в щёлочи одновременно окисляется до иодата и восстанавливается до иодида." },
    { eq: "2KI + O3 + H2O -> I2 + O2 + 2KOH", type: "другое", note: "окисление иодида озоном", tags: ["ОВР", "качественная реакция"],
      cond: "При обычных условиях.", desc: "Озон окисляет иодид до йода, а кислород — нет. Так озон отличают от кислорода (бумажка с крахмалом и KI синеет)." },
    { eq: "2KI + H2O2 + H2SO4 -> I2 + K2SO4 + 2H2O", type: "другое", note: "окисление иодида пероксидом водорода", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Пероксид водорода окисляет иодид-ионы до йода — раствор буреет.",
      ion: "2I- + H2O2 + 2H+ -> I2 + 2H2O" },
    { eq: "AgNO3 + KI -> AgI + KNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает жёлтый осадок иодида серебра — так обнаруживают иодид-ионы.", ion: "Ag+ + I- -> AgI" },
    { eq: "AgNO3 + HCl -> AgCl + HNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает белый творожистый осадок хлорида серебра.", ion: "Ag+ + Cl- -> AgCl" },
    { eq: "2AgCl -> 2Ag + Cl2", type: "разложение", tags: ["ОВР"],
      cond: "На свету.", desc: "Хлорид серебра темнеет на свету: выделяется серебро. На похожей реакции галогенидов серебра основана фотография." },
    { eq: "2F2 + 2NaOH -> 2NaF + OF2 + H2O", type: "другое", note: "окисление фтором", tags: ["ОВР"],
      cond: "Разбавленный холодный раствор щёлочи.", desc: "Фтор окисляет даже кислород: образуется фторид кислорода, где кислород имеет степень окисления +2." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Кислород и сера */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Кислород, сера и их соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "FeS2", n: "дисульфид железа(II)", a: ["пирит", "железный колчедан"] },
    { f: "Na2S", n: "сульфид натрия" },
    { f: "K2S", n: "сульфид калия" },
    { f: "NaHS", n: "гидросульфид натрия" },
    { f: "K2SO3", n: "сульфит калия" },
    { f: "NaHSO3", n: "гидросульфит натрия" },
    { f: "CaSO3", n: "сульфит кальция" },
    { f: "Na2S2O3", n: "тиосульфат натрия" },
    { f: "Na2S4O6", n: "тетратионат натрия" },
    { f: "CuS", n: "сульфид меди(II)" },
    { f: "PbS", n: "сульфид свинца(II)" },
    { f: "PbSO4", n: "сульфат свинца(II)" },
    { f: "SF6", n: "фторид серы(VI)" },
    { f: "H2S2O7", n: "дисерная кислота", a: ["пиросерная кислота", "олеум"] },
    { f: "Ag2O", n: "оксид серебра(I)" },
    { f: "BaO2", n: "пероксид бария" },
    { f: "Ba(NO3)2", n: "нитрат бария" },
    { f: "ZnCl2", n: "хлорид цинка" }
  ],
  reactions: [
    { eq: "2H2S + SO2 -> 3S + 2H2O", type: "другое", note: "сопропорционирование серы", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Сера из сероводорода (−2) и из сернистого газа (+4) переходит в простое вещество (0). Так серу выделяют из газов." },
    { eq: "3S + 6KOH -> 2K2S + K2SO3 + 3H2O", type: "другое", note: "диспропорционирование серы", tags: ["ОВР"],
      cond: "При нагревании в концентрированной щёлочи.", desc: "Сера одновременно окисляется (до +4) и восстанавливается (до −2)." },
    { eq: "S + 2H2SO4 -> 3SO2 + 2H2O", type: "другое", note: "сопропорционирование", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, при нагревании.", desc: "Концентрированная серная кислота окисляет серу, сама восстанавливаясь до сернистого газа." },
    { eq: "S + 6HNO3 -> H2SO4 + 6NO2 + 2H2O", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой, при нагревании.", desc: "Концентрированная азотная кислота окисляет серу до серной кислоты, выделяется бурый газ." },
    { eq: "S + 2HNO3 -> H2SO4 + 2NO", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой, при нагревании.", desc: "Разбавленная азотная кислота восстанавливается до NO." },
    { eq: "2Na + S -> Na2S", type: "соединение", tags: ["ОВР"],
      cond: "При растирании или нагревании.", desc: "Натрий соединяется с серой, получается сульфид натрия." },
    { eq: "S + 3F2 -> SF6", type: "соединение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Фтор окисляет серу до высшей степени окисления +6." },
    { eq: "4FeS2 + 11O2 -> 2Fe2O3 + 8SO2", type: "другое", note: "обжиг пирита", tags: ["ОВР"],
      cond: "При сильном нагревании на воздухе. Первая стадия производства серной кислоты.", desc: "При обжиге пирита окисляются и железо, и сера." },
    { eq: "H2S + 2NaOH -> Na2S + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "Избыток щёлочи.", desc: "Сероводородная кислота нейтрализуется щёлочью — получается средняя соль.", ion: "H2S + 2OH- -> S^2- + 2H2O" },
    { eq: "H2S + NaOH -> NaHS + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "Недостаток щёлочи (1 : 1).", desc: "Если щёлочи мало, образуется кислая соль — гидросульфид.", ion: "H2S + OH- -> HS- + H2O" },
    { eq: "Na2S + 2HCl -> 2NaCl + H2S", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Сильная кислота вытесняет слабую сероводородную: чувствуется запах тухлых яиц.", ion: "S^2- + 2H+ -> H2S" },
    { eq: "CuSO4 + H2S -> CuS + H2SO4", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает чёрный сульфид меди(II). Он не растворяется даже в кислоте, поэтому слабая кислота здесь вытесняет сильную.",
      ion: "Cu^2+ + H2S -> CuS + 2H+" },
    { eq: "Pb(NO3)2 + H2S -> PbS + 2HNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает чёрный сульфид свинца — так обнаруживают сероводород (бумажка с солью свинца чернеет).",
      ion: "Pb^2+ + H2S -> PbS + 2H+" },
    { eq: "CuSO4 + Na2S -> CuS + Na2SO4", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Выпадает чёрный осадок сульфида меди(II).", ion: "Cu^2+ + S^2- -> CuS" },
    { eq: "Pb(NO3)2 + Na2S -> PbS + 2NaNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает чёрный осадок сульфида свинца — качественная реакция на сульфид-ионы.", ion: "Pb^2+ + S^2- -> PbS" },
    { eq: "ZnS + 2HCl -> ZnCl2 + H2S", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Сульфид цинка растворяется в соляной кислоте, выделяется сероводород.", ion: "ZnS + 2H+ -> Zn^2+ + H2S" },
    { eq: "FeS + H2SO4 -> FeSO4 + H2S", type: "обмен", tags: [],
      cond: "С разбавленной серной кислотой. Только под тягой.", desc: "Ещё один лабораторный способ получения сероводорода.", ion: "FeS + 2H+ -> Fe^2+ + H2S" },
    { eq: "H2S + 4Br2 + 4H2O -> H2SO4 + 8HBr", type: "другое", note: "окисление сероводорода", tags: ["ОВР"],
      cond: "Избыток бромной воды.", desc: "Бромная вода обесцвечивается, сера окисляется до +6." },
    { eq: "H2S + 8HNO3 -> H2SO4 + 8NO2 + 4H2O", type: "другое", note: "окисление сероводорода", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Концентрированная азотная кислота окисляет сероводород до серной кислоты." },
    { eq: "H2S + H2SO4 -> S + SO2 + 2H2O", type: "другое", note: "окисление сероводорода", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой.", desc: "Сероводород окисляется до серы, серная кислота восстанавливается до SO₂." },
    { eq: "SO2 + 2NaOH -> Na2SO3 + H2O", type: "другое", note: "кислотный оксид + щёлочь", tags: [],
      cond: "Избыток щёлочи.", desc: "Сернистый газ поглощается щёлочью, получается сульфит.", ion: "SO2 + 2OH- -> SO3^2- + H2O" },
    { eq: "SO2 + NaOH -> NaHSO3", type: "соединение", note: "кислотный оксид + щёлочь", tags: [],
      cond: "Недостаток щёлочи.", desc: "При избытке сернистого газа получается кислая соль — гидросульфит.", ion: "SO2 + OH- -> HSO3-" },
    { eq: "SO2 + CaO -> CaSO3", type: "соединение", tags: [],
      cond: "При нагревании.", desc: "Кислотный оксид соединяется с основным — получается сульфит кальция." },
    { eq: "2Na2SO3 + O2 -> 2Na2SO4", type: "соединение", tags: ["ОВР"],
      cond: "Медленно, на воздухе.", desc: "Сульфиты постепенно окисляются кислородом воздуха до сульфатов." },
    { eq: "Na2SO3 + S -> Na2S2O3", type: "соединение", tags: ["ОВР"],
      cond: "При кипячении раствора с серой.", desc: "Так получают тиосульфат натрия." },
    { eq: "Na2S2O3 + H2SO4 -> Na2SO4 + S + SO2 + H2O", type: "другое", note: "разложение тиосерной кислоты", tags: ["ОВР"],
      cond: "В растворе, при обычных условиях.", desc: "Раствор мутнеет от выделяющейся серы. Эту реакцию используют в опытах со скоростью реакции.",
      ion: "S2O3^2- + 2H+ -> S + SO2 + H2O" },
    { eq: "Na2S2O3 + 4Cl2 + 5H2O -> Na2SO4 + H2SO4 + 8HCl", type: "другое", note: "окисление тиосульфата", tags: ["ОВР"],
      cond: "В растворе.", desc: "Тиосульфат связывает остатки хлора — поэтому его называют антихлором." },
    { eq: "2Na2S2O3 + I2 -> Na2S4O6 + 2NaI", type: "другое", note: "окисление тиосульфата йодом", tags: ["ОВР"],
      cond: "В растворе.", desc: "Раствор йода обесцвечивается. Реакцию используют в количественном анализе (иодометрии)." },
    { eq: "SO2 + NO2 -> SO3 + NO", type: "другое", note: "окисление сернистого газа", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Оксид азота(IV) окисляет сернистый газ. На этом основан старый нитрозный способ получения серной кислоты." },
    { eq: "SO3 + MgO -> MgSO4", type: "соединение", tags: [],
      cond: "", desc: "Кислотный оксид соединяется с основным, получается сульфат магния." },
    { eq: "SO3 + 2NaOH -> Na2SO4 + H2O", type: "другое", note: "кислотный оксид + щёлочь", tags: [],
      cond: "", desc: "Оксид серы(VI) реагирует со щёлочью, получается сульфат натрия.", ion: "SO3 + 2OH- -> SO4^2- + H2O" },
    { eq: "H2SO4 + SO3 -> H2S2O7", type: "соединение", tags: [],
      cond: "Оксид серы(VI) растворяют в концентрированной серной кислоте. Последняя стадия производства серной кислоты.", desc: "Получается олеум — раствор SO₃ в серной кислоте; потом его разбавляют водой." },
    { eq: "C + 2H2SO4 -> CO2 + 2SO2 + 2H2O", type: "другое", note: "окисление неметалла серной кислотой", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, при нагревании.", desc: "Концентрированная серная кислота окисляет уголь до углекислого газа." },
    { eq: "2P + 5H2SO4 -> 2H3PO4 + 5SO2 + 2H2O", type: "другое", note: "окисление неметалла серной кислотой", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, при нагревании.", desc: "Фосфор окисляется до фосфорной кислоты." },
    { eq: "H2SO4 + Na2CO3 -> Na2SO4 + H2O + CO2", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Серная кислота вытесняет из карбоната углекислый газ.", ion: "CO3^2- + 2H+ -> H2O + CO2" },
    { eq: "Ba(NO3)2 + H2SO4 -> BaSO4 + 2HNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает белый осадок сульфата бария — качественная реакция на сульфат-ионы.", ion: "Ba^2+ + SO4^2- -> BaSO4" },
    { eq: "2O3 -> 3O2", type: "другое", note: "превращение озона в кислород", tags: [],
      cond: "Самопроизвольно, быстрее при нагревании.", desc: "Озон неустойчив и постепенно превращается в обычный кислород." },
    { eq: "PbS + 4O3 -> PbSO4 + 4O2", type: "другое", note: "окисление сульфида озоном", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Озон — очень сильный окислитель: он превращает чёрный сульфид свинца в белый сульфат." },
    { eq: "PbS + 4H2O2 -> PbSO4 + 4H2O", type: "другое", note: "окисление сульфида пероксидом водорода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Так реставраторы осветляют потемневшие свинцовые белила на старых картинах." },
    { eq: "2Ag2O -> 4Ag + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Оксид серебра легко разлагается на серебро и кислород." },
    { eq: "H2O2 + Ag2O -> 2Ag + O2 + H2O", type: "другое", note: "пероксид водорода как восстановитель", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Здесь пероксид водорода — восстановитель: он сам окисляется до кислорода." },
    { eq: "BaO2 + H2SO4 -> BaSO4 + H2O2", type: "обмен", tags: [],
      cond: "С разбавленной серной кислотой на холоду.", desc: "Лабораторный способ получения пероксида водорода." },
    { eq: "Na2SO4 + 4C -> Na2S + 4CO", type: "другое", note: "восстановление сульфата углём", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Уголь восстанавливает сульфат до сульфида." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Азот и фосфор */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Азот, фосфор и их соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "NH4NO2", n: "нитрит аммония" },
    { f: "N2O", n: "оксид азота(I)", a: ["веселящий газ"] },
    { f: "N2O4", n: "тетраоксид диазота", a: ["димер оксида азота(IV)"] },
    { f: "HNO2", n: "азотистая кислота" },
    { f: "NH3·H2O", n: "гидрат аммиака", a: ["нашатырный спирт", "аммиачная вода"] },
    { f: "(NH4)2CO3", n: "карбонат аммония" },
    { f: "NH4HCO3", n: "гидрокарбонат аммония" },
    { f: "(NH4)2SO4", n: "сульфат аммония" },
    { f: "NH4H2PO4", n: "дигидрофосфат аммония", a: ["аммофос"] },
    { f: "Ca3N2", n: "нитрид кальция" },
    { f: "Mg(NO3)2", n: "нитрат магния" },
    { f: "Zn(NO3)2", n: "нитрат цинка" },
    { f: "Hg(NO3)2", n: "нитрат ртути(II)" },
    { f: "Fe(NO3)2", n: "нитрат железа(II)" },
    { f: "Fe(NO3)3", n: "нитрат железа(III)" },
    { f: "PbO", n: "оксид свинца(II)" },
    { f: "ZnO", n: "оксид цинка" },
    { f: "FeO", n: "оксид железа(II)" },
    { f: "Ca3(PO4)2", n: "фосфат кальция", a: ["фосфорит"] },
    { f: "PCl3", n: "хлорид фосфора(III)" },
    { f: "PCl5", n: "хлорид фосфора(V)" },
    { f: "H3PO3", n: "фосфористая кислота" },
    { f: "HPO3", n: "метафосфорная кислота" },
    { f: "Ca3P2", n: "фосфид кальция" },
    { f: "PH3", n: "фосфин" },
    { f: "NaH2PO2", n: "гипофосфит натрия" },
    { f: "NaH2PO4", n: "дигидрофосфат натрия" },
    { f: "Na2HPO4", n: "гидрофосфат натрия" },
    { f: "Ca(H2PO4)2", n: "дигидрофосфат кальция", a: ["суперфосфат"] },
    { f: "CaHPO4", n: "гидрофосфат кальция", a: ["преципитат"] },
    { f: "Ag3PO4", n: "фосфат серебра" }
  ],
  reactions: [
    { eq: "NH4NO2 -> N2 + 2H2O", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитрит аммония разлагается на азот и воду — лабораторный способ получения азота." },
    { eq: "NaNO2 + NH4Cl -> NaCl + N2 + 2H2O", type: "другое", note: "получение азота", tags: ["ОВР"],
      cond: "При нагревании растворов.", desc: "Сначала образуется нитрит аммония, который тут же разлагается с выделением азота." },
    { eq: "NH4NO3 -> N2O + 2H2O", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании (около 200–250 °C).", desc: "Нитрат аммония разлагается с образованием оксида азота(I) — «веселящего газа»." },
    { eq: "2NH4NO3 -> 2N2 + O2 + 4H2O", type: "разложение", tags: ["ОВР", "экзотермическая"],
      cond: "При сильном нагревании или детонации; взрывоопасно.", desc: "При высокой температуре аммиачная селитра разлагается до азота и кислорода со взрывом." },
    { eq: "(NH4)2CO3 -> 2NH3 + CO2 + H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Карбонат аммония полностью превращается в газы и пар." },
    { eq: "NH4HCO3 -> NH3 + CO2 + H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Гидрокарбонат аммония используют как разрыхлитель («пекарский аммоний»): при выпечке он целиком превращается в газы." },
    { eq: "2NH4Cl + Ca(OH)2 -> CaCl2 + 2NH3 + 2H2O", type: "обмен", tags: [],
      cond: "При нагревании смеси твёрдых веществ.", desc: "Лабораторный способ получения аммиака." },
    { eq: "(NH4)2SO4 + 2NaOH -> Na2SO4 + 2NH3 + 2H2O", type: "обмен", tags: ["качественная реакция"],
      cond: "При нагревании.", desc: "Выделяется аммиак с резким запахом — качественная реакция на ион аммония.", ion: "NH4+ + OH- -> NH3 + H2O" },
    { eq: "NH3 + H2O <=> NH3·H2O", type: "соединение", tags: [],
      cond: "При растворении аммиака в воде.", desc: "Аммиак очень хорошо растворяется в воде. Раствор (нашатырный спирт) — слабое основание." },
    { eq: "2NH3 + H2SO4 -> (NH4)2SO4", type: "соединение", tags: [],
      cond: "", desc: "Аммиак как основание присоединяет кислоту, получается сульфат аммония — азотное удобрение.", ion: "NH3 + H+ -> NH4+" },
    { eq: "2NH3 + 3CuO -> 3Cu + N2 + 3H2O", type: "другое", note: "аммиак как восстановитель", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Аммиак восстанавливает медь из оксида меди(II), сам окисляясь до азота." },
    { eq: "8NH3 + 3Cl2 -> N2 + 6NH4Cl", type: "другое", note: "аммиак как восстановитель", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Хлор окисляет аммиак до азота; избыток аммиака связывает хлороводород в белый дым NH₄Cl." },
    { eq: "N2 + 3Ca -> Ca3N2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Кальций соединяется с азотом, получается нитрид кальция." },
    { eq: "Ca3N2 + 6H2O -> 3Ca(OH)2 + 2NH3", type: "обмен", note: "гидролиз нитрида", tags: [],
      cond: "При обычных условиях.", desc: "Нитриды активных металлов полностью разлагаются водой с выделением аммиака." },
    { eq: "Mg3N2 + 6H2O -> 3Mg(OH)2 + 2NH3", type: "обмен", note: "гидролиз нитрида", tags: [],
      cond: "При обычных условиях.", desc: "Нитрид магния разлагается водой, образуются гидроксид магния и аммиак." },
    { eq: "Li3N + 3H2O -> 3LiOH + NH3", type: "обмен", note: "гидролиз нитрида", tags: [],
      cond: "При обычных условиях.", desc: "Нитрид лития разлагается водой, образуются щёлочь и аммиак." },
    { eq: "Mg3N2 + 8HCl -> 3MgCl2 + 2NH4Cl", type: "обмен", tags: [],
      cond: "С избытком соляной кислоты.", desc: "В кислоте вместо аммиака образуется соль аммония." },
    { eq: "4HNO3 -> 4NO2 + O2 + 2H2O", type: "разложение", tags: ["ОВР"],
      cond: "На свету или при нагревании.", desc: "Азотная кислота неустойчива и постепенно желтеет от выделяющегося NO₂, поэтому её хранят в тёмных склянках." },
    { eq: "2Mg(NO3)2 -> 2MgO + 4NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитраты металлов от Mg до Cu в ряду активности разлагаются до оксида металла, NO₂ и кислорода." },
    { eq: "2Zn(NO3)2 -> 2ZnO + 4NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитрат цинка разлагается до оксида цинка, оксида азота(IV) и кислорода." },
    { eq: "2Pb(NO3)2 -> 2PbO + 4NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитрат свинца разлагается до оксида свинца(II), NO₂ и кислорода." },
    { eq: "4Fe(NO3)3 -> 2Fe2O3 + 12NO2 + 3O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитрат железа(III) разлагается до оксида железа(III)." },
    { eq: "4Fe(NO3)2 -> 2Fe2O3 + 8NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "При разложении нитрата железа(II) железо окисляется до +3, поэтому получается Fe₂O₃." },
    { eq: "Hg(NO3)2 -> Hg + 2NO2 + O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитраты малоактивных металлов (после меди) разлагаются до металла." },
    { eq: "4Zn + 10HNO3 -> 4Zn(NO3)2 + NH4NO3 + 3H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С очень разбавленной азотной кислотой.", desc: "Активный металл восстанавливает очень разбавленную азотную кислоту до иона аммония. Водород не выделяется.",
      ion: "4Zn + 10H+ + NO3- -> 4Zn^2+ + NH4+ + 3H2O" },
    { eq: "3Zn + 8HNO3 -> 3Zn(NO3)2 + 2NO + 4H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "Продукт восстановления азотной кислоты зависит от её концентрации и активности металла." },
    { eq: "Zn + 4HNO3 -> Zn(NO3)2 + 2NO2 + 2H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Концентрированная азотная кислота восстанавливается до бурого NO₂." },
    { eq: "4Mg + 10HNO3 -> 4Mg(NO3)2 + N2O + 5H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "Магний восстанавливает азотную кислоту до оксида азота(I)." },
    { eq: "5Mg + 12HNO3 -> 5Mg(NO3)2 + N2 + 6H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С очень разбавленной азотной кислотой.", desc: "Чем разбавленнее кислота и активнее металл, тем глубже восстанавливается азот — вплоть до N₂ и NH₄⁺." },
    { eq: "4Mg + 10HNO3 -> 4Mg(NO3)2 + NH4NO3 + 3H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С очень разбавленной азотной кислотой.", desc: "В очень разбавленной кислоте азот восстанавливается до иона аммония." },
    { eq: "Ag + 2HNO3 -> AgNO3 + NO2 + H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Серебро растворяется в концентрированной азотной кислоте, выделяется бурый газ." },
    { eq: "3Ag + 4HNO3 -> 3AgNO3 + NO + 2H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "С разбавленной кислотой выделяется бесцветный NO." },
    { eq: "Fe + 4HNO3 -> Fe(NO3)3 + NO + 2H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "Азотная кислота окисляет железо сразу до +3." },
    { eq: "Fe + 6HNO3 -> Fe(NO3)3 + 3NO2 + 3H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой, только при нагревании (на холоду железо пассивируется).", desc: "При нагревании концентрированная азотная кислота растворяет железо." },
    { eq: "C + 4HNO3 -> CO2 + 4NO2 + 2H2O", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой, при нагревании.", desc: "Уголь окисляется до углекислого газа." },
    { eq: "P + 5HNO3 -> H3PO4 + 5NO2 + H2O", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой, при нагревании.", desc: "Фосфор окисляется до фосфорной кислоты." },
    { eq: "3P + 5HNO3 + 2H2O -> 3H3PO4 + 5NO", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой, при нагревании.", desc: "Разбавленная азотная кислота восстанавливается до NO." },
    { eq: "I2 + 10HNO3 -> 2HIO3 + 10NO2 + 4H2O", type: "другое", note: "окисление неметалла азотной кислотой", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Йод окисляется до иодноватой кислоты." },
    { eq: "CuO + 2HNO3 -> Cu(NO3)2 + H2O", type: "обмен", tags: [],
      cond: "", desc: "Основный оксид реагирует с кислотой — образуются соль и вода.", ion: "CuO + 2H+ -> Cu^2+ + H2O" },
    { eq: "FeO + 4HNO3 -> Fe(NO3)3 + NO2 + 2H2O", type: "другое", note: "оксид железа(II) + азотная кислота", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Азотная кислота не только растворяет оксид железа(II), но и окисляет железо до +3." },
    { eq: "3FeO + 10HNO3 -> 3Fe(NO3)3 + NO + 5H2O", type: "другое", note: "оксид железа(II) + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "Железо(II) окисляется до железа(III), кислота восстанавливается до NO." },
    { eq: "2NO2 + 2NaOH -> NaNO3 + NaNO2 + H2O", type: "другое", note: "диспропорционирование NO₂", tags: ["ОВР"],
      cond: "В растворе щёлочи.", desc: "Азот(+4) переходит одновременно в +5 (нитрат) и +3 (нитрит).", ion: "2NO2 + 2OH- -> NO3- + NO2- + H2O" },
    { eq: "4NO2 + O2 + 4NaOH -> 4NaNO3 + 2H2O", type: "другое", note: "поглощение NO₂ щёлочью в присутствии кислорода", tags: ["ОВР"],
      cond: "В растворе щёлочи, при доступе кислорода.", desc: "Если есть кислород, весь азот переходит в нитрат." },
    { eq: "3NO2 + H2O -> 2HNO3 + NO", type: "другое", note: "диспропорционирование NO₂", tags: ["ОВР"],
      cond: "В тёплой воде.", desc: "Оксид азота(IV) реагирует с водой, образуются азотная кислота и NO." },
    { eq: "2NO2 + H2O -> HNO3 + HNO2", type: "другое", note: "диспропорционирование NO₂", tags: ["ОВР"],
      cond: "В холодной воде.", desc: "На холоду образуются сразу две кислоты — азотная и азотистая." },
    { eq: "2NO2 <=> N2O4", type: "соединение", tags: ["экзотермическая"],
      cond: "При охлаждении равновесие смещается вправо (газ светлеет), при нагревании — влево (буреет).", desc: "Две молекулы бурого NO₂ объединяются в бесцветную молекулу N₂O₄. Классический пример химического равновесия." },
    { eq: "2NaNO2 + 2KI + 2H2SO4 -> 2NO + I2 + K2SO4 + Na2SO4 + 2H2O", type: "другое", note: "нитрит как окислитель", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Нитрит окисляет иодид до йода, сам восстанавливаясь до NO." },
    { eq: "5NaNO2 + 2KMnO4 + 3H2SO4 -> 5NaNO3 + 2MnSO4 + K2SO4 + 3H2O", type: "другое", note: "нитрит как восстановитель", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Перманганат окисляет нитрит до нитрата и обесцвечивается." },
    { eq: "Ca3(PO4)2 + 3SiO2 + 5C -> 3CaSiO3 + 2P + 5CO", type: "другое", note: "получение фосфора", tags: ["ОВР"],
      cond: "В электропечи при температуре около 1500 °C.", desc: "Промышленный способ получения фосфора из фосфоритов." },
    { eq: "2P + 3Cl2 -> 2PCl3", type: "соединение", tags: ["ОВР"],
      cond: "При недостатке хлора.", desc: "Фосфор горит в хлоре, образуется хлорид фосфора(III)." },
    { eq: "2P + 5Cl2 -> 2PCl5", type: "соединение", tags: ["ОВР"],
      cond: "При избытке хлора.", desc: "При избытке хлора фосфор окисляется до +5." },
    { eq: "PCl3 + Cl2 -> PCl5", type: "соединение", tags: ["ОВР"],
      cond: "", desc: "Хлорид фосфора(III) присоединяет хлор и превращается в хлорид фосфора(V)." },
    { eq: "PCl5 + 4H2O -> H3PO4 + 5HCl", type: "обмен", note: "гидролиз галогенида неметалла", tags: [],
      cond: "При обычных условиях.", desc: "Галогениды неметаллов полностью разлагаются водой с образованием двух кислот." },
    { eq: "PCl3 + 3H2O -> H3PO3 + 3HCl", type: "обмен", note: "гидролиз галогенида неметалла", tags: [],
      cond: "При обычных условиях.", desc: "Хлорид фосфора(III) разлагается водой, образуются фосфористая и соляная кислоты." },
    { eq: "2P + 3Ca -> Ca3P2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Фосфор с активными металлами образует фосфиды — здесь фосфор окислитель." },
    { eq: "Ca3P2 + 6H2O -> 3Ca(OH)2 + 2PH3", type: "обмен", note: "гидролиз фосфида", tags: [],
      cond: "При обычных условиях.", desc: "Фосфид кальция разлагается водой с выделением ядовитого фосфина." },
    { eq: "Ca3P2 + 6HCl -> 3CaCl2 + 2PH3", type: "обмен", tags: [],
      cond: "При обычных условиях.", desc: "С кислотой фосфид кальция тоже выделяет фосфин." },
    { eq: "2PH3 + 4O2 -> P2O5 + 3H2O", type: "другое", note: "горение", tags: ["ОВР", "горение"],
      cond: "Фосфин самовоспламеняется на воздухе (из-за примесей).", desc: "Фосфин сгорает до оксида фосфора(V) и воды. С этим связывают «блуждающие огоньки» на болотах." },
    { eq: "6P + 5KClO3 -> 3P2O5 + 5KCl", type: "другое", note: "окисление фосфора бертолетовой солью", tags: ["ОВР", "экзотермическая"],
      cond: "При трении или ударе — так загорается спичка.", desc: "Красный фосфор на коробке и бертолетова соль в головке спички реагируют со вспышкой." },
    { eq: "4P + 3NaOH + 3H2O -> PH3 + 3NaH2PO2", type: "другое", note: "диспропорционирование фосфора", tags: ["ОВР"],
      cond: "Белый фосфор в растворе щёлочи при нагревании.", desc: "Фосфор одновременно восстанавливается до фосфина и окисляется до гипофосфита." },
    { eq: "P2O5 + H2O -> 2HPO3", type: "соединение", tags: [],
      cond: "В холодной воде.", desc: "На холоду из оксида фосфора(V) получается метафосфорная кислота." },
    { eq: "P2O5 + 6NaOH -> 2Na3PO4 + 3H2O", type: "другое", note: "кислотный оксид + щёлочь", tags: [],
      cond: "Избыток щёлочи.", desc: "Оксид фосфора(V) реагирует со щёлочью, получается фосфат натрия." },
    { eq: "P2O5 + 3CaO -> Ca3(PO4)2", type: "соединение", tags: [],
      cond: "При сплавлении.", desc: "Кислотный оксид соединяется с основным, получается фосфат кальция." },
    { eq: "H3PO4 + NaOH -> NaH2PO4 + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "Кислоты и щёлочи поровну (1 : 1).", desc: "Трёхосновная кислота нейтрализуется ступенчато; на первой ступени получается дигидрофосфат.",
      ion: "H3PO4 + OH- -> H2PO4- + H2O" },
    { eq: "H3PO4 + 2NaOH -> Na2HPO4 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "Щёлочи вдвое больше (1 : 2).", desc: "На второй ступени нейтрализации получается гидрофосфат.",
      ion: "H3PO4 + 2OH- -> HPO4^2- + 2H2O" },
    { eq: "Na3PO4 + 3AgNO3 -> Ag3PO4 + 3NaNO3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает жёлтый осадок фосфата серебра — качественная реакция на фосфат-ионы.", ion: "3Ag+ + PO4^3- -> Ag3PO4" },
    { eq: "2H3PO4 + 3Ca(OH)2 -> Ca3(PO4)2 + 6H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "При нейтрализации фосфорной кислоты гидроксидом кальция выпадает фосфат кальция." },
    { eq: "Ca3(PO4)2 + 3H2SO4 -> 3CaSO4 + 2H3PO4", type: "обмен", tags: [],
      cond: "С серной кислотой, при нагревании.", desc: "Промышленный способ получения фосфорной кислоты из фосфоритов." },
    { eq: "Ca3(PO4)2 + 2H2SO4 -> 2CaSO4 + Ca(H2PO4)2", type: "обмен", tags: [],
      cond: "Недостаток серной кислоты.", desc: "Получается простой суперфосфат — смесь дигидрофосфата и сульфата кальция." },
    { eq: "Ca3(PO4)2 + 4H3PO4 -> 3Ca(H2PO4)2", type: "соединение", tags: [],
      cond: "", desc: "Двойной суперфосфат: в нём нет балласта — гипса." },
    { eq: "Ca(H2PO4)2 + Ca(OH)2 -> 2CaHPO4 + 2H2O", type: "обмен", tags: [],
      cond: "", desc: "Получается преципитат — фосфорное удобрение и подкормка для животных." },
    { eq: "H3PO4 + NH3 -> NH4H2PO4", type: "соединение", tags: [],
      cond: "", desc: "Получается аммофос — комплексное удобрение с азотом и фосфором." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Углерод и кремний */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Углерод, кремний и их соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CaC2", n: "карбид кальция" },
    { f: "Al4C3", n: "карбид алюминия" },
    { f: "SiC", n: "карбид кремния", a: ["карборунд"] },
    { f: "CS2", n: "сероуглерод" },
    { f: "Mg2Si", n: "силицид магния" },
    { f: "SiH4", n: "силан" },
    { f: "SiCl4", n: "хлорид кремния(IV)" },
    { f: "H2SiO3", n: "кремниевая кислота" },
    { f: "K2CO3", n: "карбонат калия", a: ["поташ"] },
    { f: "MgCO3", n: "карбонат магния" },
    { f: "BaCO3", n: "карбонат бария" },
    { f: "HCOONa", n: "формиат натрия" },
    { f: "Zn", n: "цинк" }
  ],
  reactions: [
    { eq: "C + 2H2 -> CH4", type: "соединение", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор (никель), нагревание и давление.", desc: "Углерод соединяется с водородом, получается метан." },
    { eq: "3C + 4Al -> Al4C3", type: "соединение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Углерод с металлами образует карбиды; здесь углерод — окислитель." },
    { eq: "Ca + 2C -> CaC2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Кальций соединяется с углеродом, получается карбид кальция." },
    { eq: "CaO + 3C -> CaC2 + CO", type: "другое", note: "получение карбида кальция", tags: ["ОВР"],
      cond: "В электропечи, около 2000 °C.", desc: "Промышленный способ получения карбида кальция из извести и кокса." },
    { eq: "Al4C3 + 12H2O -> 4Al(OH)3 + 3CH4", type: "обмен", note: "гидролиз карбида", tags: [],
      cond: "При обычных условиях.", desc: "Карбид алюминия разлагается водой с выделением метана." },
    { eq: "Al4C3 + 12HCl -> 4AlCl3 + 3CH4", type: "обмен", tags: [],
      cond: "При обычных условиях.", desc: "С кислотой карбид алюминия тоже даёт метан, а алюминий переходит в соль." },
    { eq: "CaC2 + 2H2O -> Ca(OH)2 + C2H2", type: "обмен", note: "гидролиз карбида", tags: [],
      cond: "При обычных условиях.", desc: "Карбид кальция бурно реагирует с водой — так получают ацетилен." },
    { eq: "CaC2 + 2HCl -> CaCl2 + C2H2", type: "обмен", tags: [],
      cond: "При обычных условиях.", desc: "С соляной кислотой карбид кальция тоже выделяет ацетилен." },
    { eq: "C + H2O <=> CO + H2", type: "замещение", tags: ["ОВР", "эндотермическая"],
      cond: "Водяной пар пропускают через раскалённый уголь (около 1000 °C).", desc: "Получается «водяной газ» — смесь угарного газа и водорода, ценное топливо и сырьё." },
    { eq: "CO + H2O <=> CO2 + H2", type: "другое", note: "конверсия угарного газа", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Угарный газ превращается в углекислый, а из воды получается дополнительный водород." },
    { eq: "CuO + CO -> Cu + CO2", type: "другое", note: "восстановление металла угарным газом", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Угарный газ восстанавливает медь из оксида." },
    { eq: "CO + NaOH -> HCOONa", type: "соединение", tags: [],
      cond: "При нагревании и повышенном давлении.", desc: "Несолеобразующий оксид CO всё же реагирует со щёлочью в жёстких условиях — получается формиат натрия." },
    { eq: "Fe2O3 + 3C -> 2Fe + 3CO", type: "замещение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Углерод восстанавливает железо из оксида." },
    { eq: "ZnO + C -> Zn + CO", type: "замещение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Так получают цинк из его оксида." },
    { eq: "C + 2S -> CS2", type: "соединение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Углерод соединяется с парами серы, получается сероуглерод." },
    { eq: "C + Si -> SiC", type: "соединение", tags: ["ОВР"],
      cond: "Около 2000 °C.", desc: "Получается карборунд — очень твёрдое вещество для абразивов." },
    { eq: "SiO2 + 3C -> SiC + 2CO", type: "другое", note: "получение карбида кремния", tags: ["ОВР"],
      cond: "В электропечи, около 2000 °C.", desc: "Промышленный способ получения карборунда из песка и кокса." },
    { eq: "CO2 + NaOH -> NaHCO3", type: "соединение", tags: [],
      cond: "Избыток углекислого газа.", desc: "При избытке CO₂ образуется кислая соль — гидрокарбонат.", ion: "CO2 + OH- -> HCO3-" },
    { eq: "Na2CO3 + CO2 + H2O -> 2NaHCO3", type: "соединение", tags: [],
      cond: "Пропускание CO₂ через раствор соды.", desc: "Карбонат превращается в гидрокарбонат.", ion: "CO3^2- + CO2 + H2O -> 2HCO3-" },
    { eq: "NaHCO3 + NaOH -> Na2CO3 + H2O", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Кислая соль со щёлочью превращается в среднюю.", ion: "HCO3- + OH- -> CO3^2- + H2O" },
    { eq: "Ca(OH)2 + 2CO2 -> Ca(HCO3)2", type: "соединение", tags: [],
      cond: "Долгое пропускание CO₂ через известковую воду.", desc: "Сначала известковая вода мутнеет (CaCO₃), а при избытке CO₂ снова становится прозрачной: образуется растворимый гидрокарбонат." },
    { eq: "Ca(HCO3)2 -> CaCO3 + CO2 + H2O", type: "разложение", tags: [],
      cond: "При кипячении.", desc: "Так устраняют временную жёсткость воды; из-за этой реакции в чайнике появляется накипь." },
    { eq: "Ca(HCO3)2 + Ca(OH)2 -> 2CaCO3 + 2H2O", type: "обмен", tags: [],
      cond: "", desc: "Добавление извести тоже устраняет временную жёсткость воды." },
    { eq: "Ca(HCO3)2 + Na2CO3 -> CaCO3 + 2NaHCO3", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Сода связывает ионы кальция и смягчает воду.", ion: "Ca^2+ + CO3^2- -> CaCO3" },
    { eq: "Na2CO3 + CaCl2 -> CaCO3 + 2NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Выпадает белый осадок карбоната кальция.", ion: "Ca^2+ + CO3^2- -> CaCO3" },
    { eq: "Ca(OH)2 + Na2CO3 -> CaCO3 + 2NaOH", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Так раньше получали едкий натр из соды (каустификация).", ion: "Ca^2+ + CO3^2- -> CaCO3" },
    { eq: "K2CO3 + 2HCl -> 2KCl + H2O + CO2", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Поташ «вскипает» от кислоты — выделяется углекислый газ.", ion: "CO3^2- + 2H+ -> H2O + CO2" },
    { eq: "BaCl2 + K2CO3 -> BaCO3 + 2KCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Выпадает белый осадок карбоната бария.", ion: "Ba^2+ + CO3^2- -> BaCO3" },
    { eq: "BaCO3 + 2HCl -> BaCl2 + H2O + CO2", type: "обмен", tags: [],
      cond: "", desc: "В отличие от сульфата бария, карбонат бария растворяется в кислоте — так их различают.", ion: "BaCO3 + 2H+ -> Ba^2+ + H2O + CO2" },
    { eq: "MgCO3 -> MgO + CO2", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Карбонат магния разлагается на оксид магния и углекислый газ." },
    { eq: "BaCO3 -> BaO + CO2", type: "разложение", tags: [],
      cond: "При сильном нагревании.", desc: "Карбонат бария разлагается на оксид бария и углекислый газ." },
    { eq: "Si + 2NaOH + H2O -> Na2SiO3 + 2H2", type: "другое", note: "кремний + щёлочь", tags: ["ОВР"],
      cond: "В растворе щёлочи при нагревании.", desc: "Кремний растворяется в щёлочи с выделением водорода.", ion: "Si + 2OH- + H2O -> SiO3^2- + 2H2" },
    { eq: "Si + 2Mg -> Mg2Si", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "С активными металлами кремний образует силициды и выступает окислителем." },
    { eq: "Mg2Si + 4HCl -> 2MgCl2 + SiH4", type: "обмен", tags: [],
      cond: "При обычных условиях.", desc: "Получается силан — водородное соединение кремния." },
    { eq: "SiH4 + 2O2 -> SiO2 + 2H2O", type: "другое", note: "горение", tags: ["ОВР", "горение"],
      cond: "Самовоспламеняется на воздухе.", desc: "Силан сгорает до оксида кремния и воды." },
    { eq: "SiO2 + 2Mg -> Si + 2MgO", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Магний восстанавливает кремний из оксида — лабораторный способ получения кремния." },
    { eq: "SiO2 + 2C -> Si + 2CO", type: "другое", note: "получение кремния", tags: ["ОВР"],
      cond: "В электропечи при высокой температуре.", desc: "Промышленный способ получения кремния из песка и кокса." },
    { eq: "SiO2 + Na2CO3 -> Na2SiO3 + CO2", type: "другое", note: "сплавление кислотного оксида с солью", tags: [],
      cond: "При сплавлении.", desc: "Нелетучий оксид кремния вытесняет летучий углекислый газ. Эта реакция лежит в основе варки стекла." },
    { eq: "SiO2 + CaCO3 -> CaSiO3 + CO2", type: "другое", note: "сплавление кислотного оксида с солью", tags: [],
      cond: "При сплавлении.", desc: "Получается силикат кальция — ещё один компонент стекла." },
    { eq: "Na2SiO3 + 2HCl -> H2SiO3 + 2NaCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает студенистый осадок кремниевой кислоты — так обнаруживают силикат-ионы.", ion: "SiO3^2- + 2H+ -> H2SiO3" },
    { eq: "Na2SiO3 + CO2 + H2O -> Na2CO3 + H2SiO3", type: "обмен", tags: [],
      cond: "При пропускании CO₂ через раствор силиката.", desc: "Угольная кислота сильнее кремниевой и вытесняет её из соли.", ion: "SiO3^2- + CO2 + H2O -> CO3^2- + H2SiO3" },
    { eq: "H2SiO3 -> SiO2 + H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Кремниевая кислота при нагревании теряет воду. Так получают силикагель — поглотитель влаги." },
    { eq: "Si + 2Cl2 -> SiCl4", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Кремний соединяется с хлором." },
    { eq: "Si + 2F2 -> SiF4", type: "соединение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "С фтором кремний реагирует уже без нагревания." },
    { eq: "SiCl4 + 3H2O -> H2SiO3 + 4HCl", type: "обмен", note: "гидролиз галогенида неметалла", tags: [],
      cond: "При обычных условиях (дымит на воздухе).", desc: "Хлорид кремния полностью разлагается водой." },
    { eq: "SiCl4 + 2H2 -> Si + 4HCl", type: "замещение", tags: ["ОВР"],
      cond: "При высокой температуре.", desc: "Так получают очень чистый кремний для микросхем и солнечных батарей." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Щелочные и щёлочноземельные металлы, магний */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Щелочные и щёлочноземельные металлы, магний",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "Ba", n: "барий" },
    { f: "KO2", n: "надпероксид калия", a: ["супероксид калия"] },
    { f: "LiH", n: "гидрид лития" },
    { f: "Ca(NO3)2", n: "нитрат кальция", a: ["кальциевая селитра"] }
  ],
  reactions: [
    { eq: "K + O2 -> KO2", type: "соединение", tags: ["ОВР", "горение"],
      cond: "Горение калия на воздухе или в кислороде.", desc: "При горении калия образуется не оксид, а надпероксид KO₂." },
    { eq: "2Na2O2 + 2H2O -> 4NaOH + O2", type: "другое", note: "пероксид + вода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Пероксид натрия с водой даёт щёлочь и кислород." },
    { eq: "2Na2O2 + 2CO2 -> 2Na2CO3 + O2", type: "другое", note: "регенерация кислорода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Пероксид натрия поглощает углекислый газ и выделяет кислород — так восстанавливают воздух в подводных лодках и космических кораблях." },
    { eq: "4KO2 + 2CO2 -> 2K2CO3 + 3O2", type: "другое", note: "регенерация кислорода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Надпероксид калия ещё эффективнее выделяет кислород в обмен на углекислый газ." },
    { eq: "4KO2 + 2H2O -> 4KOH + 3O2", type: "другое", note: "надпероксид + вода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "С водой надпероксид калия даёт щёлочь и кислород." },
    { eq: "Na2O2 + 2Na -> 2Na2O", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Так из пероксида получают оксид натрия." },
    { eq: "NaH + H2O -> NaOH + H2", type: "другое", note: "гидрид + вода", tags: ["ОВР"],
      cond: "При обычных условиях, бурно.", desc: "Водород гидрида (−1) и водород воды (+1) превращаются в простое вещество." },
    { eq: "CaH2 + 2H2O -> Ca(OH)2 + 2H2", type: "другое", note: "гидрид + вода", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Гидрид кальция используют как компактный источник водорода." },
    { eq: "2Li + H2 -> 2LiH", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Литий соединяется с водородом, получается гидрид лития." },
    { eq: "Mg + H2O -> MgO + H2", type: "замещение", tags: ["ОВР"],
      cond: "Магний нагревают в водяном паре.", desc: "При высокой температуре магний отнимает кислород у воды, образуя оксид." },
    { eq: "Ba + 2H2O -> Ba(OH)2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Барий активно реагирует с водой, образуется щёлочь.", ion: "Ba + 2H2O -> Ba^2+ + 2OH- + H2" },
    { eq: "Ca + Cl2 -> CaCl2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Кальций соединяется с хлором." },
    { eq: "Mg + Cl2 -> MgCl2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Магний горит в хлоре, получается хлорид магния." },
    { eq: "Mg + CuSO4 -> MgSO4 + Cu", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Магний активнее меди и вытесняет её из соли.", ion: "Mg + Cu^2+ -> Mg^2+ + Cu" },
    { eq: "MgO + H2O -> Mg(OH)2", type: "соединение", tags: [],
      cond: "Медленно, при нагревании.", desc: "Оксид магния с водой реагирует плохо, в отличие от оксидов щелочных металлов." },
    { eq: "Mg(OH)2 -> MgO + H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Нерастворимые основания при нагревании разлагаются на оксид и воду." },
    { eq: "MgCl2 + 2NaOH -> Mg(OH)2 + 2NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Выпадает белый осадок гидроксида магния.", ion: "Mg^2+ + 2OH- -> Mg(OH)2" },
    { eq: "Mg(OH)2 + 2HCl -> MgCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид магния растворяется в кислоте. Поэтому его используют в лекарствах от изжоги.", ion: "Mg(OH)2 + 2H+ -> Mg^2+ + 2H2O" },
    { eq: "MgCO3 + 2HCl -> MgCl2 + H2O + CO2", type: "обмен", tags: [],
      cond: "", desc: "Карбонат магния растворяется в кислоте с выделением углекислого газа.", ion: "MgCO3 + 2H+ -> Mg^2+ + H2O + CO2" },
    { eq: "CaO + 2HCl -> CaCl2 + H2O", type: "обмен", tags: [],
      cond: "", desc: "Основный оксид реагирует с кислотой, образуются соль и вода.", ion: "CaO + 2H+ -> Ca^2+ + H2O" },
    { eq: "Na2O + 2HCl -> 2NaCl + H2O", type: "обмен", tags: [],
      cond: "", desc: "Оксид натрия — основный оксид, он реагирует с кислотами.", ion: "Na2O + 2H+ -> 2Na+ + H2O" },
    { eq: "K2O + SO3 -> K2SO4", type: "соединение", tags: [],
      cond: "", desc: "Основный оксид соединяется с кислотным, получается соль." },
    { eq: "3CaCl2 + 2Na3PO4 -> Ca3(PO4)2 + 6NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Фосфат натрия осаждает ионы кальция — так смягчают воду.", ion: "3Ca^2+ + 2PO4^3- -> Ca3(PO4)2" },
    { eq: "Ba(OH)2 + CO2 -> BaCO3 + H2O", type: "другое", note: "щёлочь + кислотный оксид", tags: ["качественная реакция"],
      cond: "При пропускании CO₂ через баритовую воду.", desc: "Баритовая вода мутнеет — ещё один способ обнаружить углекислый газ.", ion: "Ba^2+ + 2OH- + CO2 -> BaCO3 + H2O" },
    { eq: "Ba(OH)2 + 2HCl -> BaCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Щёлочь нейтрализует кислоту.", ion: "H+ + OH- -> H2O" },
    { eq: "Ba(OH)2 + 2HNO3 -> Ba(NO3)2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Гидроксид бария нейтрализует азотную кислоту.", ion: "H+ + OH- -> H2O" },
    { eq: "KOH + HCl -> KCl + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Реакция нейтрализации: образуются соль и вода.", ion: "H+ + OH- -> H2O" },
    { eq: "2KOH + H2SO4 -> K2SO4 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Гидроксид калия нейтрализует серную кислоту.", ion: "H+ + OH- -> H2O" },
    { eq: "NaOH + HNO3 -> NaNO3 + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Гидроксид натрия нейтрализует азотную кислоту.", ion: "H+ + OH- -> H2O" },
    { eq: "Ca(OH)2 + 2HNO3 -> Ca(NO3)2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Гидроксид кальция нейтрализует азотную кислоту.", ion: "H+ + OH- -> H2O" }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Алюминий */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Алюминий и его соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "Cr", n: "хром" },
    { f: "NaAlO2", n: "метаалюминат натрия" },
    { f: "K[Al(OH)4]", n: "тетрагидроксоалюминат калия" },
    { f: "Al2(SO4)3", n: "сульфат алюминия" },
    { f: "Al(NO3)3", n: "нитрат алюминия" },
    { f: "AlN", n: "нитрид алюминия" },
    { f: "AlI3", n: "иодид алюминия" }
  ],
  reactions: [
    { eq: "2Al + 6H2O -> 2Al(OH)3 + 3H2", type: "замещение", tags: ["ОВР"],
      cond: "Только если снять защитную оксидную плёнку (например, амальгамированием).", desc: "Без плёнки алюминий активно вытесняет водород из воды." },
    { eq: "2Al + 2KOH + 6H2O -> 2K[Al(OH)4] + 3H2", type: "другое", note: "амфотерный металл + щёлочь", tags: ["ОВР"],
      cond: "В растворе щёлочи.", desc: "Алюминий растворяется в растворе гидроксида калия с выделением водорода.",
      ion: "2Al + 2OH- + 6H2O -> 2[Al(OH)4]- + 3H2" },
    { eq: "2Al + 2NaOH + 2H2O -> 2NaAlO2 + 3H2", type: "другое", note: "амфотерный металл + щёлочь", tags: ["ОВР"],
      cond: "Упрощённая запись растворения алюминия в щёлочи: вместо комплексной соли указан метаалюминат.", desc: "В таком виде реакцию часто записывают в задачах; точнее — с образованием Na[Al(OH)₄]." },
    { eq: "Al2O3 + 2NaOH -> 2NaAlO2 + H2O", type: "другое", note: "амфотерный оксид + щёлочь", tags: [],
      cond: "При сплавлении.", desc: "При сплавлении оксид алюминия ведёт себя как кислотный оксид." },
    { eq: "Al2O3 + 2NaOH + 3H2O -> 2Na[Al(OH)4]", type: "соединение", note: "амфотерный оксид + щёлочь", tags: [],
      cond: "В концентрированном растворе щёлочи.", desc: "В растворе образуется комплексная соль — тетрагидроксоалюминат.",
      ion: "Al2O3 + 2OH- + 3H2O -> 2[Al(OH)4]-" },
    { eq: "Al2O3 + Na2CO3 -> 2NaAlO2 + CO2", type: "другое", note: "сплавление амфотерного оксида с содой", tags: [],
      cond: "При сплавлении.", desc: "Амфотерный оксид вытесняет углекислый газ из соды." },
    { eq: "Al2O3 + 6HCl -> 2AlCl3 + 3H2O", type: "обмен", tags: [],
      cond: "", desc: "С кислотами оксид алюминия ведёт себя как основный оксид.", ion: "Al2O3 + 6H+ -> 2Al^3+ + 3H2O" },
    { eq: "Al2O3 + 3H2SO4 -> Al2(SO4)3 + 3H2O", type: "обмен", tags: [],
      cond: "При нагревании.", desc: "Оксид алюминия растворяется в серной кислоте.", ion: "Al2O3 + 6H+ -> 2Al^3+ + 3H2O" },
    { eq: "Al(OH)3 + NaOH -> NaAlO2 + 2H2O", type: "другое", note: "амфотерный гидроксид + щёлочь", tags: [],
      cond: "При сплавлении.", desc: "При сплавлении гидроксид алюминия образует метаалюминат." },
    { eq: "Al(OH)3 + KOH -> K[Al(OH)4]", type: "соединение", note: "амфотерный гидроксид + щёлочь", tags: [],
      cond: "В растворе щёлочи.", desc: "Гидроксид алюминия растворяется в избытке щёлочи.", ion: "Al(OH)3 + OH- -> [Al(OH)4]-" },
    { eq: "2Al(OH)3 + 3H2SO4 -> Al2(SO4)3 + 6H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид алюминия растворяется в серной кислоте.", ion: "Al(OH)3 + 3H+ -> Al^3+ + 3H2O" },
    { eq: "Na[Al(OH)4] + CO2 -> Al(OH)3 + NaHCO3", type: "обмен", tags: [],
      cond: "При пропускании углекислого газа через раствор.", desc: "Даже слабая угольная кислота разрушает комплекс — выпадает гидроксид алюминия.",
      ion: "[Al(OH)4]- + CO2 -> Al(OH)3 + HCO3-" },
    { eq: "Na[Al(OH)4] + HCl -> NaCl + Al(OH)3 + H2O", type: "обмен", tags: [],
      cond: "Недостаток кислоты.", desc: "Если кислоты мало, выпадает осадок гидроксида алюминия.", ion: "[Al(OH)4]- + H+ -> Al(OH)3 + H2O" },
    { eq: "Na[Al(OH)4] + 4HCl -> NaCl + AlCl3 + 4H2O", type: "обмен", tags: [],
      cond: "Избыток кислоты.", desc: "В избытке кислоты осадок не образуется: алюминий сразу переходит в соль.", ion: "[Al(OH)4]- + 4H+ -> Al^3+ + 4H2O" },
    { eq: "NaAlO2 + 4HCl -> NaCl + AlCl3 + 2H2O", type: "обмен", tags: [],
      cond: "Избыток кислоты.", desc: "Метаалюминат в избытке кислоты превращается в хлорид алюминия." },
    { eq: "AlCl3 + 3NaOH -> Al(OH)3 + 3NaCl", type: "обмен", tags: [],
      cond: "Недостаток щёлочи, по каплям.", desc: "Выпадает белый студенистый осадок гидроксида алюминия.", ion: "Al^3+ + 3OH- -> Al(OH)3" },
    { eq: "AlCl3 + 4NaOH -> Na[Al(OH)4] + 3NaCl", type: "обмен", tags: [],
      cond: "Избыток щёлочи.", desc: "В избытке щёлочи осадок растворяется — признак амфотерности.", ion: "Al^3+ + 4OH- -> [Al(OH)4]-" },
    { eq: "AlCl3 + 3NH3 + 3H2O -> Al(OH)3 + 3NH4Cl", type: "обмен", tags: [],
      cond: "Раствор аммиака.", desc: "Аммиак осаждает гидроксид алюминия, но не растворяет его — так получают чистый Al(OH)₃.",
      ion: "Al^3+ + 3NH3 + 3H2O -> Al(OH)3 + 3NH4+" },
    { eq: "2AlCl3 + 3Na2CO3 + 3H2O -> 2Al(OH)3 + 3CO2 + 6NaCl", type: "обмен", note: "совместный гидролиз", tags: [],
      cond: "В растворе.", desc: "Карбоната алюминия в растворе не существует: обе соли гидролизуются, выпадает гидроксид и выделяется газ.",
      ion: "2Al^3+ + 3CO3^2- + 3H2O -> 2Al(OH)3 + 3CO2" },
    { eq: "2AlCl3 + 3Na2S + 6H2O -> 2Al(OH)3 + 3H2S + 6NaCl", type: "обмен", note: "совместный гидролиз", tags: [],
      cond: "В растворе.", desc: "Сульфид алюминия в воде не существует: выпадает гидроксид алюминия и выделяется сероводород.",
      ion: "2Al^3+ + 3S^2- + 6H2O -> 2Al(OH)3 + 3H2S" },
    { eq: "Al2S3 + 6H2O -> 2Al(OH)3 + 3H2S", type: "обмен", note: "гидролиз", tags: [],
      cond: "При обычных условиях.", desc: "Сульфид алюминия полностью разлагается водой." },
    { eq: "Al2(SO4)3 + 6NaOH -> 2Al(OH)3 + 3Na2SO4", type: "обмен", tags: [],
      cond: "Недостаток щёлочи.", desc: "Выпадает осадок гидроксида алюминия.", ion: "Al^3+ + 3OH- -> Al(OH)3" },
    { eq: "Al2(SO4)3 + 3BaCl2 -> 3BaSO4 + 2AlCl3", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает белый осадок сульфата бария.", ion: "Ba^2+ + SO4^2- -> BaSO4" },
    { eq: "2Al + 3CuSO4 -> Al2(SO4)3 + 3Cu", type: "замещение", tags: ["ОВР"],
      cond: "В растворе (реакция начинается после разрушения оксидной плёнки).", desc: "Алюминий вытесняет медь из раствора соли.", ion: "2Al + 3Cu^2+ -> 2Al^3+ + 3Cu" },
    { eq: "2Al + 3H2SO4 -> Al2(SO4)3 + 3H2", type: "замещение", tags: ["ОВР"],
      cond: "С разбавленной серной кислотой.", desc: "Алюминий вытесняет водород из разбавленной кислоты.", ion: "2Al + 6H+ -> 2Al^3+ + 3H2" },
    { eq: "2Al + 6H2SO4 -> Al2(SO4)3 + 3SO2 + 6H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, только при нагревании (на холоду алюминий пассивируется).", desc: "Концентрированная серная кислота восстанавливается до сернистого газа." },
    { eq: "8Al + 30HNO3 -> 8Al(NO3)3 + 3NH4NO3 + 9H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С очень разбавленной азотной кислотой. С концентрированной на холоду алюминий пассивируется.", desc: "Азотная кислота восстанавливается до иона аммония." },
    { eq: "Al + 4HNO3 -> Al(NO3)3 + NO + 2H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "Алюминий растворяется в разбавленной азотной кислоте с выделением NO." },
    { eq: "4Al(NO3)3 -> 2Al2O3 + 12NO2 + 3O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Нитрат алюминия разлагается до оксида алюминия." },
    { eq: "2Al + Cr2O3 -> Al2O3 + 2Cr", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "Поджигание смеси (алюмотермия).", desc: "Так получают хром и другие тугоплавкие металлы." },
    { eq: "8Al + 3Fe3O4 -> 4Al2O3 + 9Fe", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "Поджигание смеси (термит).", desc: "Алюминий восстанавливает железо из железной окалины." },
    { eq: "2Al + 3I2 -> 2AlI3", type: "соединение", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор — капля воды; смесь вспыхивает с фиолетовым дымом паров йода.", desc: "Эффектный опыт: вода запускает бурную реакцию алюминия с йодом." },
    { eq: "2Al + N2 -> 2AlN", type: "соединение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Алюминий соединяется с азотом, получается нитрид алюминия." },
    { eq: "AlN + 3H2O -> Al(OH)3 + NH3", type: "обмен", note: "гидролиз нитрида", tags: [],
      cond: "При обычных условиях.", desc: "Нитрид алюминия разлагается водой с выделением аммиака." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Железо */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Железо и его соединения",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "Fe2(SO4)3", n: "сульфат железа(III)" },
    { f: "FeI2", n: "иодид железа(II)" },
    { f: "NaFeO2", n: "феррит натрия" },
    { f: "K2FeO4", n: "феррат калия" },
    { f: "KSCN", n: "тиоцианат калия", a: ["роданид калия"] },
    { f: "Fe(SCN)3", n: "тиоцианат железа(III)", a: ["роданид железа"] },
    { f: "K4[Fe(CN)6]", n: "гексацианоферрат(II) калия", a: ["жёлтая кровяная соль"] },
    { f: "K3[Fe(CN)6]", n: "гексацианоферрат(III) калия", a: ["красная кровяная соль"] },
    { f: "KFe[Fe(CN)6]", n: "гексацианоферрат(II) железа(III)-калия", a: ["берлинская лазурь", "турнбулева синь"] }
  ],
  reactions: [
    { eq: "Fe + 2FeCl3 -> 3FeCl2", type: "соединение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Железо восстанавливает железо(III) до железа(II): степени окисления 0 и +3 «встречаются» на +2.", ion: "Fe + 2Fe^3+ -> 3Fe^2+" },
    { eq: "Fe2(SO4)3 + Fe -> 3FeSO4", type: "соединение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Так растворы солей железа(II) защищают от окисления — кладут в них железный гвоздь.", ion: "2Fe^3+ + Fe -> 3Fe^2+" },
    { eq: "2FeCl3 + 2KI -> 2FeCl2 + I2 + 2KCl", type: "другое", note: "железо(III) как окислитель", tags: ["ОВР"],
      cond: "В растворе.", desc: "Ионы железа(III) окисляют иодид до йода.", ion: "2Fe^3+ + 2I- -> 2Fe^2+ + I2" },
    { eq: "2FeCl3 + H2S -> 2FeCl2 + S + 2HCl", type: "другое", note: "железо(III) как окислитель", tags: ["ОВР"],
      cond: "В растворе.", desc: "Железо(III) окисляет сероводород до серы — раствор мутнеет.", ion: "2Fe^3+ + H2S -> 2Fe^2+ + S + 2H+" },
    { eq: "Cu + 2FeCl3 -> CuCl2 + 2FeCl2", type: "другое", note: "железо(III) как окислитель", tags: ["ОВР"],
      cond: "В растворе.", desc: "Раствор хлорида железа(III) растворяет медь — так травят медные дорожки на печатных платах.", ion: "Cu + 2Fe^3+ -> Cu^2+ + 2Fe^2+" },
    { eq: "2FeCl2 + Cl2 -> 2FeCl3", type: "соединение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Хлор окисляет железо(II) до железа(III).", ion: "2Fe^2+ + Cl2 -> 2Fe^3+ + 2Cl-" },
    { eq: "4Fe(OH)2 + O2 + 2H2O -> 4Fe(OH)3", type: "соединение", tags: ["ОВР"],
      cond: "На воздухе, при обычных условиях.", desc: "Светло-зелёный осадок гидроксида железа(II) на воздухе буреет — окисляется до гидроксида железа(III)." },
    { eq: "Fe(OH)2 -> FeO + H2O", type: "разложение", tags: [],
      cond: "При нагревании без доступа воздуха.", desc: "Гидроксид железа(II) разлагается на оксид и воду." },
    { eq: "2Fe(OH)3 + 3H2SO4 -> Fe2(SO4)3 + 6H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид железа(III) растворяется в серной кислоте.", ion: "Fe(OH)3 + 3H+ -> Fe^3+ + 3H2O" },
    { eq: "Fe(OH)3 + 3HCl -> FeCl3 + 3H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Бурый осадок растворяется в соляной кислоте.", ion: "Fe(OH)3 + 3H+ -> Fe^3+ + 3H2O" },
    { eq: "Fe(OH)2 + 2HCl -> FeCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид железа(II) растворяется в соляной кислоте.", ion: "Fe(OH)2 + 2H+ -> Fe^2+ + 2H2O" },
    { eq: "Fe(OH)3 + NaOH -> NaFeO2 + 2H2O", type: "другое", note: "проявление амфотерности", tags: [],
      cond: "При сплавлении.", desc: "Гидроксид железа(III) слабо амфотерный: при сплавлении со щёлочью образуется феррит." },
    { eq: "FeCl2 + 2NaOH -> Fe(OH)2 + 2NaCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает светло-зелёный осадок гидроксида железа(II).", ion: "Fe^2+ + 2OH- -> Fe(OH)2" },
    { eq: "Fe2(SO4)3 + 6NaOH -> 2Fe(OH)3 + 3Na2SO4", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает бурый осадок гидроксида железа(III).", ion: "Fe^3+ + 3OH- -> Fe(OH)3" },
    { eq: "2FeSO4 + H2SO4 + H2O2 -> Fe2(SO4)3 + 2H2O", type: "другое", note: "окисление железа(II)", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Пероксид водорода окисляет железо(II) до железа(III).", ion: "2Fe^2+ + H2O2 + 2H+ -> 2Fe^3+ + 2H2O" },
    { eq: "10FeSO4 + 2KMnO4 + 8H2SO4 -> 5Fe2(SO4)3 + 2MnSO4 + K2SO4 + 8H2O", type: "другое", note: "окисление железа(II) перманганатом", tags: ["ОВР"],
      cond: "В кислой среде (серная кислота).", desc: "Малиновый раствор перманганата обесцвечивается: марганец(+7) восстанавливается до +2.",
      ion: "5Fe^2+ + MnO4- + 8H+ -> 5Fe^3+ + Mn^2+ + 4H2O" },
    { eq: "6FeSO4 + K2Cr2O7 + 7H2SO4 -> 3Fe2(SO4)3 + Cr2(SO4)3 + K2SO4 + 7H2O", type: "другое", note: "окисление железа(II) дихроматом", tags: ["ОВР"],
      cond: "В кислой среде (серная кислота).", desc: "Оранжевый раствор дихромата становится зелёным: хром(+6) восстанавливается до +3.",
      ion: "6Fe^2+ + Cr2O7^2- + 14H+ -> 6Fe^3+ + 2Cr^3+ + 7H2O" },
    { eq: "2Fe + 6H2SO4 -> Fe2(SO4)3 + 3SO2 + 6H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, только при нагревании (на холоду железо пассивируется).", desc: "Горячая концентрированная серная кислота окисляет железо сразу до +3." },
    { eq: "Fe3O4 + 8HCl -> FeCl2 + 2FeCl3 + 4H2O", type: "обмен", tags: [],
      cond: "", desc: "В железной окалине есть и железо(II), и железо(III), поэтому образуются две соли.", ion: "Fe3O4 + 8H+ -> Fe^2+ + 2Fe^3+ + 4H2O" },
    { eq: "Fe3O4 + 4H2 -> 3Fe + 4H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Водород восстанавливает железо из окалины." },
    { eq: "Fe3O4 + 10HNO3 -> 3Fe(NO3)3 + NO2 + 5H2O", type: "другое", note: "окисление железа(II) в окалине", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Азотная кислота окисляет железо(II) из окалины до железа(III)." },
    { eq: "3Fe3O4 + 28HNO3 -> 9Fe(NO3)3 + NO + 14H2O", type: "другое", note: "окисление железа(II) в окалине", tags: ["ОВР"],
      cond: "С разбавленной азотной кислотой.", desc: "С разбавленной кислотой выделяется NO." },
    { eq: "3Fe2O3 + CO -> 2Fe3O4 + CO2", type: "другое", note: "восстановление в доменной печи", tags: ["ОВР"],
      cond: "В доменной печи, около 500 °C.", desc: "Первая ступень: оксид железа(III) восстанавливается до окалины." },
    { eq: "Fe3O4 + CO -> 3FeO + CO2", type: "другое", note: "восстановление в доменной печи", tags: ["ОВР"],
      cond: "В доменной печи, около 700 °C.", desc: "Вторая ступень: окалина восстанавливается до оксида железа(II)." },
    { eq: "FeO + CO -> Fe + CO2", type: "другое", note: "восстановление в доменной печи", tags: ["ОВР"],
      cond: "В доменной печи, около 1000 °C.", desc: "Третья ступень: получается железо." },
    { eq: "FeO + H2 -> Fe + H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Водород восстанавливает железо из оксида железа(II)." },
    { eq: "FeO + 2HCl -> FeCl2 + H2O", type: "обмен", tags: [],
      cond: "", desc: "Основный оксид железа(II) растворяется в кислоте.", ion: "FeO + 2H+ -> Fe^2+ + H2O" },
    { eq: "Fe2O3 + 3H2SO4 -> Fe2(SO4)3 + 3H2O", type: "обмен", tags: [],
      cond: "При нагревании.", desc: "Оксид железа(III) растворяется в серной кислоте.", ion: "Fe2O3 + 6H+ -> 2Fe^3+ + 3H2O" },
    { eq: "Fe2O3 + 2NaOH -> 2NaFeO2 + H2O", type: "другое", note: "проявление амфотерности", tags: [],
      cond: "При сплавлении.", desc: "При сплавлении со щёлочью оксид железа(III) образует феррит." },
    { eq: "Fe2O3 + Na2CO3 -> 2NaFeO2 + CO2", type: "другое", note: "сплавление амфотерного оксида с содой", tags: [],
      cond: "При сплавлении.", desc: "Оксид железа(III) вытесняет углекислый газ из соды." },
    { eq: "Fe2O3 + 3KNO3 + 4KOH -> 2K2FeO4 + 3KNO2 + 2H2O", type: "другое", note: "окислительное сплавление", tags: ["ОВР"],
      cond: "При сплавлении.", desc: "В щелочном расплаве с окислителем железо окисляется до +6 — образуется феррат." },
    { eq: "2FeCl3 + 3Na2CO3 + 3H2O -> 2Fe(OH)3 + 3CO2 + 6NaCl", type: "обмен", note: "совместный гидролиз", tags: [],
      cond: "В растворе.", desc: "Карбонат железа(III) в воде не существует: выпадает бурый гидроксид и выделяется углекислый газ.",
      ion: "2Fe^3+ + 3CO3^2- + 3H2O -> 2Fe(OH)3 + 3CO2" },
    { eq: "FeCl3 + 3KSCN -> Fe(SCN)3 + 3KCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Раствор окрашивается в кроваво-красный цвет — очень чувствительная реакция на ионы железа(III).", ion: "Fe^3+ + 3SCN- -> Fe(SCN)3" },
    { eq: "FeCl3 + K4[Fe(CN)6] -> KFe[Fe(CN)6] + 3KCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает тёмно-синий осадок — берлинская лазурь. Качественная реакция на ионы железа(III).",
      ion: "K+ + Fe^3+ + [Fe(CN)6]^4- -> KFe[Fe(CN)6]" },
    { eq: "FeSO4 + K3[Fe(CN)6] -> KFe[Fe(CN)6] + K2SO4", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает синий осадок (турнбулева синь) — качественная реакция на ионы железа(II).",
      ion: "K+ + Fe^2+ + [Fe(CN)6]^3- -> KFe[Fe(CN)6]" },
    { eq: "FeCl3 + 3AgNO3 -> Fe(NO3)3 + 3AgCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает белый осадок хлорида серебра.", ion: "Ag+ + Cl- -> AgCl" },
    { eq: "4FeS + 7O2 -> 2Fe2O3 + 4SO2", type: "другое", note: "обжиг сульфида", tags: ["ОВР"],
      cond: "При нагревании на воздухе.", desc: "При обжиге сульфида окисляются и железо (до +3), и сера (до +4)." },
    { eq: "Fe + I2 -> FeI2", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Йод — слабый окислитель, поэтому с ним железо образует соль железа(II), а не железа(III)." },
    { eq: "2FeSO4 -> Fe2O3 + SO2 + SO3", type: "разложение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "При разложении сульфата железа(II) железо окисляется, а часть серы восстанавливается." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Медь, цинк, серебро, золото, ртуть, никель */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Медь, цинк, серебро, золото и другие металлы",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "Cu2O", n: "оксид меди(I)" },
    { f: "CuI", n: "иодид меди(I)" },
    { f: "Cu2S", n: "сульфид меди(I)" },
    { f: "[Cu(NH3)4](OH)2", n: "гидроксид тетраамминмеди(II)", a: ["реактив Швейцера"] },
    { f: "[Cu(NH3)4]SO4", n: "сульфат тетраамминмеди(II)" },
    { f: "[Ag(NH3)2]OH", n: "гидроксид диамминсеребра(I)", a: ["аммиачный раствор оксида серебра", "реактив Толленса"] },
    { f: "[Ag(NH3)2]Cl", n: "хлорид диамминсеребра(I)" },
    { f: "Ag2SO4", n: "сульфат серебра" },
    { f: "Ag2S", n: "сульфид серебра" },
    { f: "Zn(OH)2", n: "гидроксид цинка" },
    { f: "Na2ZnO2", n: "цинкат натрия" },
    { f: "Na2[Zn(OH)4]", n: "тетрагидроксоцинкат натрия" },
    { f: "Au", n: "золото" },
    { f: "AuCl3", n: "хлорид золота(III)" },
    { f: "H[AuCl4]", n: "золотохлористоводородная кислота" },
    { f: "Pt", n: "платина" },
    { f: "H2[PtCl6]", n: "гексахлороплатиновая кислота" },
    { f: "HgS", n: "сульфид ртути(II)", a: ["киноварь"] },
    { f: "Ni", n: "никель" },
    { f: "NiO", n: "оксид никеля(II)" },
    { f: "NiCl2", n: "хлорид никеля(II)" },
    { f: "NiSO4", n: "сульфат никеля(II)" },
    { f: "Pb", n: "свинец" }
  ],
  reactions: [
    { eq: "4CuO -> 2Cu2O + O2", type: "разложение", tags: ["ОВР"],
      cond: "При сильном нагревании (выше 1000 °C).", desc: "Чёрный оксид меди(II) превращается в красный оксид меди(I)." },
    { eq: "Cu2O + H2 -> 2Cu + H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Водород восстанавливает медь из оксида меди(I)." },
    { eq: "Cu2O + 6HNO3 -> 2Cu(NO3)2 + 2NO2 + 3H2O", type: "другое", note: "окисление меди(I)", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Азотная кислота окисляет медь(I) до меди(II)." },
    { eq: "Cu(OH)2 + 4NH3 -> [Cu(NH3)4](OH)2", type: "соединение", note: "образование комплекса", tags: ["качественная реакция"],
      cond: "Раствор аммиака.", desc: "Голубой осадок растворяется, получается ярко-синий раствор комплексного соединения.",
      ion: "Cu(OH)2 + 4NH3 -> [Cu(NH3)4]^2+ + 2OH-" },
    { eq: "CuSO4 + 4NH3 -> [Cu(NH3)4]SO4", type: "соединение", note: "образование комплекса", tags: ["качественная реакция"],
      cond: "Избыток раствора аммиака.", desc: "Раствор становится ярко-синим — качественная реакция на ионы меди(II).",
      ion: "Cu^2+ + 4NH3 -> [Cu(NH3)4]^2+" },
    { eq: "2CuSO4 + 4KI -> 2CuI + I2 + 2K2SO4", type: "другое", note: "окисление иодида медью(II)", tags: ["ОВР"],
      cond: "В растворе.", desc: "Медь(II) окисляет иодид: выпадает осадок иодида меди(I), выделяется йод.", ion: "2Cu^2+ + 4I- -> 2CuI + I2" },
    { eq: "CuS + 8HNO3 -> CuSO4 + 8NO2 + 4H2O", type: "другое", note: "окисление сульфида азотной кислотой", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой при нагревании.", desc: "Нерастворимый сульфид меди растворяется только в кислоте-окислителе: сера окисляется до +6." },
    { eq: "2Cu2S + 3O2 -> 2Cu2O + 2SO2", type: "другое", note: "обжиг сульфида", tags: ["ОВР"],
      cond: "При нагревании на воздухе.", desc: "Первая стадия получения меди из сульфидной руды." },
    { eq: "Cu2S + 2Cu2O -> 6Cu + SO2", type: "другое", note: "получение меди", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Сульфид и оксид меди(I) реагируют друг с другом — получается черновая медь." },
    { eq: "2Cu + O2 + H2O + CO2 -> Cu2(OH)2CO3", type: "соединение", tags: ["ОВР"],
      cond: "Медленно, во влажном воздухе.", desc: "Так медь и бронза покрываются зелёной патиной." },
    { eq: "Cu2(OH)2CO3 + 4HCl -> 2CuCl2 + CO2 + 3H2O", type: "обмен", tags: [],
      cond: "", desc: "Малахит растворяется в кислоте с выделением углекислого газа.", ion: "Cu2(OH)2CO3 + 4H+ -> 2Cu^2+ + CO2 + 3H2O" },
    { eq: "CuCl2 + 2NaOH -> Cu(OH)2 + 2NaCl", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает голубой осадок гидроксида меди(II).", ion: "Cu^2+ + 2OH- -> Cu(OH)2" },
    { eq: "CuSO4 + BaCl2 -> BaSO4 + CuCl2", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Выпадает белый осадок сульфата бария, раствор остаётся окрашенным.", ion: "Ba^2+ + SO4^2- -> BaSO4" },
    { eq: "2AgNO3 + 2NaOH -> Ag2O + 2NaNO3 + H2O", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Гидроксид серебра неустойчив, поэтому сразу выпадает бурый осадок оксида серебра.", ion: "2Ag+ + 2OH- -> Ag2O + H2O" },
    { eq: "Ag2O + 4NH3 + H2O -> 2[Ag(NH3)2]OH", type: "соединение", note: "образование комплекса", tags: [],
      cond: "Раствор аммиака.", desc: "Получается аммиачный раствор оксида серебра (реактив Толленса) для реакции «серебряного зеркала»." },
    { eq: "AgCl + 2NH3 -> [Ag(NH3)2]Cl", type: "соединение", note: "образование комплекса", tags: [],
      cond: "Раствор аммиака.", desc: "Осадок хлорида серебра растворяется в аммиаке, а иодид серебра — нет. Так их различают.",
      ion: "AgCl + 2NH3 -> [Ag(NH3)2]+ + Cl-" },
    { eq: "2AgBr -> 2Ag + Br2", type: "разложение", tags: ["ОВР"],
      cond: "На свету.", desc: "Бромид серебра чувствителен к свету — на этом основана классическая фотоплёнка." },
    { eq: "2Ag + 2H2SO4 -> Ag2SO4 + SO2 + 2H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой при нагревании.", desc: "Серебро растворяется в горячей концентрированной серной кислоте." },
    { eq: "2Ag + S -> Ag2S", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Серебро соединяется с серой, получается чёрный сульфид серебра." },
    { eq: "ZnO + 2NaOH -> Na2ZnO2 + H2O", type: "другое", note: "амфотерный оксид + щёлочь", tags: [],
      cond: "При сплавлении.", desc: "Оксид цинка амфотерный: при сплавлении со щёлочью образует цинкат." },
    { eq: "ZnO + 2NaOH + H2O -> Na2[Zn(OH)4]", type: "соединение", note: "амфотерный оксид + щёлочь", tags: [],
      cond: "В растворе щёлочи.", desc: "В растворе образуется комплексная соль — тетрагидроксоцинкат.", ion: "ZnO + 2OH- + H2O -> [Zn(OH)4]^2-" },
    { eq: "Zn(OH)2 + 2NaOH -> Na2[Zn(OH)4]", type: "соединение", note: "амфотерный гидроксид + щёлочь", tags: [],
      cond: "Избыток щёлочи.", desc: "Гидроксид цинка растворяется в избытке щёлочи — признак амфотерности.", ion: "Zn(OH)2 + 2OH- -> [Zn(OH)4]^2-" },
    { eq: "Zn + 2NaOH + 2H2O -> Na2[Zn(OH)4] + H2", type: "другое", note: "амфотерный металл + щёлочь", tags: ["ОВР"],
      cond: "В растворе щёлочи.", desc: "Цинк растворяется в щёлочи с выделением водорода.", ion: "Zn + 2OH- + 2H2O -> [Zn(OH)4]^2- + H2" },
    { eq: "Zn + 2NaOH -> Na2ZnO2 + H2", type: "другое", note: "амфотерный металл + щёлочь", tags: ["ОВР"],
      cond: "При сплавлении.", desc: "При сплавлении со щёлочью цинк образует цинкат и выделяет водород." },
    { eq: "ZnCl2 + 2NaOH -> Zn(OH)2 + 2NaCl", type: "обмен", tags: [],
      cond: "Недостаток щёлочи.", desc: "Выпадает белый осадок гидроксида цинка.", ion: "Zn^2+ + 2OH- -> Zn(OH)2" },
    { eq: "ZnSO4 + 2NaOH -> Zn(OH)2 + Na2SO4", type: "обмен", tags: [],
      cond: "Недостаток щёлочи.", desc: "Выпадает белый осадок гидроксида цинка.", ion: "Zn^2+ + 2OH- -> Zn(OH)2" },
    { eq: "Zn(OH)2 + 2HCl -> ZnCl2 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид цинка растворяется и в кислоте.", ion: "Zn(OH)2 + 2H+ -> Zn^2+ + 2H2O" },
    { eq: "Zn(OH)2 -> ZnO + H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Гидроксид цинка разлагается на оксид и воду." },
    { eq: "ZnO + 2HCl -> ZnCl2 + H2O", type: "обмен", tags: [],
      cond: "", desc: "Оксид цинка растворяется в кислоте.", ion: "ZnO + 2H+ -> Zn^2+ + H2O" },
    { eq: "ZnO + CO -> Zn + CO2", type: "другое", note: "восстановление металла угарным газом", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Угарный газ восстанавливает цинк из оксида." },
    { eq: "2ZnS + 3O2 -> 2ZnO + 2SO2", type: "другое", note: "обжиг сульфида", tags: ["ОВР"],
      cond: "При нагревании на воздухе.", desc: "Первая стадия получения цинка из цинковой обманки." },
    { eq: "Zn + 2H2SO4 -> ZnSO4 + SO2 + 2H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой.", desc: "Концентрированная серная кислота с цинком выделяет не водород, а сернистый газ." },
    { eq: "3Zn + 4H2SO4 -> 3ZnSO4 + S + 4H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой, менее концентрированной.", desc: "Серная кислота может восстанавливаться и до серы." },
    { eq: "4Zn + 5H2SO4 -> 4ZnSO4 + H2S + 4H2O", type: "другое", note: "металл + концентрированная серная кислота", tags: ["ОВР"],
      cond: "С концентрированной серной кислотой.", desc: "С активным металлом серная кислота восстанавливается глубже всего — до сероводорода." },
    { eq: "Zn + Pb(NO3)2 -> Zn(NO3)2 + Pb", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "На цинке вырастают красивые кристаллы свинца — «сатурново дерево».", ion: "Zn + Pb^2+ -> Zn^2+ + Pb" },
    { eq: "Au + HNO3 + 4HCl -> H[AuCl4] + NO + 2H2O", type: "другое", note: "растворение золота в царской водке", tags: ["ОВР"],
      cond: "Смесь концентрированных азотной и соляной кислот (1 : 3) — «царская водка».", desc: "Азотная кислота окисляет золото, а хлорид-ионы связывают его в прочный комплекс." },
    { eq: "2Au + 3Cl2 -> 2AuCl3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Золото реагирует с хлором, получается хлорид золота(III)." },
    { eq: "3Pt + 4HNO3 + 18HCl -> 3H2[PtCl6] + 4NO + 8H2O", type: "другое", note: "растворение платины в царской водке", tags: ["ОВР"],
      cond: "Горячая царская водка.", desc: "Платину, как и золото, растворяет только царская водка." },
    { eq: "Hg + S -> HgS", type: "соединение", tags: ["ОВР"],
      cond: "При растирании ртути с серой.", desc: "Так собирают пролитую ртуть (демеркуризация): ядовитая ртуть превращается в нелетучий сульфид." },
    { eq: "Hg + 4HNO3 -> Hg(NO3)2 + 2NO2 + 2H2O", type: "другое", note: "металл + азотная кислота", tags: ["ОВР"],
      cond: "С концентрированной азотной кислотой.", desc: "Ртуть растворяется в концентрированной азотной кислоте." },
    { eq: "Ni + 2HCl -> NiCl2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании, медленно.", desc: "Никель стоит в ряду активности до водорода и медленно вытесняет его из кислот.", ion: "Ni + 2H+ -> Ni^2+ + H2" },
    { eq: "NiO + H2 -> Ni + H2O", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Водород восстанавливает никель из оксида." },
    { eq: "Ni + CuSO4 -> NiSO4 + Cu", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Никель активнее меди и вытесняет её из соли.", ion: "Ni + Cu^2+ -> Ni^2+ + Cu" },
    { eq: "PbO + C -> Pb + CO", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Уголь восстанавливает свинец из оксида." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Хром и марганец */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Хром, марганец и их соединения",
  level: "10–11 класс · ЕГЭ",
  ions: [
    { f: "Cr", z: 2, n: "катион хрома(II)" }
  ],
  substances: [
    { f: "CrCl2", n: "хлорид хрома(II)" },
    { f: "CrCl3", n: "хлорид хрома(III)" },
    { f: "Cr2(SO4)3", n: "сульфат хрома(III)" },
    { f: "Cr(OH)3", n: "гидроксид хрома(III)" },
    { f: "NaCrO2", n: "хромит натрия" },
    { f: "Na3[Cr(OH)6]", n: "гексагидроксохромат(III) натрия" },
    { f: "K3[Cr(OH)6]", n: "гексагидроксохромат(III) калия" },
    { f: "CrO3", n: "оксид хрома(VI)" },
    { f: "Na2CrO4", n: "хромат натрия" },
    { f: "K2CrO4", n: "хромат калия" },
    { f: "Na2Cr2O7", n: "дихромат натрия" },
    { f: "K2Cr2O7", n: "дихромат калия", a: ["бихромат калия"] },
    { f: "(NH4)2S", n: "сульфид аммония" },
    { f: "Mn", n: "марганец" },
    { f: "MnSO4", n: "сульфат марганца(II)" },
    { f: "Mn(OH)2", n: "гидроксид марганца(II)" }
  ],
  reactions: [
    { eq: "4Cr + 3O2 -> 2Cr2O3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Хром сгорает до зелёного оксида хрома(III)." },
    { eq: "2Cr + 3Cl2 -> 2CrCl3", type: "соединение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "С хлором хром образует хлорид хрома(III)." },
    { eq: "Cr + 2HCl -> CrCl2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "Без доступа воздуха.", desc: "Хром вытесняет водород из соляной кислоты, образуется голубой раствор соли хрома(II).", ion: "Cr + 2H+ -> Cr^2+ + H2" },
    { eq: "Cr2O3 + 2NaOH -> 2NaCrO2 + H2O", type: "другое", note: "амфотерный оксид + щёлочь", tags: [],
      cond: "При сплавлении.", desc: "Оксид хрома(III) амфотерный: при сплавлении со щёлочью образует хромит." },
    { eq: "Cr2O3 + 6HCl -> 2CrCl3 + 3H2O", type: "обмен", tags: [],
      cond: "При нагревании.", desc: "С кислотами оксид хрома(III) образует соли хрома(III).", ion: "Cr2O3 + 6H+ -> 2Cr^3+ + 3H2O" },
    { eq: "Cr2O3 + KClO3 + 4KOH -> 2K2CrO4 + KCl + 2H2O", type: "другое", note: "окислительное сплавление", tags: ["ОВР"],
      cond: "При сплавлении.", desc: "В щелочном расплаве с окислителем хром(+3) окисляется до хромата (+6)." },
    { eq: "Cr2O3 + 3KNO3 + 2K2CO3 -> 2K2CrO4 + 3KNO2 + 2CO2", type: "другое", note: "окислительное сплавление", tags: ["ОВР"],
      cond: "При сплавлении.", desc: "Селитра окисляет хром до +6, сода создаёт щелочную среду." },
    { eq: "CrCl3 + 3NaOH -> Cr(OH)3 + 3NaCl", type: "обмен", tags: [],
      cond: "Недостаток щёлочи.", desc: "Выпадает серо-зелёный осадок гидроксида хрома(III).", ion: "Cr^3+ + 3OH- -> Cr(OH)3" },
    { eq: "Cr2(SO4)3 + 6NaOH -> 2Cr(OH)3 + 3Na2SO4", type: "обмен", tags: [],
      cond: "Недостаток щёлочи.", desc: "Выпадает осадок гидроксида хрома(III).", ion: "Cr^3+ + 3OH- -> Cr(OH)3" },
    { eq: "CrCl3 + 6NaOH -> Na3[Cr(OH)6] + 3NaCl", type: "обмен", tags: [],
      cond: "Избыток щёлочи.", desc: "В избытке щёлочи образуется изумрудно-зелёный раствор комплексной соли.", ion: "Cr^3+ + 6OH- -> [Cr(OH)6]^3-" },
    { eq: "Cr(OH)3 + 3NaOH -> Na3[Cr(OH)6]", type: "соединение", note: "амфотерный гидроксид + щёлочь", tags: [],
      cond: "Избыток щёлочи.", desc: "Гидроксид хрома(III) амфотерный и растворяется в щёлочи.", ion: "Cr(OH)3 + 3OH- -> [Cr(OH)6]^3-" },
    { eq: "Cr(OH)3 + 3HCl -> CrCl3 + 3H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Гидроксид хрома(III) растворяется и в кислоте.", ion: "Cr(OH)3 + 3H+ -> Cr^3+ + 3H2O" },
    { eq: "2Cr(OH)3 -> Cr2O3 + 3H2O", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Гидроксид хрома(III) разлагается на оксид и воду." },
    { eq: "2Na3[Cr(OH)6] + 3H2O2 -> 2Na2CrO4 + 2NaOH + 8H2O", type: "другое", note: "окисление хрома(III) в щелочной среде", tags: ["ОВР"],
      cond: "В щелочной среде.", desc: "Пероксид водорода окисляет хром(+3) до хромата: зелёный раствор становится жёлтым.",
      ion: "2[Cr(OH)6]^3- + 3H2O2 -> 2CrO4^2- + 2OH- + 8H2O" },
    { eq: "2Cr(OH)3 + 3H2O2 + 4NaOH -> 2Na2CrO4 + 8H2O", type: "другое", note: "окисление хрома(III) в щелочной среде", tags: ["ОВР"],
      cond: "В щелочной среде.", desc: "Гидроксид хрома(III) окисляется пероксидом водорода до хромата." },
    { eq: "2CrCl3 + 3H2O2 + 10NaOH -> 2Na2CrO4 + 6NaCl + 8H2O", type: "другое", note: "окисление хрома(III) в щелочной среде", tags: ["ОВР"],
      cond: "В щелочной среде.", desc: "В щелочи соли хрома(III) окисляются до хроматов." },
    { eq: "2CrCl3 + 3Br2 + 16NaOH -> 2Na2CrO4 + 6NaBr + 6NaCl + 8H2O", type: "другое", note: "окисление хрома(III) в щелочной среде", tags: ["ОВР"],
      cond: "В щелочной среде.", desc: "Бром в щелочи окисляет хром(+3) до хромата (+6).", ion: "2Cr^3+ + 3Br2 + 16OH- -> 2CrO4^2- + 6Br- + 8H2O" },
    { eq: "2Na2CrO4 + H2SO4 -> Na2Cr2O7 + Na2SO4 + H2O", type: "другое", note: "переход хромата в дихромат", tags: [],
      cond: "При подкислении.", desc: "В кислой среде жёлтый хромат превращается в оранжевый дихромат. Степень окисления хрома не меняется.",
      ion: "2CrO4^2- + 2H+ -> Cr2O7^2- + H2O" },
    { eq: "2K2CrO4 + H2SO4 -> K2Cr2O7 + K2SO4 + H2O", type: "другое", note: "переход хромата в дихромат", tags: [],
      cond: "При подкислении.", desc: "Жёлтый раствор становится оранжевым.", ion: "2CrO4^2- + 2H+ -> Cr2O7^2- + H2O" },
    { eq: "K2Cr2O7 + 2KOH -> 2K2CrO4 + H2O", type: "другое", note: "переход дихромата в хромат", tags: [],
      cond: "При подщелачивании.", desc: "В щелочной среде оранжевый дихромат снова переходит в жёлтый хромат.", ion: "Cr2O7^2- + 2OH- -> 2CrO4^2- + H2O" },
    { eq: "Na2Cr2O7 + 2NaOH -> 2Na2CrO4 + H2O", type: "другое", note: "переход дихромата в хромат", tags: [],
      cond: "При подщелачивании.", desc: "Дихромат натрия в щелочной среде превращается в хромат.", ion: "Cr2O7^2- + 2OH- -> 2CrO4^2- + H2O" },
    { eq: "K2Cr2O7 + 14HCl -> 2KCl + 2CrCl3 + 3Cl2 + 7H2O", type: "другое", note: "дихромат как окислитель", tags: ["ОВР"],
      cond: "С концентрированной соляной кислотой, при нагревании.", desc: "Дихромат окисляет хлорид-ионы до хлора, раствор из оранжевого становится зелёным.",
      ion: "Cr2O7^2- + 14H+ + 6Cl- -> 2Cr^3+ + 3Cl2 + 7H2O" },
    { eq: "K2Cr2O7 + 3H2S + 4H2SO4 -> Cr2(SO4)3 + 3S + K2SO4 + 7H2O", type: "другое", note: "дихромат как окислитель", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Дихромат окисляет сероводород до серы." },
    { eq: "K2Cr2O7 + 3Na2SO3 + 4H2SO4 -> Cr2(SO4)3 + 3Na2SO4 + K2SO4 + 4H2O", type: "другое", note: "дихромат как окислитель", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Сульфит окисляется до сульфата, хром восстанавливается до +3.",
      ion: "Cr2O7^2- + 3SO3^2- + 8H+ -> 2Cr^3+ + 3SO4^2- + 4H2O" },
    { eq: "K2Cr2O7 + 6KI + 7H2SO4 -> Cr2(SO4)3 + 3I2 + 4K2SO4 + 7H2O", type: "другое", note: "дихромат как окислитель", tags: ["ОВР"],
      cond: "В кислой среде.", desc: "Дихромат окисляет иодид до йода.", ion: "Cr2O7^2- + 6I- + 14H+ -> 2Cr^3+ + 3I2 + 7H2O" },
    { eq: "K2Cr2O7 + 3SO2 + H2SO4 -> Cr2(SO4)3 + K2SO4 + H2O", type: "другое", note: "дихромат как окислитель", tags: ["ОВР"],
      cond: "В растворе.", desc: "Сернистый газ восстанавливает дихромат до соли хрома(III)." },
    { eq: "4K2Cr2O7 -> 4K2CrO4 + 2Cr2O3 + 3O2", type: "разложение", tags: ["ОВР"],
      cond: "При сильном нагревании.", desc: "Дихромат калия разлагается на хромат, оксид хрома(III) и кислород." },
    { eq: "K2Cr2O7 + H2SO4 -> 2CrO3 + K2SO4 + H2O", type: "обмен", tags: [],
      cond: "С концентрированной серной кислотой.", desc: "Выделяются тёмно-красные кристаллы оксида хрома(VI); такая смесь — «хромовая смесь» для мытья посуды." },
    { eq: "2K2CrO4 + 3(NH4)2S + 2KOH + 2H2O -> 2K3[Cr(OH)6] + 3S + 6NH3", type: "другое", note: "хромат как окислитель в щелочной среде", tags: ["ОВР"],
      cond: "В щелочной среде.", desc: "Сульфид восстанавливает хромат до комплексной соли хрома(III), выпадает сера." },
    { eq: "CrO3 + 2NaOH -> Na2CrO4 + H2O", type: "другое", note: "кислотный оксид + щёлочь", tags: [],
      cond: "", desc: "Оксид хрома(VI) — кислотный оксид: со щёлочью он даёт хромат.", ion: "CrO3 + 2OH- -> CrO4^2- + H2O" },
    { eq: "4CrO3 -> 2Cr2O3 + 3O2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Оксид хрома(VI) неустойчив и разлагается до оксида хрома(III)." },
    { eq: "2CrO3 + 2NH3 -> Cr2O3 + N2 + 3H2O", type: "другое", note: "оксид хрома(VI) как окислитель", tags: ["ОВР"],
      cond: "При обычных условиях (аммиак может воспламениться).", desc: "Оксид хрома(VI) — сильный окислитель: он окисляет аммиак до азота." },
    { eq: "2KMnO4 + 5Na2SO3 + 3H2SO4 -> 2MnSO4 + 5Na2SO4 + K2SO4 + 3H2O", type: "другое", note: "перманганат в кислой среде", tags: ["ОВР"],
      cond: "Кислая среда.", desc: "В кислой среде марганец(+7) восстанавливается до +2: раствор обесцвечивается.",
      ion: "2MnO4- + 5SO3^2- + 6H+ -> 2Mn^2+ + 5SO4^2- + 3H2O" },
    { eq: "2KMnO4 + 3Na2SO3 + H2O -> 2MnO2 + 3Na2SO4 + 2KOH", type: "другое", note: "перманганат в нейтральной среде", tags: ["ОВР"],
      cond: "Нейтральная среда.", desc: "В нейтральной среде марганец(+7) восстанавливается до +4: выпадает бурый осадок MnO₂.",
      ion: "2MnO4- + 3SO3^2- + H2O -> 2MnO2 + 3SO4^2- + 2OH-" },
    { eq: "2KMnO4 + Na2SO3 + 2KOH -> 2K2MnO4 + Na2SO4 + H2O", type: "другое", note: "перманганат в щелочной среде", tags: ["ОВР"],
      cond: "Щелочная среда.", desc: "В щелочной среде марганец(+7) восстанавливается до +6: раствор становится зелёным (манганат).",
      ion: "2MnO4- + SO3^2- + 2OH- -> 2MnO4^2- + SO4^2- + H2O" },
    { eq: "2KMnO4 + 5H2S + 3H2SO4 -> 2MnSO4 + 5S + K2SO4 + 8H2O", type: "другое", note: "перманганат в кислой среде", tags: ["ОВР"],
      cond: "Кислая среда.", desc: "Перманганат окисляет сероводород до серы." },
    { eq: "2KMnO4 + 10KI + 8H2SO4 -> 2MnSO4 + 5I2 + 6K2SO4 + 8H2O", type: "другое", note: "перманганат в кислой среде", tags: ["ОВР"],
      cond: "Кислая среда.", desc: "Перманганат окисляет иодид до йода.", ion: "2MnO4- + 10I- + 16H+ -> 2Mn^2+ + 5I2 + 8H2O" },
    { eq: "2KMnO4 + 5H2O2 + 3H2SO4 -> 2MnSO4 + 5O2 + K2SO4 + 8H2O", type: "другое", note: "пероксид водорода как восстановитель", tags: ["ОВР"],
      cond: "Кислая среда.", desc: "Пероксид водорода окисляется до кислорода, перманганат обесцвечивается.",
      ion: "2MnO4- + 5H2O2 + 6H+ -> 2Mn^2+ + 5O2 + 8H2O" },
    { eq: "2KMnO4 + 5SO2 + 2H2O -> 2MnSO4 + K2SO4 + 2H2SO4", type: "другое", note: "перманганат как окислитель", tags: ["ОВР", "качественная реакция"],
      cond: "В растворе.", desc: "Сернистый газ обесцвечивает раствор перманганата." },
    { eq: "2KMnO4 + 3MnSO4 + 2H2O -> 5MnO2 + K2SO4 + 2H2SO4", type: "другое", note: "сопропорционирование марганца", tags: ["ОВР"],
      cond: "В растворе.", desc: "Марганец(+7) и марганец(+2) встречаются на степени окисления +4 — выпадает MnO₂." },
    { eq: "4KMnO4 + 4KOH -> 4K2MnO4 + O2 + 2H2O", type: "другое", note: "перманганат в концентрированной щёлочи", tags: ["ОВР"],
      cond: "При нагревании с концентрированной щёлочью.", desc: "Перманганат восстанавливается до зелёного манганата, выделяется кислород." },
    { eq: "3MnO2 + KClO3 + 6KOH -> 3K2MnO4 + KCl + 3H2O", type: "другое", note: "окислительное сплавление", tags: ["ОВР"],
      cond: "При сплавлении.", desc: "В щелочном расплаве марганец(+4) окисляется до манганата (+6)." },
    { eq: "2MnO2 + O2 + 4KOH -> 2K2MnO4 + 2H2O", type: "другое", note: "окислительное сплавление", tags: ["ОВР"],
      cond: "При сплавлении на воздухе.", desc: "Даже кислород воздуха окисляет оксид марганца(IV) в расплавленной щёлочи." },
    { eq: "3K2MnO4 + 2H2O -> 2KMnO4 + MnO2 + 4KOH", type: "другое", note: "диспропорционирование манганата", tags: ["ОВР"],
      cond: "При разбавлении водой.", desc: "Зелёный манганат неустойчив в нейтральной среде: превращается в малиновый перманганат и бурый MnO₂." },
    { eq: "3K2MnO4 + 2CO2 -> 2KMnO4 + MnO2 + 2K2CO3", type: "другое", note: "диспропорционирование манганата", tags: ["ОВР"],
      cond: "При пропускании углекислого газа.", desc: "Углекислый газ ускоряет превращение манганата в перманганат." },
    { eq: "2K2MnO4 + Cl2 -> 2KMnO4 + 2KCl", type: "другое", note: "окисление манганата", tags: ["ОВР"],
      cond: "В растворе.", desc: "Хлор окисляет манганат до перманганата — промышленный способ получения марганцовки." },
    { eq: "Mn + 2HCl -> MnCl2 + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Марганец — довольно активный металл и вытесняет водород из кислот.", ion: "Mn + 2H+ -> Mn^2+ + H2" },
    { eq: "MnSO4 + 2NaOH -> Mn(OH)2 + Na2SO4", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Выпадает светлый осадок гидроксида марганца(II), который на воздухе буреет.", ion: "Mn^2+ + 2OH- -> Mn(OH)2" },
    { eq: "3MnO2 + 4Al -> 2Al2O3 + 3Mn", type: "замещение", tags: ["ОВР", "экзотермическая"],
      cond: "Поджигание смеси (алюмотермия).", desc: "Алюминий восстанавливает марганец из оксида." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Электролиз и гидролиз */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Электролиз растворов и расплавов",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "Li", n: "литий" },
    { f: "LiCl", n: "хлорид лития" }
  ],
  reactions: [
    { eq: "CuCl2 -> Cu + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На катоде оседает медь, на аноде выделяется хлор." },
    { eq: "2CuSO4 + 2H2O -> 2Cu + O2 + 2H2SO4", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На катоде оседает медь. Сульфат-ионы на аноде не окисляются — окисляется вода, выделяется кислород, а в растворе накапливается кислота." },
    { eq: "2NaCl + 2H2O -> H2 + Cl2 + 2NaOH", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора поваренной соли.", desc: "Натрий из раствора не выделяется: на катоде восстанавливается вода (водород), на аноде — хлор. Так в промышленности получают хлор и щёлочь." },
    { eq: "2KBr + 2H2O -> H2 + Br2 + 2KOH", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На катоде — водород, на аноде — бром, в растворе остаётся щёлочь." },
    { eq: "2KI + 2H2O -> H2 + I2 + 2KOH", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На аноде выделяется йод, на катоде — водород." },
    { eq: "4AgNO3 + 2H2O -> 4Ag + O2 + 4HNO3", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На катоде оседает серебро, на аноде выделяется кислород, в растворе образуется азотная кислота." },
    { eq: "2Cu(NO3)2 + 2H2O -> 2Cu + O2 + 4HNO3", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора, инертные электроды.", desc: "На катоде — медь, на аноде — кислород." },
    { eq: "2ZnSO4 + 2H2O -> 2Zn + O2 + 2H2SO4", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора. Упрощённая запись: на катоде вместе с цинком частично выделяется и водород.", desc: "Металлы средней активности при электролизе раствора выделяются на катоде вместе с водородом." },
    { eq: "2NiSO4 + 2H2O -> 2Ni + O2 + 2H2SO4", type: "другое", note: "электролиз раствора", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора. Упрощённая запись: на катоде частично выделяется и водород.", desc: "Так никелируют металлические детали." },
    { eq: "2HCl -> H2 + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз раствора соляной кислоты.", desc: "На катоде выделяется водород, на аноде — хлор." },
    { eq: "2Al2O3 -> 4Al + 3O2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава оксида алюминия в криолите, около 950 °C.", desc: "Так получают весь алюминий в мире. Криолит нужен, чтобы понизить температуру плавления." },
    { eq: "MgCl2 -> Mg + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава.", desc: "Активные металлы получают только электролизом расплавов: из растворов они не выделяются." },
    { eq: "CaCl2 -> Ca + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава.", desc: "Так получают металлический кальций." },
    { eq: "2KCl -> 2K + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава.", desc: "На катоде выделяется калий, на аноде — хлор." },
    { eq: "2LiCl -> 2Li + Cl2", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава.", desc: "Так получают литий для аккумуляторов." },
    { eq: "4NaOH -> 4Na + O2 + 2H2O", type: "разложение", tags: ["ОВР", "электролиз"],
      cond: "Электролиз расплава щёлочи.", desc: "На катоде выделяется натрий, на аноде окисляются гидроксид-ионы до кислорода." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Гидролиз солей",
  level: "10–11 класс · ЕГЭ",
  ions: [
    { f: "AlOH", z: 2, n: "гидроксоалюминий-катион" },
    { f: "FeOH", z: 2, n: "гидроксожелезо(III)-катион" },
    { f: "ZnOH", z: 1, n: "гидроксоцинк-катион" },
    { f: "CuOH", z: 1, n: "гидроксомедь(II)-катион" }
  ],
  substances: [
    { f: "AlOHCl2", n: "гидроксохлорид алюминия", fa: ["Al(OH)Cl2"] },
    { f: "FeOHCl2", n: "гидроксохлорид железа(III)", fa: ["Fe(OH)Cl2"] },
    { f: "ZnOHCl", n: "гидроксохлорид цинка", fa: ["Zn(OH)Cl"] },
    { f: "(CuOH)2SO4", n: "гидроксосульфат меди(II)", fa: ["(Cu(OH))2SO4"] },
    { f: "Cr2S3", n: "сульфид хрома(III)" }
  ],
  reactions: [
    { eq: "Na2CO3 + H2O <=> NaHCO3 + NaOH", type: "обмен", note: "гидролиз по аниону", tags: [],
      cond: "В растворе; среда щелочная (pH > 7).", desc: "Соль сильного основания и слабой кислоты гидролизуется по аниону, поэтому раствор соды мылкий на ощупь.",
      ion: "CO3^2- + H2O <=> HCO3- + OH-" },
    { eq: "Na2S + H2O <=> NaHS + NaOH", type: "обмен", note: "гидролиз по аниону", tags: [],
      cond: "В растворе; среда щелочная.", desc: "Сульфид-ион связывает ионы водорода воды, в растворе накапливаются гидроксид-ионы.",
      ion: "S^2- + H2O <=> HS- + OH-" },
    { eq: "Na2SO3 + H2O <=> NaHSO3 + NaOH", type: "обмен", note: "гидролиз по аниону", tags: [],
      cond: "В растворе; среда щелочная.", desc: "Сульфит — соль слабой сернистой кислоты, его раствор имеет щелочную среду.",
      ion: "SO3^2- + H2O <=> HSO3- + OH-" },
    { eq: "Na3PO4 + H2O <=> Na2HPO4 + NaOH", type: "обмен", note: "гидролиз по аниону", tags: [],
      cond: "В растворе; среда сильнощелочная.", desc: "Раствор фосфата натрия сильно щелочной, поэтому его используют как моющее средство.",
      ion: "PO4^3- + H2O <=> HPO4^2- + OH-" },
    { eq: "CH3COONa + H2O <=> CH3COOH + NaOH", type: "обмен", note: "гидролиз по аниону", tags: [],
      cond: "В растворе; среда слабощелочная.", desc: "Ацетат — соль слабой уксусной кислоты, поэтому гидролизуется по аниону.",
      ion: "CH3COO- + H2O <=> CH3COOH + OH-" },
    { eq: "NH4Cl + H2O <=> NH3·H2O + HCl", type: "обмен", note: "гидролиз по катиону", tags: [],
      cond: "В растворе; среда кислая (pH < 7).", desc: "Соль слабого основания и сильной кислоты гидролизуется по катиону.",
      ion: "NH4+ + H2O <=> NH3·H2O + H+" },
    { eq: "AlCl3 + H2O <=> AlOHCl2 + HCl", type: "обмен", note: "гидролиз по катиону", tags: [],
      cond: "В растворе; среда кислая.", desc: "Катион алюминия связывает гидроксид-ионы воды, в растворе накапливаются ионы водорода.",
      ion: "Al^3+ + H2O <=> AlOH^2+ + H+" },
    { eq: "FeCl3 + H2O <=> FeOHCl2 + HCl", type: "обмен", note: "гидролиз по катиону", tags: [],
      cond: "В растворе; среда кислая. При нагревании гидролиз усиливается, раствор буреет.", desc: "Соли железа(III) заметно гидролизуются, поэтому их растворы кислые.",
      ion: "Fe^3+ + H2O <=> FeOH^2+ + H+" },
    { eq: "ZnCl2 + H2O <=> ZnOHCl + HCl", type: "обмен", note: "гидролиз по катиону", tags: [],
      cond: "В растворе; среда кислая.", desc: "Хлорид цинка гидролизуется по катиону. Раствор «паяльной кислоты» травит металл благодаря кислой среде.",
      ion: "Zn^2+ + H2O <=> ZnOH+ + H+" },
    { eq: "2CuSO4 + 2H2O <=> (CuOH)2SO4 + H2SO4", type: "обмен", note: "гидролиз по катиону", tags: [],
      cond: "В растворе; среда кислая.", desc: "Сульфат меди(II) — соль слабого основания и сильной кислоты, его раствор кислый.",
      ion: "Cu^2+ + H2O <=> CuOH+ + H+" },
    { eq: "Cr2S3 + 6H2O -> 2Cr(OH)3 + 3H2S", type: "обмен", note: "полный гидролиз", tags: [],
      cond: "При контакте с водой.", desc: "Соль слабого основания и слабой кислоты разлагается водой полностью." },
    { eq: "Cr2(SO4)3 + 3Na2CO3 + 3H2O -> 2Cr(OH)3 + 3CO2 + 3Na2SO4", type: "обмен", note: "совместный гидролиз", tags: [],
      cond: "В растворе.", desc: "Карбоната хрома(III) в растворе не существует: выпадает гидроксид, выделяется углекислый газ.",
      ion: "2Cr^3+ + 3CO3^2- + 3H2O -> 2Cr(OH)3 + 3CO2" },
    { eq: "2CuSO4 + 2Na2CO3 + H2O -> Cu2(OH)2CO3 + 2Na2SO4 + CO2", type: "обмен", note: "совместный гидролиз", tags: [],
      cond: "В растворе.", desc: "Вместо карбоната меди выпадает основная соль — зелёный малахит.",
      ion: "2Cu^2+ + 2CO3^2- + H2O -> Cu2(OH)2CO3 + CO2" },
    { eq: "2FeCl3 + 3Na2S -> 2FeS + S + 6NaCl", type: "другое", note: "окислительно-восстановительная реакция вместо гидролиза", tags: ["ОВР"],
      cond: "В растворе.", desc: "Железо(III) — окислитель, сульфид — восстановитель, поэтому вместо совместного гидролиза идёт ОВР: выпадают сульфид железа(II) и сера.",
      ion: "2Fe^3+ + 3S^2- -> 2FeS + S" }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Алканы и циклоалканы
   Органические формулы можно писать со связями: «-» одинарная, «=» двойная, «≡» тройная.
   fa — другие написания той же формулы (например, молекулярная формула C2H6 для CH3-CH3). */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: алканы и циклоалканы",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CH4", n: "метан", a: ["природный газ"] },
    { f: "C2H6", n: "этан", fa: ["CH3-CH3"] },
    { f: "C3H8", n: "пропан", fa: ["CH3-CH2-CH3"] },
    { f: "C4H10", n: "бутан", a: ["н-бутан"], fa: ["CH3-CH2-CH2-CH3", "CH3(CH2)2CH3"] },
    { f: "CH3-CH(CH3)-CH3", n: "изобутан", a: ["2-метилпропан"], fa: ["(CH3)3CH", "CH(CH3)3"] },
    { f: "C6H14", n: "гексан", fa: ["CH3-(CH2)4-CH3"] },
    { f: "C7H16", n: "гептан", fa: ["CH3-(CH2)5-CH3"] },
    { f: "C8H18", n: "октан" },
    { f: "C16H34", n: "гексадекан", a: ["цетан"] },
    { f: "C4H8", n: "бутен (смесь изомеров)" },
    { f: "C8H16", n: "октен" },
    { f: "(CH2)3", n: "циклопропан" },
    { f: "C6H12", n: "циклогексан" },
    { f: "C6H11Cl", n: "хлорциклогексан" },
    { f: "CH3Cl", n: "хлорметан", a: ["метилхлорид"] },
    { f: "CH2Cl2", n: "дихлорметан" },
    { f: "CHCl3", n: "трихлорметан", a: ["хлороформ"] },
    { f: "CCl4", n: "тетрахлорметан", a: ["четырёххлористый углерод"] },
    { f: "CH3Br", n: "бромметан" },
    { f: "C2H5Cl", n: "хлорэтан", a: ["этилхлорид"], fa: ["CH3-CH2Cl", "CH3-CH2-Cl"] },
    { f: "C2H5Br", n: "бромэтан", a: ["этилбромид"], fa: ["CH3-CH2Br", "CH3-CH2-Br"] },
    { f: "CH3-CHBr-CH3", n: "2-бромпропан" },
    { f: "CH3-CHCl-CH3", n: "2-хлорпропан" },
    { f: "CH3-CH2-CH2Br", n: "1-бромпропан" },
    { f: "CH2Br-CH2-CH2Br", n: "1,3-дибромпропан" },
    { f: "CH2Cl-CH2-CH2Cl", n: "1,3-дихлорпропан" },
    { f: "CH3NO2", n: "нитрометан" },
    { f: "C2H5NO2", n: "нитроэтан" },
    { f: "HCHO", n: "формальдегид", a: ["метаналь", "муравьиный альдегид"], fa: ["HCOH", "CH2O", "H-CHO"] },
    { f: "C2H5COONa", n: "пропионат натрия", a: ["пропаноат натрия"] }
  ],
  reactions: [
    { eq: "CH4 + Cl2 -> CH3Cl + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету (hν).", desc: "Атом хлора замещает атом водорода в метане. Реакция идёт по цепному радикальному механизму." },
    { eq: "CH3Cl + Cl2 -> CH2Cl2 + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету.", desc: "Хлорирование идёт дальше: замещается второй атом водорода." },
    { eq: "CH2Cl2 + Cl2 -> CHCl3 + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету.", desc: "Получается хлороформ — когда-то его использовали для наркоза." },
    { eq: "CHCl3 + Cl2 -> CCl4 + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету.", desc: "Все четыре атома водорода замещены — получается тетрахлорметан." },
    { eq: "CH4 + Br2 -> CH3Br + HBr", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету, при нагревании.", desc: "Бром замещает водород в метане медленнее, чем хлор." },
    { eq: "C2H6 + Cl2 -> C2H5Cl + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету.", desc: "Хлорирование этана даёт хлорэтан." },
    { eq: "C3H8 + Br2 -> CH3-CHBr-CH3 + HBr", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету, при нагревании.", desc: "Бром замещает преимущественно водород у среднего (вторичного) атома углерода — получается 2-бромпропан." },
    { eq: "C3H8 + Cl2 -> CH3-CHCl-CH3 + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету. Получается смесь 1- и 2-хлорпропана, основной продукт — 2-хлорпропан.", desc: "Атом водорода у вторичного атома углерода замещается легче." },
    { eq: "CH4 + HNO3 -> CH3NO2 + H2O", type: "замещение", note: "нитрование (реакция Коновалова)", tags: [],
      cond: "Разбавленная азотная кислота, около 140 °C, давление.", desc: "Нитрогруппа замещает атом водорода — получается нитрометан." },
    { eq: "C2H6 + HNO3 -> C2H5NO2 + H2O", type: "замещение", note: "нитрование (реакция Коновалова)", tags: [],
      cond: "Разбавленная азотная кислота, нагревание, давление.", desc: "Нитрование этана даёт нитроэтан." },
    { eq: "2CH4 -> C2H2 + 3H2", type: "разложение", note: "дегидрирование метана", tags: [],
      cond: "Около 1500 °C, очень быстрое охлаждение.", desc: "Промышленный способ получения ацетилена из природного газа." },
    { eq: "CH4 -> C + 2H2", type: "разложение", tags: [],
      cond: "Около 1000 °C без доступа воздуха.", desc: "Метан разлагается на сажу и водород." },
    { eq: "CH4 + H2O -> CO + 3H2", type: "другое", note: "конверсия метана", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор (никель), около 800 °C.", desc: "Основной промышленный способ получения водорода и синтез-газа." },
    { eq: "CH4 + CO2 -> 2CO + 2H2", type: "другое", note: "углекислотная конверсия метана", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, высокая температура.", desc: "Из двух парниковых газов получается синтез-газ." },
    { eq: "CH4 + O2 -> HCHO + H2O", type: "окисление", note: "каталитическое окисление", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, нагревание.", desc: "При мягком окислении метан превращается в формальдегид." },
    { eq: "2C2H6 + 7O2 -> 4CO2 + 6H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.", desc: "Этан сгорает до углекислого газа и воды." },
    { eq: "2C4H10 + 5O2 -> 4CH3COOH + 2H2O", type: "окисление", note: "каталитическое окисление", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, около 200 °C, давление.", desc: "Промышленный способ получения уксусной кислоты из бутана." },
    { eq: "C2H6 -> C2H4 + H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni или Pt), нагревание.", desc: "При отщеплении водорода из алкана получается алкен." },
    { eq: "C3H8 -> CH2=CH-CH3 + H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Из пропана получается пропен." },
    { eq: "C4H10 -> C2H6 + C2H4", type: "разложение", note: "крекинг", tags: [],
      cond: "Нагревание до 450–700 °C (термический крекинг) или с катализатором.", desc: "При крекинге длинная молекула рвётся на алкан и алкен покороче." },
    { eq: "C4H10 -> CH4 + CH2=CH-CH3", type: "разложение", note: "крекинг", tags: [],
      cond: "Крекинг при нагревании.", desc: "Молекула бутана может разорваться и по другой связи." },
    { eq: "C8H18 -> C4H10 + C4H8", type: "разложение", note: "крекинг", tags: [],
      cond: "Крекинг нефтепродуктов.", desc: "Крекинг превращает тяжёлые фракции нефти в бензин и газы." },
    { eq: "C16H34 -> C8H18 + C8H16", type: "разложение", note: "крекинг", tags: [],
      cond: "Каталитический крекинг.", desc: "Из тяжёлого углеводорода получаются компоненты бензина." },
    { eq: "C4H10 -> CH3-CH(CH3)-CH3", type: "изомеризация", tags: ["каталитическая"],
      cond: "Катализатор AlCl₃, нагревание.", desc: "Неразветвлённая молекула бутана перестраивается в разветвлённый изобутан с той же формулой C₄H₁₀." },
    { eq: "C6H14 -> C6H6 + 4H2", type: "отщепление", note: "ароматизация (дегидроциклизация)", tags: ["каталитическая"],
      cond: "Катализатор (Pt или Cr₂O₃), нагревание.", desc: "Цепочка из шести атомов углерода замыкается в бензольное кольцо." },
    { eq: "C7H16 -> C6H5-CH3 + 4H2", type: "отщепление", note: "ароматизация (дегидроциклизация)", tags: ["каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Из гептана получается толуол." },
    { eq: "2CH3Cl + 2Na -> C2H6 + 2NaCl", type: "другое", note: "реакция Вюрца", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Натрий отнимает атомы хлора, и два радикала соединяются — углеродная цепь удлиняется." },
    { eq: "2C2H5Br + 2Na -> C4H10 + 2NaBr", type: "другое", note: "реакция Вюрца", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Из бромэтана получается бутан." },
    { eq: "CH3COONa + NaOH -> CH4 + Na2CO3", type: "другое", note: "декарбоксилирование (реакция Дюма)", tags: [],
      cond: "При сплавлении твёрдых веществ.", desc: "Лабораторный способ получения метана: от молекулы соли отщепляется карбоксильная группа." },
    { eq: "C2H5COONa + NaOH -> C2H6 + Na2CO3", type: "другое", note: "декарбоксилирование", tags: [],
      cond: "При сплавлении.", desc: "Из пропионата натрия получается этан — углеродная цепь становится короче на один атом." },
    { eq: "(CH2)3 + H2 -> C3H8", type: "присоединение", note: "гидрирование с раскрытием цикла", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Напряжённый трёхчленный цикл легко раскрывается." },
    { eq: "(CH2)3 + Br2 -> CH2Br-CH2-CH2Br", type: "присоединение", note: "с раскрытием цикла", tags: [],
      cond: "При обычных условиях.", desc: "Циклопропан, в отличие от других циклоалканов, обесцвечивает бромную воду." },
    { eq: "(CH2)3 + HBr -> CH3-CH2-CH2Br", type: "присоединение", note: "с раскрытием цикла", tags: [],
      cond: "При обычных условиях.", desc: "Цикл раскрывается, получается 1-бромпропан." },
    { eq: "CH2Cl-CH2-CH2Cl + Zn -> (CH2)3 + ZnCl2", type: "другое", note: "получение циклоалкана", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Цинк отнимает два атома хлора, и концы цепочки соединяются в цикл." },
    { eq: "C6H12 -> C6H6 + 3H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Pt или Pd), около 300 °C.", desc: "Циклогексан превращается в бензол." },
    { eq: "C6H12 + Cl2 -> C6H11Cl + HCl", type: "замещение", tags: ["радикальный механизм"],
      cond: "На свету.", desc: "Шестичленный цикл устойчив: циклогексан, как алканы, вступает в замещение, а не в присоединение." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Алкены, диены, полимеры */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: алкены, диены и полимеры",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C2H4", n: "этилен", a: ["этен"], fa: ["CH2=CH2"] },
    { f: "CH2=CH-CH3", n: "пропен", a: ["пропилен"], fa: ["C3H6", "CH3-CH=CH2"] },
    { f: "CH2=CH-CH2-CH3", n: "бутен-1", fa: ["CH3-CH2-CH=CH2"] },
    { f: "CH3-CH=CH-CH3", n: "бутен-2" },
    { f: "CH2=CH-CH=CH2", n: "бутадиен-1,3", a: ["дивинил"], fa: ["C4H6"] },
    { f: "CH2=C(CH3)-CH=CH2", n: "изопрен", a: ["2-метилбутадиен-1,3"], fa: ["C5H8"] },
    { f: "CH2=CHCl", n: "винилхлорид", a: ["хлорэтен"], fa: ["CH2=CH-Cl", "C2H3Cl"] },
    { f: "CF2=CF2", n: "тетрафторэтилен", fa: ["C2F4"] },
    { f: "C6H5-CH=CH2", n: "стирол", a: ["винилбензол"], fa: ["C6H5CH=CH2", "C8H8"] },
    { f: "CH2Br-CH2Br", n: "1,2-дибромэтан", fa: ["C2H4Br2", "BrCH2-CH2Br"] },
    { f: "CH2Cl-CH2Cl", n: "1,2-дихлорэтан", fa: ["C2H4Cl2", "ClCH2-CH2Cl"] },
    { f: "CH2Br-CHBr-CH3", n: "1,2-дибромпропан" },
    { f: "CH2=CH-CH2Cl", n: "3-хлорпропен", a: ["аллилхлорид"] },
    { f: "CH3-CHBr-CH2-CH3", n: "2-бромбутан" },
    { f: "CH2Br-CH=CH-CH2Br", n: "1,4-дибромбутен-2" },
    { f: "CH2Br-CHBr-CHBr-CH2Br", n: "1,2,3,4-тетрабромбутан" },
    { f: "CH2OH-CH2OH", n: "этиленгликоль", a: ["этандиол-1,2"], fa: ["C2H4(OH)2", "HOCH2-CH2OH", "HO-CH2-CH2-OH", "CH2(OH)-CH2(OH)"] },
    { f: "CH2OH-CHOH-CH3", n: "пропандиол-1,2", a: ["пропиленгликоль"], fa: ["CH2(OH)-CH(OH)-CH3"] },
    { f: "CH3-CH(OH)-CH3", n: "пропанол-2", a: ["изопропиловый спирт"], fa: ["CH3-CHOH-CH3", "(CH3)2CHOH"] },
    { f: "CH3-CH(OH)-CH2-CH3", n: "бутанол-2" },
    { f: "ZnBr2", n: "бромид цинка" },
    { f: "(-CH2-CH2-)n", n: "полиэтилен" },
    { f: "(-CH2-CH(CH3)-)n", n: "полипропилен" },
    { f: "(-CH2-CHCl-)n", n: "поливинилхлорид", a: ["ПВХ"] },
    { f: "(-CH2-CH(C6H5)-)n", n: "полистирол" },
    { f: "(-CF2-CF2-)n", n: "политетрафторэтилен", a: ["тефлон"] },
    { f: "(-CH2-CH=CH-CH2-)n", n: "бутадиеновый каучук" },
    { f: "(-CH2-C(CH3)=CH-CH2-)n", n: "изопреновый каучук", a: ["натуральный каучук"] }
  ],
  reactions: [
    { eq: "C2H4 + H2 -> C2H6", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni, Pt или Pd), нагревание.", desc: "По двойной связи присоединяется водород, алкен превращается в алкан." },
    { eq: "C2H4 + Br2 -> CH2Br-CH2Br", type: "присоединение", note: "бромирование", tags: ["качественная реакция"],
      cond: "При обычных условиях (бромная вода).", desc: "Бромная вода обесцвечивается — качественная реакция на двойную связь." },
    { eq: "C2H4 + Cl2 -> CH2Cl-CH2Cl", type: "присоединение", note: "хлорирование", tags: [],
      cond: "При обычных условиях.", desc: "Хлор присоединяется по двойной связи, получается 1,2-дихлорэтан." },
    { eq: "C2H4 + HCl -> C2H5Cl", type: "присоединение", note: "гидрогалогенирование", tags: [],
      cond: "При обычных условиях.", desc: "К этилену присоединяется хлороводород." },
    { eq: "C2H4 + HBr -> C2H5Br", type: "присоединение", note: "гидрогалогенирование", tags: [],
      cond: "При обычных условиях.", desc: "К этилену присоединяется бромоводород." },
    { eq: "C2H4 + H2O -> C2H5OH", type: "присоединение", note: "гидратация", tags: ["каталитическая"],
      cond: "Катализатор (H₃PO₄), около 300 °C, давление.", desc: "Промышленный способ получения этилового спирта." },
    { eq: "CH2=CH-CH3 + HBr -> CH3-CHBr-CH3", type: "присоединение", note: "по правилу Марковникова", tags: [],
      cond: "При обычных условиях.", desc: "Водород присоединяется к более гидрогенизированному атому углерода, бром — к соседнему (правило Марковникова)." },
    { eq: "CH2=CH-CH3 + HCl -> CH3-CHCl-CH3", type: "присоединение", note: "по правилу Марковникова", tags: [],
      cond: "При обычных условиях.", desc: "Основной продукт — 2-хлорпропан." },
    { eq: "CH2=CH-CH3 + H2O -> CH3-CH(OH)-CH3", type: "присоединение", note: "гидратация по правилу Марковникова", tags: ["каталитическая"],
      cond: "Кислотный катализатор, нагревание.", desc: "Получается вторичный спирт — пропанол-2." },
    { eq: "CH2=CH-CH3 + Br2 -> CH2Br-CHBr-CH3", type: "присоединение", note: "бромирование", tags: ["качественная реакция"],
      cond: "При обычных условиях.", desc: "Пропен обесцвечивает бромную воду." },
    { eq: "CH2=CH-CH3 + H2 -> C3H8", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Пропен превращается в пропан." },
    { eq: "CH2=CH-CH3 + Cl2 -> CH2=CH-CH2Cl + HCl", type: "замещение", note: "аллильное хлорирование", tags: ["радикальный механизм"],
      cond: "Около 500 °C.", desc: "При высокой температуре хлор не присоединяется, а замещает водород в группе CH₃." },
    { eq: "CH2=CH-CH2-CH3 + HBr -> CH3-CHBr-CH2-CH3", type: "присоединение", note: "по правилу Марковникова", tags: [],
      cond: "При обычных условиях.", desc: "Из бутена-1 получается 2-бромбутан." },
    { eq: "CH2=CH-CH2-CH3 + H2O -> CH3-CH(OH)-CH2-CH3", type: "присоединение", note: "гидратация по правилу Марковникова", tags: ["каталитическая"],
      cond: "Кислотный катализатор, нагревание.", desc: "Получается вторичный спирт — бутанол-2." },
    { eq: "3C2H4 + 2KMnO4 + 4H2O -> 3CH2OH-CH2OH + 2MnO2 + 2KOH", type: "окисление", note: "реакция Вагнера", tags: ["ОВР", "качественная реакция"],
      cond: "Водный раствор перманганата на холоду (нейтральная среда).", desc: "Малиновый раствор обесцвечивается, выпадает бурый MnO₂, а алкен превращается в двухатомный спирт." },
    { eq: "3CH2=CH-CH3 + 2KMnO4 + 4H2O -> 3CH2OH-CHOH-CH3 + 2MnO2 + 2KOH", type: "окисление", note: "реакция Вагнера", tags: ["ОВР", "качественная реакция"],
      cond: "Водный раствор перманганата на холоду.", desc: "Из пропена получается пропандиол-1,2." },
    { eq: "5C2H4 + 12KMnO4 + 18H2SO4 -> 10CO2 + 12MnSO4 + 6K2SO4 + 28H2O", type: "окисление", note: "жёсткое окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "В кислой среде двойная связь рвётся; из этилена получается углекислый газ." },
    { eq: "5CH2=CH-CH3 + 10KMnO4 + 15H2SO4 -> 5CH3COOH + 5CO2 + 10MnSO4 + 5K2SO4 + 20H2O", type: "окисление", note: "жёсткое окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Молекула рвётся по двойной связи: из группы CH₂= получается CO₂, а из остатка — уксусная кислота." },
    { eq: "5CH3-CH=CH-CH3 + 8KMnO4 + 12H2SO4 -> 10CH3COOH + 8MnSO4 + 4K2SO4 + 12H2O", type: "окисление", note: "жёсткое окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Симметричный бутен-2 рвётся на две одинаковые молекулы уксусной кислоты." },
    { eq: "2C2H4 + O2 -> 2CH3CHO", type: "окисление", note: "каталитическое окисление (Вакер-процесс)", tags: ["ОВР", "каталитическая"],
      cond: "Катализаторы PdCl₂ и CuCl₂ в водном растворе.", desc: "Промышленный способ получения уксусного альдегида." },
    { eq: "C2H4 + 3O2 -> 2CO2 + 2H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение", "экзотермическая"],
      cond: "Поджигание.", desc: "Этилен горит светящимся пламенем." },
    { eq: "nC2H4 -> (-CH2-CH2-)n", type: "полимеризация", tags: [],
      cond: "Катализатор или высокое давление, нагревание.", desc: "Тысячи молекул этилена соединяются в длинную цепь — получается полиэтилен." },
    { eq: "nCH2=CH-CH3 -> (-CH2-CH(CH3)-)n", type: "полимеризация", tags: ["каталитическая"],
      cond: "Катализатор.", desc: "Из пропилена получается полипропилен." },
    { eq: "nCH2=CHCl -> (-CH2-CHCl-)n", type: "полимеризация", tags: [],
      cond: "Инициатор, нагревание.", desc: "Из винилхлорида получается поливинилхлорид (ПВХ) — материал для труб и окон." },
    { eq: "nC6H5-CH=CH2 -> (-CH2-CH(C6H5)-)n", type: "полимеризация", tags: [],
      cond: "Инициатор, нагревание.", desc: "Из стирола получается полистирол." },
    { eq: "nCF2=CF2 -> (-CF2-CF2-)n", type: "полимеризация", tags: [],
      cond: "Инициатор, давление.", desc: "Получается тефлон — очень стойкий полимер для антипригарных покрытий." },
    { eq: "C2H5OH -> C2H4 + H2O", type: "отщепление", note: "внутримолекулярная дегидратация", tags: [],
      cond: "Концентрированная серная кислота, выше 140 °C.", desc: "От молекулы спирта отщепляется вода, образуется двойная связь — лабораторный способ получения этилена." },
    { eq: "C2H5Cl + KOH -> C2H4 + KCl + H2O", type: "отщепление", note: "дегидрогалогенирование", tags: [],
      cond: "Спиртовой раствор щёлочи, нагревание.", desc: "В спиртовом растворе щёлочь отщепляет хлороводород и образуется алкен." },
    { eq: "CH3-CHBr-CH3 + KOH -> CH2=CH-CH3 + KBr + H2O", type: "отщепление", note: "дегидрогалогенирование", tags: [],
      cond: "Спиртовой раствор щёлочи, нагревание.", desc: "Из 2-бромпропана получается пропен." },
    { eq: "CH3-CHBr-CH2-CH3 + KOH -> CH3-CH=CH-CH3 + KBr + H2O", type: "отщепление", note: "по правилу Зайцева", tags: [],
      cond: "Спиртовой раствор щёлочи, нагревание.", desc: "Водород отщепляется от менее гидрогенизированного соседнего атома углерода, поэтому основной продукт — бутен-2." },
    { eq: "CH2Br-CH2Br + Zn -> C2H4 + ZnBr2", type: "отщепление", note: "дегалогенирование", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Цинк отнимает два соседних атома брома, образуется двойная связь." },
    { eq: "CH2=CH-CH=CH2 + 2H2 -> C4H10", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Обе двойные связи насыщаются водородом." },
    { eq: "CH2=CH-CH=CH2 + Br2 -> CH2Br-CH=CH-CH2Br", type: "присоединение", note: "1,4-присоединение", tags: [],
      cond: "При обычных условиях.", desc: "Сопряжённые диены присоединяют бром по концам молекулы, а двойная связь перемещается в середину." },
    { eq: "CH2=CH-CH=CH2 + 2Br2 -> CH2Br-CHBr-CHBr-CH2Br", type: "присоединение", note: "бромирование", tags: [],
      cond: "Избыток брома.", desc: "При избытке брома насыщаются обе двойные связи." },
    { eq: "nCH2=CH-CH=CH2 -> (-CH2-CH=CH-CH2-)n", type: "полимеризация", tags: ["каталитическая"],
      cond: "Катализатор (натрий в способе Лебедева).", desc: "Получается синтетический бутадиеновый каучук." },
    { eq: "nCH2=C(CH3)-CH=CH2 -> (-CH2-C(CH3)=CH-CH2-)n", type: "полимеризация", tags: ["каталитическая"],
      cond: "Катализатор.", desc: "Изопреновый каучук по строению близок к натуральному каучуку из сока гевеи." },
    { eq: "2C2H5OH -> CH2=CH-CH=CH2 + 2H2O + H2", type: "другое", note: "способ Лебедева", tags: ["каталитическая"],
      cond: "Катализатор (ZnO, Al₂O₃), около 425 °C.", desc: "Первый промышленный способ получения бутадиена для синтетического каучука (СССР, 1932 год)." },
    { eq: "C4H10 -> CH2=CH-CH=CH2 + 2H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Современный промышленный способ получения бутадиена из бутана." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Алкины и арены */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: алкины",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C2H2", n: "ацетилен", a: ["этин"], fa: ["CH≡CH", "HC≡CH"] },
    { f: "CH≡C-CH3", n: "пропин", a: ["метилацетилен"], fa: ["C3H4", "HC≡C-CH3", "CH3-C≡CH"] },
    { f: "CHBr=CHBr", n: "1,2-дибромэтен", fa: ["C2H2Br2"] },
    { f: "CHBr2-CHBr2", n: "1,1,2,2-тетрабромэтан", fa: ["C2H2Br4"] },
    { f: "CH3-CBr2-CH3", n: "2,2-дибромпропан" },
    { f: "CH3-CHCl2", n: "1,1-дихлорэтан" },
    { f: "CH2=CH-C≡CH", n: "винилацетилен", fa: ["C4H4"] },
    { f: "AgC≡CAg", n: "ацетиленид серебра", fa: ["Ag2C2"] },
    { f: "CH3-C≡CAg", n: "пропинид серебра" },
    { f: "NaC≡CNa", n: "ацетиленид натрия", fa: ["Na2C2"] },
    { f: "K2C2O4", n: "оксалат калия" },
    { f: "HCN", n: "циановодород", a: ["синильная кислота"] },
    { f: "CH2=CH-CN", n: "акрилонитрил", fa: ["C3H3N"] }
  ],
  reactions: [
    { eq: "C2H2 + H2 -> C2H4", type: "присоединение", note: "частичное гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (палладий с добавками), нагревание.", desc: "На специальном катализаторе тройная связь превращается в двойную." },
    { eq: "C2H2 + 2H2 -> C2H6", type: "присоединение", note: "полное гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni или Pt), нагревание.", desc: "Ацетилен присоединяет две молекулы водорода и превращается в этан." },
    { eq: "C2H2 + Br2 -> CHBr=CHBr", type: "присоединение", note: "бромирование", tags: [],
      cond: "Недостаток брома.", desc: "Тройная связь присоединяет одну молекулу брома и становится двойной." },
    { eq: "C2H2 + 2Br2 -> CHBr2-CHBr2", type: "присоединение", note: "бромирование", tags: ["качественная реакция"],
      cond: "Избыток бромной воды.", desc: "Ацетилен обесцвечивает бромную воду, присоединяя две молекулы брома." },
    { eq: "C2H2 + HCl -> CH2=CHCl", type: "присоединение", note: "гидрохлорирование", tags: ["каталитическая"],
      cond: "Катализатор (HgCl₂), нагревание.", desc: "Получается винилхлорид — сырьё для ПВХ." },
    { eq: "C2H2 + H2O -> CH3CHO", type: "присоединение", note: "реакция Кучерова", tags: ["каталитическая"],
      cond: "Соли ртути(II) (HgSO₄) в кислой среде.", desc: "Сначала образуется неустойчивый виниловый спирт, который сразу перестраивается в уксусный альдегид." },
    { eq: "CH≡C-CH3 + H2O -> CH3-CO-CH3", type: "присоединение", note: "реакция Кучерова", tags: ["каталитическая"],
      cond: "Соли ртути(II) в кислой среде.", desc: "Гомологи ацетилена по реакции Кучерова дают не альдегиды, а кетоны — здесь ацетон." },
    { eq: "CH≡C-CH3 + 2HBr -> CH3-CBr2-CH3", type: "присоединение", note: "по правилу Марковникова", tags: [],
      cond: "При обычных условиях.", desc: "Оба атома брома присоединяются к среднему атому углерода." },
    { eq: "3C2H2 -> C6H6", type: "другое", note: "тримеризация (реакция Зелинского)", tags: ["каталитическая"],
      cond: "Активированный уголь, около 600 °C.", desc: "Три молекулы ацетилена замыкаются в бензольное кольцо." },
    { eq: "2C2H2 -> CH2=CH-C≡CH", type: "другое", note: "димеризация", tags: ["каталитическая"],
      cond: "Катализатор (CuCl в растворе NH₄Cl).", desc: "Получается винилацетилен — сырьё для хлоропренового каучука." },
    { eq: "C2H2 + 2[Ag(NH3)2]OH -> AgC≡CAg + 4NH3 + 2H2O", type: "замещение", tags: ["качественная реакция"],
      cond: "Аммиачный раствор оксида серебра.", desc: "Выпадает серовато-белый осадок ацетиленида серебра — качественная реакция на тройную связь на конце цепи. Сухой ацетиленид взрывоопасен." },
    { eq: "CH≡C-CH3 + [Ag(NH3)2]OH -> CH3-C≡CAg + 2NH3 + H2O", type: "замещение", tags: ["качественная реакция"],
      cond: "Аммиачный раствор оксида серебра.", desc: "Пропин тоже даёт осадок, а бутин-2 — нет: у него нет атома водорода при тройной связи." },
    { eq: "C2H2 + 2Na -> NaC≡CNa + H2", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Атомы водорода при тройной связи подвижны: ацетилен проявляет слабые кислотные свойства." },
    { eq: "C2H2 + 2KMnO4 + 3H2SO4 -> 2CO2 + 2MnSO4 + K2SO4 + 4H2O", type: "окисление", note: "жёсткое окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата.", desc: "В кислой среде ацетилен окисляется до углекислого газа, раствор обесцвечивается." },
    { eq: "3C2H2 + 8KMnO4 -> 3K2C2O4 + 8MnO2 + 2KOH + 2H2O", type: "окисление", note: "окисление в нейтральной среде", tags: ["ОВР", "качественная реакция"],
      cond: "Водный раствор перманганата (нейтральная среда).", desc: "В нейтральной среде углеродная цепь сохраняется — получается оксалат калия, выпадает бурый MnO₂." },
    { eq: "5CH≡C-CH3 + 8KMnO4 + 12H2SO4 -> 5CH3COOH + 5CO2 + 8MnSO4 + 4K2SO4 + 12H2O", type: "окисление", note: "жёсткое окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Тройная связь рвётся: концевой атом углерода уходит в CO₂, остаток становится уксусной кислотой." },
    { eq: "CH2Br-CH2Br + 2KOH -> C2H2 + 2KBr + 2H2O", type: "отщепление", note: "дегидрогалогенирование", tags: [],
      cond: "Спиртовой раствор щёлочи, нагревание.", desc: "Отщепляются две молекулы бромоводорода — образуется тройная связь." },
    { eq: "CH3-CHCl2 + 2KOH -> C2H2 + 2KCl + 2H2O", type: "отщепление", note: "дегидрогалогенирование", tags: [],
      cond: "Спиртовой раствор щёлочи, нагревание.", desc: "Из 1,1-дихлорэтана тоже получается ацетилен." },
    { eq: "C2H2 + HCN -> CH2=CH-CN", type: "присоединение", tags: ["каталитическая"],
      cond: "Катализатор (CuCl).", desc: "Получается акрилонитрил — сырьё для синтетического волокна нитрон." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: ароматические углеводороды",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C6H6", n: "бензол" },
    { f: "C6H5-CH3", n: "толуол", a: ["метилбензол"], fa: ["C6H5CH3", "C7H8", "CH3-C6H5"] },
    { f: "C6H5-C2H5", n: "этилбензол", fa: ["C6H5C2H5", "C8H10", "C6H5-CH2-CH3"] },
    { f: "C6H5-CH(CH3)2", n: "изопропилбензол", a: ["кумол"], fa: ["C6H5CH(CH3)2", "C9H12"] },
    { f: "C6H5Br", n: "бромбензол", fa: ["C6H5-Br"] },
    { f: "C6H5Cl", n: "хлорбензол", fa: ["C6H5-Cl"] },
    { f: "C6H5NO2", n: "нитробензол", fa: ["C6H5-NO2"] },
    { f: "C6H6Cl6", n: "гексахлорциклогексан", a: ["гексахлоран"] },
    { f: "CH3-C6H2(NO2)3", n: "2,4,6-тринитротолуол", a: ["тротил", "тол"], fa: ["C6H2(NO2)3CH3", "C7H5N3O6"] },
    { f: "C6H5-CH2Cl", n: "бензилхлорид", fa: ["C6H5CH2Cl"] },
    { f: "CH3-C6H4-Cl", n: "хлортолуол (орто- и пара-)", fa: ["ClC6H4CH3"] },
    { f: "C6H5COOH", n: "бензойная кислота", fa: ["C6H5-COOH"] },
    { f: "C6H5COONa", n: "бензоат натрия" },
    { f: "C6H5COOK", n: "бензоат калия" },
    { f: "C6H5-CHBr-CH2Br", n: "1,2-дибром-1-фенилэтан" },
    { f: "C6H5-CH(OH)-CH2OH", n: "1-фенилэтандиол-1,2" }
  ],
  reactions: [
    { eq: "C6H6 + Br2 -> C6H5Br + HBr", type: "замещение", note: "бромирование", tags: ["каталитическая"],
      cond: "Катализатор (FeBr₃ или железные опилки).", desc: "Бензол не обесцвечивает бромную воду: с бромом он вступает в замещение, и только с катализатором." },
    { eq: "C6H6 + Cl2 -> C6H5Cl + HCl", type: "замещение", note: "хлорирование", tags: ["каталитическая"],
      cond: "Катализатор (AlCl₃ или FeCl₃).", desc: "Атом хлора замещает атом водорода в бензольном кольце." },
    { eq: "C6H6 + HNO3 -> C6H5NO2 + H2O", type: "замещение", note: "нитрование", tags: [],
      cond: "Нитрующая смесь: концентрированные азотная и серная кислоты, нагревание.", desc: "Получается нитробензол — жёлтая жидкость с запахом горького миндаля, сырьё для анилина." },
    { eq: "C6H6 + 3H2 -> C6H12", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni или Pt), нагревание, давление.", desc: "В жёстких условиях бензол присоединяет водород и превращается в циклогексан." },
    { eq: "C6H6 + 3Cl2 -> C6H6Cl6", type: "присоединение", note: "радикальное хлорирование", tags: ["радикальный механизм"],
      cond: "На свету (hν).", desc: "На свету бензол присоединяет хлор — получается гексахлоран, когда-то средство от насекомых." },
    { eq: "C6H6 + CH3Cl -> C6H5-CH3 + HCl", type: "замещение", note: "алкилирование", tags: ["каталитическая"],
      cond: "Катализатор (AlCl₃).", desc: "Метильная группа замещает атом водорода — получается толуол." },
    { eq: "C6H6 + C2H4 -> C6H5-C2H5", type: "присоединение", note: "алкилирование алкеном", tags: ["каталитическая"],
      cond: "Кислотный катализатор.", desc: "Промышленный способ получения этилбензола — сырья для стирола." },
    { eq: "C6H6 + CH2=CH-CH3 -> C6H5-CH(CH3)2", type: "присоединение", note: "алкилирование алкеном", tags: ["каталитическая"],
      cond: "Кислотный катализатор.", desc: "Получается кумол — сырьё для производства фенола и ацетона." },
    { eq: "2C6H6 + 15O2 -> 12CO2 + 6H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "Бензол горит сильно коптящим пламенем." },
    { eq: "C6H5-CH3 + 3HNO3 -> CH3-C6H2(NO2)3 + 3H2O", type: "замещение", note: "нитрование", tags: [],
      cond: "Концентрированные азотная и серная кислоты, нагревание.", desc: "Метильная группа облегчает замещение, поэтому толуол нитруется сразу по трём положениям — получается тротил." },
    { eq: "C6H5-CH3 + Cl2 -> C6H5-CH2Cl + HCl", type: "замещение", note: "хлорирование в боковую цепь", tags: ["радикальный механизм"],
      cond: "На свету (hν).", desc: "На свету хлор замещает водород в метильной группе, а не в кольце." },
    { eq: "C6H5-CH3 + Cl2 -> CH3-C6H4-Cl + HCl", type: "замещение", note: "хлорирование в кольцо", tags: ["каталитическая"],
      cond: "Катализатор (FeCl₃).", desc: "С катализатором хлор замещает водород в кольце, в орто- и пара-положениях." },
    { eq: "5C6H5-CH3 + 6KMnO4 + 9H2SO4 -> 5C6H5COOH + 6MnSO4 + 3K2SO4 + 14H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Бензол перманганатом не окисляется, а толуол — окисляется: метильная группа превращается в карбоксильную." },
    { eq: "C6H5-CH3 + 2KMnO4 -> C6H5COOK + 2MnO2 + KOH + H2O", type: "окисление", note: "окисление в нейтральной среде", tags: ["ОВР"],
      cond: "Водный раствор перманганата, нагревание.", desc: "В нейтральной среде получается соль — бензоат калия." },
    { eq: "5C6H5-C2H5 + 12KMnO4 + 18H2SO4 -> 5C6H5COOH + 5CO2 + 12MnSO4 + 6K2SO4 + 28H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Любая боковая цепь окисляется до группы −COOH, лишний атом углерода уходит в CO₂." },
    { eq: "C6H5-CH=CH2 + Br2 -> C6H5-CHBr-CH2Br", type: "присоединение", note: "бромирование", tags: ["качественная реакция"],
      cond: "При обычных условиях.", desc: "Стирол, в отличие от бензола, обесцвечивает бромную воду: у него есть двойная связь в боковой цепи." },
    { eq: "C6H5-CH=CH2 + H2 -> C6H5-C2H5", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Водород присоединяется по двойной связи боковой цепи." },
    { eq: "3C6H5-CH=CH2 + 2KMnO4 + 4H2O -> 3C6H5-CH(OH)-CH2OH + 2MnO2 + 2KOH", type: "окисление", note: "реакция Вагнера", tags: ["ОВР", "качественная реакция"],
      cond: "Водный раствор перманганата на холоду.", desc: "Стирол обесцвечивает раствор перманганата, как и алкены." },
    { eq: "C6H5-C2H5 -> C6H5-CH=CH2 + H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Промышленный способ получения стирола." },
    { eq: "C6H5COONa + NaOH -> C6H6 + Na2CO3", type: "другое", note: "декарбоксилирование", tags: [],
      cond: "При сплавлении.", desc: "От бензоата отщепляется карбоксильная группа, получается бензол." },
    { eq: "C6H5COOH + NaOH -> C6H5COONa + H2O", type: "обмен", note: "нейтрализация", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Бензойная кислота нейтрализуется щёлочью. Бензоат натрия — пищевой консервант E211.",
      ion: "C6H5COOH + OH- -> C6H5COO- + H2O" }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Галогенпроизводные, спирты, фенол */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: галогенпроизводные и спирты",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C2H5OH", n: "этанол", a: ["этиловый спирт", "спирт"], fa: ["CH3-CH2-OH", "CH3CH2OH", "C2H6O"] },
    { f: "CH3OH", n: "метанол", a: ["метиловый спирт"], fa: ["CH4O"] },
    { f: "CH3-CH2-CH2OH", n: "пропанол-1", a: ["пропиловый спирт"], fa: ["C3H7OH", "CH3CH2CH2OH", "C3H8O"] },
    { f: "C2H5ONa", n: "этилат натрия", a: ["этоксид натрия"], fa: ["C2H5-ONa", "CH3CH2ONa"] },
    { f: "CH3ONa", n: "метилат натрия" },
    { f: "C2H5-O-C2H5", n: "диэтиловый эфир", fa: ["(C2H5)2O", "C4H10O"] },
    { f: "CH3-O-CH3", n: "диметиловый эфир", fa: ["(CH3)2O"] },
    { f: "C3H5(OH)3", n: "глицерин", a: ["пропантриол-1,2,3"], fa: ["CH2OH-CHOH-CH2OH", "CH2(OH)-CH(OH)-CH2(OH)", "C3H8O3"] },
    { f: "C3H5(ONO2)3", n: "тринитрат глицерина", a: ["нитроглицерин"], fa: ["C3H5(NO3)3"] },
    { f: "C3H5(ONa)3", n: "глицерат натрия" },
    { f: "Cu(C3H7O3)2", n: "глицерат меди(II)" },
    { f: "Cu(C2H5O2)2", n: "гликолят меди(II)" },
    { f: "CH2ONa-CH2ONa", n: "этиленгликолят натрия" },
    { f: "C2H5CN", n: "пропионитрил", fa: ["CH3-CH2-CN"] },
    { f: "KCN", n: "цианид калия" }
  ],
  reactions: [
    { eq: "C2H5Cl + NaOH -> C2H5OH + NaCl", type: "замещение", note: "гидролиз галогеналкана", tags: [],
      cond: "Водный раствор щёлочи, нагревание.", desc: "В водном растворе гидроксид-ион замещает атом хлора — получается спирт." },
    { eq: "C2H5Br + KOH -> C2H5OH + KBr", type: "замещение", note: "гидролиз галогеналкана", tags: [],
      cond: "Водный раствор щёлочи, нагревание.", desc: "Бромэтан превращается в этанол. В спиртовом растворе щёлочи шла бы другая реакция — отщепление." },
    { eq: "CH3-CH2-CH2Br + NaOH -> CH3-CH2-CH2OH + NaBr", type: "замещение", note: "гидролиз галогеналкана", tags: [],
      cond: "Водный раствор щёлочи, нагревание.", desc: "Из 1-бромпропана получается пропанол-1." },
    { eq: "CH2Cl-CH2Cl + 2NaOH -> CH2OH-CH2OH + 2NaCl", type: "замещение", note: "гидролиз галогеналкана", tags: [],
      cond: "Водный раствор щёлочи, нагревание.", desc: "Из дигалогенпроизводного с атомами галогена у разных атомов углерода получается двухатомный спирт." },
    { eq: "CH3-CHCl2 + 2NaOH -> CH3CHO + 2NaCl + H2O", type: "замещение", note: "гидролиз галогеналкана", tags: [],
      cond: "Водный раствор щёлочи, нагревание.", desc: "Если оба атома хлора у одного атома углерода, получается не спирт, а альдегид." },
    { eq: "CH3Cl + 2NH3 -> CH3NH2 + NH4Cl", type: "замещение", note: "алкилирование аммиака", tags: [],
      cond: "Избыток аммиака, нагревание.", desc: "Аминогруппа замещает атом хлора — получается метиламин." },
    { eq: "C2H5Br + KCN -> C2H5CN + KBr", type: "замещение", tags: [],
      cond: "При нагревании в спиртовом растворе.", desc: "Цианид-ион замещает бром, углеродная цепь удлиняется на один атом." },
    { eq: "2C2H5OH + 2Na -> 2C2H5ONa + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Натрий замещает водород гидроксильной группы, выделяется водород. Спирты реагируют спокойнее, чем вода." },
    { eq: "2CH3OH + 2Na -> 2CH3ONa + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Метанол реагирует с натрием, образуется метилат натрия." },
    { eq: "C2H5ONa + H2O -> C2H5OH + NaOH", type: "обмен", note: "гидролиз алкоголята", tags: [],
      cond: "При обычных условиях.", desc: "Спирты — более слабые кислоты, чем вода, поэтому алкоголяты полностью разлагаются водой." },
    { eq: "C2H5OH + HBr -> C2H5Br + H2O", type: "замещение", tags: [],
      cond: "Концентрированная серная кислота, нагревание (HBr часто получают прямо в смеси из KBr).", desc: "Атом брома замещает гидроксильную группу." },
    { eq: "C2H5OH + HCl -> C2H5Cl + H2O", type: "замещение", tags: ["каталитическая"],
      cond: "Катализатор ZnCl₂, нагревание.", desc: "Получается хлорэтан." },
    { eq: "2C2H5OH -> C2H5-O-C2H5 + H2O", type: "отщепление", note: "межмолекулярная дегидратация", tags: [],
      cond: "Концентрированная серная кислота, ниже 140 °C.", desc: "При более низкой температуре вода отщепляется от двух молекул спирта — получается простой эфир." },
    { eq: "2CH3OH -> CH3-O-CH3 + H2O", type: "отщепление", note: "межмолекулярная дегидратация", tags: [],
      cond: "Кислотный катализатор, нагревание.", desc: "Получается диметиловый эфир." },
    { eq: "C2H5OH + CuO -> CH3CHO + Cu + H2O", type: "окисление", tags: ["ОВР", "качественная реакция"],
      cond: "Раскалённую медную проволоку с налётом CuO опускают в спирт.", desc: "Чёрная проволока становится красной, чувствуется запах альдегида. Первичный спирт окисляется до альдегида." },
    { eq: "CH3OH + CuO -> HCHO + Cu + H2O", type: "окисление", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Метанол окисляется до формальдегида." },
    { eq: "CH3-CH(OH)-CH3 + CuO -> CH3-CO-CH3 + Cu + H2O", type: "окисление", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Вторичный спирт окисляется до кетона — здесь ацетона." },
    { eq: "CH3-CH2-CH2OH + CuO -> CH3-CH2-CHO + Cu + H2O", type: "окисление", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Пропанол-1 окисляется до пропаналя." },
    { eq: "C2H5OH -> CH3CHO + H2", type: "отщепление", note: "дегидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Cu), нагревание.", desc: "Отщепление водорода от спирта тоже даёт альдегид." },
    { eq: "2CH3OH + O2 -> 2HCHO + 2H2O", type: "окисление", note: "каталитическое окисление", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор (Ag или Cu), нагревание.", desc: "Промышленный способ получения формальдегида." },
    { eq: "C2H5OH + O2 -> CH3COOH + H2O", type: "окисление", note: "уксуснокислое брожение", tags: ["ОВР"],
      cond: "Под действием бактерий (ферментов), при доступе воздуха.", desc: "Так вино скисает и превращается в уксус." },
    { eq: "3C2H5OH + K2Cr2O7 + 4H2SO4 -> 3CH3CHO + Cr2(SO4)3 + K2SO4 + 7H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор дихромата.", desc: "Оранжевый раствор становится зелёным — на этом основаны старые трубки-алкотестеры." },
    { eq: "5C2H5OH + 4KMnO4 + 6H2SO4 -> 5CH3COOH + 4MnSO4 + 2K2SO4 + 11H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Сильный окислитель окисляет первичный спирт сразу до кислоты." },
    { eq: "3CH3-CH(OH)-CH3 + K2Cr2O7 + 4H2SO4 -> 3CH3-CO-CH3 + Cr2(SO4)3 + K2SO4 + 7H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор дихромата.", desc: "Вторичный спирт окисляется до кетона." },
    { eq: "5CH3OH + 6KMnO4 + 9H2SO4 -> 5CO2 + 6MnSO4 + 3K2SO4 + 19H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Метанол окисляется полностью — до углекислого газа." },
    { eq: "CO + 2H2 -> CH3OH", type: "присоединение", tags: ["каталитическая"],
      cond: "Катализатор (ZnO, Cr₂O₃ или медь), нагревание, давление.", desc: "Промышленный способ получения метанола из синтез-газа." },
    { eq: "2CH3OH + 3O2 -> 2CO2 + 4H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "Метанол горит почти невидимым пламенем. Он очень ядовит!" },
    { eq: "CH3-CH2-CH2OH -> CH2=CH-CH3 + H2O", type: "отщепление", note: "внутримолекулярная дегидратация", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Из пропанола-1 получается пропен." },
    { eq: "CH3-CH(OH)-CH3 -> CH2=CH-CH3 + H2O", type: "отщепление", note: "внутримолекулярная дегидратация", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Из пропанола-2 тоже получается пропен." },
    { eq: "CH2OH-CH2OH + 2Na -> CH2ONa-CH2ONa + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Обе гидроксильные группы этиленгликоля замещают водород на натрий." },
    { eq: "CH2OH-CH2OH + 2HBr -> CH2Br-CH2Br + 2H2O", type: "замещение", tags: [],
      cond: "При нагревании.", desc: "Обе гидроксильные группы замещаются на бром." },
    { eq: "2CH2OH-CH2OH + Cu(OH)2 -> Cu(C2H5O2)2 + 2H2O", type: "замещение", tags: ["качественная реакция"],
      cond: "Свежий гидроксид меди(II) в щелочной среде.", desc: "Голубой осадок растворяется, получается ярко-синий раствор — качественная реакция на многоатомные спирты." },
    { eq: "2C3H5(OH)3 + Cu(OH)2 -> Cu(C3H7O3)2 + 2H2O", type: "замещение", tags: ["качественная реакция"],
      cond: "Свежий гидроксид меди(II) в щелочной среде.", desc: "Глицерин растворяет гидроксид меди(II) с образованием ярко-синего раствора." },
    { eq: "C3H5(OH)3 + 3HNO3 -> C3H5(ONO2)3 + 3H2O", type: "замещение", note: "этерификация", tags: [],
      cond: "Концентрированные азотная и серная кислоты.", desc: "Получается нитроглицерин — взрывчатое вещество и лекарство для сердца." },
    { eq: "2C3H5(OH)3 + 6Na -> 2C3H5(ONa)3 + 3H2", type: "замещение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "Все три гидроксильные группы глицерина реагируют с натрием." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: фенол",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C6H5OH", n: "фенол", a: ["карболовая кислота"], fa: ["C6H5-OH", "C6H6O"] },
    { f: "C6H5ONa", n: "фенолят натрия", fa: ["C6H5-ONa"] },
    { f: "C6H2Br3OH", n: "2,4,6-трибромфенол", fa: ["C6H2Br3-OH"] },
    { f: "C6H2(NO2)3OH", n: "2,4,6-тринитрофенол", a: ["пикриновая кислота"] },
    { f: "C6H11OH", n: "циклогексанол" }
  ],
  reactions: [
    { eq: "C6H5OH + NaOH -> C6H5ONa + H2O", type: "обмен", note: "кислотные свойства фенола", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "В отличие от спиртов, фенол реагирует со щелочами: бензольное кольцо усиливает кислотные свойства группы −OH.",
      ion: "C6H5OH + OH- -> C6H5O- + H2O" },
    { eq: "2C6H5OH + 2Na -> 2C6H5ONa + H2", type: "замещение", tags: ["ОВР"],
      cond: "В расплаве фенола.", desc: "Фенол, как и спирты, реагирует с натрием." },
    { eq: "C6H5ONa + HCl -> C6H5OH + NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Сильная кислота вытесняет слабый фенол — раствор мутнеет.", ion: "C6H5O- + H+ -> C6H5OH" },
    { eq: "C6H5ONa + CO2 + H2O -> C6H5OH + NaHCO3", type: "обмен", tags: [],
      cond: "При пропускании углекислого газа.", desc: "Даже угольная кислота сильнее фенола: она вытесняет его из фенолята.",
      ion: "C6H5O- + CO2 + H2O -> C6H5OH + HCO3-" },
    { eq: "C6H5OH + 3Br2 -> C6H2Br3OH + 3HBr", type: "замещение", tags: ["качественная реакция"],
      cond: "Бромная вода, без катализатора.", desc: "Выпадает белый осадок трибромфенола — качественная реакция на фенол. Группа −OH сильно облегчает замещение в кольце." },
    { eq: "C6H5OH + 3HNO3 -> C6H2(NO2)3OH + 3H2O", type: "замещение", note: "нитрование", tags: [],
      cond: "Концентрированная азотная кислота, в присутствии серной кислоты.", desc: "Получается пикриновая кислота — жёлтое взрывчатое вещество." },
    { eq: "C6H5OH + 3H2 -> C6H11OH", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Бензольное кольцо насыщается водородом, получается циклогексанол." },
    { eq: "C6H5Cl + NaOH -> C6H5OH + NaCl", type: "замещение", tags: [],
      cond: "Около 300 °C, давление.", desc: "Атом хлора в бензольном кольце замещается с трудом — нужны жёсткие условия." },
    { eq: "C6H5-CH(CH3)2 + O2 -> C6H5OH + CH3-CO-CH3", type: "окисление", note: "кумольный способ (суммарное уравнение)", tags: ["ОВР"],
      cond: "Окисление кумола кислородом воздуха, затем разложение промежуточного гидропероксида серной кислотой.", desc: "Главный промышленный способ: из кумола получают сразу два ценных продукта — фенол и ацетон." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Альдегиды, кетоны, карбоновые кислоты */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: альдегиды и кетоны",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CH3CHO", n: "уксусный альдегид", a: ["этаналь", "ацетальдегид"], fa: ["CH3-CHO", "CH3COH", "C2H4O"] },
    { f: "CH3-CH2-CHO", n: "пропаналь", a: ["пропионовый альдегид"], fa: ["C2H5CHO", "CH3CH2CHO", "C2H5-CHO"] },
    { f: "CH3-CO-CH3", n: "ацетон", a: ["пропанон", "диметилкетон"], fa: ["CH3COCH3", "(CH3)2CO", "CH3-C(O)-CH3"] },
    { f: "CH3COONH4", n: "ацетат аммония" },
    { f: "(CH3COO)2Ca", n: "ацетат кальция", fa: ["Ca(CH3COO)2"] }
  ],
  reactions: [
    { eq: "CH3CHO + H2 -> C2H5OH", type: "присоединение", note: "гидрирование (восстановление)", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Альдегид восстанавливается до первичного спирта." },
    { eq: "HCHO + H2 -> CH3OH", type: "присоединение", note: "гидрирование (восстановление)", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Формальдегид восстанавливается до метанола." },
    { eq: "CH3-CH2-CHO + H2 -> CH3-CH2-CH2OH", type: "присоединение", note: "гидрирование (восстановление)", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Пропаналь восстанавливается до пропанола-1." },
    { eq: "CH3-CO-CH3 + H2 -> CH3-CH(OH)-CH3", type: "присоединение", note: "гидрирование (восстановление)", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Кетон восстанавливается до вторичного спирта." },
    { eq: "CH3CHO + 2[Ag(NH3)2]OH -> CH3COONH4 + 2Ag + 3NH3 + H2O", type: "окисление", note: "реакция «серебряного зеркала»", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, лёгкое нагревание.", desc: "На стенках пробирки оседает блестящий слой серебра — качественная реакция на альдегидную группу. Кетоны так не реагируют." },
    { eq: "CH3CHO + Ag2O -> CH3COOH + 2Ag", type: "окисление", note: "«серебряное зеркало», упрощённая запись", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Упрощённая школьная запись реакции серебряного зеркала." },
    { eq: "HCHO + 4[Ag(NH3)2]OH -> (NH4)2CO3 + 4Ag + 6NH3 + 2H2O", type: "окисление", note: "реакция «серебряного зеркала»", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Формальдегид окисляется глубже всех альдегидов — до карбоната, и восстанавливает вчетверо больше серебра." },
    { eq: "CH3CHO + 2Cu(OH)2 -> CH3COOH + Cu2O + 2H2O", type: "окисление", tags: ["ОВР", "качественная реакция"],
      cond: "Свежий гидроксид меди(II), нагревание.", desc: "Голубой осадок становится кирпично-красным (Cu₂O) — ещё одна качественная реакция на альдегиды." },
    { eq: "CH3CHO + 2Cu(OH)2 + NaOH -> CH3COONa + Cu2O + 3H2O", type: "окисление", tags: ["ОВР", "качественная реакция"],
      cond: "Гидроксид меди(II) в избытке щёлочи, нагревание.", desc: "В щелочной среде кислота сразу превращается в соль." },
    { eq: "HCHO + 4Cu(OH)2 -> CO2 + 2Cu2O + 5H2O", type: "окисление", tags: ["ОВР", "качественная реакция"],
      cond: "При нагревании.", desc: "Формальдегид окисляется до углекислого газа." },
    { eq: "5CH3CHO + 2KMnO4 + 3H2SO4 -> 5CH3COOH + 2MnSO4 + K2SO4 + 3H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата.", desc: "Альдегид легко окисляется до карбоновой кислоты." },
    { eq: "3CH3CHO + K2Cr2O7 + 4H2SO4 -> 3CH3COOH + Cr2(SO4)3 + K2SO4 + 4H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор дихромата.", desc: "Дихромат окисляет альдегид до кислоты, раствор зеленеет." },
    { eq: "5HCHO + 4KMnO4 + 6H2SO4 -> 5CO2 + 4MnSO4 + 2K2SO4 + 11H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата.", desc: "Формальдегид окисляется до углекислого газа." },
    { eq: "2CH3CHO + O2 -> 2CH3COOH", type: "окисление", note: "каталитическое окисление", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор (соли марганца), нагревание.", desc: "Промышленный способ получения уксусной кислоты из альдегида." },
    { eq: "CH3CHO + Br2 + H2O -> CH3COOH + 2HBr", type: "окисление", tags: ["ОВР"],
      cond: "Бромная вода.", desc: "Альдегиды обесцвечивают бромную воду, но, в отличие от алкенов, бром не присоединяется, а окисляет альдегид." },
    { eq: "CH3-CO-CH3 + 4O2 -> 3CO2 + 3H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "Ацетон легко воспламеняется." },
    { eq: "(CH3COO)2Ca -> CaCO3 + CH3-CO-CH3", type: "разложение", tags: [],
      cond: "При нагревании.", desc: "Старинный способ получения ацетона — сухая перегонка ацетата кальция." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: карбоновые кислоты",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CH3COOH", n: "уксусная кислота", a: ["уксус"], fa: ["CH3-COOH", "C2H4O2"] },
    { f: "HCOOH", n: "муравьиная кислота", a: ["метановая кислота"], fa: ["H-COOH", "CH2O2"] },
    { f: "H2C2O4", n: "щавелевая кислота", fa: ["HOOC-COOH", "(COOH)2", "C2H2O4"] },
    { f: "Na2C2O4", n: "оксалат натрия" },
    { f: "CH3COOK", n: "ацетат калия" },
    { f: "(CH3COO)2Mg", n: "ацетат магния", fa: ["Mg(CH3COO)2"] },
    { f: "(CH3COO)2Cu", n: "ацетат меди(II)", fa: ["Cu(CH3COO)2"] },
    { f: "(CH3COO)2Zn", n: "ацетат цинка", fa: ["Zn(CH3COO)2"] },
    { f: "CH2ClCOOH", n: "хлоруксусная кислота", fa: ["ClCH2COOH", "CH2Cl-COOH"] },
    { f: "C17H35COOH", n: "стеариновая кислота" },
    { f: "C17H33COOH", n: "олеиновая кислота" },
    { f: "C15H31COOH", n: "пальмитиновая кислота" },
    { f: "C17H35COONa", n: "стеарат натрия", a: ["мыло"] },
    { f: "(C17H35COO)2Ca", n: "стеарат кальция", fa: ["Ca(C17H35COO)2"] },
    { f: "CH2=CH-COOH", n: "акриловая кислота", a: ["пропеновая кислота"] },
    { f: "CH2Br-CHBr-COOH", n: "2,3-дибромпропановая кислота" }
  ],
  reactions: [
    { eq: "2CH3COOH + Mg -> (CH3COO)2Mg + H2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Уксусная кислота, как и неорганические кислоты, реагирует с активными металлами с выделением водорода.",
      ion: "2CH3COOH + Mg -> 2CH3COO- + Mg^2+ + H2" },
    { eq: "2CH3COOH + Zn -> (CH3COO)2Zn + H2", type: "замещение", tags: ["ОВР"],
      cond: "В растворе.", desc: "Цинк растворяется в уксусной кислоте медленнее, чем в соляной: уксусная кислота слабая.",
      ion: "2CH3COOH + Zn -> 2CH3COO- + Zn^2+ + H2" },
    { eq: "2CH3COOH + 2Na -> 2CH3COONa + H2", type: "замещение", tags: ["ОВР"],
      cond: "При обычных условиях.", desc: "Натрий замещает водород карбоксильной группы." },
    { eq: "CH3COOH + NaOH -> CH3COONa + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Уксусная кислота нейтрализуется щёлочью.", ion: "CH3COOH + OH- -> CH3COO- + H2O" },
    { eq: "CH3COOH + KOH -> CH3COOK + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Получается ацетат калия.", ion: "CH3COOH + OH- -> CH3COO- + H2O" },
    { eq: "2CH3COOH + CaO -> (CH3COO)2Ca + H2O", type: "обмен", tags: [],
      cond: "", desc: "Карбоновая кислота реагирует с основным оксидом." },
    { eq: "2CH3COOH + Na2CO3 -> 2CH3COONa + H2O + CO2", type: "обмен", tags: ["качественная реакция"],
      cond: "В растворе.", desc: "Уксусная кислота сильнее угольной: выделяется углекислый газ. Так карбоновые кислоты отличают от фенола.",
      ion: "2CH3COOH + CO3^2- -> 2CH3COO- + H2O + CO2" },
    { eq: "2CH3COOH + CaCO3 -> (CH3COO)2Ca + H2O + CO2", type: "обмен", tags: [],
      cond: "При обычных условиях.", desc: "Поэтому уксусом можно удалить накипь из чайника.",
      ion: "2CH3COOH + CaCO3 -> 2CH3COO- + Ca^2+ + H2O + CO2" },
    { eq: "2CH3COOH + Cu(OH)2 -> (CH3COO)2Cu + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "", desc: "Голубой осадок растворяется, образуется сине-зелёный раствор ацетата меди(II).",
      ion: "2CH3COOH + Cu(OH)2 -> 2CH3COO- + Cu^2+ + 2H2O" },
    { eq: "CH3COOH + NH3 -> CH3COONH4", type: "соединение", tags: [],
      cond: "", desc: "Кислота присоединяет аммиак — получается ацетат аммония.", ion: "CH3COOH + NH3 -> CH3COO- + NH4+" },
    { eq: "CH3COOH + Cl2 -> CH2ClCOOH + HCl", type: "замещение", tags: ["каталитическая"],
      cond: "Катализатор (красный фосфор), нагревание.", desc: "Хлор замещает водород в метильной группе (в α-положении)." },
    { eq: "CH2ClCOOH + 2NH3 -> NH2CH2COOH + NH4Cl", type: "замещение", tags: [],
      cond: "Избыток аммиака.", desc: "Аминогруппа замещает хлор — так получают простейшую аминокислоту глицин." },
    { eq: "CH3COONa + H2SO4 -> CH3COOH + NaHSO4", type: "обмен", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Лабораторный способ получения уксусной кислоты: сильная нелетучая кислота вытесняет слабую летучую." },
    { eq: "CH3COONa + HCl -> CH3COOH + NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Сильная кислота вытесняет слабую уксусную — появляется запах уксуса.", ion: "CH3COO- + H+ -> CH3COOH" },
    { eq: "HCOOH + Ag2O -> CO2 + H2O + 2Ag", type: "окисление", note: "«серебряное зеркало»", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Муравьиная кислота — единственная карбоновая кислота, дающая серебряное зеркало: в её молекуле есть альдегидная группа." },
    { eq: "HCOOH + 2[Ag(NH3)2]OH -> (NH4)2CO3 + 2Ag + 2NH3 + H2O", type: "окисление", note: "«серебряное зеркало»", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Полная запись реакции серебряного зеркала для муравьиной кислоты." },
    { eq: "HCOOH -> CO + H2O", type: "разложение", note: "дегидратация", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Лабораторный способ получения угарного газа." },
    { eq: "5HCOOH + 2KMnO4 + 3H2SO4 -> 5CO2 + 2MnSO4 + K2SO4 + 8H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата.", desc: "Муравьиная кислота обесцвечивает перманганат, окисляясь до углекислого газа." },
    { eq: "HCOOH + Br2 -> CO2 + 2HBr", type: "окисление", tags: ["ОВР"],
      cond: "Бромная вода.", desc: "Муравьиная кислота обесцвечивает бромную воду, уксусная — нет." },
    { eq: "HCOOH + NaOH -> HCOONa + H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Получается формиат натрия.", ion: "HCOOH + OH- -> HCOO- + H2O" },
    { eq: "HCOONa + HCl -> HCOOH + NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Соляная кислота вытесняет более слабую муравьиную.", ion: "HCOO- + H+ -> HCOOH" },
    { eq: "2HCOONa -> Na2C2O4 + H2", type: "разложение", tags: ["ОВР"],
      cond: "При нагревании.", desc: "При нагревании формиат превращается в оксалат." },
    { eq: "H2C2O4 -> CO + CO2 + H2O", type: "разложение", tags: [],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Щавелевая кислота разлагается на угарный газ, углекислый газ и воду." },
    { eq: "5H2C2O4 + 2KMnO4 + 3H2SO4 -> 10CO2 + 2MnSO4 + K2SO4 + 8H2O", type: "окисление", tags: ["ОВР"],
      cond: "Подкисленный раствор перманганата, нагревание.", desc: "Классическая реакция для определения концентрации перманганата." },
    { eq: "H2C2O4 + 2NaOH -> Na2C2O4 + 2H2O", type: "обмен", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Двухосновная щавелевая кислота нейтрализуется двумя молекулами щёлочи.", ion: "H2C2O4 + 2OH- -> C2O4^2- + 2H2O" },
    { eq: "C17H33COOH + H2 -> C17H35COOH", type: "присоединение", note: "гидрирование", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Жидкая непредельная олеиновая кислота превращается в твёрдую стеариновую." },
    { eq: "C17H35COONa + HCl -> C17H35COOH + NaCl", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Из раствора мыла выпадает стеариновая кислота.", ion: "C17H35COO- + H+ -> C17H35COOH" },
    { eq: "2C17H35COONa + CaCl2 -> (C17H35COO)2Ca + 2NaCl", type: "обмен", tags: [],
      cond: "В жёсткой воде.", desc: "Мыло в жёсткой воде образует нерастворимые хлопья и плохо мылится.", ion: "2C17H35COO- + Ca^2+ -> (C17H35COO)2Ca" },
    { eq: "CH2=CH-COOH + Br2 -> CH2Br-CHBr-COOH", type: "присоединение", tags: ["качественная реакция"],
      cond: "Бромная вода.", desc: "Непредельная акриловая кислота обесцвечивает бромную воду по двойной связи." },
    { eq: "CH3COOH + 2O2 -> 2CO2 + 2H2O", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "Уксусная кислота сгорает до углекислого газа и воды." }
  ]
});

/* ATOMIX LAB · 10–11 класс / ЕГЭ · Сложные эфиры и жиры, углеводы, амины, аминокислоты */
window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: сложные эфиры и жиры",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CH3COOC2H5", n: "этилацетат", a: ["этиловый эфир уксусной кислоты", "уксусноэтиловый эфир"], fa: ["CH3COO-C2H5", "CH3-COO-C2H5", "C4H8O2"] },
    { f: "CH3COOCH3", n: "метилацетат", a: ["метиловый эфир уксусной кислоты"], fa: ["CH3-COO-CH3"] },
    { f: "HCOOCH3", n: "метилформиат", a: ["метиловый эфир муравьиной кислоты"], fa: ["HCOO-CH3"] },
    { f: "HCOOC2H5", n: "этилформиат", a: ["этиловый эфир муравьиной кислоты"], fa: ["HCOO-C2H5"] },
    { f: "(C17H35COO)3C3H5", n: "тристеарат глицерина", a: ["тристеарин", "твёрдый жир"], fa: ["C3H5(OCOC17H35)3", "C57H110O6"] },
    { f: "(C17H33COO)3C3H5", n: "триолеат глицерина", a: ["триолеин", "жидкий жир", "растительное масло"], fa: ["C3H5(OCOC17H33)3", "C57H104O6"] },
    { f: "(C17H33Br2COO)3C3H5", n: "три(9,10-дибромстеарат) глицерина" },
    { f: "C17H33COONa", n: "олеат натрия" }
  ],
  reactions: [
    { eq: "CH3COOH + C2H5OH <=> CH3COOC2H5 + H2O", type: "замещение", note: "этерификация", tags: ["каталитическая"],
      cond: "Катализатор — концентрированная серная кислота, нагревание. Реакция обратимая.", desc: "Кислота и спирт образуют сложный эфир с фруктовым запахом. Вода образуется из группы −OH кислоты и водорода спирта." },
    { eq: "CH3COOH + CH3OH <=> CH3COOCH3 + H2O", type: "замещение", note: "этерификация", tags: ["каталитическая"],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Получается метилацетат." },
    { eq: "HCOOH + CH3OH <=> HCOOCH3 + H2O", type: "замещение", note: "этерификация", tags: ["каталитическая"],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Получается метилформиат." },
    { eq: "HCOOH + C2H5OH <=> HCOOC2H5 + H2O", type: "замещение", note: "этерификация", tags: ["каталитическая"],
      cond: "Концентрированная серная кислота, нагревание.", desc: "Получается этилформиат с запахом рома." },
    { eq: "CH3COOC2H5 + H2O <=> CH3COOH + C2H5OH", type: "гидролиз", note: "кислотный гидролиз сложного эфира", tags: ["каталитическая"],
      cond: "Кислая среда, нагревание. Реакция обратимая.", desc: "Обратная этерификации реакция: эфир расщепляется на кислоту и спирт." },
    { eq: "CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH", type: "гидролиз", note: "щелочной гидролиз (омыление)", tags: [],
      cond: "Раствор щёлочи, нагревание.", desc: "В щелочной среде гидролиз идёт до конца: вместо кислоты образуется её соль." },
    { eq: "CH3COOCH3 + NaOH -> CH3COONa + CH3OH", type: "гидролиз", note: "щелочной гидролиз (омыление)", tags: [],
      cond: "Раствор щёлочи, нагревание.", desc: "Метилацетат омыляется до ацетата натрия и метанола." },
    { eq: "HCOOC2H5 + NaOH -> HCOONa + C2H5OH", type: "гидролиз", note: "щелочной гидролиз (омыление)", tags: [],
      cond: "Раствор щёлочи, нагревание.", desc: "Этилформиат омыляется до формиата натрия и этанола." },
    { eq: "(C17H35COO)3C3H5 + 3NaOH -> C3H5(OH)3 + 3C17H35COONa", type: "гидролиз", note: "омыление жира", tags: [],
      cond: "Раствор щёлочи, нагревание.", desc: "Так варят мыло: жир расщепляется на глицерин и соли жирных кислот." },
    { eq: "(C17H35COO)3C3H5 + 3H2O -> C3H5(OH)3 + 3C17H35COOH", type: "гидролиз", note: "гидролиз жира", tags: ["каталитическая"],
      cond: "Кислая среда при нагревании или ферменты (липазы) в организме.", desc: "При пищеварении жиры расщепляются на глицерин и жирные кислоты." },
    { eq: "C3H5(OH)3 + 3C17H35COOH -> (C17H35COO)3C3H5 + 3H2O", type: "замещение", note: "этерификация (синтез жира)", tags: ["каталитическая"],
      cond: "Кислотный катализатор, нагревание.", desc: "Жиры — сложные эфиры глицерина и жирных кислот." },
    { eq: "(C17H33COO)3C3H5 + 3H2 -> (C17H35COO)3C3H5", type: "присоединение", note: "гидрирование жира", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание, давление.", desc: "Жидкое растительное масло превращается в твёрдый жир — так получают маргарин." },
    { eq: "(C17H33COO)3C3H5 + 3Br2 -> (C17H33Br2COO)3C3H5", type: "присоединение", tags: ["качественная реакция"],
      cond: "Бромная вода.", desc: "Растительное масло обесцвечивает бромную воду — в нём есть двойные связи." },
    { eq: "(C17H33COO)3C3H5 + 3NaOH -> C3H5(OH)3 + 3C17H33COONa", type: "гидролиз", note: "омыление жира", tags: [],
      cond: "Раствор щёлочи, нагревание.", desc: "Из растительного масла получается жидкое мыло и глицерин." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: углеводы",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "C6H12O7", n: "глюконовая кислота", fa: ["C5H11O5COOH", "CH2OH(CHOH)4COOH"] },
    { f: "C5H11O5COONH4", n: "глюконат аммония" },
    { f: "C6H14O6", n: "сорбит", a: ["сорбитол"], fa: ["CH2OH(CHOH)4CH2OH"] },
    { f: "CH3-CH(OH)-COOH", n: "молочная кислота", fa: ["CH3CH(OH)COOH", "C3H6O3"] },
    { f: "C3H7COOH", n: "масляная кислота", a: ["бутановая кислота"], fa: ["CH3-CH2-CH2-COOH", "CH3CH2CH2COOH"] },
    { f: "C12H22O11", n: "сахароза", a: ["сахар", "тростниковый сахар"] },
    { f: "(C6H10O5)n", n: "крахмал, целлюлоза", a: ["крахмал", "целлюлоза", "клетчатка"] },
    { f: "(C6H7O2(ONO2)3)n", n: "тринитрат целлюлозы", a: ["пироксилин"] }
  ],
  reactions: [
    { eq: "C6H12O6 + 2[Ag(NH3)2]OH -> C5H11O5COONH4 + 2Ag + 3NH3 + H2O", type: "окисление", note: "«серебряное зеркало»", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Глюкоза — альдегидоспирт: альдегидная группа окисляется, на стенках оседает серебро." },
    { eq: "C6H12O6 + Ag2O -> C6H12O7 + 2Ag", type: "окисление", note: "«серебряное зеркало», упрощённая запись", tags: ["ОВР", "качественная реакция"],
      cond: "Аммиачный раствор оксида серебра, нагревание.", desc: "Упрощённая запись: глюкоза окисляется до глюконовой кислоты." },
    { eq: "C6H12O6 + 2Cu(OH)2 -> C6H12O7 + Cu2O + 2H2O", type: "окисление", tags: ["ОВР", "качественная реакция"],
      cond: "При нагревании.", desc: "При нагревании с гидроксидом меди(II) глюкоза даёт красный осадок Cu₂O. (На холоду она, как многоатомный спирт, даёт синий раствор.)" },
    { eq: "C6H12O6 + Br2 + H2O -> C6H12O7 + 2HBr", type: "окисление", tags: ["ОВР"],
      cond: "Бромная вода.", desc: "Глюкоза обесцвечивает бромную воду, окисляясь до глюконовой кислоты. Фруктоза так не реагирует." },
    { eq: "C6H12O6 + H2 -> C6H14O6", type: "присоединение", note: "гидрирование (восстановление)", tags: ["каталитическая"],
      cond: "Катализатор (Ni), нагревание.", desc: "Получается шестиатомный спирт сорбит — сахарозаменитель." },
    { eq: "C6H12O6 -> 2CH3-CH(OH)-COOH", type: "разложение", note: "молочнокислое брожение", tags: [],
      cond: "Под действием молочнокислых бактерий.", desc: "Так скисает молоко и квасится капуста." },
    { eq: "C6H12O6 -> C3H7COOH + 2CO2 + 2H2", type: "разложение", note: "маслянокислое брожение", tags: ["ОВР"],
      cond: "Под действием маслянокислых бактерий.", desc: "Из-за масляной кислоты прогорклое масло неприятно пахнет." },
    { eq: "C12H22O11 + H2O -> 2C6H12O6", type: "гидролиз", note: "гидролиз сахарозы", tags: ["каталитическая"],
      cond: "Кислая среда при нагревании или ферменты.", desc: "Сахароза расщепляется на две молекулы с одинаковой формулой C₆H₁₂O₆ — глюкозу и фруктозу." },
    { eq: "C12H22O11 + 12O2 -> 12CO2 + 11H2O", type: "окисление", note: "полное окисление", tags: ["ОВР", "экзотермическая"],
      cond: "При горении; в организме — постепенно, при участии ферментов.", desc: "Сахар — источник энергии: при его окислении выделяется много тепла." },
    { eq: "(C6H10O5)n + nH2O -> nC6H12O6", type: "гидролиз", note: "гидролиз полисахарида", tags: ["каталитическая"],
      cond: "Кислая среда при нагревании или ферменты (амилаза слюны).", desc: "Крахмал и целлюлоза при полном гидролизе дают глюкозу." },
    { eq: "6nCO2 + 5nH2O -> (C6H10O5)n + 6nO2", type: "другое", note: "фотосинтез крахмала (суммарное уравнение)", tags: ["ОВР", "эндотермическая"],
      cond: "На свету, в зелёных растениях.", desc: "Растения запасают энергию солнца в виде крахмала." },
    { eq: "(C6H10O5)n + 3nHNO3 -> (C6H7O2(ONO2)3)n + 3nH2O", type: "замещение", note: "этерификация целлюлозы", tags: [],
      cond: "Концентрированные азотная и серная кислоты.", desc: "Каждое звено целлюлозы содержит три группы −OH, которые этерифицируются — получается пироксилин для бездымного пороха." }
  ]
});

window.ATOMIX_CHEM_DATA.packs.push({
  topic: "Органика: амины, аминокислоты, белки",
  level: "10–11 класс · ЕГЭ",
  substances: [
    { f: "CH3NH2", n: "метиламин", fa: ["CH3-NH2", "CH5N"] },
    { f: "[CH3NH3]Cl", n: "хлорид метиламмония", fa: ["CH3NH3Cl"] },
    { f: "[CH3NH3]OH", n: "гидроксид метиламмония", fa: ["CH3NH3OH"] },
    { f: "C2H5NH2", n: "этиламин", fa: ["CH3-CH2-NH2", "C2H5-NH2"] },
    { f: "[C2H5NH3]Cl", n: "хлорид этиламмония", fa: ["C2H5NH3Cl"] },
    { f: "(CH3)2NH", n: "диметиламин", fa: ["CH3-NH-CH3"] },
    { f: "[(CH3)2NH2]Cl", n: "хлорид диметиламмония", fa: ["(CH3)2NH2Cl"] },
    { f: "C6H5NH2", n: "анилин", a: ["аминобензол"], fa: ["C6H5-NH2"] },
    { f: "[C6H5NH3]Cl", n: "хлорид фениламмония", a: ["солянокислый анилин"], fa: ["C6H5NH3Cl"] },
    { f: "C6H2Br3NH2", n: "2,4,6-триброманилин" },
    { f: "NH2CH2COOH", n: "глицин", a: ["аминоуксусная кислота"], fa: ["H2N-CH2-COOH", "NH2-CH2-COOH", "H2NCH2COOH"] },
    { f: "NH2CH2COONa", n: "глицинат натрия" },
    { f: "[NH3CH2COOH]Cl", n: "гидрохлорид глицина", fa: ["ClNH3CH2COOH"] },
    { f: "NH2CH2COOCH3", n: "метиловый эфир глицина" },
    { f: "(NH2CH2COO)2Cu", n: "глицинат меди(II)", fa: ["Cu(NH2CH2COO)2"] },
    { f: "NH2CH2CONHCH2COOH", n: "глицилглицин", a: ["дипептид"], fa: ["H2N-CH2-CO-NH-CH2-COOH"] },
    { f: "CH3-CH(NH2)-COOH", n: "аланин", fa: ["CH3CH(NH2)COOH"] },
    { f: "CH3-CH(NH2)-COONa", n: "аланинат натрия" },
    { f: "NH2(CH2)5COOH", n: "ε-аминокапроновая кислота", fa: ["H2N-(CH2)5-COOH"] },
    { f: "(-NH-CH2-CO-)n", n: "полиглицин" },
    { f: "(-NH-(CH2)5-CO-)n", n: "капрон" }
  ],
  reactions: [
    { eq: "CH3NH2 + HCl -> [CH3NH3]Cl", type: "соединение", note: "основные свойства аминов", tags: [],
      cond: "При обычных условиях.", desc: "Амины — органические основания: присоединяют кислоты, как аммиак.", ion: "CH3NH2 + H+ -> [CH3NH3]+" },
    { eq: "CH3NH2 + H2O <=> [CH3NH3]OH", type: "соединение", note: "основные свойства аминов", tags: [],
      cond: "В водном растворе.", desc: "Раствор метиламина имеет щелочную среду — фенолфталеин краснеет.", ion: "CH3NH2 + H2O <=> [CH3NH3]+ + OH-" },
    { eq: "[CH3NH3]Cl + NaOH -> CH3NH2 + NaCl + H2O", type: "обмен", tags: [],
      cond: "При нагревании.", desc: "Щёлочь вытесняет амин из его соли.", ion: "[CH3NH3]+ + OH- -> CH3NH2 + H2O" },
    { eq: "4CH3NH2 + 9O2 -> 4CO2 + 10H2O + 2N2", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "При горении аминов азот выделяется в виде простого вещества." },
    { eq: "C2H5NH2 + HCl -> [C2H5NH3]Cl", type: "соединение", note: "основные свойства аминов", tags: [],
      cond: "При обычных условиях.", desc: "Этиламин присоединяет хлороводород.", ion: "C2H5NH2 + H+ -> [C2H5NH3]+" },
    { eq: "4C2H5NH2 + 15O2 -> 8CO2 + 14H2O + 2N2", type: "окисление", note: "горение", tags: ["ОВР", "горение"],
      cond: "Поджигание.", desc: "Этиламин сгорает до углекислого газа, воды и азота." },
    { eq: "C2H5NH2 + HNO2 -> C2H5OH + N2 + H2O", type: "другое", note: "реакция первичного амина с азотистой кислотой", tags: ["ОВР"],
      cond: "На холоду (азотистую кислоту получают из NaNO₂ и кислоты).", desc: "Первичные амины с азотистой кислотой превращаются в спирты с выделением азота." },
    { eq: "(CH3)2NH + HCl -> [(CH3)2NH2]Cl", type: "соединение", note: "основные свойства аминов", tags: [],
      cond: "При обычных условиях.", desc: "Вторичный амин тоже проявляет основные свойства.", ion: "(CH3)2NH + H+ -> [(CH3)2NH2]+" },
    { eq: "C6H5NH2 + HCl -> [C6H5NH3]Cl", type: "соединение", note: "основные свойства анилина", tags: [],
      cond: "При обычных условиях.", desc: "Анилин — очень слабое основание, но с сильными кислотами образует соли.", ion: "C6H5NH2 + H+ -> [C6H5NH3]+" },
    { eq: "[C6H5NH3]Cl + NaOH -> C6H5NH2 + NaCl + H2O", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Щёлочь вытесняет анилин из соли — раствор мутнеет.", ion: "[C6H5NH3]+ + OH- -> C6H5NH2 + H2O" },
    { eq: "C6H5NH2 + 3Br2 -> C6H2Br3NH2 + 3HBr", type: "замещение", tags: ["качественная реакция"],
      cond: "Бромная вода.", desc: "Выпадает белый осадок триброманилина — качественная реакция на анилин." },
    { eq: "C6H5NO2 + 3H2 -> C6H5NH2 + 2H2O", type: "другое", note: "восстановление нитросоединения (реакция Зинина)", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Промышленный способ получения анилина, открытый русским химиком Н. Н. Зининым." },
    { eq: "C6H5NO2 + 3Fe + 6HCl -> C6H5NH2 + 3FeCl2 + 2H2O", type: "другое", note: "восстановление нитросоединения", tags: ["ОВР"],
      cond: "Железо в соляной кислоте.", desc: "Водород, выделяющийся в момент реакции железа с кислотой, восстанавливает нитробензол." },
    { eq: "C6H5NO2 + 3Zn + 7HCl -> [C6H5NH3]Cl + 3ZnCl2 + 2H2O", type: "другое", note: "восстановление нитросоединения", tags: ["ОВР"],
      cond: "Цинк в избытке соляной кислоты.", desc: "В избытке кислоты анилин сразу образует соль." },
    { eq: "CH3NO2 + 3H2 -> CH3NH2 + 2H2O", type: "другое", note: "восстановление нитросоединения", tags: ["ОВР", "каталитическая"],
      cond: "Катализатор, нагревание.", desc: "Нитрометан восстанавливается до метиламина." },
    { eq: "NH2CH2COOH + NaOH -> NH2CH2COONa + H2O", type: "обмен", note: "кислотные свойства аминокислоты", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Аминокислоты амфотерны: карбоксильная группа реагирует со щёлочью.", ion: "NH2CH2COOH + OH- -> NH2CH2COO- + H2O" },
    { eq: "NH2CH2COOH + HCl -> [NH3CH2COOH]Cl", type: "соединение", note: "основные свойства аминокислоты", tags: [],
      cond: "В растворе.", desc: "Аминогруппа присоединяет кислоту.", ion: "NH2CH2COOH + H+ -> [NH3CH2COOH]+" },
    { eq: "CH3-CH(NH2)-COOH + NaOH -> CH3-CH(NH2)-COONa + H2O", type: "обмен", note: "кислотные свойства аминокислоты", tags: ["нейтрализация"],
      cond: "В растворе.", desc: "Аланин тоже реагирует со щелочами." },
    { eq: "NH2CH2COOH + CH3OH -> NH2CH2COOCH3 + H2O", type: "замещение", note: "этерификация", tags: ["каталитическая"],
      cond: "В присутствии хлороводорода.", desc: "Аминокислоты, как карбоновые кислоты, образуют сложные эфиры." },
    { eq: "2NH2CH2COOH + Cu(OH)2 -> (NH2CH2COO)2Cu + 2H2O", type: "обмен", tags: [],
      cond: "В растворе.", desc: "Образуется ярко-синее комплексное соединение — глицинат меди." },
    { eq: "2NH2CH2COOH -> NH2CH2CONHCH2COOH + H2O", type: "поликонденсация", note: "образование дипептида", tags: [],
      cond: "При нагревании или в организме (на рибосомах).", desc: "Аминогруппа одной молекулы и карбоксильная группа другой образуют пептидную связь −CO−NH−." },
    { eq: "nNH2CH2COOH -> (-NH-CH2-CO-)n + nH2O", type: "поликонденсация", tags: [],
      cond: "При нагревании.", desc: "Так из аминокислот строятся полипептиды — основа белков." },
    { eq: "nNH2(CH2)5COOH -> (-NH-(CH2)5-CO-)n + nH2O", type: "поликонденсация", tags: [],
      cond: "При нагревании.", desc: "Получается капрон — прочное синтетическое волокно." }
  ]
});


/* ATOMIX LAB · СТЕПЕНИ ОКИСЛЕНИЯ, КОТОРЫЕ НЕЛЬЗЯ ПОСЧИТАТЬ ПРОСТЫМИ ПРАВИЛАМИ
   Обычные вещества программа разбирает сама (O −2, H +1, металлы, сумма = заряду).
   Здесь указаны исключения:
   - пероксиды и другие особые случаи неорганики;
   - органические вещества: степень окисления КАЖДОГО атома углерода
     (как в ЕГЭ: считается по связям с соседними атомами).
   Формат: "C -3 -1" — степени окисления двух атомов углерода;
           "-2*4" — четыре атома с одинаковой степенью; элементы разделяются «;».
   Не указанные элементы программа досчитывает по правилам (H +1, O −2, N −3 …),
   и проверяет, что сумма степеней окисления равна заряду частицы. */
window.ATOMIX_CHEM_DATA.oxidation = {
  // неорганика
  "H2O2": "O -1*2", "Na2O2": "O -1*2", "BaO2": "O -1*2", "KO2": "O -1/2*2",
  "FeS2": "Fe +2; S -1*2",
  "Fe3O4": "Fe +2 +3*2",
  "[Fe(CN)6]": "C +2*6",
  "KFe[Fe(CN)6]": "Fe +3 +2; C +2*6",
  "Cu2(OH)2CO3": "C +4",
  "C2O4": "C +3*2",
  "CaC2": "C -1*2", "Al4C3": "C -4*3",
  // алканы, циклоалканы, галогенпроизводные
  "C2H6": "C -3*2", "C3H8": "C -3 -2 -3", "C4H10": "C -3 -2 -2 -3",
  "CH3-CH(CH3)-CH3": "C -3 -1 -3 -3",
  "C6H14": "C -3 -2*4 -3", "C7H16": "C -3 -2*5 -3", "C8H18": "C -3 -2*6 -3", "C16H34": "C -3 -2*14 -3",
  "(CH2)3": "C -2*3", "C6H12": "C -2*6", "C6H11Cl": "C 0 -2*5",
  "C2H5Cl": "C -3 -1", "C2H5Br": "C -3 -1",
  "CH3-CHBr-CH3": "C -3 0 -3", "CH3-CHCl-CH3": "C -3 0 -3", "CH3-CH2-CH2Br": "C -3 -2 -1",
  "CH2Br-CH2-CH2Br": "C -1 -2 -1", "CH2Cl-CH2-CH2Cl": "C -1 -2 -1",
  "C2H5NO2": "C -3 -1; N +3", "CH3NO2": "C -2; N +3",
  "C2H5COONa": "C -3 -2 +3",
  // алкены, диены, полимеры
  "C2H4": "C -2*2", "CH2=CH-CH3": "C -2 -1 -3", "CH2=CH-CH2-CH3": "C -2 -1 -2 -3",
  "CH3-CH=CH-CH3": "C -3 -1 -1 -3", "CH2=CH-CH=CH2": "C -2 -1 -1 -2",
  "CH2=C(CH3)-CH=CH2": "C -2 0 -3 -1 -2", "CH2=CHCl": "C -2 0", "CF2=CF2": "C +2*2",
  "C6H5-CH=CH2": "C 0 -1*5 -1 -2",
  "CH2Br-CH2Br": "C -1*2", "CH2Cl-CH2Cl": "C -1*2", "CH2Br-CHBr-CH3": "C -1 0 -3",
  "CH2=CH-CH2Cl": "C -2 -1 -1", "CH3-CHBr-CH2-CH3": "C -3 0 -2 -3",
  "CH2Br-CH=CH-CH2Br": "C -1*4", "CH2Br-CHBr-CHBr-CH2Br": "C -1 0 0 -1",
  "CH2OH-CH2OH": "C -1*2", "CH2OH-CHOH-CH3": "C -1 0 -3",
  "CH3-CH(OH)-CH3": "C -3 0 -3", "CH3-CH(OH)-CH2-CH3": "C -3 0 -2 -3",
  "(-CH2-CH2-)n": "C -2*2", "(-CH2-CH(CH3)-)n": "C -2 -1 -3", "(-CH2-CHCl-)n": "C -2 0",
  "(-CH2-CH(C6H5)-)n": "C -2 -1 0 -1*5", "(-CF2-CF2-)n": "C +2*2",
  "(-CH2-CH=CH-CH2-)n": "C -2 -1 -1 -2", "(-CH2-C(CH3)=CH-CH2-)n": "C -2 0 -3 -1 -2",
  // алкины
  "C2H2": "C -1*2", "CH≡C-CH3": "C -1 0 -3", "CHBr=CHBr": "C 0*2", "CHBr2-CHBr2": "C +1*2",
  "CH3-CBr2-CH3": "C -3 +2 -3", "CH3-CHCl2": "C -3 +1", "CH2=CH-C≡CH": "C -2 -1 0 -1",
  "AgC≡CAg": "C -1*2", "CH3-C≡CAg": "C -3 0 -1", "NaC≡CNa": "C -1*2", "CH2=CH-CN": "C -2 -1 +3",
  // арены
  "C6H6": "C -1*6", "C6H5-CH3": "C 0 -1*5 -3", "C6H5-C2H5": "C 0 -1*5 -2 -3",
  "C6H5-CH(CH3)2": "C 0 -1*5 -1 -3 -3",
  "C6H5Br": "C +1 -1*5", "C6H5Cl": "C +1 -1*5", "C6H5NO2": "C +1 -1*5; N +3", "C6H6Cl6": "C 0*6",
  "CH3-C6H2(NO2)3": "C -3 0 +1*3 -1*2; N +3*3",
  "C6H5-CH2Cl": "C 0 -1*5 -1", "CH3-C6H4-Cl": "C -3 0 +1 -1*4",
  "C6H5COO": "C 0 -1*5 +3",
  "C6H5-CHBr-CH2Br": "C 0 -1*5 0 -1", "C6H5-CH(OH)-CH2OH": "C 0 -1*5 0 -1",
  // спирты, фенол, эфиры
  "C2H5OH": "C -3 -1", "CH3-CH2-CH2OH": "C -3 -2 -1", "C2H5ONa": "C -3 -1",
  "C2H5-O-C2H5": "C -3 -1 -1 -3", "CH3-O-CH3": "C -2*2",
  "C3H5(OH)3": "C -1 0 -1", "C3H5(ONO2)3": "C -1 0 -1; N +5*3", "C3H5(ONa)3": "C -1 0 -1",
  "Cu(C3H7O3)2": "Cu +2; C -1 0 -1 -1 0 -1", "Cu(C2H5O2)2": "Cu +2; C -1*4",
  "CH2ONa-CH2ONa": "C -1*2", "C2H5CN": "C -3 -2 +3",
  "C6H5O": "C +1 -1*5", "C6H2Br3OH": "C +1 +1*3 -1*2", "C6H2(NO2)3OH": "C +1 +1*3 -1*2; N +3*3",
  "C6H11OH": "C 0 -2*5",
  // альдегиды, кетоны, кислоты, сложные эфиры, жиры
  "CH3CHO": "C -3 +1", "CH3-CH2-CHO": "C -3 -2 +1", "CH3-CO-CH3": "C -3 +2 -3",
  "CH3COO": "C -3 +3", "CH2ClCOOH": "C -1 +3",
  "C17H35COO": "C -3 -2*16 +3", "C17H33COOH": "C -3 -2*14 -1*2 +3", "C17H33COONa": "C -3 -2*14 -1*2 +3",
  "C15H31COOH": "C -3 -2*14 +3", "CH2=CH-COOH": "C -2 -1 +3", "CH2Br-CHBr-COOH": "C -1 0 +3",
  "CH3COOC2H5": "C -3 +3 -1 -3", "CH3COOCH3": "C -3 +3 -2", "HCOOCH3": "C +2 -2", "HCOOC2H5": "C +2 -1 -3",
  "(C17H35COO)3C3H5": "C -3*3 -2*48 +3*3 -1 0 -1",
  "(C17H33COO)3C3H5": "C -3*3 -2*42 -1*6 +3*3 -1 0 -1",
  "(C17H33Br2COO)3C3H5": "C -3*3 -2*42 0*6 +3*3 -1 0 -1",
  // углеводы
  "C6H12O6": "C +1 0*4 -1", "C6H12O7": "C +3 0*4 -1", "C5H11O5COONH4": "C +3 0*4 -1; N -3",
  "C6H14O6": "C -1 0*4 -1", "CH3-CH(OH)-COOH": "C -3 0 +3", "C3H7COOH": "C -3 -2 -2 +3",
  "C12H22O11": "C +1 0*4 -1 -1 +2 0*3 -1",
  "(C6H10O5)n": "C +1 0*4 -1", "(C6H7O2(ONO2)3)n": "C +1 0*4 -1; N +5*3",
  // амины, аминокислоты
  "C2H5NH2": "C -3 -1", "[C2H5NH3]": "C -3 -1", "(CH3)2NH": "C -2*2", "[(CH3)2NH2]": "C -2*2",
  "C6H5NH2": "C +1 -1*5", "[C6H5NH3]": "C +1 -1*5", "C6H2Br3NH2": "C +1 +1*3 -1*2",
  "NH2CH2COO": "C -1 +3", "[NH3CH2COOH]": "C -1 +3", "NH2CH2COOCH3": "C -1 +3 -2",
  "NH2CH2CONHCH2COOH": "C -1 +3 -1 +3",
  "CH3-CH(NH2)-COOH": "C -3 0 +3", "CH3-CH(NH2)-COONa": "C -3 0 +3",
  "NH2(CH2)5COOH": "C -1 -2*4 +3",
  "(-NH-CH2-CO-)n": "C -1 +3", "(-NH-(CH2)5-CO-)n": "C -1 -2*4 +3"
};

/* ############################################################
   4. Структурные формулы веществ и ионов (был <script id="chem-structures">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · СТРУКТУРНЫЕ ФОРМУЛЫ ВЕЩЕСТВ И ИОНОВ
   Готовые рисунки (SVG) для всех веществ и ионов из базы реакций.
   Ключ — формула вещества так, как её хранит программа (без знаков связей).
   x — развёрнутая формула (подписаны все атомы углерода вне циклов;
       у неорганических веществ — единственный вид рисунка),
   s — скелетная формула (если отличается от развёрнутой),
   каждая — [ширина, высота, содержимое SVG]; n / ne — пояснение под рисунком
   по-русски / по-английски.
   Рисунки построены заранее по SMILES библиотекой SmilesDrawer
   (github.com/reymond-group/smilesDrawer, лицензия MIT) и встроены сюда,
   поэтому странице не нужен интернет. Исходные SMILES и скрипты, которыми
   собраны рисунки, лежат отдельно в архиве atomix-tools.zip
   (structures-src.js — SMILES, gen.py/gen.js — рисование, build.py — сборка).
   ============================================================ */
window.ATOMIX_CHEM_DATA.structures = {"CH4":{"x":[64.9,68,"<path d='M37 36.3L53.9 46M11 21.3L27.9 31M35.1 29.1L44.8 12.2M20.1 55.1L29.8 38.2'/><text transform='translate(55.1 48.6)' y='.36em'>H</text><text transform='translate(35.9 33.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"]},"C2H6":{"x":[59.8,31,"<path d='M21.3 10.3L38.2 20'/><text transform='translate(39.3 22.6)' y='.36em'>CH₃</text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"]},"C3H8":{"x":[85.8,39,"<path d='M47.3 20L64.2 10.2M21.3 10.2L38.2 20'/><text transform='translate(65.2 7.6)' y='.36em'>CH₃</text><text transform='translate(39.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[58,21,"<path d='M29 18L55 3M3 3L29 18'/>"]},"C4H10":{"x":[111.7,47.8,"<path d='M73.3 28.8L90.2 19M47.3 19L64.2 28.8M21.3 28.8L38.2 19'/><text transform='translate(91.2 16.4)' y='.36em'>CH₃</text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,21,"<path d='M55 18L80.9 3M29 3L55 18M3 18L29 3'/>"]},"CH3CH(CH3)CH3":{"x":[78.8,68,"<path d='M19.4 55L29.2 38.2M37 33.6L56.5 33.6M19.4 12.3L27.7 26.5'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(58.3 33.6)' y='.36em'>CH₃</text><text transform='translate(20.3 7.7)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[51,58,"<path d='M3 55L18 29M18 29L48 29M3 3L18 29'/>"]},"C6H14":{"x":[163.7,47.8,"<path d='M125.3 28.7L142.1 19M99.3 19L116.2 28.7M73.3 28.7L90.2 19M47.3 19L64.2 28.7M21.3 28.7L38.2 19'/><text transform='translate(143.2 16.4)' y='.36em'>CH₃</text><text transform='translate(117.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(91.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[135.9,21,"<path d='M106.9 18L132.9 3M80.9 3L106.9 18M55 18L80.9 3M29 3L55 18M3 18L29 3'/>"]},"C7H16":{"x":[189.7,47.8,"<path d='M151.2 28.8L168.1 19.1M125.3 19.1L142.1 28.8M99.3 28.8L116.2 19.1M73.3 19.1L90.2 28.8M47.3 28.8L64.2 19.1M21.3 19.1L38.2 28.8'/><text transform='translate(169.2 16.4)' y='.36em'>CH₃</text><text transform='translate(143.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(117.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(91.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(65.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(39.3 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.3 16.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[161.9,21,"<path d='M132.9 18L158.9 3M106.9 3L132.9 18M80.9 18L106.9 3M55 3L80.9 18M29 18L55 3M3 3L29 18'/>"]},"C8H18":{"x":[215.7,47.8,"<path d='M177.2 28.8L194.1 19.1M151.2 19.1L168.1 28.8M125.3 28.8L142.1 19.1M99.3 19.1L116.2 28.8M73.3 28.8L90.2 19.1M47.3 19.1L64.2 28.8M21.3 28.8L38.2 19.1'/><text transform='translate(195.1 16.4)' y='.36em'>CH₃</text><text transform='translate(169.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(143.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(117.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(91.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[187.9,21,"<path d='M158.9 18L184.9 3M132.9 3L158.9 18M106.9 18L132.9 3M80.9 3L106.9 18M55 18L80.9 3M29 3L55 18M3 18L29 3'/>"],"n":"Показан н-октан (неразветвлённая цепь).","ne":"n-Octane (an unbranched chain) is shown."},"C16H34":{"x":[423.5,47.8,"<path d='M385.1 28.7L401.9 19M359.1 19L376 28.7M333.1 28.7L350 19M307.1 19L324 28.7M281.1 28.7L298 19M255.2 19L272 28.7M229.2 28.7L246.1 19M203.2 19L220.1 28.7M177.2 28.7L194.1 19M151.2 19L168.1 28.7M125.3 28.7L142.1 19M99.3 19L116.2 28.7M73.3 28.7L90.2 19M47.3 19L64.2 28.7M21.3 28.7L38.2 19'/><text transform='translate(403 16.4)' y='.36em'>CH₃</text><text transform='translate(377 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(351 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(325.1 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(299.1 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(273.1 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(247.1 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(221.1 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(195.1 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(169.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(143.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(117.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(91.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[395.7,21,"<path d='M366.7 18L392.7 3M340.7 3L366.7 18M314.8 18L340.7 3M288.8 3L314.8 18M262.8 18L288.8 3M236.8 3L262.8 18M210.8 18L236.8 3M184.9 3L210.8 18M158.9 18L184.9 3M132.9 3L158.9 18M106.9 18L132.9 3M80.9 3L106.9 18M55 18L80.9 3M29 3L55 18M3 18L29 3'/>"]},"(CH2)3":{"x":[32,36,"<path d='M29 3L29 33M3 18L29 33M3 18L29 3'/>"]},"C6H12":{"x":[58,66,"<path d='M3 48L29 63M3 18L3 48M29 63L55 48M3 18L29 3M55 18L55 48M29 3L55 18'/>"]},"C2H4":{"x":[59.6,31,"<path d='M21.9 7.7L39.9 18.1M19.3 12.1L37.3 22.6'/><text transform='translate(39.1 22.6)' y='.36em'>CH₂</text><text transform='translate(20.1 7.6)' text-anchor='end' y='.36em'>H₂C</text>"]},"CH2CHCH3":{"x":[85.8,39,"<path d='M42.8 16.7L63.6 4.7M47.3 20L64.2 10.2M21.3 10.2L38.2 20'/><text transform='translate(65.2 7.6)' y='.36em'>CH₂</text><text transform='translate(39.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[58,23.9,"<path d='M29 15L49.8 3M29 20.9L55 5.9M3 5.9L29 20.9'/>"]},"CH2CHCH2CH3":{"x":[111.7,47.8,"<path d='M68.8 25.5L89.6 13.5M73.3 28.8L90.2 19M47.3 19L64.2 28.8M21.3 28.8L38.2 19'/><text transform='translate(91.2 16.4)' y='.36em'>CH₂</text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,23.9,"<path d='M55 15L75.8 3M55 20.9L80.9 5.9M29 5.9L55 20.9M3 20.9L29 5.9'/>"]},"CH3CHCHCH3":{"x":[111.7,47.8,"<path d='M73.3 28.8L90.2 19M42.8 22.3L63.6 34.3M47.3 19L64.2 28.8M21.3 28.8L38.2 19'/><text transform='translate(91.2 16.4)' y='.36em'>CH₃</text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,23.9,"<path d='M55 18L80.9 3M29 8.9L49.8 20.9M29 3L55 18M3 18L29 3'/>"]},"C4H8":{"x":[215.7,47.8,"<path d='M172.7 25.5L193.5 13.5M177.2 28.8L194.1 19.1M151.2 19.1L168.1 28.8M125.3 28.8L142.1 19.1M73.3 28.8L90.2 19.1M47.9 13.5L68.7 25.5M47.3 19.1L64.2 28.8M21.3 28.8L38.2 19.1'/><text transform='translate(195.1 16.4)' y='.36em'>CH₂</text><text transform='translate(169.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(143.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(117.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₃</tspan></text><text transform='translate(91.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[187.9,23.9,"<path d='M158.9 15L179.7 3M158.9 20.9L184.9 5.9M132.9 5.9L158.9 20.9M106.9 20.9L132.9 5.9M55 20.9L80.9 5.9M34.1 3L54.9 15M29 5.9L55 20.9M3 20.9L29 5.9'/>"],"n":"Показаны два изомера: бутен-1 и бутен-2.","ne":"Two isomers are shown: but-1-ene and but-2-ene."},"C8H16":{"x":[215.7,47.8,"<path d='M172.7 25.5L193.5 13.5M177.2 28.8L194.1 19.1M151.2 19.1L168.1 28.8M125.3 28.8L142.1 19.1M99.3 19.1L116.2 28.8M73.3 28.8L90.2 19.1M47.3 19.1L64.2 28.8M21.3 28.8L38.2 19.1'/><text transform='translate(195.1 16.4)' y='.36em'>CH₂</text><text transform='translate(169.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(143.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(117.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(91.2 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(65.2 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[187.9,23.9,"<path d='M158.9 15L179.7 3M158.9 20.9L184.9 5.9M132.9 5.9L158.9 20.9M106.9 20.9L132.9 5.9M80.9 5.9L106.9 20.9M55 20.9L80.9 5.9M29 5.9L55 20.9M3 20.9L29 5.9'/>"],"n":"Показан октен-1 — один из возможных изомеров.","ne":"Oct-1-ene is shown — one of the possible isomers."},"CH2CHCHCH2":{"x":[111.5,47.8,"<path d='M68.6 25.5L89.4 13.5M73.1 28.8L90 19M47.1 19L64 28.8M21.8 34.3L42.5 22.3M21.2 28.8L38 19'/><text transform='translate(91.1 16.4)' y='.36em'>CH₂</text><text transform='translate(65.1 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(39.1 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(20.1 31.4)' text-anchor='end' y='.36em'>H₂C</text>"],"s":[83.9,26.8,"<path d='M55 15L75.8 3M55 20.9L80.9 5.9M29 5.9L55 20.9M8.1 23.8L28.9 11.8M3 20.9L29 5.9'/>"]},"CH2C(CH3)CHCH2":{"x":[111.5,69.8,"<path d='M71.3 26.9L89.3 16.5M73.8 31.3L91.9 20.9M68.6 36.6L68.6 56.1M47.1 19L64 28.8M21.8 34.3L42.5 22.3M21.2 28.8L38 19'/><text transform='translate(91.1 16.4)' y='.36em'>CH₂</text><text transform='translate(72.1 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(65.1 61.4)' y='.36em'>CH₃</text><text transform='translate(39.1 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(20.1 31.4)' text-anchor='end' y='.36em'>H₂C</text>"],"s":[85.2,53.2,"<path d='M53.7 18L79.7 3M56.2 22.4L82.2 7.4M55 20.2L55 50.2M29 5.2L55 20.2M8.1 23.1L28.9 11.1M3 20.2L29 5.2'/>"]},"C2H2":{"x":[52,31,"<path d='M18.1 6.7L37.2 17.7M14.7 12.6L33.8 23.6M17.5 10.3L34.4 20'/><text transform='translate(35.5 22.6)' y='.36em'>CH</text><text transform='translate(16.5 7.6)' text-anchor='end' y='.36em'>HC</text>"]},"CHCCH3":{"x":[81.8,46,"<path d='M47.9 21.7L67 32.7M44.5 27.6L63.6 38.6M47.3 25.3L64.2 35M21.3 10.3L38.2 20'/><text transform='translate(65.2 37.6)' y='.36em'>CH</text><text transform='translate(39.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[59.7,38.9,"<path d='M30.7 15.1L56.7 30.1M27.3 20.9L53.3 35.9M29 18L55 33M3 3L29 18'/>"]},"AgCCAg":{"x":[95.7,61,"<path d='M65.4 40.3L80.2 48.8M40.1 21.7L59.1 32.7M36.7 27.6L55.7 38.6M39.4 25.3L56.3 35M15.6 11.5L30.4 20'/><text transform='translate(81.3 52.6)' y='.36em'>Ag</text><text transform='translate(57.4 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(31.4 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(14.4 7.6)' text-anchor='end' y='.36em'>Ag</text>"],"s":[95.7,61,"<path d='M60.9 37.6L80.2 48.8M36.6 19.7L62.6 34.7M33.2 25.6L59.2 40.6M34.9 22.6L60.9 37.6M15.6 11.5L34.9 22.6'/><text transform='translate(81.3 52.6)' y='.36em'>Ag</text><text transform='translate(14.4 7.6)' text-anchor='end' y='.36em'>Ag</text>"]},"CH3CCAg":{"x":[103.8,61,"<path d='M65.4 40.3L82.3 50M40.1 21.7L59.1 32.7M36.7 27.6L55.7 38.6M39.4 25.3L56.3 35M15.6 11.5L30.4 20'/><text transform='translate(83.4 52.6)' y='.36em'>CH₃</text><text transform='translate(57.4 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(31.4 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(14.4 7.6)' text-anchor='end' y='.36em'>Ag</text>"],"s":[89.8,55.6,"<path d='M60.9 37.6L86.9 52.6M36.6 19.7L62.6 34.7M33.2 25.6L59.2 40.6M34.9 22.6L60.9 37.6M15.6 11.5L34.9 22.6'/><text transform='translate(14.4 7.6)' text-anchor='end' y='.36em'>Ag</text>"]},"NaCCNa":{"x":[96.2,61,"<path d='M65.2 40.3L80 48.8M39.9 21.7L58.9 32.7M36.5 27.6L55.5 38.6M39.3 25.3L56.2 35M15.4 11.5L30.2 20'/><text transform='translate(80.5 52.6)' y='.36em'>Na</text><text transform='translate(57.2 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(31.2 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(15 7.6)' text-anchor='end' y='.36em'>Na</text>"],"s":[96.2,61,"<path d='M60.7 37.6L80 48.8M36.4 19.7L62.4 34.7M33 25.6L59 40.6M34.7 22.6L60.7 37.6M15.4 11.5L34.7 22.6'/><text transform='translate(80.5 52.6)' y='.36em'>Na</text><text transform='translate(15 7.6)' text-anchor='end' y='.36em'>Na</text>"]},"CH2CHCCH":{"x":[107.9,54,"<path d='M65 31.7L85.8 19.7M69.5 35L86.4 25.2M43.5 25.2L60.4 35M18.1 6.7L37.2 17.7M14.7 12.5L33.8 23.5M17.5 10.2L34.4 20'/><text transform='translate(87.4 22.6)' y='.36em'>CH₂</text><text transform='translate(61.4 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(35.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(16.5 7.6)' text-anchor='end' y='.36em'>HC</text>"],"s":[85.6,39,"<path d='M56.7 30L77.5 18M56.7 36L82.6 21M30.7 21L56.7 36M6.4 3L32.4 18M3 8.9L29 23.9M4.7 6L30.7 21'/>"]},"C6H6":{"x":[58,66,"<path d='M3 48L29 63M3 18L3 48M29 63L55 48M3 18L29 3M55 18L55 48M29 3L55 18'/><circle cx='29' cy='33' r='20.9'/>"]},"C6H5CH3":{"x":[97.9,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(77.4 63)' y='.36em'>CH₃</text>"],"s":[83.9,66,"<path d='M55 48L80.9 63M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/>"]},"C6H5C2H5":{"x":[125,63.4,"<path d='M95.6 33.5L105.4 50.4M63 29L87.7 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/><text transform='translate(104.5 55)' y='.36em'>CH₃</text><text transform='translate(89.5 29)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text>"],"s":[111,58,"<path d='M93 29L108 55M63 29L93 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/>"]},"C6H5CH(CH3)2":{"x":[125,68,"<path d='M95.6 29.1L105.4 12.2M95.6 38.2L105.4 55.1M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.5 7.6)' y='.36em'>CH₃</text><text transform='translate(89.5 33.6)' y='.36em'>CH</text><text transform='translate(104.5 59.6)' y='.36em'>CH₃</text>"],"s":[111,58,"<path d='M93 29L108 3M93 29L108 55M63 29L93 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/>"]},"C6H5CHCH2":{"x":[125,63.4,"<path d='M90.1 34.1L102.1 54.9M95.6 33.5L105.4 50.4M63 29L87.7 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/><text transform='translate(104.5 55)' y='.36em'>CH₂</text><text transform='translate(89.5 29)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text>"],"s":[111,58,"<path d='M90.1 34.1L102.1 54.9M93 29L108 55M63 29L93 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/>"]},"CH3Cl":{"x":[50.3,31,"<path d='M14 11.5L28.7 20'/><text transform='translate(29.8 22.6)' y='.36em'>CH₃</text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH2Cl2":{"x":[66.6,39,"<path d='M37.8 20L52.6 11.5M14 11.5L28.7 20'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(29.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[66.6,25.6,"<path d='M33.3 22.6L52.6 11.5M14 11.5L33.3 22.6'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CHCl3":{"x":[59.6,68,"<path d='M11.2 53L19.7 38.2M27.6 33.6L44.6 33.6M11.2 14.3L18.2 26.4'/><text transform='translate(11.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(18.8 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[59.6,68,"<path d='M11.2 53L22.3 33.6M22.3 33.6L44.6 33.6M11.2 14.3L22.3 33.6'/><text transform='translate(11.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CCl4":{"x":[66.6,68,"<path d='M37.8 36.3L52.6 44.8M14 22.5L28.7 31M35.9 29.1L44.4 14.3M22.1 53L30.7 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(36.8 33.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(11.8 18.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(22.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[66.6,68,"<path d='M33.3 33.6L52.6 44.8M14 22.5L33.3 33.6M33.3 33.6L44.4 14.3M22.1 53L33.3 33.6'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 18.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(22.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH3Br":{"x":[50.4,31,"<path d='M14.1 11.5L28.9 20'/><text transform='translate(29.9 22.6)' y='.36em'>CH₃</text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"C2H5Cl":{"x":[76.3,39,"<path d='M37.8 20L54.7 10.2M14 11.5L28.7 20'/><text transform='translate(55.8 7.6)' y='.36em'>CH₃</text><text transform='translate(29.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[62.3,25.6,"<path d='M33.3 22.6L59.3 7.6M14 11.5L33.3 22.6'/><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"C2H5Br":{"x":[76.4,39,"<path d='M38 20L54.8 10.2M14.1 11.5L28.9 20'/><text transform='translate(55.9 7.6)' y='.36em'>CH₃</text><text transform='translate(29.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[62.4,25.6,"<path d='M33.4 22.6L59.4 7.6M14.1 11.5L33.4 22.6'/><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH3CHBrCH3":{"x":[69.2,68,"<path d='M19.4 55L29.2 38.2M37 33.6L54.1 33.6M19.4 12.3L27.7 26.5'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(56.9 33.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(20.3 7.7)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[55.4,58,"<path d='M3 55L18 29M18 29L40.3 29M3 3L18 29'/><text transform='translate(43.1 29)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH3CHClCH3":{"x":[69.1,68,"<path d='M19.4 55L29.2 38.2M37 33.6L54.1 33.6M19.4 12.3L27.7 26.5'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(57.3 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(20.3 7.7)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[55.3,58,"<path d='M3 55L18 29M18 29L40.3 29M3 3L18 29'/><text transform='translate(43.5 29)' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH3CH2CH2Br":{"x":[102.3,47.8,"<path d='M63.9 28.8L80.8 19M38 19L54.8 28.8M14.1 27.5L28.9 19'/><text transform='translate(81.9 16.4)' y='.36em'>CH₃</text><text transform='translate(55.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(29.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(12.3 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[88.3,26.4,"<path d='M59.4 18L85.4 3M33.4 3L59.4 18M14.1 14.1L33.4 3'/><text transform='translate(12.3 18)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2BrCH2CH2Br":{"x":[118.9,47.8,"<path d='M89.9 28.7L104.7 20.2M63.9 19L80.8 28.7M38 28.7L54.8 19M14.1 20.2L28.9 28.7'/><text transform='translate(106.5 16.4)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(81.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(55.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(29.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(12.3 16.4)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[118.9,25.6,"<path d='M85.4 22.6L104.7 11.5M59.4 7.6L85.4 22.6M33.4 22.6L59.4 7.6M14.1 11.5L33.4 22.6'/><text transform='translate(106.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2ClCH2CH2Cl":{"x":[118.6,47.8,"<path d='M89.8 28.7L104.6 20.2M63.8 19L80.7 28.7M37.8 28.7L54.7 19M14 20.2L28.7 28.7'/><text transform='translate(106.8 16.4)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(81.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(55.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(29.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(11.8 16.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[118.6,25.6,"<path d='M85.3 22.6L104.6 11.5M59.3 7.6L85.3 22.6M33.3 22.6L59.3 7.6M14 11.5L33.3 22.6'/><text transform='translate(106.8 7.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"C6H11Cl":{"x":[88.3,71.4,"<path d='M55 48L74.3 59.1M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><text transform='translate(76.5 63)' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH2BrCH2Br":{"x":[92.9,47.8,"<path d='M63.9 28.8L78.7 20.2M38 19L54.8 28.8M14.1 27.5L28.9 19'/><text transform='translate(80.5 16.4)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(55.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(29.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(12.3 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[92.9,31,"<path d='M59.4 22.6L78.7 11.5M33.4 7.6L59.4 22.6M14.1 18.8L33.4 7.6'/><text transform='translate(80.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 22.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2ClCH2Cl":{"x":[92.6,47.8,"<path d='M63.8 28.8L78.6 20.2M37.8 19L54.7 28.8M14 27.5L28.7 19'/><text transform='translate(80.8 16.4)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(55.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(29.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(11.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[92.6,31,"<path d='M59.3 22.6L78.6 11.5M33.3 7.6L59.3 22.6M14 18.8L33.3 7.6'/><text transform='translate(80.8 7.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 22.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH3CHCl2":{"x":[69.1,68,"<path d='M19.4 55L29.2 38.2M37 33.6L54.1 33.6M20.6 14.3L27.7 26.5'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(57.3 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(21.2 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[59.6,62.6,"<path d='M7.3 59.6L22.3 33.6M22.3 33.6L44.6 33.6M11.2 14.3L22.3 33.6'/><text transform='translate(47.8 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH2BrCHBrCH3":{"x":[92.9,69,"<path d='M63.9 50L78.7 41.5M38 40.2L54.8 50M14.1 48.8L25.6 42.1M33.4 32.4L33.4 12.9'/><text transform='translate(80.5 37.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(55.9 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36.9 37.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(12.3 52.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(29.9 7.6)' y='.36em'>CH₃</text>"],"s":[92.9,56.4,"<path d='M59.4 48L78.7 36.8M33.4 33L59.4 48M14.1 44.1L33.4 33M33.4 33L33.4 3'/><text transform='translate(80.5 33)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 48)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2CHCH2Cl":{"x":[102.2,47.8,"<path d='M59.3 25.5L80.1 13.5M63.8 28.8L80.7 19M37.8 19L54.7 28.8M14 27.5L28.7 19'/><text transform='translate(81.8 16.4)' y='.36em'>CH₂</text><text transform='translate(55.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(29.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(11.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[88.2,29.3,"<path d='M59.3 15L80.1 3M59.3 20.9L85.3 5.9M33.3 5.9L59.3 20.9M14 17L33.3 5.9'/><text transform='translate(11.8 20.9)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH3CHBrCH2CH3":{"x":[111.7,69.8,"<path d='M73.3 28.8L90.2 19M68.7 36.6L68.7 53.7M47.3 19L60.9 26.9M21.3 28.8L38.2 19'/><text transform='translate(91.2 16.4)' y='.36em'>CH₃</text><text transform='translate(72.2 31.4)' text-anchor='end' y='.36em'>HC</text><text transform='translate(63.9 61.4)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,56.4,"<path d='M55 18L80.9 3M55 18L55 40.3M29 3L55 18M3 18L29 3'/><text transform='translate(50.1 48)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH3CBr2CH3":{"x":[76.4,68,"<path d='M38 36.3L54.8 46M14.1 22.5L28.9 31M36 29.1L44.6 14.3M21 55.1L30.8 38.2'/><text transform='translate(55.9 48.6)' y='.36em'>CH₃</text><text transform='translate(36.9 33.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(12.3 18.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(43.5 7.7)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(21.9 59.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[62.4,62.6,"<path d='M33.4 33.6L59.4 48.6M14.1 22.5L33.4 33.6M33.4 33.6L44.6 14.3M18.4 59.6L33.4 33.6'/><text transform='translate(12.3 18.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(43.5 7.7)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2CHCl":{"x":[76.3,39,"<path d='M33.3 16.7L54.1 4.7M37.8 20L54.7 10.2M14 11.5L28.7 20'/><text transform='translate(55.8 7.6)' y='.36em'>CH₂</text><text transform='translate(29.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[62.3,25.6,"<path d='M33.3 16.7L54.1 4.7M33.3 22.6L59.3 7.6M14 11.5L33.3 22.6'/><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CF2CF2":{"x":[89.5,91,"<path d='M57.6 12.9L57.6 32.4M62.1 40.2L79 50M36.7 55.5L57.5 43.5M36.1 50L53 40.2M31.6 57.9L31.6 77.4M10.1 40.2L27 50'/><text transform='translate(60.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(54.1 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(80.5 52.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(35.1 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(28.5 82.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(8.7 37.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"],"s":[89.5,91,"<path d='M57.6 12.9L57.6 37.6M57.6 37.6L79 50M36.7 55.5L57.5 43.5M31.6 52.6L57.6 37.6M31.6 52.6L31.6 77.4M10.1 40.2L31.6 52.6'/><text transform='translate(60.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(80.5 52.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(28.5 82.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(8.7 37.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"]},"CH2BrCHCHCH2Br":{"x":[144.8,47.8,"<path d='M115.9 28.7L130.7 20.2M89.9 19L106.8 28.7M64.5 34.3L85.3 22.3M63.9 28.7L80.8 19M38 19L54.8 28.7M14.1 27.5L28.9 19'/><text transform='translate(132.5 16.4)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(107.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(81.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(55.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(29.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(12.3 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[144.8,31,"<path d='M111.4 22.6L130.7 11.5M85.4 7.6L111.4 22.6M64.5 25.5L85.3 13.5M59.4 22.6L85.4 7.6M33.4 7.6L59.4 22.6M14.1 18.8L33.4 7.6'/><text transform='translate(132.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 22.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH2BrCHBrCHBrCH2Br":{"x":[144.8,91,"<path d='M115.9 50L130.7 41.5M89.9 40.2L106.8 50M85.4 32.4L85.4 15.3M63.9 50L77.5 42.1M59.4 57.9L59.4 74.9M38 40.2L51.5 48.1M14.1 48.8L28.9 40.2'/><text transform='translate(132.5 37.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(107.9 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(88.9 37.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(80.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(62.9 52.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(54.5 82.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(29.9 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(12.3 52.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[144.8,91,"<path d='M111.4 52.6L130.7 41.5M85.4 37.6L111.4 52.6M85.4 37.6L85.4 15.3M59.4 52.6L85.4 37.6M59.4 52.6L59.4 74.9M33.4 37.6L59.4 52.6M14.1 48.8L33.4 37.6'/><text transform='translate(132.5 37.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(80.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(54.5 82.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 52.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CHBrCHBr":{"x":[92.9,47.8,"<path d='M63.9 28.8L78.7 20.2M33.5 22.3L54.2 34.3M38 19L54.8 28.8M14.1 27.5L28.9 19'/><text transform='translate(80.5 16.4)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(55.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(29.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(12.3 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[92.9,31,"<path d='M59.4 22.6L78.7 11.5M33.5 13.5L54.2 25.5M33.4 7.6L59.4 22.6M14.1 18.8L33.4 7.6'/><text transform='translate(80.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 22.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CHBr2CHBr2":{"x":[92.9,91,"<path d='M59.4 15.3L59.4 32.4M63.9 40.2L78.7 48.8M38 50L54.8 40.2M33.4 57.9L33.4 74.9M14.1 41.5L25.5 48.1'/><text transform='translate(64.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(55.9 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(80.5 52.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(36.9 52.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(28.5 82.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[92.9,91,"<path d='M59.4 15.3L59.4 37.6M59.4 37.6L78.7 48.8M33.4 52.6L59.4 37.6M33.4 52.6L33.4 74.9M14.1 41.5L33.4 52.6'/><text transform='translate(64.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(80.5 52.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(28.5 82.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"C6H5Br":{"x":[88.4,71.4,"<path d='M55 48L74.3 59.1M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(76.1 63)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"C6H5Cl":{"x":[88.3,71.4,"<path d='M55 48L74.3 59.1M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(76.5 63)' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"C6H6Cl6":{"x":[118.6,136,"<path d='M14 93.8L33.3 82.7M33.3 82.7L59.3 97.7M33.3 52.7L33.3 82.7M59.3 97.7L59.3 120M59.3 97.7L85.3 82.7M33.3 52.7L59.3 37.7M14 41.5L33.3 52.7M85.3 82.7L104.6 93.8M85.3 52.7L85.3 82.7M59.3 37.7L85.3 52.7M59.3 15.4L59.3 37.7M85.3 52.7L104.6 41.5'/><text transform='translate(11.8 97.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(54.8 127.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(106.8 97.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(106.8 37.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(63.7 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 37.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"C6H5CH2Cl":{"x":[115.3,63.4,"<path d='M95.6 33.5L104.1 48.3M63 29L87.7 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/><text transform='translate(103.5 55)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(89.5 29)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text>"],"s":[115.3,63.4,"<path d='M93 29L104.1 48.3M63 29L93 29M48 3L63 29M48 55L63 29M18 3L48 3M18 55L48 55M3 29L18 3M3 29L18 55'/><circle cx='33' cy='29' r='20.9'/><text transform='translate(103.5 55)' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"CH3C6H4Cl":{"x":[218.1,121,"<path d='M141.8 110L163.2 97.6M163.2 97.6L189.2 112.6M163.2 67.6L163.2 97.6M189.2 112.6L215.2 97.6M163.2 67.6L189.2 52.6M143.9 56.5L163.2 67.6M215.2 67.6L215.2 97.6M189.2 52.6L215.2 67.6M85.3 52.6L106.7 65M59.3 67.6L85.3 52.6M85.3 52.6L85.3 22.6M33.3 52.6L59.3 67.6M59.3 7.6L85.3 22.6M33.3 52.6L33.3 22.6M33.3 22.6L59.3 7.6M14 11.5L33.3 22.6'/><circle cx='189.2' cy='82.6' r='20.9'/><circle cx='59.3' cy='37.6' r='20.9'/><text transform='translate(140.7 112.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(132.8 52.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl</tspan></text><text transform='translate(107.7 67.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₃</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[218.1,115.6,"<path d='M137.2 112.6L163.2 97.6M163.2 97.6L189.2 112.6M163.2 67.6L163.2 97.6M189.2 112.6L215.2 97.6M163.2 67.6L189.2 52.6M143.9 56.5L163.2 67.6M215.2 67.6L215.2 97.6M189.2 52.6L215.2 67.6M85.3 52.6L111.2 67.6M59.3 67.6L85.3 52.6M85.3 52.6L85.3 22.6M33.3 52.6L59.3 67.6M59.3 7.6L85.3 22.6M33.3 52.6L33.3 22.6M33.3 22.6L59.3 7.6M14 11.5L33.3 22.6'/><circle cx='189.2' cy='82.6' r='20.9'/><circle cx='59.3' cy='37.6' r='20.9'/><text transform='translate(132.8 52.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"n":"Показаны оба изомера: орто- (2-хлортолуол) и пара- (4-хлортолуол).","ne":"Both isomers are shown: ortho- (2-chlorotoluene) and para- (4-chlorotoluene)."},"C6H5CHBrCH2Br":{"x":[140.3,101.4,"<path d='M111.5 50.6L126.2 59.1M88.8 58.5L102.4 50.6M80.9 85.3L80.9 68.2M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(128 63)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(103.4 48)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(77.4 63)' y='.36em'>CH</text><text transform='translate(76.1 93)' y='.36em'><tspan class='x'>Br</tspan></text>"],"s":[140.3,101.4,"<path d='M106.9 48L126.2 59.1M80.9 63L106.9 48M80.9 85.3L80.9 63M55 48L80.9 63M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(128 63)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(76.1 93)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"CH3NO2":{"x":[68.3,68,"<path d='M19.4 55L29.2 38.2M39.7 36.2L57.2 36.2M39.7 31.1L57.2 31.1M19.4 12.2L29.2 29'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.5 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(22.4 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[60.2,62.6,"<path d='M8.7 59.6L21 38.2M31.6 36.2L49.1 36.2M31.6 31.1L49.1 31.1M11.3 12.2L21 29'/><text transform='translate(20.4 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(49.9 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C2H5NO2":{"x":[101.4,69,"<path d='M63.1 50L80 40.2M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81 37.6)' y='.36em'>CH₃</text><text transform='translate(55 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(37.9 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[87.5,61,"<path d='M58.5 52.6L84.5 37.6M37.1 40.2L58.5 52.6M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(37.9 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C6H5NO2":{"x":[118.6,68,"<path d='M95.6 29.1L105.4 12.2M93.1 38.9L103.5 56.9M97.5 36.3L107.9 54.4M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(89.7 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text>"]},"CH3C6H2(NO2)3":{"x":[154.2,171.9,"<path d='M56.3 132.9L68.7 111.5L98.7 111.5M53.7 85.6L68.7 111.5M98.7 111.5L111 132.9M98.7 111.5L113.7 85.6M53.7 85.6L68.7 59.6M29.5 85.6L53.7 85.6M121.6 140.1L139.1 140.1M121.6 135L139.1 135M101.8 158.1L111 142.1M98.7 59.6L113.7 85.6M68.7 59.6L98.7 59.6M8.8 106.3L18.1 90.2M13.2 108.8L22.5 92.7M11.3 64.1L21 81M98.7 59.6L111 38.2M103.2 10.3L113.6 28.3M98.8 12.9L109.2 30.9M121.6 33.6L138.4 33.6'/><circle cx='83.7' cy='85.6' r='20.9'/><text transform='translate(57.2 137.5)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(110.4 137.5)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(139.9 137.5)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(104.3 163.5)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(110.4 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(102.4 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(139.9 33.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(29 85.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(12.4 111.5)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[154.2,171.9,"<path d='M53.7 137.5L68.7 111.5L98.7 111.5M53.7 85.6L68.7 111.5M98.7 111.5L111 132.9M98.7 111.5L113.7 85.6M53.7 85.6L68.7 59.6M29.5 85.6L53.7 85.6M121.6 140.1L139.1 140.1M121.6 135L139.1 135M101.8 158.1L111 142.1M98.7 59.6L113.7 85.6M68.7 59.6L98.7 59.6M8.8 106.3L18.1 90.2M13.2 108.8L22.5 92.7M11.3 64.1L21 81M98.7 59.6L111 38.2M103.2 10.3L113.6 28.3M98.8 12.9L109.2 30.9M121.6 33.6L138.4 33.6'/><circle cx='83.7' cy='85.6' r='20.9'/><text transform='translate(110.4 137.5)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(139.9 137.5)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(104.3 163.5)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(110.4 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(102.4 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(139.9 33.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(29 85.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(12.4 111.5)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"CH3OH":{"x":[56.3,31,"<path d='M17.9 10.3L34.7 20'/><text transform='translate(35.8 22.6)' y='.36em'>CH₃</text><text transform='translate(17 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C2H5OH":{"x":[82.3,39,"<path d='M43.8 20L60.7 10.2M17.9 10.2L34.7 20'/><text transform='translate(61.8 7.6)' y='.36em'>CH₃</text><text transform='translate(35.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(17 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[68.3,25.6,"<path d='M39.3 22.6L65.3 7.6M17.9 10.2L39.3 22.6'/><text transform='translate(17 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"CH3CH2CH2OH":{"x":[108.2,47.8,"<path d='M69.8 28.8L86.7 19M43.8 19L60.7 28.8M17.9 28.8L34.7 19'/><text transform='translate(87.8 16.4)' y='.36em'>CH₃</text><text transform='translate(61.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(35.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(17 31.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[94.2,26.4,"<path d='M65.3 18L91.3 3M39.3 3L65.3 18M17.9 15.4L39.3 3'/><text transform='translate(17 18)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"CH3CH(OH)CH3":{"x":[75.1,68,"<path d='M19.4 55L29.2 38.2M37 33.6L56.5 33.6M19.4 12.3L27.7 26.5'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(20.3 7.7)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[61.3,58,"<path d='M3 55L18 29M18 29L42.8 29M3 3L18 29'/><text transform='translate(44.3 29)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"CH3CH(OH)CH2CH3":{"x":[111.7,69.8,"<path d='M73.3 28.8L90.2 19M68.7 36.6L68.7 56.1M47.3 19L60.9 26.9M21.3 28.8L38.2 19'/><text transform='translate(91.2 16.4)' y='.36em'>CH₃</text><text transform='translate(72.2 31.4)' text-anchor='end' y='.36em'>HC</text><text transform='translate(65 61.4)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(39.3 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(20.3 31.4)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,56.4,"<path d='M55 18L80.9 3M55 18L55 42.7M29 3L55 18M3 18L29 3'/><text transform='translate(51.2 48)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"C6H11OH":{"x":[94.2,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><text transform='translate(77.2 63)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"CH2OHCH2OH":{"x":[104.5,47.8,"<path d='M69.8 28.8L86.7 19M43.8 19L60.7 28.8M17.9 28.8L34.7 19'/><text transform='translate(87.5 16.4)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(61.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(35.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(17 31.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[104.5,31,"<path d='M65.3 22.6L86.7 10.2M39.3 7.6L65.3 22.6M17.9 20L39.3 7.6'/><text transform='translate(87.5 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(17 22.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"CH2OHCHOHCH3":{"x":[104.5,69,"<path d='M69.8 50L86.7 40.2M43.8 40.2L60.7 50M17.9 50L31.4 42.1M39.3 32.4L39.3 12.9'/><text transform='translate(87.5 37.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(61.8 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(42.8 37.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(17 52.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(35.8 7.6)' y='.36em'>CH₃</text>"],"s":[104.5,56.4,"<path d='M65.3 48L86.7 35.6M39.3 33L65.3 48M17.9 45.4L39.3 33M39.3 33L39.3 3'/><text transform='translate(87.5 33)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(17 48)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C3H5(OH)3":{"x":[130.5,69,"<path d='M95.8 50L112.7 40.2M69.8 40.2L86.7 50M65.3 32.4L65.3 12.9M43.8 50L57.4 42.1M17.9 40.2L34.7 50'/><text transform='translate(113.5 37.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(87.8 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(68.8 37.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(61.6 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.8 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[130.5,55.6,"<path d='M91.3 52.6L112.7 40.2M65.3 37.6L91.3 52.6M65.3 37.6L65.3 12.9M39.3 52.6L65.3 37.6M17.9 40.2L39.3 52.6'/><text transform='translate(113.5 37.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(61.6 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C6H5CH(OH)CH2OH":{"x":[146.2,101.4,"<path d='M111.5 50.6L128.4 60.4M88.8 58.5L102.4 50.6M80.9 87.7L80.9 68.2M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(129.2 63)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(103.4 48)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(77.4 63)' y='.36em'>CH</text><text transform='translate(77.2 93)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[146.2,101.4,"<path d='M106.9 48L128.4 60.4M80.9 63L106.9 48M80.9 87.7L80.9 63M55 48L80.9 63M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(129.2 63)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(77.2 93)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"C6H5OH":{"x":[94.2,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(77.2 63)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"C6H2Br3OH":{"x":[124.6,106,"<path d='M85.4 52.6L106.8 65M85.4 22.6L85.4 52.6M59.4 67.6L85.4 52.6M85.4 22.6L104.7 11.5M59.4 7.6L85.4 22.6M33.4 52.6L59.4 67.6M59.4 67.6L59.4 89.9M33.4 22.6L59.4 7.6M33.4 22.6L33.4 52.6M14.1 11.5L33.4 22.6'/><circle cx='59.4' cy='37.6' r='20.9'/><text transform='translate(107.6 67.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(106.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(54.5 97.6)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"C6H2(NO2)3OH":{"x":[154.2,171.9,"<path d='M56.3 132.9L68.7 111.5L98.7 111.5M53.7 85.6L68.7 111.5M98.7 111.5L111 132.9M98.7 111.5L113.7 85.6M53.7 85.6L68.7 59.6M29.5 85.6L53.7 85.6M121.6 140.1L139.1 140.1M121.6 135L139.1 135M101.8 158.1L111 142.1M98.7 59.6L113.7 85.6M68.7 59.6L98.7 59.6M8.8 106.3L18.1 90.2M13.2 108.8L22.5 92.7M11.3 64.1L21 81M98.7 59.6L111 38.2M103.2 10.3L113.6 28.3M98.8 12.9L109.2 30.9M121.6 33.6L138.4 33.6'/><circle cx='83.7' cy='85.6' r='20.9'/><text transform='translate(57.4 137.5)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(110.4 137.5)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(139.9 137.5)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(104.3 163.5)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(110.4 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(102.4 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(139.9 33.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(29 85.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(12.4 111.5)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C3H5(ONO2)3":{"x":[224.9,136,"<path d='M194.3 94.3L209.9 85.3M185.9 102.3L185.9 123.1M191 102.3L191 123.1M167 85.3L182.5 94.2M141 95L157.9 85.3M115 85.3L131.9 95M110.5 77.4L110.5 57.9M89.1 95L102.5 87.2M89.1 40.3L105.9 50M63.1 85.3L80 95M87.1 32.3L87.1 12.3M82 32.3L82 12.3M64.6 49.1L78.5 41.2M38.4 94.3L54 85.3M11.9 82.8L29.1 92.8M9.4 87.2L26.6 97.2M32.5 102.9L32.5 122.4'/><text transform='translate(210.7 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(193.8 97.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(133 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(114 82.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(89.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64.1 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(81 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(37.9 97.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 127.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[224.9,136,"<path d='M194.3 94.3L209.9 85.3M185.9 102.3L185.9 123.1M191 102.3L191 123.1M167 85.3L182.5 94.2M136.5 97.7L157.9 85.3M110.5 82.7L136.5 97.7M110.5 82.7L110.5 57.9M84.5 97.7L110.5 82.7M89.1 40.3L105.9 50M63.1 85.3L84.5 97.7M87.1 32.3L87.1 12.3M82 32.3L82 12.3M64.6 49.1L78.5 41.2M38.4 94.3L54 85.3M11.9 82.8L29.1 92.8M9.4 87.2L26.6 97.2M32.5 102.9L32.5 122.4'/><text transform='translate(210.7 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(193.8 97.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(89.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64.1 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(37.9 97.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 127.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"CH3OCH3":{"x":[85.8,30.6,"<path d='M47.3 20L64.2 10.2M21.3 10.2L38.2 20'/><text transform='translate(65.2 7.6)' y='.36em'>CH₃</text><text transform='translate(39 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[58,26,"<path d='M33.5 15.4L55 3M3 3L24.4 15.4'/><text transform='translate(25.3 18)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"C2H5OC2H5":{"x":[137.7,39.4,"<path d='M99.3 20.3L116.2 10.6M73.3 10.6L90.2 20.3M47.3 20.3L64.2 10.6M21.3 10.6L38.2 20.3'/><text transform='translate(117.2 8)' y='.36em'>CH₃</text><text transform='translate(91.2 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(65 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(39.3 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.3 8)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[109.9,26,"<path d='M80.9 23L106.9 8M59.5 10.6L80.9 23M29 23L50.4 10.6M3 8L29 23'/><text transform='translate(51.2 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"CH3ONa":{"x":[80,30.6,"<path d='M45 18L58.5 10.2'/><text transform='translate(59.5 7.6)' y='.36em'>CH₃</text><text transform='translate(33.3 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[66,30.6,"<path d='M45 18L63 7.6'/><text transform='translate(33.3 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Na⁺</text>"]},"C2H5ONa":{"x":[105.9,39.4,"<path d='M67.5 20.4L84.4 10.6M41.6 10.6L58.5 20.4'/><text transform='translate(85.5 8)' y='.36em'>CH₃</text><text transform='translate(59.5 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[91.9,31.4,"<path d='M63 23L89 8M41.6 10.6L63 23'/><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"CH2ONaCH2ONa":{"x":[153.7,47.8,"<path d='M93.5 19L110.4 28.7M67.5 28.7L84.4 19M41.6 19L58.5 28.7'/><text transform='translate(134.7 16.4)' y='.36em'>Na⁺</text><text transform='translate(111.2 31.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(85.5 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(59.5 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(33.3 16.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 31.4)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[153.7,31.4,"<path d='M89 8L110.4 20.3M63 23L89 8M41.6 10.6L63 23'/><text transform='translate(134.7 8)' y='.36em'>Na⁺</text><text transform='translate(111.2 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"C3H5(ONa)3":{"x":[205.7,69.8,"<path d='M145.5 19.1L162.4 28.8M119.5 28.8L136.4 19.1M115 36.7L115 56.2M93.5 19.1L107 26.9M71 26.8L84.4 19.1'/><text transform='translate(186.7 16.4)' y='.36em'>Na⁺</text><text transform='translate(163.2 31.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(137.4 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(118.5 31.4)' text-anchor='end' y='.36em'>HC</text><text transform='translate(111.2 61.4)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(85.5 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(59.3 31.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(30.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(19 31.4)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[205.7,61.4,"<path d='M140.9 8L162.4 20.4M115 23L140.9 8M115 23L115 47.8M89 8L115 23M71 18.4L89 8'/><text transform='translate(186.7 8)' y='.36em'>Na⁺</text><text transform='translate(163.2 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(111.2 53)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(59.3 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(30.8 8)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"C6H5ONa":{"x":[91.9,76,"<path d='M17.1 64.1L37 52.7L63 67.7M37 22.7L37 52.7M63 67.7L89 52.7M37 22.7L63 7.7M89 22.7L89 52.7M63 7.7L89 22.7'/><circle cx='63' cy='37.7' r='20.9'/><text transform='translate(16.6 67.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19 7.7)' text-anchor='end' y='.36em'>Na⁺</text>"]},"Cu(C2H5O2)2":{"x":[98.3,73,"<path d='M95.3 17.3L95.3 47.3M71.8 55L95.3 47.3M71.8 9.7L95.3 17.3M53.7 38.5L63.7 52.3M53.7 26.1L63.7 12.3M34.6 52.3L44.6 38.5M34.6 12.3L44.6 26.1M3 47.3L26.5 55M3 17.3L26.5 9.7M3 17.3L3 47.3'/><text transform='translate(63.1 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(55.2 32.3)' text-anchor='end' y='.36em'>Cu</text><text transform='translate(27.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(27.8 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(63.1 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text>"],"n":"Ион меди связан с двумя молекулами этиленгликоля (хелатный комплекс, ярко-синий раствор).","ne":"The copper ion is bound to two ethylene glycol molecules (a chelate complex, a bright blue solution)."},"Cu(C3H7O3)2":{"x":[174.5,103.2,"<path d='M154.9 89.5L157 70.1M133.2 47.3L153.3 61.8M133.2 17.3L133.2 47.3M109.7 54.9L133.2 47.3M109.7 9.6L133.2 17.3M91.6 38.5L101.6 52.3M91.6 26.1L101.6 12.3M72.5 52.3L82.5 38.5M72.5 12.3L82.5 26.1M40.9 47.3L64.4 54.9M40.9 17.3L64.4 9.6M40.9 17.3L40.9 47.3M20.9 61.8L40.9 47.3M17.2 70.1L19.2 89.5'/><text transform='translate(158.1 94.8)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(154 64.9)' y='.36em'>CH₂</text><text transform='translate(101 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(81.1 32.3)' y='.36em'>Cu</text><text transform='translate(65.7 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(20.1 64.9)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(16 94.8)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(65.7 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(101 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text>"],"s":[148.1,103.2,"<path d='M141.9 89.5L144.5 64.9M120.2 47.3L144.5 64.9M120.2 17.3L120.2 47.3M96.7 54.9L120.2 47.3M96.7 9.6L120.2 17.3M78.6 38.5L88.6 52.3M78.6 26.1L88.6 12.3M59.5 52.3L69.5 38.5M59.5 12.3L69.5 26.1M27.9 47.3L51.4 54.9M27.9 17.3L51.4 9.6M27.9 17.3L27.9 47.3M3.6 64.9L27.9 47.3M3.6 64.9L6.2 89.5'/><text transform='translate(145.1 94.8)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(88 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(68.1 32.3)' y='.36em'>Cu</text><text transform='translate(52.7 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(3 94.8)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(52.7 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(88 56.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text>"],"n":"Ион меди связан с двумя молекулами глицерина (хелатный комплекс, ярко-синий раствор).","ne":"The copper ion is bound to two glycerol molecules (a chelate complex, a bright blue solution)."},"HCHO":{"x":[49.5,31,"<path d='M11.8 7.7L29.8 18.1M9.3 12.1L27.3 22.6'/><text transform='translate(29 22.6)' y='.36em'>CH₂</text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CH3CHO":{"x":[75.5,39,"<path d='M37.1 20L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L28 20'/><text transform='translate(55 7.6)' y='.36em'>CH₃</text><text transform='translate(29 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[61.6,25.6,"<path d='M32.5 22.6L58.5 7.6M11.7 4.7L32.5 16.7M11.1 10.2L32.5 22.6'/><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CH3CH2CHO":{"x":[101.4,47.8,"<path d='M63.1 28.8L80 19M37.1 19L54 28.8M11.7 34.3L32.5 22.3M11.1 28.8L28 19'/><text transform='translate(81 16.4)' y='.36em'>CH₃</text><text transform='translate(55 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(29 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(10.3 31.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[87.5,26.4,"<path d='M58.5 18L84.5 3M32.5 3L58.5 18M11.7 20.9L32.5 8.9M11.1 15.4L32.5 3'/><text transform='translate(10.3 18)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CH3COCH3":{"x":[68.3,68,"<path d='M19.4 55.1L29.2 38.2M36.4 36.2L57.2 36.2M36.4 31.1L57.2 31.1M19.4 12.2L29.2 29.1'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(20.3 7.7)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[54.6,58,"<path d='M3 55L18 29M18 31.5L43.4 31.5M18 26.4L43.4 26.4M3 3L18 29'/><text transform='translate(44.3 29)' y='.36em'><tspan class='o'>O</tspan></text>"]},"HCOOH":{"x":[71.8,39,"<path d='M37.1 20L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L28 20'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(29 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[71.8,25.6,"<path d='M32.5 22.6L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L32.5 22.6'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CH3COOH":{"x":[68.3,68,"<path d='M19.4 55.1L29.2 38.2M36.4 36.2L57.2 36.2M36.4 31.1L57.2 31.1M19.4 12.2L29.2 29.1'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(20.5 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[64.9,62.6,"<path d='M13.3 59.6L28.3 33.6M28.3 36.2L53.7 36.2M28.3 31.1L53.7 31.1M15.9 12.2L28.3 33.6'/><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C3H7COOH":{"x":[127.4,69.8,"<path d='M89.1 28.7L105.9 19M63.1 19L80 28.7M37.1 28.7L54 19M11.8 16.4L29.8 26.9M9.3 20.9L27.3 31.3M32.5 36.6L32.5 56.1'/><text transform='translate(107 16.4)' y='.36em'>CH₃</text><text transform='translate(81 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[113.5,61,"<path d='M84.5 22.6L110.5 7.6M58.5 7.6L84.5 22.6M32.5 22.6L58.5 7.6M11.8 7.7L33.8 20.4M9.3 12.1L31.3 24.8M32.5 22.6L32.5 47.4'/><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 52.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"CH2ClCOOH":{"x":[98.5,69.8,"<path d='M63.8 28.8L80.7 19M56.7 36L56.7 56.8M61.8 36L61.8 56.8M37.8 19L54.7 28.8M14 27.5L28.7 19'/><text transform='translate(81.5 16.4)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(62.8 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(55.6 61.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(29.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(11.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"s":[98.5,61,"<path d='M59.3 22.6L80.7 10.2M56.7 22.6L56.7 48M61.8 22.6L61.8 48M33.3 7.6L59.3 22.6M14 18.8L33.3 7.6'/><text transform='translate(81.5 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(55.6 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(11.8 22.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"H2C2O4":{"x":[97.8,91,"<path d='M65.3 12.9L65.3 32.4M68 42.1L86 52.5M70.5 37.7L88.6 48.1M43.8 50L60.7 40.2M36.7 57.2L36.7 78M41.8 57.2L41.8 78M17.9 40.2L34.7 50'/><text transform='translate(69 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(61.8 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(87.5 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(42.8 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(35.6 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[97.8,91,"<path d='M65.3 12.9L65.3 37.6M64 39.8L86 52.5M66.6 35.4L88.6 48.1M39.3 52.6L65.3 37.6M36.7 52.6L36.7 78M41.8 52.6L41.8 78M17.9 40.2L39.3 52.6'/><text transform='translate(69 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(87.5 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(35.6 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"CH2CHCOOH":{"x":[101.4,69,"<path d='M58.6 46.7L79.4 34.7M63.1 50L80 40.2M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81 37.6)' y='.36em'>CH₂</text><text transform='translate(55 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[87.5,61,"<path d='M58.6 46.7L79.4 34.7M58.5 52.6L84.5 37.6M32.5 37.6L58.5 52.6M9.3 48.1L31.3 35.4M11.8 52.5L33.8 39.8M32.5 37.6L32.5 12.9'/><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"CH2BrCHBrCOOH":{"x":[118,91,"<path d='M89.1 50L103.8 41.5M63.1 40.2L80 50M58.5 32.4L58.5 15.3M37.1 50L50.7 42.1M11.9 37.8L29.7 48.1M9.4 42.1L27.2 52.4M32.5 57.9L32.5 77.4'/><text transform='translate(105.6 37.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(81 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(62 37.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(53.7 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(36 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[118,91,"<path d='M84.5 52.6L103.8 41.5M58.5 37.6L84.5 52.6M58.5 37.6L58.5 15.3M32.5 52.6L58.5 37.6M11.8 37.7L33.8 50.4M9.3 42.1L31.3 54.8M32.5 52.6L32.5 77.4'/><text transform='translate(105.6 37.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(53.7 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(10.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"CH3CH(OH)COOH":{"x":[104.5,91,"<path d='M65.3 12.9L65.3 32.4M69.8 40.2L86.7 50M43.8 50L60.7 40.2M36.7 57.2L36.7 78M41.8 57.2L41.8 78M17.9 40.2L34.7 50'/><text transform='translate(68.8 7.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(61.8 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(87.5 52.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(42.8 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(35.6 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[104.5,86.4,"<path d='M65.3 3L65.3 33M65.3 33L86.7 45.3M39.3 48L65.3 33M36.7 48L36.7 73.4M41.8 48L41.8 73.4M17.9 35.6L39.3 48'/><text transform='translate(87.5 48)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.6 78)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 33)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C6H5COOH":{"x":[121.3,68,"<path d='M95.6 29.1L105.4 12.2M93.1 38.9L103.5 56.9M97.5 36.3L107.9 54.4M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(89.5 33.6)' y='.36em'>C</text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[121.3,68,"<path d='M93 33.6L105.4 12.2M90.8 34.9L103.5 56.9M95.2 32.3L107.9 54.4M63 33.6L93 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text>"]},"C17H35COOH":{"x":[491.2,69.8,"<path d='M452.8 28.8L469.7 19.1M426.8 19.1L443.7 28.8M400.8 28.8L417.7 19.1M374.8 19.1L391.7 28.8M348.9 28.8L365.7 19.1M322.9 19.1L339.8 28.8M296.9 28.8L313.8 19.1M270.9 19.1L287.8 28.8M244.9 28.8L261.8 19.1M219 19.1L235.8 28.8M193 28.8L209.9 19.1M167 19.1L183.9 28.8M141 28.8L157.9 19.1M115 19.1L131.9 28.8M89.1 28.8L105.9 19.1M63.1 19.1L80 28.8M37.1 28.8L54 19.1M11.8 16.5L29.8 26.9M9.3 20.9L27.3 31.3M32.5 36.7L32.5 56.2'/><text transform='translate(470.7 16.4)' y='.36em'>CH₃</text><text transform='translate(444.7 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(418.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(392.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(366.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(340.8 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(314.8 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(288.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(262.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(236.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(210.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(184.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(159 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(133 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(107 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(81 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[477.3,61,"<path d='M448.2 22.7L474.2 7.7M422.3 7.7L448.2 22.7M396.3 22.7L422.3 7.7M370.3 7.7L396.3 22.7M344.3 22.7L370.3 7.7M318.3 7.7L344.3 22.7M292.4 22.7L318.3 7.7M266.4 7.7L292.4 22.7M240.4 22.7L266.4 7.7M214.4 7.7L240.4 22.7M188.4 22.7L214.4 7.7M162.5 7.7L188.4 22.7M136.5 22.7L162.5 7.7M110.5 7.7L136.5 22.7M84.5 22.7L110.5 7.7M58.5 7.7L84.5 22.7M32.5 22.7L58.5 7.7M11.8 7.8L33.8 20.5M9.3 12.2L31.3 24.9M32.5 22.7L32.5 47.4'/><text transform='translate(10.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 52.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"C17H33COOH":{"x":[387.2,241,"<path d='M348.9 220.3L365.7 230M344.3 192.9L344.3 212.4M322.9 175.3L339.8 185M318.3 147.9L318.3 167.4M296.9 130.3L313.8 140M292.4 102.9L292.4 122.4M270.9 85.3L287.8 95M266.4 57.9L266.4 77.4M240.4 43.6L261.2 55.6M244.9 40.3L261.8 50M219 50L235.8 40.3M193 40.3L209.9 50M167 50L183.9 40.3M141 40.3L157.9 50M115 50L131.9 40.3M89.1 40.3L105.9 50M63.1 50L80 40.3M37.1 40.3L54 50M9.3 48.2L27.3 37.7M11.8 52.6L29.8 42.2M32.5 12.9L32.5 32.4'/><text transform='translate(366.8 232.7)' y='.36em'>CH₃</text><text transform='translate(347.8 217.7)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(340.8 187.7)' y='.36em'>CH₂</text><text transform='translate(321.8 172.7)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(314.8 142.7)' y='.36em'>CH₂</text><text transform='translate(295.9 127.7)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(288.9 97.7)' y='.36em'>CH₂</text><text transform='translate(269.9 82.7)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(262.9 52.7)' y='.36em'>CH</text><text transform='translate(236.9 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(210.9 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(184.9 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(158.9 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(133 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(107 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(81 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(55 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(36.3 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[373.3,235.6,"<path d='M344.3 217.7L370.3 232.7M344.3 187.7L344.3 217.7M318.3 172.7L344.3 187.7M318.3 142.7L318.3 172.7M292.4 127.7L318.3 142.7M292.4 97.7L292.4 127.7M266.4 82.7L292.4 97.7M266.4 52.7L266.4 82.7M240.4 43.6L261.2 55.6M240.4 37.7L266.4 52.7M214.4 52.7L240.4 37.7M188.4 37.7L214.4 52.7M162.4 52.7L188.4 37.7M136.5 37.7L162.4 52.7M110.5 52.7L136.5 37.7M84.5 37.7L110.5 52.7M58.5 52.7L84.5 37.7M32.5 37.7L58.5 52.7M9.3 48.2L31.3 35.4M11.8 52.6L33.8 39.9M32.5 12.9L32.5 37.7'/><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(36.3 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"n":"Двойная связь в середине цепи, цис-расположение.","ne":"The double bond is in the middle of the chain, in the cis arrangement."},"HCOONa":{"x":[95.5,39.4,"<path d='M63 17.1L83.8 5.1M67.5 20.4L84.4 10.6M41.6 10.6L58.5 20.4'/><text transform='translate(85.3 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(59.5 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[95.5,31.4,"<path d='M63 17.1L83.8 5.1M63 23L84.4 10.6M41.6 10.6L63 23'/><text transform='translate(85.3 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"CH3COONa":{"x":[105.9,61.4,"<path d='M67.5 20.4L84.4 10.6M60.4 27.6L60.4 48.4M65.5 27.6L65.5 48.4M41.6 10.6L58.5 20.4'/><text transform='translate(85.5 8)' y='.36em'>CH₃</text><text transform='translate(66.5 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[91.9,61.4,"<path d='M63 23L89 8M60.4 23L60.4 48.4M65.5 23L65.5 48.4M41.6 10.6L63 23'/><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"CH3COOK":{"x":[103,61.4,"<path d='M64.6 20.4L81.5 10.6M57.5 27.6L57.5 48.4M62.6 27.6L62.6 48.4M38.7 10.6L55.5 20.4'/><text transform='translate(82.6 8)' y='.36em'>CH₃</text><text transform='translate(63.6 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(56.4 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 23)' text-anchor='end' y='.36em'>K⁺</text>"],"s":[89,61.4,"<path d='M60.1 23L86.1 8M57.5 23L57.5 48.4M62.6 23L62.6 48.4M38.7 10.6L60.1 23'/><text transform='translate(56.4 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 23)' text-anchor='end' y='.36em'>K⁺</text>"]},"CH3COONH4":{"x":[113.9,61.4,"<path d='M75.5 20.4L92.4 10.6M68.4 27.6L68.4 48.4M73.5 27.6L73.5 48.4M49.5 10.6L66.4 20.4'/><text transform='translate(93.4 8)' y='.36em'>CH₃</text><text transform='translate(74.5 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(67.2 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(41.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(24.3 23)' text-anchor='end' y='.36em'>H₄<tspan class='n'>N⁺</tspan></text>"],"s":[99.9,61.4,"<path d='M71 23L96.9 8M68.4 23L68.4 48.4M73.5 23L73.5 48.4M49.5 10.6L71 23'/><text transform='translate(67.2 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(41.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(24.3 23)' text-anchor='end' y='.36em'>H₄<tspan class='n'>N⁺</tspan></text>"]},"(CH3COO)2Ca":{"x":[179.4,69.8,"<path d='M141 28.8L157.9 19.1M133.9 36L133.9 56.9M139 36L139 56.9M115 19.1L131.9 28.8M37.1 28.8L54 19.1M11.8 16.5L29.8 26.9M9.3 20.9L27.3 31.4M32.5 36.7L32.5 56.2'/><text transform='translate(159 16.4)' y='.36em'>CH₃</text><text transform='translate(140 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(132.8 61.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 16.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.3 31.4)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[165.5,61.4,"<path d='M136.5 23L162.5 8M133.9 23L133.9 48.5M139 23L139 48.5M115 10.7L136.5 23M32.5 23L58.5 8M11.8 8.1L33.8 20.8M9.3 12.5L31.3 25.3M32.5 23L32.5 47.8'/><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.3 23)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"(CH3COO)2Mg":{"x":[179.4,69.8,"<path d='M141 28.8L157.9 19.1M133.9 36L133.9 56.9M139 36L139 56.9M115 19.1L131.9 28.8M37.1 28.8L54 19.1M11.8 16.5L29.8 26.9M9.3 20.9L27.3 31.4M32.5 36.7L32.5 56.2'/><text transform='translate(159 16.4)' y='.36em'>CH₃</text><text transform='translate(140 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(132.8 61.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 16.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78 31.4)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[165.5,61.4,"<path d='M136.5 23L162.5 8M133.9 23L133.9 48.5M139 23L139 48.5M115 10.7L136.5 23M32.5 23L58.5 8M11.8 8.1L33.8 20.8M9.3 12.5L31.3 25.3M32.5 23L32.5 47.8'/><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78 23)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"(CH3COO)2Zn":{"x":[179.4,69.8,"<path d='M141 28.8L157.9 19.1M133.9 36L133.9 56.9M139 36L139 56.9M115 19.1L131.9 28.8M37.1 28.8L54 19.1M11.8 16.5L29.8 26.9M9.3 20.9L27.3 31.4M32.5 36.7L32.5 56.2'/><text transform='translate(159 16.4)' y='.36em'>CH₃</text><text transform='translate(140 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(132.8 61.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 16.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(79.3 31.4)' dominant-baseline='central'><tspan x='0' y='0'>Zn²⁺</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[165.5,61.4,"<path d='M136.5 23L162.5 8M133.9 23L133.9 48.5M139 23L139 48.5M115 10.7L136.5 23M32.5 23L58.5 8M11.8 8.1L33.8 20.8M9.3 12.5L31.3 25.3M32.5 23L32.5 47.8'/><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(79.3 23)' dominant-baseline='central'><tspan x='0' y='0'>Zn²⁺</tspan></text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"(CH3COO)2Cu":{"x":[179.4,69.8,"<path d='M141 28.8L157.9 19.1M133.9 36L133.9 56.9M139 36L139 56.9M115 19.1L131.9 28.8M37.1 28.8L54 19.1M11.8 16.5L29.8 26.9M9.3 20.9L27.3 31.4M32.5 36.7L32.5 56.2'/><text transform='translate(159 16.4)' y='.36em'>CH₃</text><text transform='translate(140 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(132.8 61.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 16.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.5 31.4)' dominant-baseline='central'><tspan x='0' y='0'>Cu²⁺</tspan></text><text transform='translate(55 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(36 31.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 16.4)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 61.4)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[165.5,61.4,"<path d='M136.5 23L162.5 8M133.9 23L133.9 48.5M139 23L139 48.5M115 10.7L136.5 23M32.5 23L58.5 8M11.8 8.1L33.8 20.8M9.3 12.5L31.3 25.3M32.5 23L32.5 47.8'/><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.5 23)' dominant-baseline='central'><tspan x='0' y='0'>Cu²⁺</tspan></text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C2H5COONa":{"x":[131.9,69,"<path d='M93.5 50L110.4 40.2M67.5 40.2L84.4 50M65.5 33L65.5 12.2M60.4 33L60.4 12.2M45 48L58.5 40.2'/><text transform='translate(111.5 37.6)' y='.36em'>CH₃</text><text transform='translate(85.5 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(66.5 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[117.9,60.6,"<path d='M89 52.6L115 37.6M63 37.6L89 52.6M65.5 37.6L65.5 12.2M60.4 37.6L60.4 12.2M45 48L63 37.6'/><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"]},"Na2C2O4":{"x":[153.7,91,"<path d='M93.5 40.2L110.4 50M91.5 33L91.5 12.2M86.4 33L86.4 12.2M67.5 50L84.4 40.2M60.4 57.2L60.4 78M65.5 57.2L65.5 78M41.6 40.2L58.5 50'/><text transform='translate(134.7 37.6)' y='.36em'>Na⁺</text><text transform='translate(111.2 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(92.5 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(85.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(66.5 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 37.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 52.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[153.7,91,"<path d='M89 37.6L110.4 50M91.5 37.6L91.5 12.2M86.4 37.6L86.4 12.2M63 52.6L89 37.6M60.4 52.6L60.4 78M65.5 52.6L65.5 78M41.6 40.2L63 52.6'/><text transform='translate(134.7 37.6)' y='.36em'>Na⁺</text><text transform='translate(111.2 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(85.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(59.3 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 37.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 52.6)' text-anchor='end' y='.36em'>Na⁺</text>"]},"K2C2O4":{"x":[148,91,"<path d='M90.6 40.2L107.5 50M88.6 33L88.6 12.2M83.5 33L83.5 12.2M64.6 50L81.5 40.2M57.5 57.2L57.5 78M62.6 57.2L62.6 78M38.7 40.2L55.5 50'/><text transform='translate(134.8 37.6)' y='.36em'>K⁺</text><text transform='translate(108.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(89.6 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(82.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(63.6 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(56.4 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 37.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 52.6)' text-anchor='end' y='.36em'>K⁺</text>"],"s":[148,91,"<path d='M86.1 37.6L107.5 50M88.6 37.6L88.6 12.2M83.5 37.6L83.5 12.2M60.1 52.6L86.1 37.6M57.5 52.6L57.5 78M62.6 52.6L62.6 78M38.7 40.2L60.1 52.6'/><text transform='translate(134.8 37.6)' y='.36em'>K⁺</text><text transform='translate(108.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(82.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(56.4 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 37.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 52.6)' text-anchor='end' y='.36em'>K⁺</text>"]},"C6H5COONa":{"x":[118.6,93.9,"<path d='M95.6 29.1L105.4 12.2M93.1 38.9L103.5 56.9M97.5 36.3L107.9 54.4M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(89.5 33.6)' y='.36em'>C</text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(56.8 85.6)' y='.36em'>Na⁺</text>"],"s":[118.6,93.9,"<path d='M93 33.6L105.4 12.2M90.8 34.9L103.5 56.9M95.2 32.3L107.9 54.4M63 33.6L93 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(56.8 85.6)' y='.36em'>Na⁺</text>"]},"C6H5COOK":{"x":[118.6,93.9,"<path d='M95.6 29.1L105.4 12.2M93.1 38.9L103.5 56.9M97.5 36.3L107.9 54.4M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(89.5 33.6)' y='.36em'>C</text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(59.7 85.6)' y='.36em'>K⁺</text>"],"s":[118.6,93.9,"<path d='M93 33.6L105.4 12.2M90.8 34.9L103.5 56.9M95.2 32.3L107.9 54.4M63 33.6L93 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(59.7 85.6)' y='.36em'>K⁺</text>"]},"C17H35COONa":{"x":[114.1,61.4,"<path d='M67.5 20.4L82 12M60.4 27.6L60.4 48.4M65.5 27.6L65.5 48.4M41.6 10.6L58.5 20.4'/><text transform='translate(83.5 8)' y='.36em'>C₁₇H₃₅</text><text transform='translate(66.5 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[114.1,61.4,"<path d='M63 23L82 12M60.4 23L60.4 48.4M65.5 23L65.5 48.4M41.6 10.6L63 23'/><text transform='translate(83.5 8)' y='.36em'>C₁₇H₃₅</text><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"C17H33COONa":{"x":[114.1,61.4,"<path d='M67.5 20.4L82 12M60.4 27.6L60.4 48.4M65.5 27.6L65.5 48.4M41.6 10.6L58.5 20.4'/><text transform='translate(83.5 8)' y='.36em'>C₁₇H₃₃</text><text transform='translate(66.5 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[114.1,61.4,"<path d='M63 23L82 12M60.4 23L60.4 48.4M65.5 23L65.5 48.4M41.6 10.6L63 23'/><text transform='translate(83.5 8)' y='.36em'>C₁₇H₃₃</text><text transform='translate(59.3 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"]},"(C17H35COO)2Ca":{"x":[187.6,61.4,"<path d='M141 20.4L155.4 12.1M133.9 27.6L133.9 48.5M139 27.6L139 48.5M115 10.7L131.9 20.4M37.1 20.4L51.5 12.1M11.8 8.1L29.8 18.5M9.3 12.5L27.3 23M32.5 28.3L32.5 47.8'/><text transform='translate(156.9 8)' y='.36em'>C₁₇H₃₅</text><text transform='translate(140 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.3 23)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(53 8)' dominant-baseline='central'>C₁₇H₃₅</text><text transform='translate(36 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[187.6,61.4,"<path d='M136.5 23L155.4 12.1M133.9 23L133.9 48.5M139 23L139 48.5M115 10.7L136.5 23M32.5 23L51.5 12.1M11.8 8.1L33.8 20.8M9.3 12.5L31.3 25.3M32.5 23L32.5 47.8'/><text transform='translate(156.9 8)' y='.36em'>C₁₇H₃₅</text><text transform='translate(132.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(106.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(78.3 23)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(53 8)' dominant-baseline='central'>C₁₇H₃₅</text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"HCOOCH3":{"x":[101.2,39.4,"<path d='M68.8 17.1L89.6 5.1M73.3 20.4L90.2 10.6M47.3 10.6L64.2 20.4M21.3 20.4L38.2 10.6'/><text transform='translate(91 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(65.2 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(39 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(20.3 23)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[87.5,26,"<path d='M55 17.1L75.8 5.1M55 23L76.4 10.6M33.5 10.6L55 23M3 23L24.4 10.6'/><text transform='translate(77.2 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(25.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"HCOOC2H5":{"x":[127.2,39.4,"<path d='M94.8 17L115.6 5M99.3 20.3L116.2 10.6M73.3 10.6L90.2 20.3M47.3 20.3L64.2 10.6M21.3 10.6L38.2 20.3'/><text transform='translate(117 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(91.2 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(65 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(39.3 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.3 8)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[113.5,26,"<path d='M81 17L101.8 5M80.9 23L102.4 10.6M59.5 10.6L80.9 23M29 23L50.4 10.6M3 8L29 23'/><text transform='translate(103.2 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(51.2 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"CH3COOCH3":{"x":[111.7,61.4,"<path d='M73.3 20.4L90.2 10.6M66.2 27.6L66.2 48.4M71.3 27.6L71.3 48.4M47.3 10.6L64.2 20.4M21.3 20.4L38.2 10.6'/><text transform='translate(91.2 8)' y='.36em'>CH₃</text><text transform='translate(72.2 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(65 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(39 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(20.3 23)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[83.9,61.4,"<path d='M55 23L80.9 8M52.4 23L52.4 48.4M57.5 23L57.5 48.4M33.5 10.6L55 23M3 23L24.4 10.6'/><text transform='translate(51.2 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(25.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"CH3COOC2H5":{"x":[137.7,61.4,"<path d='M99.3 20.3L116.2 10.6M92.2 27.6L92.2 48.4M97.3 27.6L97.3 48.4M73.3 10.6L90.2 20.3M47.3 20.3L64.2 10.6M21.3 10.6L38.2 20.3'/><text transform='translate(117.2 8)' y='.36em'>CH₃</text><text transform='translate(98.2 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(91 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(65 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(39.3 23)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.3 8)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[109.9,61.4,"<path d='M80.9 23L106.9 8M78.4 23L78.4 48.4M83.5 23L83.5 48.4M59.5 10.6L80.9 23M29 23L50.4 10.6M3 8L29 23'/><text transform='translate(77.2 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(51.2 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"(C17H35COO)3C3H5":{"x":[239.5,136,"<path d='M193 95L207.4 86.7M185.9 102.3L185.9 123.1M191 102.3L191 123.1M167 85.3L183.9 95M141 95L157.9 85.3M115 85.3L131.9 95M110.5 77.4L110.5 57.9M89.1 95L102.5 87.2M89.1 40.3L105.9 50M63.1 85.3L80 95M87.1 33.1L87.1 12.3M82 33.1L82 12.3M65.8 48.5L80 40.3M37.1 95L54 85.3M11.9 82.8L29.7 93.2M9.4 87.2L27.2 97.5M32.5 102.9L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₅</text><text transform='translate(191.9 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(133 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(114 82.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(88 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₅</text><text transform='translate(81 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(36 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₅</text>"],"s":[239.5,136,"<path d='M188.4 97.7L207.4 86.7M185.9 97.7L185.9 123.1M191 97.7L191 123.1M167 85.3L188.4 97.7M136.5 97.7L157.9 85.3M110.5 82.7L136.5 97.7M110.5 82.7L110.5 57.9M84.5 97.7L110.5 82.7M84.5 37.7L105.9 50M63.1 85.3L84.5 97.7M87.1 37.7L87.1 12.3M82 37.7L82 12.3M65.8 48.5L84.5 37.7M32.5 97.7L54 85.3M11.8 82.7L33.8 95.5M9.3 87.2L31.3 99.9M32.5 97.7L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₅</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₅</text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₅</text>"]},"(C17H33COO)3C3H5":{"x":[239.5,136,"<path d='M193 95L207.4 86.7M185.9 102.3L185.9 123.1M191 102.3L191 123.1M167 85.3L183.9 95M141 95L157.9 85.3M115 85.3L131.9 95M110.5 77.4L110.5 57.9M89.1 95L102.5 87.2M89.1 40.3L105.9 50M63.1 85.3L80 95M87.1 33.1L87.1 12.3M82 33.1L82 12.3M65.7 48.5L80 40.3M37.1 95L54 85.3M11.9 82.8L29.7 93.2M9.4 87.2L27.2 97.5M32.5 102.9L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₃</text><text transform='translate(191.9 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(133 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(114 82.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(88 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₃</text><text transform='translate(81 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(36 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₃</text>"],"s":[239.5,136,"<path d='M188.4 97.7L207.4 86.7M185.9 97.7L185.9 123.1M191 97.7L191 123.1M167 85.3L188.4 97.7M136.5 97.7L157.9 85.3M110.5 82.7L136.5 97.7M110.5 82.7L110.5 57.9M84.5 97.7L110.5 82.7M84.5 37.7L105.9 50M63.1 85.3L84.5 97.7M87.1 37.7L87.1 12.3M82 37.7L82 12.3M65.7 48.5L84.5 37.7M32.5 97.7L54 85.3M11.8 82.7L33.8 95.5M9.3 87.2L31.3 99.9M32.5 97.7L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₃</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₃</text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₃</text>"]},"(C17H33Br2COO)3C3H5":{"x":[252.6,136,"<path d='M193 95L207.4 86.7M185.9 102.3L185.9 123.1M191 102.3L191 123.1M167 85.3L183.9 95M141 95L157.9 85.3M115 85.3L131.9 95M110.5 77.4L110.5 57.9M89.1 95L102.5 87.2M89.1 40.3L105.9 50M63.1 85.3L80 95M87.1 33.1L87.1 12.3M82 33.1L82 12.3M65.9 48.4L80 40.3M37.1 95L54 85.3M11.9 82.8L29.7 93.2M9.4 87.2L27.2 97.5M32.5 102.9L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₃Br₂</text><text transform='translate(191.9 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(133 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(114 82.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(88 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₃Br₂</text><text transform='translate(81 97.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(36 97.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₃Br₂</text>"],"s":[252.6,136,"<path d='M188.4 97.7L207.4 86.7M185.9 97.7L185.9 123.1M191 97.7L191 123.1M167 85.3L188.4 97.7M136.5 97.7L157.9 85.3M110.5 82.7L136.5 97.7M110.5 82.7L110.5 57.9M84.5 97.7L110.5 82.7M84.5 37.7L105.9 50M63.1 85.3L84.5 97.7M87.1 37.7L87.1 12.3M82 37.7L82 12.3M65.9 48.4L84.5 37.7M32.5 97.7L54 85.3M11.8 82.7L33.8 95.5M9.3 87.2L31.3 99.9M32.5 97.7L32.5 120'/><text transform='translate(208.9 82.7)' y='.36em'>C₁₇H₃₃Br₂</text><text transform='translate(184.7 127.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(106.8 52.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(64 52.7)' text-anchor='end' y='.36em'>C₁₇H₃₃Br₂</text><text transform='translate(54.8 82.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(10.3 82.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27 127.7)' y='.36em'>C₁₇H₃₃Br₂</text>"]},"C6H12O6":{"x":[201.7,91,"<path d='M167 50.1L183.9 40.3M141 40.3L157.9 50.1M136.5 32.4L136.5 12.9M115 50.1L128.6 42.2M110.5 57.9L110.5 77.4M89.1 40.3L102.6 48.2M84.5 32.4L84.5 12.9M63.1 50.1L76.7 42.2M58.5 57.9L58.5 77.4M37.1 40.3L50.7 48.2M11.7 55.6L32.5 43.6M11.1 50.1L28 40.3'/><text transform='translate(184.7 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(159 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(140 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(132.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(114 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(88 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(62 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(54.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(29 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[201.7,91,"<path d='M162.5 52.7L183.9 40.3M136.5 37.7L162.5 52.7M136.5 37.7L136.5 12.9M110.5 52.7L136.5 37.7M110.5 52.7L110.5 77.4M84.5 37.7L110.5 52.7M84.5 37.7L84.5 12.9M58.5 52.7L84.5 37.7M58.5 52.7L58.5 77.4M32.5 37.7L58.5 52.7M11.7 55.6L32.5 43.6M11.1 50.1L32.5 37.7'/><text transform='translate(184.7 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(132.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(54.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Открытая (линейная) форма молекулы.","ne":"The open-chain (linear) form of the molecule."},"C6H12O7":{"x":[201.7,91,"<path d='M167 50.1L183.9 40.3M141 40.3L157.9 50.1M136.5 32.4L136.5 12.9M115 50.1L128.6 42.2M110.5 57.9L110.5 77.4M89.1 40.3L102.6 48.2M84.5 32.4L84.5 12.9M63.1 50.1L76.7 42.2M58.5 57.9L58.5 77.4M37.1 40.3L50.7 48.2M9.4 48.2L27.2 37.9M11.9 52.5L29.7 42.2M32.5 32.4L32.5 12.9'/><text transform='translate(184.7 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(159 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(140 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(132.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(114 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(88 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(62 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(54.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(36 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[201.7,91,"<path d='M162.5 52.7L183.9 40.3M136.5 37.7L162.5 52.7M136.5 37.7L136.5 12.9M110.5 52.7L136.5 37.7M110.5 52.7L110.5 77.4M84.5 37.7L110.5 52.7M84.5 37.7L84.5 12.9M58.5 52.7L84.5 37.7M58.5 52.7L58.5 77.4M32.5 37.7L58.5 52.7M9.3 48.2L31.3 35.5M11.8 52.6L33.8 39.9M32.5 37.7L32.5 12.9'/><text transform='translate(184.7 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(132.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(80.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(54.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"C5H11O5COONH4":{"x":[240.1,91,"<path d='M205.4 50L222.3 40.3M179.4 40.3L196.3 50M174.9 32.4L174.9 12.9M153.4 50L166.9 42.2M148.9 57.9L148.9 77.4M127.5 40.3L141.2 48.2M122.9 32.4L122.9 12.9M101.5 50L115 42.2M96.9 57.9L96.9 77.4M75.5 40.3L89.2 48.2M73.5 33.1L73.5 12.3M68.4 33.1L68.4 12.3M53 48L66.4 40.3'/><text transform='translate(223.1 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(197.4 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(178.4 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(171.2 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(152.4 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(145.2 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(126.4 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(119.2 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(100.4 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(93.2 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(74.5 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(67.2 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(41.3 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(24.3 37.7)' text-anchor='end' y='.36em'>H₄<tspan class='n'>N⁺</tspan></text>"],"s":[240.1,91,"<path d='M200.9 52.7L222.3 40.3M174.9 37.7L200.9 52.7M174.9 37.7L174.9 12.9M148.9 52.7L174.9 37.7M148.9 52.7L148.9 77.4M122.9 37.7L148.9 52.7M122.9 37.7L122.9 12.9M96.9 52.7L122.9 37.7M96.9 52.7L96.9 77.4M71 37.7L96.9 52.7M73.5 37.7L73.5 12.3M68.4 37.7L68.4 12.3M53 48L71 37.7'/><text transform='translate(223.1 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(171.2 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(145.2 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(119.2 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(93.2 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(67.2 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(41.3 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(24.3 37.7)' text-anchor='end' y='.36em'>H₄<tspan class='n'>N⁺</tspan></text>"]},"C6H14O6":{"x":[208.4,91,"<path d='M173.7 50.1L190.6 40.3M147.8 40.3L164.7 50.1M143.2 32.4L143.2 12.9M121.8 50.1L135.4 42.2M117.2 57.9L117.2 77.4M95.8 40.3L109.4 48.2M91.3 32.4L91.3 12.9M69.8 50.1L83.4 42.2M65.3 57.9L65.3 77.4M43.8 40.3L57.4 48.2M17.9 50.1L34.7 40.3'/><text transform='translate(191.5 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(165.7 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(146.7 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(139.5 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(120.7 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(113.5 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(94.8 37.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(87.5 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(68.8 52.7)' text-anchor='end' y='.36em'>HC</text><text transform='translate(61.6 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.8 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(17 52.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[208.4,91,"<path d='M169.2 52.7L190.6 40.3M143.2 37.7L169.2 52.7M143.2 37.7L143.2 12.9M117.2 52.7L143.2 37.7M117.2 52.7L117.2 77.4M91.3 37.7L117.2 52.7M91.3 37.7L91.3 12.9M65.3 52.7L91.3 37.7M65.3 52.7L65.3 77.4M39.3 37.7L65.3 52.7M17.9 50.1L39.3 37.7'/><text transform='translate(191.5 37.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(139.5 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(113.5 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(87.5 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(61.6 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(17 52.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"C12H22O11":{"x":[258.9,147.8,"<path d='M29.2 128.3L48.3 124.3M55 118.2L62.7 94.7M62.7 94.7L86.9 89.5M42.6 72.4L62.7 94.7M93.6 83.4L101.3 59.9M42.6 72.4L51.9 43.8M18.4 77.5L42.6 72.4M101.3 59.9L117.9 78.3M81.2 37.6L101.3 59.9M51.9 43.8L81.2 37.6M35.3 25.4L51.9 43.8M126.5 81.1L150.7 76M80.4 12.9L81.2 37.6M143.1 52.4L150.7 76M150.7 76L173.3 65.9M150.7 76L153.8 105.8M145 43.5L158 29M181.6 67.7L198.2 86M153.8 105.8L183.2 112M135.5 122.4L153.8 105.8M198.2 86L222.8 83.5M183.2 112L198.2 86M183.2 112L193.3 134.6M231.1 87.2L242.6 102.9'/><text transform='translate(27.8 129.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(49.9 123.2)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(88.3 88.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(117.6 82.2)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(144.9 47.4)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(157.8 25.1)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(174.4 63.8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(224.5 82.9)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(241.9 107.2)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(191.7 139.4)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(135.3 125.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(83.9 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(35.5 21.5)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(17 78.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[258.9,147.8,"<path d='M29.2 128.3L53.4 123.2M53.4 123.2L62.7 94.7M62.7 94.7L86.9 89.5M42.6 72.4L62.7 94.7M93.6 83.4L101.3 59.9M42.6 72.4L51.9 43.8M18.4 77.5L42.6 72.4M101.3 59.9L117.9 78.3M81.2 37.6L101.3 59.9M51.9 43.8L81.2 37.6M35.3 25.4L51.9 43.8M126.5 81.1L150.7 76M80.4 12.9L81.2 37.6M141.4 47.4L150.7 76M150.7 76L173.3 65.9M150.7 76L153.8 105.8M141.4 47.4L158 29M181.6 67.7L198.2 86M153.8 105.8L183.2 112M135.5 122.4L153.8 105.8M198.2 86L228 82.9M183.2 112L198.2 86M183.2 112L193.3 134.6M228 82.9L242.6 102.9'/><text transform='translate(27.8 129.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(88.3 88.4)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(117.6 82.2)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(157.8 25.1)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(174.4 63.8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(241.9 107.2)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(191.7 139.4)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(135.3 125.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(83.9 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(35.5 21.5)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(17 78.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"n":"Остатки глюкозы (шестичленный цикл) и фруктозы (пятичленный цикл); пространственное строение не показано.","ne":"A glucose unit (six-membered ring) and a fructose unit (five-membered ring); the 3D arrangement is not shown."},"(C6H10O5)n":{"x":[135.9,172,"<path d='M106.9 106L132.9 121M106.9 81.2L106.9 106M80.9 121L106.9 106M80.9 61L102.4 73.4M55 106L80.9 121M80.9 121L80.9 145.7M80.9 36.2L80.9 61M55 76L80.9 61M55 76L55 106M33.5 118.4L55 106M85.5 28.4L102.4 18.6M33.5 63.6L55 76M3 76L24.4 63.6'/><path class='br' d='M115.9 3H119.9V166H115.9M20 3H16V166H20'/><text transform='translate(103.2 76)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(84.4 31)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(103.2 16)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(25.3 61)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(32.7 121)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(77.2 151)' y='.36em'><tspan class='o'>O</tspan>H</text><text class='nidx' x='121.9' y='167'>n</text>"],"s":[135.9,172,"<path d='M106.9 106L132.9 121M106.9 81.2L106.9 106M80.9 121L106.9 106M80.9 61L102.4 73.4M55 106L80.9 121M80.9 121L80.9 145.7M80.9 31L80.9 61M55 76L80.9 61M55 76L55 106M33.5 118.4L55 106M80.9 31L102.4 18.6M33.5 63.6L55 76M3 76L24.4 63.6'/><path class='br' d='M115.9 3H119.9V166H115.9M20 3H16V166H20'/><text transform='translate(103.2 76)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(103.2 16)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(25.3 61)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(32.7 121)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(77.2 151)' y='.36em'><tspan class='o'>O</tspan>H</text><text class='nidx' x='121.9' y='167'>n</text>"],"n":"Звено цепи — остаток глюкозы; пространственное строение (α или β) не показано.","ne":"The repeating unit is a glucose residue; the 3D arrangement (α or β) is not shown."},"(C6H7O2(ONO2)3)n":{"x":[142.3,172,"<path d='M109.8 106L139.1 122.9M109.8 81.2L109.8 106M83.8 121L109.8 106M83.8 61L105.3 73.4M57.9 106L83.8 121M83.8 121L83.8 143.3M83.8 36.2L83.8 61M57.9 76L83.8 61M57.9 76L57.9 106M38.9 116.9L57.9 106M88.4 28.4L102.8 20.1M36.4 63.6L57.9 76M3 77.7L27.3 63.6'/><path class='br' d='M128.1 3H132.1V166H128.1M14 3H10V166H14'/><text transform='translate(106.1 76)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(87.3 31)' text-anchor='end' y='.36em'>H₂C</text><text transform='translate(104.3 16)' y='.36em'><tspan class='o'>ONO₂</tspan></text><text transform='translate(28.2 61)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(37.4 121)' text-anchor='end' y='.36em'><tspan class='o'>O₂NO</tspan></text><text transform='translate(78.3 151)' y='.36em'><tspan class='o'>ONO₂</tspan></text><text class='nidx' x='134.1' y='167'>n</text>"],"s":[142.3,172,"<path d='M109.8 106L139.1 122.9M109.8 81.2L109.8 106M83.8 121L109.8 106M83.8 61L105.3 73.4M57.9 106L83.8 121M83.8 121L83.8 143.3M83.8 31L83.8 61M57.9 76L83.8 61M57.9 76L57.9 106M38.9 116.9L57.9 106M83.8 31L102.8 20.1M36.4 63.6L57.9 76M3 77.7L27.3 63.6'/><path class='br' d='M128.1 3H132.1V166H128.1M14 3H10V166H14'/><text transform='translate(106.1 76)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(104.3 16)' y='.36em'><tspan class='o'>ONO₂</tspan></text><text transform='translate(28.2 61)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(37.4 121)' text-anchor='end' y='.36em'><tspan class='o'>O₂NO</tspan></text><text transform='translate(78.3 151)' y='.36em'><tspan class='o'>ONO₂</tspan></text><text class='nidx' x='134.1' y='167'>n</text>"],"n":"Группы –OH остатков глюкозы заменены на группы –ONO₂ (остатки азотной кислоты).","ne":"The –OH groups of the glucose units are replaced by –ONO₂ groups (nitric acid residues)."},"HCN":{"x":[45.4,31,"<path d='M11.6 6.7L30.7 17.7M8.2 12.6L27.3 23.6M11 10.3L27.9 20'/><text transform='translate(28.9 22.6)' y='.36em'>CH</text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"]},"CH2CHCN":{"x":[101.3,54,"<path d='M58.5 31.7L79.2 19.7M63 35L79.8 25.2M37 25.2L53.9 35M11.6 6.7L30.7 17.7M8.2 12.5L27.3 23.5M11 10.2L27.9 20'/><text transform='translate(80.9 22.6)' y='.36em'>CH₂</text><text transform='translate(54.9 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"s":[87.3,40.6,"<path d='M58.5 31.7L79.2 19.7M58.4 37.6L84.4 22.6M32.4 22.6L58.4 37.6M11.6 6.7L34.1 19.7M8.2 12.5L30.7 25.5M11 10.2L32.4 22.6'/><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"]},"C2H5CN":{"x":[101.3,54,"<path d='M63 35L79.8 25.2M37 25.2L53.9 35M11.6 6.7L30.7 17.7M8.2 12.5L27.3 23.5M11 10.2L27.9 20'/><text transform='translate(80.9 22.6)' y='.36em'>CH₃</text><text transform='translate(54.9 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"s":[87.3,40.6,"<path d='M58.4 37.6L84.4 22.6M32.4 22.6L58.4 37.6M11.6 6.7L34.1 19.7M8.2 12.5L30.7 25.5M11 10.2L32.4 22.6'/><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"]},"CH3NH2":{"x":[59.8,31,"<path d='M21.4 10.3L38.2 20'/><text transform='translate(39.3 22.6)' y='.36em'>CH₃</text><text transform='translate(20.1 7.6)' text-anchor='end' y='.36em'>H₂<tspan class='n'>N</tspan></text>"]},"C2H5NH2":{"x":[85.8,39,"<path d='M47.3 20L64.2 10.2M21.4 10.2L38.2 20'/><text transform='translate(65.3 7.6)' y='.36em'>CH₃</text><text transform='translate(39.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(20.1 7.6)' text-anchor='end' y='.36em'>H₂<tspan class='n'>N</tspan></text>"],"s":[71.8,25.6,"<path d='M42.8 22.6L68.8 7.6M21.4 10.2L42.8 22.6'/><text transform='translate(20.1 7.6)' text-anchor='end' y='.36em'>H₂<tspan class='n'>N</tspan></text>"]},"(CH3)2NH":{"x":[85.8,39,"<path d='M47.3 20L64.2 10.2M21.3 10.2L38.2 20'/><text transform='translate(65.2 7.6)' y='.36em'>CH₃</text><text transform='translate(39.5 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[58,34.4,"<path d='M33.5 15.4L55 3M3 3L24.4 15.4'/><text transform='translate(25.7 18)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text>"]},"C6H5NH2":{"x":[98.2,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(77.7 63)' y='.36em'><tspan class='n'>N</tspan>H₂</text>"]},"C6H2Br3NH2":{"x":[128.5,106,"<path d='M85.4 52.6L106.8 65M85.4 22.6L85.4 52.6M59.4 67.6L85.4 52.6M85.4 22.6L104.7 11.5M59.4 7.6L85.4 22.6M33.4 52.6L59.4 67.6M59.4 67.6L59.4 89.9M33.4 22.6L59.4 7.6M33.4 22.6L33.4 52.6M14.1 11.5L33.4 22.6'/><circle cx='59.4' cy='37.6' r='20.9'/><text transform='translate(108.1 67.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(106.5 7.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(54.5 97.6)' y='.36em'><tspan class='x'>Br</tspan></text>"]},"[CH3NH3]Cl":{"x":[78.4,39,"<path d='M40 20L56.8 10.2'/><text transform='translate(57.9 7.6)' y='.36em'>CH₃</text><text transform='translate(32.1 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₃⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"s":[64.4,39,"<path d='M40 20L61.4 7.6'/><text transform='translate(32.1 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₃⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"[CH3NH3]OH":{"x":[84.4,39,"<path d='M45.9 20L62.8 10.2'/><text transform='translate(63.9 7.6)' y='.36em'>CH₃</text><text transform='translate(38.1 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₃⁺</tspan></text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"],"s":[70.4,39,"<path d='M45.9 20L67.4 7.6'/><text transform='translate(38.1 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₃⁺</tspan></text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"]},"[C2H5NH3]Cl":{"x":[104.3,47.8,"<path d='M65.9 28.8L82.8 19M40 19L56.8 28.8'/><text transform='translate(83.9 16.4)' y='.36em'>CH₃</text><text transform='translate(57.9 31.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(32.1 16.4)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='-0.9em'>H₃⁺</tspan></text><text transform='translate(15.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"s":[90.3,39.8,"<path d='M61.4 31.4L87.4 16.4M40 19L61.4 31.4'/><text transform='translate(32.1 16.4)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='-0.9em'>H₃⁺</tspan></text><text transform='translate(15.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"[(CH3)2NH2]Cl":{"x":[104.3,47.8,"<path d='M65.9 28.8L82.8 19M40 19L56.8 28.8'/><text transform='translate(83.9 16.4)' y='.36em'>CH₃</text><text transform='translate(58.1 31.4)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₂⁺</tspan></text><text transform='translate(31.9 16.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₃</tspan></text><text transform='translate(15.8 31.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"s":[90.3,34.4,"<path d='M65.9 15.4L87.4 3M35.4 3L56.8 15.4'/><text transform='translate(58.1 18)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₂⁺</tspan></text><text transform='translate(15.8 18)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"[C6H5NH3]Cl":{"x":[99.9,76,"<path d='M24.8 64.3L45 52.7L71 67.7M45 22.7L45 52.7M71 67.7L96.9 52.7M45 22.7L71 7.7M96.9 22.7L96.9 52.7M71 7.7L96.9 22.7'/><circle cx='71' cy='37.7' r='20.9'/><text transform='translate(24.3 67.7)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N⁺</tspan></text><text transform='translate(25.4 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"NH2CH2COOH":{"x":[101.8,69,"<path d='M63.1 50L80 40.2M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(55 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[101.8,61,"<path d='M58.5 52.6L80 40.2M32.5 37.6L58.5 52.6M9.3 48.1L31.3 35.4M11.8 52.5L33.8 39.8M32.5 37.6L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"NH2CH2COONa":{"x":[132.1,69,"<path d='M93.5 50L110.4 40.2M67.5 40.2L84.4 50M65.5 33L65.5 12.2M60.4 33L60.4 12.2M45 48L58.5 40.2'/><text transform='translate(111.7 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(85.5 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(66.5 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[132.1,60.6,"<path d='M89 52.6L110.4 40.2M63 37.6L89 52.6M65.5 37.6L65.5 12.2M60.4 37.6L60.4 12.2M45 48L63 37.6'/><text transform='translate(111.7 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"]},"[NH3CH2COOH]Cl":{"x":[134.3,69,"<path d='M91.9 50L108.8 40.2M65.9 40.2L82.8 50M63.9 33L63.9 12.2M58.8 33L58.8 12.2M40 50L56.8 40.2'/><text transform='translate(110.1 37.6)' y='.36em'><tspan class='n'>N</tspan>H₃⁺</text><text transform='translate(83.9 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(64.9 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(57.7 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(31.7 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(15.8 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"s":[134.3,69,"<path d='M87.4 52.6L108.8 40.2M61.4 37.6L87.4 52.6M63.9 37.6L63.9 12.2M58.8 37.6L58.8 12.2M40 50L61.4 37.6'/><text transform='translate(110.1 37.6)' y='.36em'><tspan class='n'>N</tspan>H₃⁺</text><text transform='translate(57.7 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(31.7 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(15.8 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"NH2CH2COOCH3":{"x":[137.9,69,"<path d='M99.3 50L116.2 40.2M73.3 40.2L90.2 50M71.3 33L71.3 12.2M66.2 33L66.2 12.2M47.3 50L64.2 40.2M21.3 40.2L38.2 50'/><text transform='translate(117.4 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(91.2 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(72.2 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(65 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(39 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(20.3 37.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[124.1,60.6,"<path d='M80.9 52.6L102.4 40.2M55 37.6L80.9 52.6M57.5 37.6L57.5 12.2M52.4 37.6L52.4 12.2M33.5 50L55 37.6M3 37.6L24.4 50'/><text transform='translate(103.6 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(51.2 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(25.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text>"]},"(NH2CH2COO)2Cu":{"x":[135,110.1,"<path d='M83.7 107.2L98.7 81.2M59.5 102L83.7 107.2M98.9 83.7L124.2 81.1M98.4 78.7L123.7 76M82.1 62.8L98.7 81.2M52 78.8L53.8 95.7M58.2 68L73.8 61M28.6 81.2L44.2 74.2M48.6 46.5L50.4 63.4M3.7 61L20.3 79.4M18.7 35L42.9 40.2M3.7 61L18.7 35M10.7 10.8L21 34M6 12.9L16.4 36.1'/><text transform='translate(124.8 78.1)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.9 58.9)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(45.2 71.1)' dominant-baseline='central'><tspan x='0' y='0'>Cu</tspan></text><text transform='translate(44.3 41.3)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(10.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(20.5 83.3)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(57.6 100.9)' text-anchor='end' y='.36em'>H₂<tspan class='n'>N</tspan></text>"],"n":"Ион меди связан с двумя остатками глицина (хелатный комплекс).","ne":"The copper ion is bound to two glycine residues (a chelate complex)."},"CH3CH(NH2)COOH":{"x":[108.5,91,"<path d='M65.3 12.9L65.3 32.4M69.8 40.2L86.7 50M43.8 50L60.7 40.2M36.7 57.2L36.7 78M41.8 57.2L41.8 78M17.9 40.2L34.7 50'/><text transform='translate(68.8 7.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(61.8 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(88 52.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(42.8 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(35.6 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 37.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"s":[108.5,86.4,"<path d='M65.3 3L65.3 33M65.3 33L86.7 45.3M39.3 48L65.3 33M36.7 48L36.7 73.4M41.8 48L41.8 73.4M17.9 35.6L39.3 48'/><text transform='translate(88 48)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(35.6 78)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 33)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"CH3CH(NH2)COONa":{"x":[131.9,91,"<path d='M93.5 50L110.4 40.2M89 57.9L89 77.4M67.5 40.2L81.1 48.1M65.5 33L65.5 12.2M60.4 33L60.4 12.2M45 48L58.5 40.2'/><text transform='translate(111.5 37.6)' y='.36em'>CH₃</text><text transform='translate(92.5 52.6)' text-anchor='end' y='.36em'>HC</text><text transform='translate(85.7 82.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(66.5 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"s":[117.9,91,"<path d='M89 52.6L115 37.6M89 52.6L89 77.4M63 37.6L89 52.6M65.5 37.6L65.5 12.2M60.4 37.6L60.4 12.2M45 48L63 37.6'/><text transform='translate(85.7 82.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"]},"NH2CH2CONHCH2COOH":{"x":[179.7,91,"<path d='M141 50.1L157.9 40.3M115 40.3L131.9 50.1M113 33.1L113 12.3M107.9 33.1L107.9 12.3M89.1 50.1L105.9 40.3M63.1 40.3L80 50.1M37.1 50.1L54 40.3M11.8 37.8L29.8 48.2M9.3 42.2L27.3 52.6M32.5 57.9L32.5 77.4'/><text transform='translate(159.2 37.7)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(133 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(114 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(81.2 52.7)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(55 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(36 52.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[179.7,91,"<path d='M136.5 52.7L157.9 40.3M110.5 37.7L136.5 52.7M113 37.7L113 12.3M107.9 37.7L107.9 12.3M89.1 50.1L110.5 37.7M58.5 37.7L80 50.1M32.5 52.7L58.5 37.7M11.8 37.8L33.8 50.5M9.3 42.2L31.3 54.9M32.5 52.7L32.5 77.4'/><text transform='translate(159.2 37.7)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(81.2 52.7)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"n":"Пептидная связь –CO–NH– соединяет два остатка глицина.","ne":"The peptide bond –CO–NH– joins two glycine residues."},"NH2(CH2)5COOH":{"x":[205.7,69,"<path d='M167 50.1L183.9 40.3M141 40.3L157.9 50.1M115 50.1L131.9 40.3M89.1 40.3L105.9 50.1M63.1 50.1L80 40.3M37.1 40.3L54 50.1M9.3 48.2L27.3 37.8M11.8 52.6L29.8 42.2M32.5 32.4L32.5 12.9'/><text transform='translate(185.1 37.7)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(159 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(133 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(107 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(81 37.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(55 52.7)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[205.7,61,"<path d='M162.5 52.7L183.9 40.3M136.5 37.7L162.5 52.7M110.5 52.7L136.5 37.7M84.5 37.7L110.5 52.7M58.5 52.7L84.5 37.7M32.5 37.7L58.5 52.7M9.3 48.2L31.3 35.5M11.8 52.6L33.8 39.9M32.5 37.7L32.5 12.9'/><text transform='translate(185.1 37.7)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"(CH2CH2)n":{"x":[83.9,54.8,"<path d='M59.5 30.8L80.9 18.4M33.5 21L50.4 30.8M3 33.4L24.4 21'/><path class='br' d='M64 3H68V48.8H64M20 3H16V48.8H20'/><text transform='translate(51.5 33.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(25.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text class='nidx' x='70' y='49.8'>n</text>"],"s":[83.9,52,"<path d='M55 31L80.9 16M29 16L55 31M3 31L29 16'/><path class='br' d='M64 3H68V46H64M20 3H16V46H20'/><text class='nidx' x='70' y='47'>n</text>"]},"(CH2CH(CH3))n":{"x":[83.9,82.4,"<path d='M59.5 58.4L80.9 46M33.5 48.6L50.4 58.4M3 61L21.1 50.5M29 40.7L29 21.2'/><path class='br' d='M64 3H68V76.4H64M20 3H16V76.4H20'/><text transform='translate(51.5 61)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(32.5 46)' text-anchor='end' y='.36em'>HC</text><text transform='translate(25.5 16)' y='.36em'>CH₃</text><text class='nidx' x='70' y='77.4'>n</text>"],"s":[83.9,82,"<path d='M55 61L80.9 46M29 46L55 61M3 61L29 46M29 46L29 16'/><path class='br' d='M64 3H68V76H64M20 3H16V76H20'/><text class='nidx' x='70' y='77'>n</text>"]},"(CH2CHCl)n":{"x":[83.9,82.4,"<path d='M59.5 58.4L80.9 46M33.5 48.6L50.4 58.4M3 61L21.1 50.5M29 40.7L29 23.7'/><path class='br' d='M64 3H68V76.4H64M20 3H16V76.4H20'/><text transform='translate(51.5 61)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(32.5 46)' text-anchor='end' y='.36em'>HC</text><text transform='translate(24.5 16)' y='.36em'><tspan class='x'>Cl</tspan></text><text class='nidx' x='70' y='77.4'>n</text>"],"s":[83.9,82,"<path d='M55 61L80.9 46M29 46L55 61M3 61L29 46M29 46L29 23.7'/><path class='br' d='M64 3H68V76H64M20 3H16V76H20'/><text transform='translate(24.5 16)' y='.36em'><tspan class='x'>Cl</tspan></text><text class='nidx' x='70' y='77'>n</text>"]},"(CH2CH(C6H5))n":{"x":[83.9,82.4,"<path d='M59.5 58.4L80.9 46M33.5 48.6L50.4 58.4M3 61L21.1 50.5M29 40.7L29 23.7'/><path class='br' d='M64 3H68V76.4H64M20 3H16V76.4H20'/><text transform='translate(51.5 61)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(32.5 46)' text-anchor='end' y='.36em'>HC</text><text transform='translate(23.5 16)' y='.36em'>C₆H₅</text><text class='nidx' x='70' y='77.4'>n</text>"],"s":[83.9,82,"<path d='M55 61L80.9 46M29 46L55 61M3 61L29 46M29 46L29 23.7'/><path class='br' d='M64 3H68V76H64M20 3H16V76H20'/><text transform='translate(23.5 16)' y='.36em'>C₆H₅</text><text class='nidx' x='70' y='77'>n</text>"]},"(CF2CF2)n":{"x":[83.9,52,"<path d='M66.2 24.5L80.9 16M40.2 22.5L47.9 26.9M3 31L22 20'/><path class='br' d='M64.4 3H68.4V46H64.4M20 3H16V46H20'/><text transform='translate(49.4 31)' dominant-baseline='central'>CF₂</text><text transform='translate(23.5 16)' dominant-baseline='central'>CF₂</text><text class='nidx' x='70.4' y='47'>n</text>"]},"(CH2CHCHCH2)n":{"x":[135.9,54.8,"<path d='M111.5 30.7L132.9 18.4M85.5 21L102.4 30.7M60.1 36.3L80.9 24.3M59.5 30.7L76.4 21M33.5 21L50.4 30.7M3 33.4L24.4 21'/><path class='br' d='M115.9 3H119.9V48.8H115.9M20 3H16V48.8H20'/><text transform='translate(103.4 33.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(77.4 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H</tspan></text><text transform='translate(51.5 33.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(25.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text class='nidx' x='121.9' y='49.8'>n</text>"],"s":[135.9,52,"<path d='M106.9 31L132.9 16M80.9 16L106.9 31M60.1 33.9L80.9 21.9M55 31L80.9 16M29 16L55 31M3 31L29 16'/><path class='br' d='M115.9 3H119.9V46H115.9M20 3H16V46H20'/><text class='nidx' x='121.9' y='47'>n</text>"]},"(CH2C(CH3)CHCH2)n":{"x":[126,91.4,"<path d='M80.6 49L90.4 65.9M80.6 39.9L90.4 23M51 39.3L75 39.3M53.2 44.4L72.7 44.4M98.2 18.4L123 18.4M35.6 23L45.4 39.9M3 18.4L27.7 18.4'/><path class='br' d='M105.5 3H109.5V85.4H105.5M22 3H18V85.4H22'/><text transform='translate(89.5 70.4)' y='.36em'>CH₃</text><text transform='translate(74.5 44.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(89.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(44.5 44.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(29.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text class='nidx' x='111.5' y='86.4'>n</text>"],"s":[126,89,"<path d='M78 42L93 68M78 42L93 16M51 36.9L75 36.9M48 42L78 42M93 16L123 16M33 16L48 42M3 16L33 16'/><path class='br' d='M104 3H108V83H104M22 3H18V83H22'/><text class='nidx' x='110' y='84'>n</text>"],"n":"Цис-расположение звеньев, как в натуральном каучуке.","ne":"The units are in the cis arrangement, as in natural rubber."},"(NHCH2CO)n":{"x":[109.9,84.4,"<path d='M85.5 30.7L106.9 18.4M59.5 21L76.4 30.7M33.5 30.7L50.4 21M3 18.4L24.4 30.7M26.4 38L26.4 58.8M31.5 38L31.5 58.8'/><path class='br' d='M89.9 3H93.9V78.4H89.9M20 3H16V78.4H20'/><text transform='translate(77.7 33.4)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(51.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(32.5 33.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(25.3 63.4)' y='.36em'><tspan class='o'>O</tspan></text><text class='nidx' x='95.9' y='79.4'>n</text>"],"s":[109.9,82,"<path d='M85.5 28.3L106.9 16M55 16L76.4 28.3M29 31L55 16M3 16L29 31M26.4 31L26.4 56.4M31.5 31L31.5 56.4'/><path class='br' d='M89.9 3H93.9V76H89.9M20 3H16V76H20'/><text transform='translate(77.7 31)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(25.3 61)' y='.36em'><tspan class='o'>O</tspan></text><text class='nidx' x='95.9' y='77'>n</text>"]},"(NH(CH2)5CO)n":{"x":[213.8,84.4,"<path d='M189.4 30.8L210.8 18.4M163.4 21L180.3 30.8M137.5 30.8L154.3 21M111.5 21L128.4 30.8M85.5 30.8L102.4 21M59.5 21L76.4 30.8M33.5 30.8L50.4 21M3 18.4L24.4 30.8M26.4 38L26.4 58.8M31.5 38L31.5 58.8'/><path class='br' d='M193.9 3H197.9V78.4H193.9M20 3H16V78.4H20'/><text transform='translate(181.6 33.4)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(155.4 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(129.4 33.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(103.4 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(77.4 33.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(51.5 18.4)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='-0.9em'>H₂</tspan></text><text transform='translate(32.5 33.4)' text-anchor='end' y='.36em'>C</text><text transform='translate(25.3 63.4)' y='.36em'><tspan class='o'>O</tspan></text><text class='nidx' x='199.9' y='79.4'>n</text>"],"s":[213.8,82,"<path d='M189.4 28.4L210.8 16M158.9 16L180.3 28.4M132.9 31L158.9 16M106.9 16L132.9 31M80.9 31L106.9 16M55 16L80.9 31M29 31L55 16M3 16L29 31M26.4 31L26.4 56.4M31.5 31L31.5 56.4'/><path class='br' d='M193.9 3H197.9V76H193.9M20 3H16V76H20'/><text transform='translate(181.6 31)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(25.3 61)' y='.36em'><tspan class='o'>O</tspan></text><text class='nidx' x='199.9' y='77'>n</text>"]},"HCOO^-":{"x":[67.1,39,"<path d='M34.7 16.7L55.5 4.7M39.2 20L56.1 10.2M13.2 10.2L30.1 20'/><text transform='translate(56.9 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(31.1 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H</tspan></text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[67.1,25.6,"<path d='M34.7 16.7L55.5 4.7M34.6 22.6L56.1 10.2M13.2 10.2L34.6 22.6'/><text transform='translate(56.9 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"CH3COO^-":{"x":[68.3,68,"<path d='M19.4 55.1L29.2 38.2M36.4 36.2L57.2 36.2M36.4 31.1L57.2 31.1M19.4 12.2L29.2 29.1'/><text transform='translate(20.3 59.6)' text-anchor='end' y='.36em'>H₃C</text><text transform='translate(28.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(22.4 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[60.2,62.6,"<path d='M8.7 59.6L23.7 33.6M23.7 36.2L49.1 36.2M23.7 31.1L49.1 31.1M11.3 12.2L23.7 33.6'/><text transform='translate(49.9 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C2O4^2-":{"x":[93.1,91,"<path d='M60.6 12.9L60.6 32.4M63.3 42.1L81.4 52.5M65.9 37.7L83.9 48.1M39.2 50L56.1 40.2M32.1 57.2L32.1 78M37.2 57.2L37.2 78M13.2 40.2L30.1 50'/><text transform='translate(66.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(57.1 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(82.9 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(38.1 52.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(30.9 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[93.1,91,"<path d='M60.6 12.9L60.6 37.6M59.4 39.8L81.4 52.5M61.9 35.4L83.9 48.1M34.6 52.6L60.6 37.6M32.1 52.6L32.1 78M37.2 52.6L37.2 78M13.2 40.2L34.6 52.6'/><text transform='translate(66.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(82.9 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.9 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C6H5COO^-":{"x":[118.6,68,"<path d='M95.6 29.1L105.4 12.2M93.1 38.9L103.5 56.9M97.5 36.3L107.9 54.4M63 33.6L87.7 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(89.5 33.6)' y='.36em'>C</text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text>"],"s":[118.6,68,"<path d='M93 33.6L105.4 12.2M90.8 34.9L103.5 56.9M95.2 32.3L107.9 54.4M63 33.6L93 33.6M48 7.6L63 33.6M48 59.6L63 33.6M18 7.6L48 7.6M18 59.6L48 59.6M3 33.6L18 7.6M3 33.6L18 59.6'/><circle cx='33' cy='33.6' r='20.9'/><text transform='translate(104.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(104.3 59.6)' y='.36em'><tspan class='o'>O</tspan></text>"]},"C6H5O^-":{"x":[91.5,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(77.2 63)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"C17H35COO^-":{"x":[76.5,68,"<path d='M28.7 53L37.3 38.2M44.5 36.2L65.3 36.2M44.5 31.1L65.3 31.1M27.5 12.2L37.3 29.1'/><text transform='translate(30.4 59.6)' text-anchor='end' y='.36em'>C₁₇H₃₅</text><text transform='translate(36.4 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(66.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.5 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[76.5,68,"<path d='M28.7 53L39.9 33.6M39.9 36.2L65.3 36.2M39.9 31.1L65.3 31.1M27.5 12.2L39.9 33.6'/><text transform='translate(30.4 59.6)' text-anchor='end' y='.36em'>C₁₇H₃₅</text><text transform='translate(66.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.5 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"[CH3NH3]^+":{"x":[62,31,"<path d='M23.5 10.3L40.4 20'/><text transform='translate(41.5 22.6)' y='.36em'>CH₃</text><text transform='translate(24.3 7.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N⁺</tspan></text>"]},"[C2H5NH3]^+":{"x":[88,39,"<path d='M49.5 20L66.4 10.2M23.5 10.2L40.4 20'/><text transform='translate(67.5 7.6)' y='.36em'>CH₃</text><text transform='translate(41.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(24.3 7.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N⁺</tspan></text>"],"s":[74,25.6,"<path d='M45 22.6L71 7.6M23.5 10.2L45 22.6'/><text transform='translate(24.3 7.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N⁺</tspan></text>"]},"[(CH3)2NH2]^+":{"x":[85.8,39,"<path d='M47.3 20L64.2 10.2M21.3 10.2L38.2 20'/><text transform='translate(65.2 7.6)' y='.36em'>CH₃</text><text transform='translate(39.5 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₂⁺</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃C</text>"],"s":[58,34.4,"<path d='M33.5 15.4L55 3M3 3L24.4 15.4'/><text transform='translate(25.7 18)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan><tspan x='0' y='0.9em'>H₂⁺</tspan></text>"]},"[C6H5NH3]^+":{"x":[102,71.4,"<path d='M55 48L76.4 60.4M55 18L55 48M29 63L55 48M29 3L55 18M3 48L29 63M3 18L29 3M3 18L3 48'/><circle cx='29' cy='33' r='20.9'/><text transform='translate(77.7 63)' y='.36em'><tspan class='n'>N</tspan>H₃⁺</text>"]},"NH2CH2COO^-":{"x":[101.8,69,"<path d='M63.1 50L80 40.2M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(55 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"s":[101.8,61,"<path d='M58.5 52.6L80 40.2M32.5 37.6L58.5 52.6M9.3 48.1L31.3 35.4M11.8 52.5L33.8 39.8M32.5 37.6L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₂</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"[NH3CH2COOH]^+":{"x":[105.6,69,"<path d='M63.1 50L80 40.2M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₃⁺</text><text transform='translate(55 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan><tspan x='0' y='0.9em'>H₂</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"],"s":[105.6,61,"<path d='M58.5 52.6L80 40.2M32.5 37.6L58.5 52.6M9.3 48.1L31.3 35.4M11.8 52.5L33.8 39.8M32.5 37.6L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'><tspan class='n'>N</tspan>H₃⁺</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text>"]},"H2":{"x":[38.9,31,"<path d='M11 10.3L27.9 20'/><text transform='translate(29.1 22.6)' y='.36em'>H</text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>H</text>"]},"O2":{"x":[39.1,31,"<path d='M11.8 7.7L29.8 18.1M9.3 12.1L27.3 22.6'/><text transform='translate(28.8 22.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"O3":{"x":[69,30.6,"<path d='M40.5 18L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L28 20'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(28.8 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁺</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"N2":{"x":[38.9,31,"<path d='M11.6 6.7L30.7 17.7M8.2 12.6L27.3 23.6M11 10.3L27.9 20'/><text transform='translate(29.1 22.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"]},"F2":{"x":[37.5,31,"<path d='M10.1 10.3L27 20'/><text transform='translate(28.5 22.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(8.7 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"]},"Cl2":{"x":[40.6,31,"<path d='M14 11.5L26.6 18.8'/><text transform='translate(28.8 22.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"Br2":{"x":[40.9,31,"<path d='M14.1 11.5L26.7 18.8'/><text transform='translate(28.5 22.6)' y='.36em'><tspan class='x'>Br</tspan></text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"I2":{"x":[35,31,"<path d='M9 10.3L25.9 20'/><text transform='translate(29.4 22.6)' y='.36em'><tspan class='x'>I</tspan></text><text transform='translate(5.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I</tspan></text>"]},"C":{"x":[13,16,"<text transform='translate(3 7.6)' y='.36em'>C</text>"],"n":"Вещество с атомной решёткой: молекул нет, атомы связаны ковалентными связями в сплошную сеть.","ne":"Covalent network solid: there are no molecules; the atoms are joined by covalent bonds into a continuous network."},"Si":{"x":[14.3,16,"<text transform='translate(3 7.6)' y='.36em'>Si</text>"],"n":"Вещество с атомной решёткой: молекул нет, атомы связаны ковалентными связями в сплошную сеть.","ne":"Covalent network solid: there are no molecules; the atoms are joined by covalent bonds into a continuous network."},"S":{"x":[12.2,16,"<text transform='translate(3 7.6)' y='.36em'>S</text>"],"n":"Сера состоит из молекул S₈ — колец из восьми атомов, но в уравнениях её пишут просто S.","ne":"Sulfur is made of S₈ molecules (rings of eight atoms), but in equations it is written simply as S."},"P":{"x":[12.2,16,"<text transform='translate(3 7.6)' y='.36em'><tspan class='x'>P</tspan></text>"],"n":"Белый фосфор состоит из молекул P₄, красный — из длинных цепочек атомов; в уравнениях пишут просто P.","ne":"White phosphorus is made of P₄ molecules and red phosphorus of long chains of atoms; in equations it is written simply as P."},"Li":{"x":[13.3,16,"<text transform='translate(3 7.6)' y='.36em'>Li</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Na":{"x":[18.7,16,"<text transform='translate(3 7.6)' y='.36em'>Na</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"K":{"x":[13,16,"<text transform='translate(3 7.6)' y='.36em'>K</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Mg":{"x":[19,16,"<text transform='translate(3 7.6)' y='.36em'>Mg</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Ca":{"x":[18.7,16,"<text transform='translate(3 7.6)' y='.36em'>Ca</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Ba":{"x":[18.2,16,"<text transform='translate(3 7.6)' y='.36em'>Ba</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Al":{"x":[14.3,16,"<text transform='translate(3 7.6)' y='.36em'>Al</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Fe":{"x":[16.9,16,"<text transform='translate(3 7.6)' y='.36em'>Fe</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Cu":{"x":[17.9,16,"<text transform='translate(3 7.6)' y='.36em'>Cu</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Zn":{"x":[16.9,16,"<text transform='translate(3 7.6)' y='.36em'>Zn</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Ag":{"x":[17.4,16,"<text transform='translate(3 7.6)' y='.36em'>Ag</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Hg":{"x":[17.9,16,"<text transform='translate(3 7.6)' y='.36em'>Hg</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"W":{"x":[15,16,"<text transform='translate(3 7.6)' y='.36em'>W</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Cr":{"x":[15.8,16,"<text transform='translate(3 7.6)' y='.36em'>Cr</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Pb":{"x":[17.4,16,"<text transform='translate(3 7.6)' y='.36em'>Pb</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Au":{"x":[17.4,16,"<text transform='translate(3 7.6)' y='.36em'>Au</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Pt":{"x":[15.2,16,"<text transform='translate(3 7.6)' y='.36em'>Pt</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Ni":{"x":[14.8,16,"<text transform='translate(3 7.6)' y='.36em'>Ni</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"Mn":{"x":[19,16,"<text transform='translate(3 7.6)' y='.36em'>Mn</text>"],"n":"Металл: отдельных молекул нет — атомы в кристалле связаны металлической связью.","ne":"A metal has no separate molecules: the atoms in the crystal are held together by metallic bonding."},"H2O":{"x":[64.9,30.6,"<path d='M37 20L53.9 10.2M11 10.2L27.9 20'/><text transform='translate(55.1 7.6)' y='.36em'>H</text><text transform='translate(28.7 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>H</text>"]},"H2O2":{"x":[90.9,31.4,"<path d='M63 20.4L79.8 10.6M37 10.6L53.9 20.4M11 20.4L27.9 10.6'/><text transform='translate(81.1 8)' y='.36em'>H</text><text transform='translate(54.7 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(28.7 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(9.7 23)' text-anchor='end' y='.36em'>H</text>"]},"NH3":{"x":[57.9,68,"<path d='M9.1 55.1L18.8 38.2M26.7 33.6L46.2 33.6M9.1 12.2L18.8 29.1'/><text transform='translate(9.7 59.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(18.2 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(48.2 33.6)' y='.36em'>H</text><text transform='translate(9.7 7.7)' text-anchor='end' y='.36em'>H</text>"]},"NH3·H2O":{"x":[142.8,61.4,"<path d='M114.9 20.3L131.8 10.6M110.4 28.2L110.4 47.7M88.9 10.6L105.8 20.3M37 10.6L53.9 20.3M11 20.3L27.9 10.6'/><text transform='translate(133.1 8)' y='.36em'>H</text><text transform='translate(113.7 23)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(107.1 53)' y='.36em'>H</text><text transform='translate(81.1 8)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(55.1 23)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(28.7 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(9.7 23)' text-anchor='end' y='.36em'>H</text>"],"n":"Гидрат аммиака: молекула аммиака, связанная с молекулой воды водородной связью.","ne":"Ammonia hydrate: an ammonia molecule held to a water molecule by a hydrogen bond."},"PH3":{"x":[57.9,68,"<path d='M9.1 55.1L18.8 38.2M26.7 33.6L46.2 33.6M9.1 12.2L18.8 29.1'/><text transform='translate(9.7 59.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(18.2 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(48.2 33.6)' y='.36em'>H</text><text transform='translate(9.7 7.7)' text-anchor='end' y='.36em'>H</text>"]},"SiH4":{"x":[64.9,68,"<path d='M39.1 37.5L53.9 46M11 21.3L25.8 29.8M36.3 27L44.8 12.2M20.1 55.1L28.6 40.3'/><text transform='translate(55.1 48.6)' y='.36em'>H</text><text transform='translate(36.4 33.6)' text-anchor='end' y='.36em'>Si</text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"]},"H2S":{"x":[64.9,30.6,"<path d='M37 20L53.9 10.2M11 10.2L27.9 20'/><text transform='translate(55.1 7.6)' y='.36em'>H</text><text transform='translate(29.4 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>H</text>"]},"HF":{"x":[38.1,31,"<path d='M10.1 10.3L27 20'/><text transform='translate(28.3 22.6)' y='.36em'>H</text><text transform='translate(8.7 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"]},"HCl":{"x":[39.8,31,"<path d='M14 11.5L28.7 20'/><text transform='translate(30 22.6)' y='.36em'>H</text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"HBr":{"x":[39.9,31,"<path d='M14.1 11.5L28.9 20'/><text transform='translate(30.1 22.6)' y='.36em'>H</text><text transform='translate(12.3 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br</tspan></text>"]},"HI":{"x":[36.9,31,"<path d='M9 10.3L25.9 20'/><text transform='translate(27.2 22.6)' y='.36em'>H</text><text transform='translate(5.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I</tspan></text>"]},"CO":{"x":[44.9,31,"<path d='M14.8 7.3L32.9 17.7M11.4 13.2L29.5 23.6M13.2 10.3L30.1 20'/><text transform='translate(31.1 22.6)' y='.36em'>C⁻</text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁺</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"CO2":{"x":[65,46,"<path d='M37.8 22.7L55.8 33.1M35.2 27.1L53.3 37.6M11.8 7.7L29.8 18.1M9.3 12.1L27.3 22.6'/><text transform='translate(54.8 37.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(29 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CS2":{"x":[64.3,46,"<path d='M37.4 22.7L55.4 33.1M34.8 27.1L52.8 37.6M11.4 7.7L29.4 18.1M8.8 12.1L26.9 22.6'/><text transform='translate(55 37.6)' y='.36em'>S</text><text transform='translate(28.6 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.2 7.6)' text-anchor='end' y='.36em'>S</text>"]},"SO2":{"x":[65,46,"<path d='M37.8 22.7L55.8 33.1M35.2 27.1L53.3 37.6M11.8 7.7L29.8 18.1M9.3 12.1L27.3 22.6'/><text transform='translate(54.8 37.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(29.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"SO3":{"x":[58.1,68,"<path d='M11.1 56.9L21.5 38.9M6.7 54.4L17.1 36.3M26.2 36.2L47 36.2M26.2 31.1L47 31.1M11.1 10.4L21.5 28.4M6.7 12.9L17.1 30.9'/><text transform='translate(10.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(18.5 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(10.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"NO":{"x":[39,31,"<path d='M11.8 7.7L29.8 18.1M9.3 12.1L27.3 22.6'/><text transform='translate(29.3 22.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"У атома азота есть неспаренный электрон.","ne":"The nitrogen atom has an unpaired electron."},"NO2":{"x":[67.1,30.6,"<path d='M40 13.6L55.5 4.7M42.5 18.1L56.1 10.2M13.2 10.2L30.1 20'/><text transform='translate(56.9 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(31.4 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы. У атома азота есть неспаренный электрон.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle. The nitrogen atom has an unpaired electron."},"N2O":{"x":[69,46,"<path d='M39.7 23.8L55.7 33.1M37.1 28.2L53.2 37.5M11.9 7.8L29.7 18.1M9.4 12.1L27.2 22.5'/><text transform='translate(55.2 37.6)' y='.36em'><tspan class='n'>N⁻</tspan></text><text transform='translate(29.3 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"N2O4":{"x":[93.1,91,"<path d='M60.6 12.9L60.6 32.4M65.2 43.2L81.3 52.4M67.8 38.8L83.8 48.1M40.5 49.3L56.1 40.2M32.1 57.2L32.1 78M37.2 57.2L37.2 78M13.2 40.2L28.7 49.2'/><text transform='translate(66.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(57.3 37.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(82.9 52.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(40 52.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(30.9 82.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(14.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"P2O5":{"x":[117,61.4,"<path d='M87.2 18.5L105.2 8M89.8 22.9L107.8 12.5M82 27.6L82 48.4M87.1 27.6L87.1 48.4M63.1 10.6L80 20.3M37.1 20.3L54 10.6M11.8 8L29.8 18.5M9.3 12.5L27.3 22.9M30 27.6L30 48.4M35.1 27.6L35.1 48.4'/><text transform='translate(106.8 8)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(87.8 23)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(80.8 53)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(54.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(35.8 23)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Простейшая формула; настоящие молекулы — P₄O₁₀.","ne":"Simplest formula; the real molecules are P₄O₁₀."},"SiO2":{"x":[65,46,"<path d='M40.1 24.1L55.8 33.1M37.6 28.5L53.3 37.6M11.8 7.7L27.5 16.8M9.3 12.1L25 21.2'/><text transform='translate(54.8 37.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.6 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Si</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Условная графическая формула: в кристалле молекул нет — каждый атом кремния связан с четырьмя атомами кислорода.","ne":"Conventional graphic formula: the crystal has no molecules — each silicon atom is bonded to four oxygen atoms."},"SiC":{"x":[39.5,31,"<text transform='translate(28.2 22.6)' y='.36em'>Si</text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>C</text>"],"n":"Карборунд — вещество с атомной решёткой, как у алмаза: каждый атом кремния связан с четырьмя атомами углерода, а каждый атом углерода — с четырьмя атомами кремния.","ne":"Carborundum is a covalent network solid like diamond: each silicon atom is bonded to four carbon atoms and each carbon atom to four silicon atoms."},"OF2":{"x":[63.5,30.6,"<path d='M36.1 20L53 10.2M10.1 10.2L27 20'/><text transform='translate(54.5 7.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(27.9 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(8.7 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"]},"SF6":{"x":[63.5,76,"<path d='M36.1 40.3L53 50M10.1 25.3L27 35M31.6 12.9L31.6 32.4M10.1 50L27 40.3M36.1 35L53 25.3M31.6 42.9L31.6 62.4'/><text transform='translate(54.5 52.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(28.5 37.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(8.7 22.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(34.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(8.7 52.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(54.5 22.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(28.5 67.6)' y='.36em'><tspan class='x'>F</tspan></text>"]},"SiF4":{"x":[63.5,68,"<path d='M38.3 37.5L53 46M10.1 21.3L24.9 29.8M35.4 27L44 12.2M19.2 55.1L27.7 40.3'/><text transform='translate(54.5 48.6)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(35.6 33.6)' text-anchor='end' y='.36em'>Si</text><text transform='translate(8.7 18.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(43.5 7.7)' y='.36em'><tspan class='x'>F</tspan></text><text transform='translate(19.6 59.6)' text-anchor='end' y='.36em'><tspan class='x'>F</tspan></text>"]},"SiCl4":{"x":[66.6,68,"<path d='M40 37.5L52.6 44.8M14 22.5L26.6 29.8M37.1 27L44.4 14.3M22.1 53L29.4 40.3'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(37.3 33.6)' text-anchor='end' y='.36em'>Si</text><text transform='translate(11.8 18.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(22.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"PCl3":{"x":[59.6,68,"<path d='M11.2 53L19.7 38.2M27.6 33.6L44.6 33.6M11.2 14.3L19.7 29.1'/><text transform='translate(11.8 59.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(19 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(11.8 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"PCl5":{"x":[70.5,72.8,"<path d='M41.8 34.4L56.5 25.9M15 34.7L32 36.5M28.1 57.4L35.1 41.8M32.6 15.2L36.1 31.9M41.1 40.5L53.8 51.9'/><text transform='translate(58.7 22)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(33.9 37)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(11.8 33.9)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(29.5 64.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(35.4 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(55.1 57.1)' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"H2CO3":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M15.9 12.2L25.7 29.1'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(24.8 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"H2SiO3":{"x":[64.9,68,"<path d='M15.9 55.1L24.5 40.3M35.6 36.2L53.7 36.2M35.6 31.1L53.7 31.1M15.9 12.2L24.5 27'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(24.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Si</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"HNO3":{"x":[64.9,68,"<path d='M15.9 55L25.7 38.2M36.2 36.2L53.7 36.2M36.2 31.1L53.7 31.1M15.9 12.2L25.7 29'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(25 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(18.9 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"HNO2":{"x":[71.8,30.6,"<path d='M37.1 20L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L28 20'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(29.3 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"H2SO4":{"x":[71.8,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M37 30.9L47.5 12.9M32.6 28.4L43 10.4M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.6 33.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"H2SO3":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M15.9 12.2L25.7 29.1'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(25.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"H2S2O7":{"x":[123.8,67.9,"<path d='M89.1 31L105.9 21.2M74 10.3L84.4 28.4M69.6 12.9L80 30.9M84.6 38.9L95 56.9M89 36.3L99.4 54.3M63.1 46L80 36.2M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(106.8 18.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(87.6 33.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(73.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(95.8 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(29.5 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"H3PO4":{"x":[71.8,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M35.2 29.1L44.9 12.2M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"]},"H3PO3":{"x":[65,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M35.2 29.1L44.9 12.2M20.2 55.1L29.9 38.2'/><text transform='translate(55.2 48.6)' y='.36em'>H</text><text transform='translate(35.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text>"],"n":"Один атом водорода связан прямо с фосфором и не отщепляется, поэтому кислота двухосновная.","ne":"One hydrogen atom is bonded directly to phosphorus and is not released, so the acid is diprotic."},"HPO3":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M17.8 10.4L28.2 28.4M13.4 12.9L23.8 30.9'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(25 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Простейшая формула; на деле молекулы метафосфорной кислоты — кольца и цепочки из таких звеньев.","ne":"Simplest formula; real metaphosphoric acid molecules are rings and chains of such units."},"HClO":{"x":[46.6,31,"<path d='M14 11.5L28.7 20'/><text transform='translate(29.6 22.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"HIO3":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M17.8 10.4L28.2 28.4M13.4 12.9L23.8 30.9'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(27.2 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>I</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"H[AuCl4]":{"x":[75.8,72.8,"<path d='M17.2 34.7L31.7 36.2M30.3 57.4L36.2 44M34.7 15.2L37.7 29.5M45.1 42.2L55.9 51.9'/><text transform='translate(62 22)' y='.36em'>H⁺</text><text transform='translate(33.8 37)' y='.36em'>Au³⁺</text><text transform='translate(15.9 33.9)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(33.5 64.4)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(39.5 7.7)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(57.2 57.1)' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"H2[PtCl6]":{"x":[101.8,74.3,"<path d='M26.8 17.8L35 29.9M17.1 34.6L31.7 35.7M41.6 28.9L45.9 15M24.2 52.6L34.1 41.9M51.9 31.3L60.1 28.1M40.5 43.9L42.7 58.3'/><text transform='translate(88 36.3)' y='.36em'>H⁺</text><text transform='translate(62 51.3)' dominant-baseline='central'><tspan x='0' y='0'>H⁺</tspan></text><text transform='translate(34.7 36.3)' y='.36em'>Pt⁴⁺</text><text transform='translate(28.8 11.5)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(15.8 34)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(43.7 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(25.3 58.3)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(62.8 25.3)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(39.3 65.9)' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"Li2O":{"x":[71.2,30.6,"<text transform='translate(56.9 7.6)' y='.36em'>Li⁺</text><text transform='translate(30.9 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'>Li⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2O":{"x":[75.7,30.6,"<text transform='translate(56.8 7.6)' y='.36em'>Na⁺</text><text transform='translate(33.3 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2O":{"x":[70.1,30.6,"<text transform='translate(56.8 7.6)' y='.36em'>K⁺</text><text transform='translate(30.4 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(13.2 7.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2O2":{"x":[101.7,31.4,"<path d='M41.6 10.6L58.5 20.4'/><text transform='translate(82.8 8)' y='.36em'>Na⁺</text><text transform='translate(59.3 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(33.3 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 23)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. В пероксид-ионе O₂²⁻ два атома кислорода связаны между собой.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. In the peroxide ion O₂²⁻ the two oxygen atoms are bonded to each other."},"BaO2":{"x":[76.2,30.6,"<path d='M13.2 10.2L30.1 20'/><text transform='translate(54.7 7.6)' y='.36em'>Ba²⁺</text><text transform='translate(30.9 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(14.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. В пероксид-ионе O₂²⁻ два атома кислорода связаны между собой.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. In the peroxide ion O₂²⁻ the two oxygen atoms are bonded to each other."},"KO2":{"x":[68.5,30.6,"<path d='M11.1 10.2L28 20'/><text transform='translate(55.2 7.6)' y='.36em'>K⁺</text><text transform='translate(28.8 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. Надпероксид-ион O₂⁻ содержит неспаренный электрон.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The superoxide ion O₂⁻ has an unpaired electron."},"MgO":{"x":[52.8,31,"<text transform='translate(29.6 22.6)' y='.36em'>Mg²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaO":{"x":[52,31,"<text transform='translate(29.9 22.6)' y='.36em'>Ca²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"BaO":{"x":[51.7,31,"<text transform='translate(30.2 22.6)' y='.36em'>Ba²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnO":{"x":[51.9,31,"<text transform='translate(30.9 22.6)' y='.36em'>Zn²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuO":{"x":[52.2,31,"<text transform='translate(30.2 22.6)' y='.36em'>Cu²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cu2O":{"x":[76,30.6,"<text transform='translate(57 7.6)' y='.36em'>Cu⁺</text><text transform='translate(33.3 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Cu⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ag2O":{"x":[75.7,30.6,"<text transform='translate(57.4 7.6)' y='.36em'>Ag⁺</text><text transform='translate(33.2 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(18.4 7.6)' text-anchor='end' y='.36em'>Ag⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"HgO":{"x":[52.2,31,"<text transform='translate(30.2 22.6)' y='.36em'>Hg²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"PbO":{"x":[51.9,31,"<text transform='translate(30.4 22.6)' y='.36em'>Pb²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NiO":{"x":[50.6,31,"<text transform='translate(31.7 22.6)' y='.36em'>Ni²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeO":{"x":[51.7,31,"<text transform='translate(30.7 22.6)' y='.36em'>Fe²⁺</text><text transform='translate(17.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe2O3":{"x":[129.6,31,"<text transform='translate(108.6 8)' y='.36em'>Fe³⁺</text><text transform='translate(82.6 23)' dominant-baseline='central'><tspan x='0' y='0'>Fe³⁺</tspan></text><text transform='translate(58.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(32.4 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(17.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe3O4":{"x":[181.6,31,"<text transform='translate(160.6 8)' y='.36em'>Fe²⁺</text><text transform='translate(134.6 23)' dominant-baseline='central'><tspan x='0' y='0'>Fe³⁺</tspan></text><text transform='translate(108.6 8)' dominant-baseline='central'><tspan x='0' y='0'>Fe³⁺</tspan></text><text transform='translate(84.4 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(58.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(32.4 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(17.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. Смешанный оксид FeO·Fe₂O₃: в нём есть ионы железа(II) и железа(III).","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. A mixed oxide FeO·Fe₂O₃: it contains both iron(II) and iron(III) ions."},"Al2O3":{"x":[128.5,31,"<text transform='translate(110.1 8)' y='.36em'>Al³⁺</text><text transform='translate(84.1 23)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(58.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(32.4 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(17.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cr2O3":{"x":[128.9,31,"<text transform='translate(109 8)' y='.36em'>Cr³⁺</text><text transform='translate(83 23)' dominant-baseline='central'><tspan x='0' y='0'>Cr³⁺</tspan></text><text transform='translate(58.4 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(32.4 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O²⁻</tspan></text><text transform='translate(17.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O²⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MnO2":{"x":[65,46,"<path d='M40.1 24.1L55.8 33.1M37.6 28.5L53.3 37.6M11.8 7.7L27.5 16.8M9.3 12.1L25 21.2'/><text transform='translate(54.8 37.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(26 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Mn</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Условная графическая формула: молекул в кристалле нет, линии показывают валентность атомов.","ne":"Conventional graphic formula: the crystal has no molecules; the lines show the valence of the atoms."},"CrO3":{"x":[58.1,68,"<path d='M11.1 56.9L20.1 41.2M6.7 54.4L15.7 38.7M28.8 36.2L47 36.2M28.8 31.1L47 31.1M11.1 10.4L20.1 26.1M6.7 12.9L15.7 28.6'/><text transform='translate(10.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(16.4 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(10.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Условная графическая формула: молекул в кристалле нет, линии показывают валентность атомов.","ne":"Conventional graphic formula: the crystal has no molecules; the lines show the valence of the atoms."},"WO3":{"x":[58.1,68,"<path d='M11.1 56.9L20.5 40.7M6.7 54.4L16 38.2M26.9 36.2L47 36.2M26.9 31.1L47 31.1M11.1 10.4L20.4 26.5M6.7 12.9L16 29'/><text transform='translate(10.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17 33.6)' dominant-baseline='central'><tspan x='0' y='0'>W</tspan></text><text transform='translate(47.8 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(10.3 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Условная графическая формула: молекул в кристалле нет, линии показывают валентность атомов.","ne":"Conventional graphic formula: the crystal has no molecules; the lines show the valence of the atoms."},"LiOH":{"x":[43,31.4,"<text transform='translate(28.7 23)' y='.36em'>Li⁺</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaOH":{"x":[45.1,31.4,"<text transform='translate(26.2 23)' y='.36em'>Na⁺</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KOH":{"x":[42.3,31.4,"<text transform='translate(29.1 23)' y='.36em'>K⁺</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca(OH)2":{"x":[74.1,31,"<text transform='translate(52.2 8)' y='.36em'>Ca²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ba(OH)2":{"x":[73.9,31,"<text transform='translate(52.4 8)' y='.36em'>Ba²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Mg(OH)2":{"x":[75,31,"<text transform='translate(51.9 8)' y='.36em'>Mg²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cu(OH)2":{"x":[74.4,31,"<text transform='translate(52.4 8)' y='.36em'>Cu²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe(OH)2":{"x":[73.9,31,"<text transform='translate(52.9 8)' y='.36em'>Fe²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Zn(OH)2":{"x":[74.1,31,"<text transform='translate(53.1 8)' y='.36em'>Zn²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Mn(OH)2":{"x":[75,31,"<text transform='translate(51.9 8)' y='.36em'>Mn²⁺</text><text transform='translate(28.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Al(OH)3":{"x":[98.8,31,"<text transform='translate(80.4 8)' y='.36em'>Al³⁺</text><text transform='translate(54.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(28.7 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe(OH)3":{"x":[99.9,31,"<text transform='translate(78.9 8)' y='.36em'>Fe³⁺</text><text transform='translate(54.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(28.7 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cr(OH)3":{"x":[99.2,31,"<text transform='translate(79.2 8)' y='.36em'>Cr³⁺</text><text transform='translate(54.7 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(28.7 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaCl":{"x":[48.2,31,"<text transform='translate(29.2 22.6)' y='.36em'>Na⁺</text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KCl":{"x":[45.4,31,"<text transform='translate(32.1 22.6)' y='.36em'>K⁺</text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"LiCl":{"x":[46,31,"<text transform='translate(31.7 22.6)' y='.36em'>Li⁺</text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AgCl":{"x":[48.3,31,"<text transform='translate(29.9 22.6)' y='.36em'>Ag⁺</text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KBr":{"x":[45.7,31,"<text transform='translate(32.4 22.6)' y='.36em'>K⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaBr":{"x":[48.5,31,"<text transform='translate(29.5 22.6)' y='.36em'>Na⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AgBr":{"x":[48.7,31,"<text transform='translate(30.2 22.6)' y='.36em'>Ag⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KI":{"x":[42.2,31,"<text transform='translate(29 22.6)' y='.36em'>K⁺</text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaI":{"x":[45,31,"<text transform='translate(26.1 22.6)' y='.36em'>Na⁺</text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AgI":{"x":[45.2,31,"<text transform='translate(26.8 22.6)' y='.36em'>Ag⁺</text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuI":{"x":[45.2,31,"<text transform='translate(26.3 22.6)' y='.36em'>Cu⁺</text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaF":{"x":[46.6,31,"<text transform='translate(27.7 22.6)' y='.36em'>Na⁺</text><text transform='translate(12.7 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaF2":{"x":[69.5,30.6,"<text transform='translate(56.8 7.6)' y='.36em'><tspan class='x'>F⁻</tspan></text><text transform='translate(27.7 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(12.7 7.6)' text-anchor='end' y='.36em'><tspan class='x'>F⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MgCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(29.2 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"BaCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(29.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ba²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(30.2 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Zn²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(29.4 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Cu²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(29.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Fe²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MnCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Mn²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NiCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(30.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ni²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CrCl2":{"x":[72.8,30.6,"<text transform='translate(56.9 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text><text transform='translate(30.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr²⁺</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnBr2":{"x":[73.2,30.6,"<text transform='translate(56.8 7.6)' y='.36em'><tspan class='x'>Br⁻</tspan></text><text transform='translate(30.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Zn²⁺</tspan></text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Br⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeI2":{"x":[66.8,30.6,"<text transform='translate(57.2 7.6)' y='.36em'><tspan class='x'>I⁻</tspan></text><text transform='translate(26.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Fe²⁺</tspan></text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"PbI2":{"x":[66.8,30.6,"<text transform='translate(57.2 7.6)' y='.36em'><tspan class='x'>I⁻</tspan></text><text transform='translate(26.6 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Pb²⁺</tspan></text><text transform='translate(9.6 7.6)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeCl3":{"x":[102.9,31.4,"<text transform='translate(81.9 8)' y='.36em'>Fe³⁺</text><text transform='translate(56.9 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AlCl3":{"x":[101.8,31.4,"<text transform='translate(83.4 8)' y='.36em'>Al³⁺</text><text transform='translate(56.9 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CrCl3":{"x":[102.2,31.4,"<text transform='translate(82.3 8)' y='.36em'>Cr³⁺</text><text transform='translate(56.9 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AuCl3":{"x":[103.3,31.4,"<text transform='translate(81.9 8)' y='.36em'>Au³⁺</text><text transform='translate(56.9 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AlI3":{"x":[98.7,31.4,"<text transform='translate(80.3 8)' y='.36em'>Al³⁺</text><text transform='translate(57.2 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>I⁻</tspan></text><text transform='translate(31.2 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>I⁻</tspan></text><text transform='translate(9.6 23)' text-anchor='end' y='.36em'><tspan class='x'>I⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeS":{"x":[51.4,31,"<text transform='translate(30.4 22.6)' y='.36em'>Fe²⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnS":{"x":[51.6,31,"<text transform='translate(30.7 22.6)' y='.36em'>Zn²⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuS":{"x":[52,31,"<text transform='translate(29.9 22.6)' y='.36em'>Cu²⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"PbS":{"x":[51.7,31,"<text transform='translate(30.2 22.6)' y='.36em'>Pb²⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"HgS":{"x":[52,31,"<text transform='translate(29.9 22.6)' y='.36em'>Hg²⁺</text><text transform='translate(16.4 7.6)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ag2S":{"x":[75.7,30.6,"<text transform='translate(57.4 7.6)' y='.36em'>Ag⁺</text><text transform='translate(33.8 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(18.4 7.6)' text-anchor='end' y='.36em'>Ag⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cu2S":{"x":[76,30.6,"<text transform='translate(57 7.6)' y='.36em'>Cu⁺</text><text transform='translate(34 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Cu⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2S":{"x":[70.1,30.6,"<text transform='translate(56.8 7.6)' y='.36em'>K⁺</text><text transform='translate(31.1 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(13.2 7.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2S":{"x":[75.7,30.6,"<text transform='translate(56.8 7.6)' y='.36em'>Na⁺</text><text transform='translate(34 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(19 7.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Al2S3":{"x":[128.2,31,"<text transform='translate(109.9 8)' y='.36em'>Al³⁺</text><text transform='translate(83.9 23)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(58.8 8)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(32.9 23)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(16.4 8)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cr2S3":{"x":[128.7,31,"<text transform='translate(108.7 8)' y='.36em'>Cr³⁺</text><text transform='translate(82.8 23)' dominant-baseline='central'><tspan x='0' y='0'>Cr³⁺</tspan></text><text transform='translate(58.8 8)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(32.9 23)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(16.4 8)' text-anchor='end' y='.36em'>S²⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeS2":{"x":[75.8,30.6,"<path d='M12.9 10.2L29.8 20'/><text transform='translate(54.8 7.6)' y='.36em'>Fe²⁺</text><text transform='translate(31.3 22.6)' dominant-baseline='central'><tspan x='0' y='0'>S⁻</tspan></text><text transform='translate(13.2 7.6)' text-anchor='end' y='.36em'>S⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. В дисульфид-ионе S₂²⁻ два атома серы связаны между собой.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. In the disulfide ion S₂²⁻ the two sulfur atoms are bonded to each other."},"NaHS":{"x":[45.3,31.4,"<text transform='translate(26.4 23)' y='.36em'>Na⁺</text><text transform='translate(11.4 8)' text-anchor='middle' dominant-baseline='central'>SH⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Mg3N2":{"x":[130.4,31,"<text transform='translate(107.4 8)' y='.36em'>Mg²⁺</text><text transform='translate(81.4 23)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(55.4 8)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(32.7 23)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N³⁻</tspan></text><text transform='translate(16.9 8)' text-anchor='end' y='.36em'><tspan class='n'>N³⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca3N2":{"x":[129.7,31,"<text transform='translate(107.7 8)' y='.36em'>Ca²⁺</text><text transform='translate(81.7 23)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(55.7 8)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(32.7 23)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N³⁻</tspan></text><text transform='translate(16.9 8)' text-anchor='end' y='.36em'><tspan class='n'>N³⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Li3N":{"x":[98.5,31.4,"<text transform='translate(84.2 8)' y='.36em'>Li⁺</text><text transform='translate(58.2 23)' dominant-baseline='central'><tspan x='0' y='0'>Li⁺</tspan></text><text transform='translate(32.3 8)' dominant-baseline='central'><tspan x='0' y='0'>Li⁺</tspan></text><text transform='translate(16.9 23)' text-anchor='end' y='.36em'><tspan class='n'>N³⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AlN":{"x":[50.4,31,"<text transform='translate(32 22.6)' y='.36em'>Al³⁺</text><text transform='translate(16.9 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N³⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca3P2":{"x":[129.5,31,"<text transform='translate(107.5 8)' y='.36em'>Ca²⁺</text><text transform='translate(81.5 23)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(55.5 8)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(32.4 23)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P³⁻</tspan></text><text transform='translate(16.4 8)' text-anchor='end' y='.36em'><tspan class='x'>P³⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaH":{"x":[47.2,31,"<text transform='translate(28.2 22.6)' y='.36em'>Na⁺</text><text transform='translate(13.8 7.6)' text-anchor='end' y='.36em'>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"LiH":{"x":[45,31,"<text transform='translate(30.7 22.6)' y='.36em'>Li⁺</text><text transform='translate(13.8 7.6)' text-anchor='end' y='.36em'>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaH2":{"x":[70.9,30.6,"<text transform='translate(57.1 7.6)' y='.36em'>H⁻</text><text transform='translate(28.2 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(13.8 7.6)' text-anchor='end' y='.36em'>H⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaC2":{"x":[74.8,30.6,"<path d='M40.3 17.7L59.3 6.7M43.7 23.6L62.7 12.6M43.1 20L59.9 10.2'/><text transform='translate(61 7.6)' y='.36em'>C⁻</text><text transform='translate(31.7 22.6)' dominant-baseline='central'><tspan x='0' y='0'>⁻C</tspan></text><text transform='translate(22 7.6)' text-anchor='end' y='.36em'>Ca²⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. В ацетиленид-ионе C₂²⁻ атомы углерода связаны тройной связью.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. In the acetylide ion C₂²⁻ the carbon atoms are joined by a triple bond."},"Al4C3":{"x":[180.8,31,"<text transform='translate(162.3 8)' y='.36em'>Al³⁺</text><text transform='translate(136.4 23)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(110.4 8)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(84.4 23)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(58.9 8)' dominant-baseline='central'><tspan x='0' y='0'>C⁴⁻</tspan></text><text transform='translate(32.9 23)' dominant-baseline='central'><tspan x='0' y='0'>C⁴⁻</tspan></text><text transform='translate(17.8 8)' text-anchor='end' y='.36em'>C⁴⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Mg2Si":{"x":[80,30.6,"<text transform='translate(56.9 7.6)' y='.36em'>Mg²⁺</text><text transform='translate(30.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Mg²⁺</tspan></text><text transform='translate(19.3 7.6)' text-anchor='end' y='.36em'>Si⁴⁻</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KCN":{"x":[68.4,30.6,"<path d='M11.6 6.7L30.7 17.7M8.2 12.6L27.3 23.6M11 10.2L27.9 20'/><text transform='translate(55.1 7.6)' y='.36em'>K⁺</text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KSCN":{"x":[94.4,45.6,"<path d='M37 25.2L53.9 35M11.6 6.7L30.7 17.7M8.2 12.5L27.3 23.5M11 10.2L27.9 20'/><text transform='translate(81.1 22.6)' y='.36em'>K⁺</text><text transform='translate(55.3 37.6)' dominant-baseline='central'><tspan x='0' y='0'>S⁻</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe(SCN)3":{"x":[255.8,75.6,"<path d='M192.9 55.2L209.7 65M167.5 36.7L186.6 47.7M164.1 42.6L183.2 53.6M166.9 40.2L183.8 50M114.9 40.2L131.8 50M89.6 21.7L108.6 32.7M86.2 27.6L105.2 38.6M88.9 25.2L105.8 35M37 25.2L53.9 35M11.6 6.7L30.7 17.7M8.2 12.6L27.3 23.6M11 10.2L27.9 20'/><text transform='translate(234.8 52.6)' y='.36em'>Fe³⁺</text><text transform='translate(211.2 67.6)' dominant-baseline='central'><tspan x='0' y='0'>S⁻</tspan></text><text transform='translate(184.8 52.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(159.1 37.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(133.3 52.6)' dominant-baseline='central'><tspan x='0' y='0'>S⁻</tspan></text><text transform='translate(106.9 37.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(81.1 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(55.3 37.6)' dominant-baseline='central'><tspan x='0' y='0'>S⁻</tspan></text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2SO4":{"x":[127.7,56.6,"<path d='M67.5 36.2L84.4 46M52.5 10.3L62.9 28.4M48.1 12.9L58.5 30.9M67.5 30.9L77.9 12.9M63.1 28.4L73.5 10.3M45 44L58.5 36.2'/><text transform='translate(108.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(59.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(51.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 33.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2SO4":{"x":[122,56.6,"<path d='M64.6 36.2L81.5 46M49.6 10.3L60 28.4M45.2 12.9L55.6 30.9M64.6 30.9L75 12.9M60.2 28.4L70.6 10.3M42.1 44L55.5 36.2'/><text transform='translate(108.8 33.6)' y='.36em'>K⁺</text><text transform='translate(82.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(57 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(48.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(71.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 33.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ag2SO4":{"x":[127.7,56.6,"<path d='M67.4 36.2L84.3 46M52.4 10.3L62.8 28.4M48 12.9L58.4 30.9M67.4 30.9L77.8 12.9M63 28.4L73.4 10.3M44.9 44L58.3 36.2'/><text transform='translate(109.3 33.6)' y='.36em'>Ag⁺</text><text transform='translate(85.1 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(59.8 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(51.6 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.2 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.2 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(18.4 33.6)' text-anchor='end' y='.36em'>Ag⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuSO4":{"x":[100.5,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78.5 33.6)' y='.36em'>Cu²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnSO4":{"x":[100.3,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(79.3 33.6)' y='.36em'>Zn²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeSO4":{"x":[100.1,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(79 33.6)' y='.36em'>Fe²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MgSO4":{"x":[101,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78 33.6)' y='.36em'>Mg²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaSO4":{"x":[100.3,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78.3 33.6)' y='.36em'>Ca²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"BaSO4":{"x":[100.1,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78.6 33.6)' y='.36em'>Ba²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"PbSO4":{"x":[100.3,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78.8 33.6)' y='.36em'>Pb²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MnSO4":{"x":[101,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(78 33.6)' y='.36em'>Mn²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NiSO4":{"x":[99,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.1'/><text transform='translate(80 33.6)' y='.36em'>Ni²⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Al2(SO4)3":{"x":[280.8,83,"<path d='M193 46L209.9 36.3M173.5 69.4L183.9 51.4M177.9 71.9L188.3 53.9M188.5 53.9L198.9 71.9M192.9 51.4L203.3 69.4M167 36.3L183.9 46M115 36.3L131.9 46M100 10.4L110.4 28.4M95.6 12.9L106 31M115 31L125.4 12.9M110.6 28.4L121 10.4M92.5 44.1L105.9 36.3M37.1 46L54 36.3M9.4 59.2L27.2 48.8M11.9 63.5L29.7 53.2M22 25.4L32.5 43.4M17.6 27.9L28 46M35.2 53.3L44.9 70'/><text transform='translate(262.4 33.7)' y='.36em'>Al³⁺</text><text transform='translate(236.4 48.7)' dominant-baseline='central'><tspan x='0' y='0'>Al³⁺</tspan></text><text transform='translate(210.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(185.4 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(177.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(199.7 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(132.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(107.4 33.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(99.2 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(10.3 63.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 22.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 74.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Fe2(SO4)3":{"x":[281.9,83,"<path d='M193 46L209.9 36.3M173.5 69.4L183.9 51.4M177.9 71.9L188.3 53.9M188.5 53.9L198.9 71.9M192.9 51.4L203.3 69.4M167 36.3L183.9 46M115 36.3L131.9 46M100 10.4L110.4 28.4M95.6 12.9L106 31M115 31L125.4 12.9M110.6 28.4L121 10.4M92.5 44.1L105.9 36.3M37.1 46L54 36.3M9.4 59.2L27.2 48.8M11.9 63.5L29.7 53.2M22 25.4L32.5 43.4M17.6 27.9L28 46M35.2 53.3L44.9 70'/><text transform='translate(260.9 33.7)' y='.36em'>Fe³⁺</text><text transform='translate(234.9 48.7)' dominant-baseline='central'><tspan x='0' y='0'>Fe³⁺</tspan></text><text transform='translate(210.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(185.4 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(177.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(199.7 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(132.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(107.4 33.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(99.2 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(10.3 63.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 22.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 74.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cr2(SO4)3":{"x":[281.2,83,"<path d='M193 46L209.9 36.3M173.5 69.4L183.9 51.4M177.9 71.9L188.3 53.9M188.5 53.9L198.9 71.9M192.9 51.4L203.3 69.4M167 36.3L183.9 46M115 36.3L131.9 46M100 10.4L110.4 28.4M95.6 12.9L106 31M115 31L125.4 12.9M110.6 28.4L121 10.4M92.5 44.1L105.9 36.3M37.1 46L54 36.3M9.4 59.2L27.2 48.8M11.9 63.5L29.7 53.2M22 25.4L32.5 43.4M17.6 27.9L28 46M35.2 53.3L44.9 70'/><text transform='translate(261.3 33.7)' y='.36em'>Cr³⁺</text><text transform='translate(235.3 48.7)' dominant-baseline='central'><tspan x='0' y='0'>Cr³⁺</tspan></text><text transform='translate(210.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(185.4 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(177.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(199.7 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(132.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(107.4 33.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(99.2 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.5 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(10.3 63.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 22.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 74.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CuSO4·5H2O":{"x":[232,56.6,"<path d='M168.5 36.3L185.4 46M153.5 10.4L163.9 28.4M149.1 12.9L159.5 31M168.5 31L178.9 12.9M164.1 28.4L174.5 10.4M146 44.1L159.5 36.3'/><text transform='translate(210 33.7)' y='.36em'>Cu²⁺</text><text transform='translate(186.3 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(160.9 33.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(152.7 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(175.3 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(134.3 48.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(108.3 33.7)' text-anchor='middle' dominant-baseline='central'>H₂<tspan class='o'>O</tspan></text><text transform='translate(82.3 48.7)' text-anchor='middle' dominant-baseline='central'>H₂<tspan class='o'>O</tspan></text><text transform='translate(56.4 33.7)' text-anchor='middle' dominant-baseline='central'>H₂<tspan class='o'>O</tspan></text><text transform='translate(30.4 48.7)' text-anchor='middle' dominant-baseline='central'>H₂<tspan class='o'>O</tspan></text><text transform='translate(11.8 33.7)' text-anchor='middle' dominant-baseline='central'>H₂<tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. Кристаллогидрат: на каждую формульную единицу CuSO₄ приходится пять молекул воды.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. A crystal hydrate: there are five water molecules for every CuSO₄ formula unit."},"NaHSO4":{"x":[97.2,67.9,"<path d='M37.1 36.2L50.7 44.1M11.9 18.8L29.7 29.1M9.4 23.1L27.2 33.4M37 30.9L47.5 12.9M32.6 28.4L43 10.3M20.2 55L29.9 38.2'/><text transform='translate(78.3 33.6)' y='.36em'>Na⁺</text><text transform='translate(51.3 48.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(29.5 33.6)' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2SO3":{"x":[127.7,60.6,"<path d='M67.5 40.2L84.4 50M65.5 33L65.5 12.2M60.4 33L60.4 12.2M45 48L58.5 40.2'/><text transform='translate(108.7 37.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(66.1 37.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2SO3":{"x":[122,60.6,"<path d='M64.6 40.2L81.5 50M62.6 33L62.6 12.2M57.5 33L57.5 12.2M42.1 48L55.5 40.2'/><text transform='translate(108.8 37.6)' y='.36em'>K⁺</text><text transform='translate(82.4 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(63.2 37.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(56.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 37.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaSO3":{"x":[100.3,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Ca²⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(35.6 37.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaHSO3":{"x":[97.2,61,"<path d='M37.1 40.2L50.7 48.1M9.4 48.1L27.2 37.8M11.9 52.4L29.7 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Na⁺</text><text transform='translate(51.3 52.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(35.6 37.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2S2O3":{"x":[127.7,56.6,"<path d='M67.5 36.2L84.4 46M52.5 10.3L62.9 28.4M48.1 12.9L58.5 30.9M67.5 30.9L77.9 12.9M63.1 28.4L73.5 10.3M45 44L58.5 36.2'/><text transform='translate(108.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(59.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(51.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.9 7.6)' y='.36em'>S</text><text transform='translate(33.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 33.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2S4O6":{"x":[205.7,82.9,"<path d='M145.5 36.2L162.4 46M130.4 10.3L140.9 28.3M126 12.9L136.4 30.9M145.4 30.9L155.9 12.9M141 28.3L151.4 10.3M119.5 46L136.4 36.2M93.5 36.2L110.4 46M67.5 46L84.4 36.2M48.1 69.3L58.5 51.3M52.5 71.9L62.9 53.8M63.1 53.8L73.5 71.9M67.5 51.3L77.9 69.3M41.6 36.2L58.5 46'/><text transform='translate(186.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(163.2 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(137.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(129.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(152.2 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(111.9 48.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(85.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(59.9 48.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(51.7 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.3 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 48.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaNO3":{"x":[97.2,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Na⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"KNO3":{"x":[94.5,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(81.2 37.6)' y='.36em'>K⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"AgNO3":{"x":[97.4,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(79 37.6)' y='.36em'>Ag⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Cu(NO3)2":{"x":[178.5,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(156.5 37.7)' y='.36em'>Cu²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Pb(NO3)2":{"x":[178.2,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(156.7 37.7)' y='.36em'>Pb²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Ba(NO3)2":{"x":[178,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(156.5 37.7)' y='.36em'>Ba²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Mg(NO3)2":{"x":[179,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(155.9 37.7)' y='.36em'>Mg²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Zn(NO3)2":{"x":[178.2,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(157.2 37.7)' y='.36em'>Zn²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Fe(NO3)2":{"x":[178,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(157 37.7)' y='.36em'>Fe²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Hg(NO3)2":{"x":[178.5,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(156.5 37.7)' y='.36em'>Hg²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Ca(NO3)2":{"x":[178.3,91,"<path d='M115 40.3L131.9 50.1M113 32.3L113 12.3M107.9 32.3L107.9 12.3M92.5 48.1L104.5 41.1M38.4 49.4L54 40.3M11.9 37.9L29.1 47.8M9.4 42.2L26.6 52.2M32.5 57.9L32.5 77.4'/><text transform='translate(156.2 37.7)' y='.36em'>Ca²⁺</text><text transform='translate(132.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Fe(NO3)3":{"x":[256,91,"<path d='M193 40.3L209.9 50M191 32.3L191 12.3M185.9 32.3L185.9 12.3M170.4 48.1L182.5 41.1M116.3 49.3L131.9 40.3M107.9 57.3L107.9 78.1M113 57.3L113 78.1M89.1 40.3L104.5 49.2M37.1 40.3L54 50M9.4 48.2L26.6 38.1M11.9 52.5L29.2 42.6M32.5 32.4L32.5 12.9'/><text transform='translate(234.9 37.7)' y='.36em'>Fe³⁺</text><text transform='translate(210.7 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(193.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(184.7 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(132.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"Al(NO3)3":{"x":[254.8,91,"<path d='M193 40.3L209.9 50M191 32.3L191 12.3M185.9 32.3L185.9 12.3M170.4 48.1L182.5 41.1M116.3 49.3L131.9 40.3M107.9 57.3L107.9 78.1M113 57.3L113 78.1M89.1 40.3L104.5 49.2M37.1 40.3L54 50M9.4 48.2L26.6 38.1M11.9 52.5L29.2 42.6M32.5 32.4L32.5 12.9'/><text transform='translate(236.4 37.7)' y='.36em'>Al³⁺</text><text transform='translate(210.7 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(193.8 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(184.7 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(158.7 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(132.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(115.8 52.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(106.8 82.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 37.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 37.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 52.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"NaNO2":{"x":[97.2,31.4,"<path d='M37.1 10.6L54 20.4M11.7 25.9L32.5 13.9M11.1 20.4L28 10.6'/><text transform='translate(78.3 8)' y='.36em'>Na⁺</text><text transform='translate(54.8 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 8)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(10.3 23)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KNO2":{"x":[94.5,31.4,"<path d='M37.1 10.6L54 20.4M11.7 25.9L32.5 13.9M11.1 20.4L28 10.6'/><text transform='translate(81.2 8)' y='.36em'>K⁺</text><text transform='translate(54.8 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 8)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(10.3 23)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2CO3":{"x":[127.7,60.6,"<path d='M67.5 40.2L84.4 50M65.5 33L65.5 12.2M60.4 33L60.4 12.2M45 48L58.5 40.2'/><text transform='translate(108.7 37.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(66.5 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2CO3":{"x":[122,60.6,"<path d='M64.6 40.2L81.5 50M62.6 33L62.6 12.2M57.5 33L57.5 12.2M42.1 48L55.5 40.2'/><text transform='translate(108.8 37.6)' y='.36em'>K⁺</text><text transform='translate(82.4 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(63.6 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(56.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30.4 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(13.2 37.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaCO3":{"x":[100.3,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Ca²⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"BaCO3":{"x":[100.1,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.6 37.6)' y='.36em'>Ba²⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"MgCO3":{"x":[101,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78 37.6)' y='.36em'>Mg²⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaHCO3":{"x":[97.2,61,"<path d='M37.1 40.2L50.7 48.1M9.4 48.1L27.2 37.8M11.9 52.4L29.7 42.1M32.5 32.4L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Na⁺</text><text transform='translate(51.3 52.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(36 37.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca(HCO3)2":{"x":[178.3,91,"<path d='M115 40.3L128.7 48.2M113 33.1L113 12.3M107.9 33.1L107.9 12.3M92.5 48.1L105.9 40.3M37.1 50.1L50.7 42.2M11.9 37.9L29.7 48.2M9.4 42.2L27.2 52.5M32.5 57.9L32.5 77.4'/><text transform='translate(156.2 37.7)' y='.36em'>Ca²⁺</text><text transform='translate(129.3 52.7)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(114 37.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(106.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.8 52.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(51.3 37.7)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(36 52.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 37.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 82.7)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Cu2(OH)2CO3":{"x":[178.5,61.4,"<path d='M37.1 20.4L54 10.7M11.8 8.1L29.8 18.5M9.3 12.5L27.3 23M32.5 28.3L32.5 47.8'/><text transform='translate(156.5 8)' y='.36em'>Cu²⁺</text><text transform='translate(130.5 23)' dominant-baseline='central'><tspan x='0' y='0'>Cu²⁺</tspan></text><text transform='translate(106.8 8)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(80.8 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(54.8 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(36 23)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 8)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 53)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. Основная соль: кроме карбонат-ионов в ней есть гидроксид-ионы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. A basic salt: besides carbonate ions it contains hydroxide ions."},"Na2SiO3":{"x":[127.7,60.6,"<path d='M69.7 41.5L84.4 50M65.5 30.3L65.5 12.2M60.4 30.3L60.4 12.2M41.6 50L56.3 41.5'/><text transform='translate(108.7 37.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(67 37.6)' text-anchor='end' y='.36em'>Si</text><text transform='translate(59.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(19 37.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaSiO3":{"x":[100.3,61,"<path d='M39.2 41.5L54 50M9.3 48.1L25 39M11.8 52.5L27.5 43.5M32.5 29.9L32.5 12.9'/><text transform='translate(78.3 37.6)' y='.36em'>Ca²⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(36.5 37.6)' text-anchor='end' y='.36em'>Si</text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na3PO4":{"x":[149.2,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M35.2 29L44.9 12.1M20.2 55L29.9 38.1'/><text transform='translate(130.3 33.6)' y='.36em'>Na⁺</text><text transform='translate(104.3 48.6)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(78.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 33.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ag3PO4":{"x":[149.4,67.9,"<path d='M37.1 36.2L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.5M35.2 29L44.9 12.1M20.2 55L29.9 38.1'/><text transform='translate(131 33.6)' y='.36em'>Ag⁺</text><text transform='translate(105 48.6)' dominant-baseline='central'><tspan x='0' y='0'>Ag⁺</tspan></text><text transform='translate(79 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Ag⁺</tspan></text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 33.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca3(PO4)2":{"x":[230.2,82.9,"<path d='M115 36.2L131.9 46M100 10.3L110.4 28.3M95.6 12.9L106 30.9M113.1 29L122.9 12.2M92.5 44L105.9 36.2M37.1 46L54 36.2M9.4 59.1L27.2 48.8M11.9 63.4L29.7 53.1M20.2 27.1L29.9 44M35.2 53.2L44.9 70'/><text transform='translate(208.2 33.6)' y='.36em'>Ca²⁺</text><text transform='translate(182.2 48.6)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(156.2 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Ca²⁺</tspan></text><text transform='translate(132.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(107.2 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(99.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(80.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 48.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(10.3 63.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(23.1 22.6)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(43.8 74.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2HPO4":{"x":[127.7,56.6,"<path d='M67.5 36.2L81.2 44.1M52.5 10.3L62.9 28.4M48.1 12.9L58.5 30.9M65.6 29L75.4 12.2M45 44L58.5 36.2'/><text transform='translate(108.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(81.8 48.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(59.7 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(51.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.3 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(33.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(19 33.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"CaHPO4":{"x":[100.3,67.9,"<path d='M37.1 36.2L50.7 44.1M11.9 18.8L29.7 29.1M9.4 23.1L27.2 33.4M35.2 29L44.9 12.2M20.2 55L29.9 38.2'/><text transform='translate(78.3 33.6)' y='.36em'>Ca²⁺</text><text transform='translate(51.3 48.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(29.3 33.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaH2PO4":{"x":[97.2,67.9,"<path d='M37.1 36.2L50.7 44.1M11.9 18.8L29.7 29.1M9.4 23.1L27.2 33.4M35.2 29L44.9 12.2M20.2 55L29.9 38.2'/><text transform='translate(78.3 33.6)' y='.36em'>Na⁺</text><text transform='translate(51.3 48.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(29.3 33.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca(H2PO4)2":{"x":[178.3,82.9,"<path d='M115 36.2L128.7 44.1M100 10.3L110.4 28.4M95.6 12.9L106 30.9M113.1 29L122.9 12.2M92.5 44L105.9 36.2M37.1 46L50.7 38.1M9.4 59.1L27.2 48.8M11.9 63.4L29.7 53.1M20.2 27.2L29.9 44M35.2 53.2L44.9 70'/><text transform='translate(156.2 33.6)' y='.36em'>Ca²⁺</text><text transform='translate(129.3 48.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(107.2 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>P</tspan></text><text transform='translate(99.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.8 7.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(80.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(51.3 33.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(29.3 48.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 63.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 22.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(43.8 74.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaH2PO2":{"x":[97.1,67.9,"<path d='M37 36.2L53.9 46M11 21.2L27.9 31M36.9 30.9L47.3 12.9M32.5 28.4L42.9 10.3M20.1 55L29.8 38.1'/><text transform='translate(78.2 33.6)' y='.36em'>Na⁺</text><text transform='translate(55.1 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(29.1 33.6)' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(43.7 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.7 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. В гипофосфит-ионе два атома водорода связаны прямо с фосфором.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. In the hypophosphite ion two hydrogen atoms are bonded directly to phosphorus."},"NaClO":{"x":[71.9,30.6,"<path d='M14 11.5L28.7 20'/><text transform='translate(53.1 7.6)' y='.36em'>Na⁺</text><text transform='translate(29.6 22.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Ca(ClO)2":{"x":[127,31,"<path d='M65.9 11.8L80.7 20.3M14 11.8L28.7 20.3'/><text transform='translate(105 8)' y='.36em'>Ca²⁺</text><text transform='translate(81.5 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.8 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl</tspan></text><text transform='translate(29.6 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(11.8 8)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaClO3":{"x":[97.2,61,"<path d='M39.2 41.5L54 50M9.3 48.1L25 39M11.8 52.5L27.5 43.5M35.1 30.4L35.1 12.2M30 30.4L30 12.2'/><text transform='translate(78.3 37.6)' y='.36em'>Na⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KClO3":{"x":[94.5,61,"<path d='M39.2 41.5L54 50M9.3 48.1L25 39M11.8 52.5L27.5 43.5M35.1 30.4L35.1 12.2M30 30.4L30 12.2'/><text transform='translate(81.2 37.6)' y='.36em'>K⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37 37.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KClO4":{"x":[94.5,67.9,"<path d='M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26L43 10.3M17.6 54.3L26.7 38.6M22 56.9L31.1 41.2'/><text transform='translate(81.2 33.6)' y='.36em'>K⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(28.1 33.6)' y='.36em'><tspan class='x'>Cl</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KIO3":{"x":[94.5,61,"<path d='M37.1 40.2L54 50M9.3 48.1L27.3 37.7M11.8 52.5L29.8 42.1M35.1 33L35.1 12.2M30 33L30 12.2'/><text transform='translate(81.2 37.6)' y='.36em'>K⁺</text><text transform='translate(54.8 52.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(33.6 37.6)' text-anchor='end' y='.36em'><tspan class='x'>I</tspan></text><text transform='translate(10.3 52.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"KMnO4":{"x":[94.5,67.9,"<path d='M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26L43 10.3M17.6 54.3L26.7 38.6M22 56.9L31.1 41.2'/><text transform='translate(81.2 33.6)' y='.36em'>K⁺</text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(26 33.6)' y='.36em'>Mn</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2MnO4":{"x":[122,56.6,"<path d='M66.8 37.5L81.5 46M49.6 10.3L58.7 26M45.2 12.9L54.3 28.6M65.9 28.6L75 12.9M61.5 26L70.6 10.3M38.7 46L53.4 37.5'/><text transform='translate(108.8 33.6)' y='.36em'>K⁺</text><text transform='translate(82.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(53.6 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Mn</tspan></text><text transform='translate(48.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(71.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27.1 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(13.2 33.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2CrO4":{"x":[122,56.6,"<path d='M66.8 37.5L81.5 46M49.6 10.3L58.7 26M45.2 12.9L54.3 28.6M65.9 28.6L75 12.9M61.5 26L70.6 10.3M38.7 46L53.4 37.5'/><text transform='translate(108.8 33.6)' y='.36em'>K⁺</text><text transform='translate(82.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(55 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(48.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(71.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27.1 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(13.2 33.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2CrO4":{"x":[127.7,56.6,"<path d='M69.7 37.5L84.4 46M52.5 10.3L61.6 26M48.1 12.9L57.2 28.6M68.8 28.6L77.9 12.9M64.4 26L73.5 10.3M41.6 46L56.3 37.5'/><text transform='translate(108.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(85.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(57.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(51.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(19 33.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2Cr2O7":{"x":[174,56.5,"<path d='M118.7 37.4L133.5 46M101.6 10.3L110.6 26M97.1 12.9L106.2 28.6M117.9 28.6L127 12.9M113.5 26L122.6 10.3M90.6 46L105.4 37.4M66.8 37.4L81.5 46M49.6 10.3L58.7 26M45.2 12.9L54.3 28.6M65.9 28.6L75 12.9M61.5 26L70.6 10.3M38.7 46L53.4 37.4'/><text transform='translate(160.7 33.6)' y='.36em'>K⁺</text><text transform='translate(134.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(106.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(100.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(123.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(82.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(55 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(48.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(71.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27.1 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(13.2 33.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2Cr2O7":{"x":[179.7,56.5,"<path d='M121.6 37.4L136.4 46M104.5 10.3L113.5 26M100 12.9L109.1 28.6M120.8 28.6L129.9 12.9M116.4 26L125.5 10.3M93.5 46L108.3 37.4M69.7 37.4L84.4 46M52.5 10.3L61.6 26M48.1 12.9L57.2 28.6M68.8 28.6L77.9 12.9M64.4 26L73.5 10.3M41.6 46L56.3 37.4'/><text transform='translate(160.7 33.6)' y='.36em'>Na⁺</text><text transform='translate(137.2 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(109.8 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(103.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(126.2 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(85.3 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(57.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(51.7 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(74.3 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(30 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(19 33.6)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"K2FeO4":{"x":[122,56.6,"<path d='M66.8 37.5L81.5 46M49.6 10.3L58.7 26M45.2 12.9L54.3 28.6M65.9 28.6L75 12.9M61.5 26L70.6 10.3M38.7 46L53.4 37.5'/><text transform='translate(108.8 33.6)' y='.36em'>K⁺</text><text transform='translate(82.4 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(54.6 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Fe</tspan></text><text transform='translate(48.8 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(71.4 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(27.1 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(13.2 33.6)' text-anchor='end' y='.36em'>K⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaAlO2":{"x":[97.2,31.4,"<path d='M39.2 11.8L54 20.4M11.7 25.9L30.1 15.3M11.1 20.4L25.9 11.8'/><text transform='translate(78.3 8)' y='.36em'>Na⁺</text><text transform='translate(54.8 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(28.6 8)' dominant-baseline='central'><tspan x='0' y='0'>Al</tspan></text><text transform='translate(10.3 23)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaFeO2":{"x":[97.2,31.4,"<path d='M39.2 11.8L54 20.4M11.7 25.9L30.1 15.3M11.1 20.4L25.9 11.8'/><text transform='translate(78.3 8)' y='.36em'>Na⁺</text><text transform='translate(54.8 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(27.1 8)' dominant-baseline='central'><tspan x='0' y='0'>Fe</tspan></text><text transform='translate(10.3 23)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NaCrO2":{"x":[97.2,31.4,"<path d='M39.2 11.8L54 20.4M11.7 25.9L30.1 15.3M11.1 20.4L25.9 11.8'/><text transform='translate(78.3 8)' y='.36em'>Na⁺</text><text transform='translate(54.8 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(27.4 8)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(10.3 23)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na2ZnO2":{"x":[127.7,31,"<path d='M69.7 11.8L84.4 20.3M41.6 20.3L56.3 11.8'/><text transform='translate(108.7 8)' y='.36em'>Na⁺</text><text transform='translate(85.3 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(57.7 8)' dominant-baseline='central'><tspan x='0' y='0'>Zn</tspan></text><text transform='translate(30 23)' dominant-baseline='central'><tspan class='o' x='0' y='0'>⁻O</tspan></text><text transform='translate(19 8)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NH4Cl":{"x":[93.9,68,"<path d='M69.2 29.1L82.8 21.2M49 12.2L58.8 29M64 38.2L73.8 55M40 46L56.8 36.2'/><text transform='translate(84.1 18.6)' y='.36em'>H</text><text transform='translate(58.1 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(49.7 7.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(73.1 59.6)' y='.36em'>H</text><text transform='translate(32.1 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(15.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NH4NO3":{"x":[142.9,87,"<path d='M118.3 29.1L131.9 21.2M98.1 12.2L107.9 29M113.1 38.2L122.9 55M89.1 46L105.9 36.2M38.4 45.3L54 36.2M11.9 33.8L29.1 43.7M9.4 38.1L26.6 48.1M32.5 53.9L32.5 73.4'/><text transform='translate(133.2 18.6)' y='.36em'>H</text><text transform='translate(107.2 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(98.8 7.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(122.2 59.6)' y='.36em'>H</text><text transform='translate(81.2 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(54.8 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(37.9 48.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(10.3 33.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 78.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу. «+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown. The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"NH4NO2":{"x":[142.9,67.9,"<path d='M118.3 29.1L131.9 21.2M98.1 12.2L107.9 29M113.1 38.2L122.9 55M89.1 46L105.9 36.2M37.1 46L54 36.2M11.7 30.7L32.5 42.7M11.1 36.2L28 46'/><text transform='translate(133.2 18.6)' y='.36em'>H</text><text transform='translate(107.2 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(98.8 7.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(122.2 59.6)' y='.36em'>H</text><text transform='translate(81.2 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(54.8 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(29.3 48.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(10.3 33.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"(NH4)2SO4":{"x":[220.8,83,"<path d='M194.2 30.3L209.7 21.3M175.9 12.3L185.7 29.1M190.9 38.2L200.7 55M166.9 46L182.4 37.1M114.9 46L131.8 36.3M95.5 69.4L105.9 51.4M99.9 71.9L110.3 53.9M110.5 53.9L120.9 71.9M114.9 51.4L125.3 69.4M88.9 36.3L105.8 46M37 36.3L53.9 46M11 21.3L27.9 31M35.6 28.3L44.8 12.3M20.1 55L29.8 38.3'/><text transform='translate(211 18.7)' y='.36em'>H</text><text transform='translate(193.7 33.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(176.6 7.7)' text-anchor='end' y='.36em'>H</text><text transform='translate(200 59.6)' y='.36em'>H</text><text transform='translate(159.1 48.7)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(132.6 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(107.3 48.7)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(99.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.7 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(55.1 48.7)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(29.1 33.7)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(9.7 18.7)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"(NH4)2CO3":{"x":[220.8,87,"<path d='M194.2 30.3L209.7 21.3M175.9 12.3L185.7 29.1M190.9 38.2L200.7 55M166.9 46L182.4 37.1M114.9 46L131.8 36.3M107.8 53.3L107.8 74.1M112.9 53.3L112.9 74.1M88.9 36.3L105.8 46M37 36.3L53.9 46M11 21.3L27.9 31M35.6 28.3L44.8 12.3M20.1 55L29.8 38.3'/><text transform='translate(211 18.7)' y='.36em'>H</text><text transform='translate(193.7 33.7)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(176.6 7.7)' text-anchor='end' y='.36em'>H</text><text transform='translate(200 59.6)' y='.36em'>H</text><text transform='translate(159.1 48.7)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(132.6 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(113.9 48.7)' text-anchor='end' y='.36em'>C</text><text transform='translate(106.7 78.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.7 33.7)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(55.1 48.7)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(29.1 33.7)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(9.7 18.7)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NH4HCO3":{"x":[142.9,87,"<path d='M118.3 29.1L131.9 21.2M98.1 12.2L107.9 29M113.1 38.2L122.9 55M89.1 46L105.9 36.2M37.1 46L50.7 38.1M11.9 33.8L29.7 44.1M9.4 38.1L27.2 48.4M32.5 53.9L32.5 73.4'/><text transform='translate(133.2 18.6)' y='.36em'>H</text><text transform='translate(107.2 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(98.8 7.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(122.2 59.6)' y='.36em'>H</text><text transform='translate(81.2 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(51.3 33.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(36 48.6)' text-anchor='end' y='.36em'>C</text><text transform='translate(10.3 33.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(28.8 78.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"NH4H2PO4":{"x":[148,102,"<path d='M119.5 63.6L136.3 63.6M111.6 38.9L111.6 58.4M111.6 68.9L111.6 88.4M86.8 63.6L106.3 63.6M41.8 37.6L58.7 37.6M11.2 35.1L32 35.1M11.2 40.2L32 40.2M36.6 12.9L36.6 32.4M36.6 42.9L36.6 62.4'/><text transform='translate(138.3 63.6)' y='.36em'>H</text><text transform='translate(108.3 63.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(114.8 33.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(108.3 93.6)' y='.36em'>H</text><text transform='translate(78.3 63.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(59.3 37.6)' dominant-baseline='central'><tspan class='o'>O</tspan>H</text><text transform='translate(39.8 37.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 37.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(40.3 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(32.8 67.6)' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"(NH4)2S":{"x":[168.8,67.9,"<path d='M144.2 29.1L157.8 21.2M124 12.2L133.7 29M139 38.2L148.7 55M114.9 46L131.8 36.2M37 36.2L53.9 46M11 21.2L27.9 31M35.6 28.2L44.8 12.2M20.1 55L29.8 38.2'/><text transform='translate(159.1 18.6)' y='.36em'>H</text><text transform='translate(133.1 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(124.6 7.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(148.1 59.6)' y='.36em'>H</text><text transform='translate(107.1 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(81.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S²⁻</tspan></text><text transform='translate(55.1 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(29.1 33.6)' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.6)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"(NH4)2Cr2O7":{"x":[272.7,83,"<path d='M246.1 30.3L261.7 21.3M227.9 12.3L237.7 29M242.9 38.2L252.7 55M218.8 46L234.3 37.1M169 44.8L183.8 36.3M147.4 69.4L156.5 53.7M151.8 71.9L160.9 56.2M163.8 56.2L172.8 71.9M168.2 53.7L177.2 69.4M140.9 36.3L155.7 44.8M117 44.8L131.8 36.3M95.5 69.4L104.5 53.7M99.9 71.9L108.9 56.2M111.8 56.2L120.9 71.9M116.2 53.7L125.3 69.4M88.9 36.3L103.7 44.8M37 36.3L53.9 46M11 21.3L27.9 31M35.6 28.2L44.8 12.3M20.1 55L29.8 38.2'/><text transform='translate(263 18.6)' y='.36em'>H</text><text transform='translate(245.6 33.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(228.6 7.7)' text-anchor='end' y='.36em'>H</text><text transform='translate(252 59.6)' y='.36em'>H</text><text transform='translate(211 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(184.6 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(157.2 48.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(151.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(173.6 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(132.6 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(105.3 48.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(99.1 74.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(121.7 74.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(80.7 33.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(55.1 48.6)' dominant-baseline='central'><tspan x='0' y='0'>H</tspan></text><text transform='translate(29.1 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"AlOHCl2":{"x":[101.8,31.4,"<path d='M65.9 20.4L80.7 11.8'/><text transform='translate(83.4 8)' y='.36em'>Al³⁺</text><text transform='translate(61.2 23)' text-anchor='end' dominant-baseline='central'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"FeOHCl2":{"x":[102.9,31.4,"<path d='M65.9 20.4L80.7 11.8'/><text transform='translate(81.9 8)' y='.36em'>Fe³⁺</text><text transform='translate(61.2 23)' text-anchor='end' dominant-baseline='central'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(30.9 8)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl⁻</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"ZnOHCl":{"x":[77.1,30.6,"<path d='M40 20L54.7 11.5'/><text transform='translate(56.1 7.6)' y='.36em'>Zn²⁺</text><text transform='translate(35.2 22.6)' text-anchor='end' dominant-baseline='central'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(15.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"(CuOH)2SO4":{"x":[187.3,57.4,"<path d='M149.9 20.4L164.6 11.9M97.9 20.4L114.8 10.7M78.4 43.8L88.9 25.7M82.9 46.3L93.3 28.3M93.4 28.3L103.9 46.3M97.9 25.7L108.3 43.8M71.9 10.7L88.8 20.4M20 10.7L34.7 19.2'/><text transform='translate(165.3 8)' y='.36em'>Cu²⁺</text><text transform='translate(145.1 23)' text-anchor='end' dominant-baseline='central'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(115.6 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(90.3 23)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(82.1 49)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(104.6 49)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(63.7 8)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(35.4 23)' dominant-baseline='central'><tspan x='0' y='0'>Cu²⁺</tspan></text><text transform='translate(21 8)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"],"n":"Ионное вещество: оно состоит из ионов, а не из молекул. Показаны ионы, которые входят в формулу.","ne":"Ionic compound: it is made of ions, not molecules. The ions that make up the formula are shown."},"Na[Al(OH)4]":{"x":[84.8,72.8,"<path d='M20.6 34.4L37.6 36.2M35.2 59.6L42.1 44M40.1 12.8L43.6 29.5M50.9 42.2L63.6 53.6'/><text transform='translate(65 22)' y='.36em'>Na⁺</text><text transform='translate(41.2 37)' y='.36em'>Al³⁺</text><text transform='translate(21 33.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(38.6 64.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(44.6 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(63.8 57.1)' y='.36em'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"K[Al(OH)4]":{"x":[84.8,72.8,"<path d='M20.6 34.4L37.6 36.2M35.2 59.6L42.1 44M40.1 12.8L43.6 29.5M50.9 42.2L63.6 53.6'/><text transform='translate(67.9 22)' y='.36em'>K⁺</text><text transform='translate(41.2 37)' y='.36em'>Al³⁺</text><text transform='translate(21 33.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(38.6 64.4)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(44.6 7.7)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(63.8 57.1)' y='.36em'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"Na2[Zn(OH)4]":{"x":[109.3,71.8,"<path d='M63.5 41.3L65.2 58.3M46.1 15.2L57.5 27.9M70.2 35.2L86.9 38.8M40 43.7L52.6 38.1'/><text transform='translate(71.4 7.7)' y='.36em'>Na⁺</text><text transform='translate(71.4 33.6)' text-anchor='end' y='.36em'>Zn²⁺</text><text transform='translate(62.1 63.5)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(48.2 11.3)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(88.3 39.9)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(35 45.8)' text-anchor='end' dominant-baseline='central'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(18.9 28.2)' text-anchor='end' y='.36em'>Na⁺</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"Na3[Cr(OH)6]":{"x":[136.1,74.3,"<path d='M21.5 39L35.5 38.1M32.1 56.7L41 43.7M28.5 19.2L40.1 31.7M47.6 44.7L52.7 60.9M46.5 29.7L49 12.8M52.5 40.1L68.4 46.3'/><text transform='translate(117.1 22.3)' y='.36em'>Na⁺</text><text transform='translate(91.1 37.3)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(65.1 22.3)' dominant-baseline='central'><tspan x='0' y='0'>Na⁺</tspan></text><text transform='translate(53.8 37.3)' text-anchor='end' y='.36em'>Cr³⁺</text><text transform='translate(21 39.5)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(34.1 62.1)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(30.6 15.3)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(50.5 66)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(46.1 7.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(69.6 48.3)' y='.36em'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"K3[Cr(OH)6]":{"x":[133.3,74.3,"<path d='M21.5 39L35.5 38.1M32.1 56.7L41 43.7M28.5 19.2L40.1 31.7M47.6 44.7L52.7 60.9M46.5 29.7L49 12.8M52.5 40.1L68.4 46.3'/><text transform='translate(120 22.3)' y='.36em'>K⁺</text><text transform='translate(94 37.3)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(68.1 22.3)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(53.8 37.3)' text-anchor='end' y='.36em'>Cr³⁺</text><text transform='translate(21 39.5)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(34.1 62.1)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(30.6 15.3)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(50.5 66)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(46.1 7.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(69.6 48.3)' y='.36em'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"K4[Fe(CN)6]":{"x":[180.1,132.7,"<path d='M52.3 44.5L61.9 58.6M44 63.3L58.6 64.4M68.5 57.6L73.6 41.3M50 82.5L61 70.6M79.9 59.6L89.3 55.9M67.4 72.6L69.9 89.5M38.4 18.1L49 33.7M32.8 21.9L43.4 37.5M35.6 20L46.2 35.6M10.9 57.4L32.1 59.1M10.4 64.2L31.6 65.8M11.7 60.9L31.1 62.4M79.5 33.5L86 12.5M73 31.5L79.5 10.5M76.6 31.3L82.4 12.7M26.9 102.4L40.1 88.2M31.8 107.1L45 92.8M29.3 104.7L42.3 90.8M99.1 55.7L119.6 47.7M96.7 49.4L117.1 41.4M99.1 52.1L117.2 45M68 99.2L71.2 120.8M74.7 98.2L78 119.7M71.5 99.8L74.4 119.1'/><text transform='translate(166.9 65)' y='.36em'>K⁺</text><text transform='translate(140.9 80)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(114.9 65)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(89 80)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(60.8 65)' y='.36em'>Fe²⁺</text><text transform='translate(54.7 40.2)' text-anchor='end' y='.36em'>C⁻</text><text transform='translate(35.7 15.4)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(32.8 62.7)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(9.7 60.5)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(77.1 36.3)' text-anchor='end' y='.36em'>⁻C</text><text transform='translate(80.7 7.7)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(39.1 87)' y='.36em'>⁻C</text><text transform='translate(28.7 109)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(87.4 54)' dominant-baseline='central'><tspan x='0' y='0'>⁻C</tspan></text><text transform='translate(118.8 43.1)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(67.2 94.6)' y='.36em'>C⁻</text><text transform='translate(71.9 124.3)' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"K3[Fe(CN)6]":{"x":[154.3,132.7,"<path d='M44.1 68.6L55.8 67.7M52.4 87.4L62 73.3M49.8 49.1L61.1 61.3M68.6 74.3L73.6 90.6M67.5 59.4L70 42.5M73.5 69.8L89.4 76M10.5 67.8L31.7 66.1M11 74.5L32.2 72.9M11.7 71.1L31.2 69.6M32.9 110L43.5 94.4M38.5 113.9L49.1 98.3M35.7 111.9L46.3 96.4M31.9 24.9L44.3 38.2M27 29.5L39.3 42.8M29.4 27.2L41.8 40.5M73.1 100.5L79.6 121.5M79.6 98.5L86.1 119.5M76.7 100.7L82.5 119.3M75 32.7L78 12.2M68.2 31.7L71.3 11.2M71.6 32.1L74.5 12.8M99.4 83.7L117.2 90.6M101.9 77.3L119.7 84.3M100.7 80.4L117.3 87'/><text transform='translate(141 52)' y='.36em'>K⁺</text><text transform='translate(115 67)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(89 52)' dominant-baseline='central'><tspan x='0' y='0'>K⁺</tspan></text><text transform='translate(75.3 67)' text-anchor='end' y='.36em'>Fe³⁺</text><text transform='translate(32.9 69.2)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(9.8 71.5)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(51.5 91.8)' text-anchor='end' y='.36em'>⁻C</text><text transform='translate(35.8 116.5)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(42.4 45)' y='.36em'>C⁻</text><text transform='translate(28.8 23)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(71.7 95.6)' y='.36em'>C⁻</text><text transform='translate(80.7 124.3)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(64 37.3)' y='.36em'>⁻C</text><text transform='translate(72 7.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(90.8 77.9)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(118.9 88.9)' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"KFe[Fe(CN)6]":{"x":[129.6,131.7,"<path d='M73.7 62L86.2 53.5M66.3 59.8L67.6 42.8M73.1 69.7L89.4 74.7M47.6 50.6L60.1 62.2M68.6 74.6L74.8 90.5M43.8 70.7L58.2 68.6M97 50.3L114 38.7M93.2 44.6L110.1 33.1M95.1 47.5L111 36.6M71.8 32.6L73.2 12.7M65 32.1L66.5 12.2M68.4 32.3L69.9 12.8M100 81.5L117.9 87.1M102.1 75.1L119.9 80.6M101.1 78.3L118.1 83.6M28 27.9L41.1 39.9M23.5 32.8L36.5 44.9M25.7 30.3L38.8 42.5M75 100.3L83.1 120.8M81.4 97.9L89.4 118.3M78.6 100.3L85.8 118.4M10.4 72.3L30.9 69.3M11.4 79.1L31.9 76M11.6 75.6L30.9 72.7'/><text transform='translate(62.5 119.4)' y='.36em'>K⁺</text><text transform='translate(59.7 93.4)' text-anchor='end' y='.36em'>Fe³⁺</text><text transform='translate(60.3 67.4)' dominant-baseline='central'><tspan x='0' y='0'>Fe²⁺</tspan></text><text transform='translate(83.8 50.5)' dominant-baseline='central'><tspan x='0' y='0'>⁻C</tspan></text><text transform='translate(112.1 33.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(61.2 37.5)' y='.36em'>⁻C</text><text transform='translate(67 7.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(90.9 76.3)' y='.36em'>C⁻</text><text transform='translate(119.8 85.1)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(49.1 47)' text-anchor='end' y='.36em'>C⁻</text><text transform='translate(25.1 26.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(73.2 95.4)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(84.4 123.3)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(32.6 71.9)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(9.7 76.4)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами). Это берлинская лазурь: внешние ионы — K⁺ и Fe³⁺.","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands). This is Prussian blue: the outer ions are K⁺ and Fe³⁺."},"[Cu(NH3)4](OH)2":{"x":[131.7,74,"<path d='M79.2 60.5L83.6 44.1M87.6 29.2L92 12.7M93 38.6L109.5 43M61.7 30.2L78.1 34.6'/><text transform='translate(79.6 36.6)' y='.36em'>Cu²⁺</text><text transform='translate(81.1 65.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N</tspan></text><text transform='translate(90 7.6)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(111.3 44.4)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(56.8 28.9)' text-anchor='end' dominant-baseline='central'>H₃<tspan class='n'>N</tspan></text><text transform='translate(31.7 50.1)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(12 42.3)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Cu(NH3)4]SO4":{"x":[161,79.7,"<path d='M108.3 60.6L112.7 44.1M116.7 29.2L121.1 12.8M122.2 38.7L138.6 43.1M90.8 30.3L107.3 34.7M40.6 43.7L59.5 48.8M11.7 33.3L31.8 38.7M10.4 38.2L30.5 43.6M39.2 38.6L44.6 18.5M34.3 37.3L39.7 17.1M29.2 66.3L34.2 47.4'/><text transform='translate(108.7 36.7)' y='.36em'>Cu²⁺</text><text transform='translate(110.2 65.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N</tspan></text><text transform='translate(119.2 7.7)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(140.4 44.4)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(86 28.9)' text-anchor='end' dominant-baseline='central'>H₃<tspan class='n'>N</tspan></text><text transform='translate(60.8 50.1)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O⁻</tspan></text><text transform='translate(32.5 42.4)' y='.36em'>S</text><text transform='translate(10.3 34.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(39.6 13.4)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(33.4 71.3)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Ag(NH3)2]OH":{"x":[101.6,31,"<path d='M67.6 17.6L79.8 10.6M36.9 10.6L51.7 19.1'/><text transform='translate(81.1 8)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(52.9 23)' dominant-baseline='central'><tspan x='0' y='0'>Ag⁺</tspan></text><text transform='translate(32.6 8)' text-anchor='end' dominant-baseline='central'>H₃<tspan class='n'>N</tspan></text><text transform='translate(12 23)' text-anchor='middle' dominant-baseline='central'><tspan class='o'>O</tspan>H⁻</text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Ag(NH3)2]Cl":{"x":[104.6,31.4,"<path d='M70.7 17.6L82.8 10.6M40 10.6L54.7 19.1'/><text transform='translate(84.1 8)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(55.9 23)' dominant-baseline='central'><tspan x='0' y='0'>Ag⁺</tspan></text><text transform='translate(35.6 8)' text-anchor='end' dominant-baseline='central'>H₃<tspan class='n'>N</tspan></text><text transform='translate(15.8 23)' text-anchor='end' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"H^+":{"x":[16.8,16,"<text transform='translate(3 7.6)' y='.36em'>H⁺</text>"]},"Na^+":{"x":[21.9,16,"<text transform='translate(3 7.6)' y='.36em'>Na⁺</text>"]},"K^+":{"x":[16.2,16,"<text transform='translate(3 7.6)' y='.36em'>K⁺</text>"]},"Ag^+":{"x":[21.4,16,"<text transform='translate(3 7.6)' y='.36em'>Ag⁺</text>"]},"NH4^+":{"x":[64.9,68,"<path d='M37 36.3L53.9 46M11 21.3L26.5 30.2M35.6 28.2L44.8 12.3M20.1 55L29.8 38.2'/><text transform='translate(55.1 48.6)' y='.36em'>H</text><text transform='translate(37.8 33.6)' text-anchor='end' y='.36em'><tspan class='n'>N⁺</tspan></text><text transform='translate(9.7 18.6)' text-anchor='end' y='.36em'>H</text><text transform='translate(44.1 7.7)' y='.36em'>H</text><text transform='translate(20.7 59.6)' text-anchor='end' y='.36em'>H</text>"]},"Mg^2+":{"x":[26.1,16,"<text transform='translate(3 7.6)' y='.36em'>Mg²⁺</text>"]},"Ca^2+":{"x":[25,16,"<text transform='translate(3 7.6)' y='.36em'>Ca²⁺</text>"]},"Ba^2+":{"x":[24.5,16,"<text transform='translate(3 7.6)' y='.36em'>Ba²⁺</text>"]},"Zn^2+":{"x":[24,16,"<text transform='translate(3 7.6)' y='.36em'>Zn²⁺</text>"]},"Cu^2+":{"x":[25,16,"<text transform='translate(3 7.6)' y='.36em'>Cu²⁺</text>"]},"Fe^2+":{"x":[24,16,"<text transform='translate(3 7.6)' y='.36em'>Fe²⁺</text>"]},"Mn^2+":{"x":[26.1,16,"<text transform='translate(3 7.6)' y='.36em'>Mn²⁺</text>"]},"Ni^2+":{"x":[21.9,16,"<text transform='translate(3 7.6)' y='.36em'>Ni²⁺</text>"]},"Pb^2+":{"x":[24.5,16,"<text transform='translate(3 7.6)' y='.36em'>Pb²⁺</text>"]},"Cr^2+":{"x":[23,16,"<text transform='translate(3 7.6)' y='.36em'>Cr²⁺</text>"]},"Al^3+":{"x":[21.4,16,"<text transform='translate(3 7.6)' y='.36em'>Al³⁺</text>"]},"Fe^3+":{"x":[24,16,"<text transform='translate(3 7.6)' y='.36em'>Fe³⁺</text>"]},"Cr^3+":{"x":[23,16,"<text transform='translate(3 7.6)' y='.36em'>Cr³⁺</text>"]},"AlOH^2+":{"x":[55.8,31,"<path d='M20 10.3L34.7 18.8'/><text transform='translate(37.4 22.6)' y='.36em'>Al³⁺</text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"]},"FeOH^2+":{"x":[56.9,31,"<path d='M20 10.3L34.7 18.8'/><text transform='translate(35.9 22.6)' y='.36em'>Fe³⁺</text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"]},"ZnOH^+":{"x":[57.1,31,"<path d='M20 10.3L34.7 18.8'/><text transform='translate(36.1 22.6)' y='.36em'>Zn²⁺</text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"]},"CuOH^+":{"x":[57.4,31,"<path d='M20 10.3L34.7 18.8'/><text transform='translate(35.4 22.6)' y='.36em'>Cu²⁺</text><text transform='translate(21 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"]},"[Cu(NH3)4]^2+":{"x":[92.2,74,"<path d='M53.5 38.6L69.9 43M48 29.2L52.4 12.7M39.6 60.5L44 44.1M22.1 30.2L38.6 34.6'/><text transform='translate(40 36.6)' y='.36em'>Cu²⁺</text><text transform='translate(71.7 44.4)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(50.5 7.6)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(41.6 65.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N</tspan></text><text transform='translate(20.3 28.9)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Ag(NH3)2]^+":{"x":[86.2,30.6,"<path d='M52.3 17.2L64.4 10.2M21.5 10.2L36.3 18.8'/><text transform='translate(65.7 7.6)' y='.36em'><tspan class='n'>N</tspan>H₃</text><text transform='translate(37.5 22.6)' dominant-baseline='central'><tspan x='0' y='0'>Ag⁺</tspan></text><text transform='translate(20.3 7.6)' text-anchor='end' y='.36em'>H₃<tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"OH^-":{"x":[43,31,"<path d='M11 10.3L27.9 20'/><text transform='translate(28.7 22.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>H</text>"]},"HS^-":{"x":[42.6,31,"<path d='M11 10.3L27.9 20'/><text transform='translate(29.4 22.6)' y='.36em'>S⁻</text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'>H</text>"]},"S^2-":{"x":[19.3,16,"<text transform='translate(3 7.6)' y='.36em'>S²⁻</text>"]},"Cl^-":{"x":[18.8,16,"<text transform='translate(3 7.6)' y='.36em'><tspan class='x'>Cl⁻</tspan></text>"]},"Br^-":{"x":[19.3,16,"<text transform='translate(3 7.6)' y='.36em'><tspan class='x'>Br⁻</tspan></text>"]},"I^-":{"x":[12.6,16,"<text transform='translate(3 7.6)' y='.36em'><tspan class='x'>I⁻</tspan></text>"]},"SO4^2-":{"x":[69,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M37 30.9L47.5 12.9M32.6 28.4L43 10.4M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(35.6 33.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"SO3^2-":{"x":[63.5,68,"<path d='M14.6 55.1L24.3 38.2M31.6 36.2L52.4 36.2M31.6 31.1L52.4 31.1M14.6 12.2L24.3 29.1'/><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text><text transform='translate(23.9 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(53.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17.6 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"HSO3^-":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M15.9 12.2L25.7 29.1'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(25.3 33.6)' dominant-baseline='central'><tspan x='0' y='0'>S</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(18.9 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"S2O3^2-":{"x":[69,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M37 30.9L47.5 12.9M32.6 28.4L43 10.4M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(35.6 33.6)' text-anchor='end' y='.36em'>S</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(44.5 7.7)' y='.36em'>S</text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"NO3^-":{"x":[63.5,68,"<path d='M14.6 55L24.3 38.2M34.9 36.2L52.4 36.2M34.9 31.1L52.4 31.1M14.6 12.2L24.3 29'/><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text><text transform='translate(23.7 33.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N⁺</tspan></text><text transform='translate(53.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17.6 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"],"n":"«+» и «−» у отдельных атомов — формальные заряды; в сумме они дают заряд всей частицы.","ne":"The + and − signs on individual atoms are formal charges; together they add up to the charge of the whole particle."},"NO2^-":{"x":[69,30.6,"<path d='M37.1 20L54 10.2M11.7 4.7L32.5 16.7M11.1 10.2L28 20'/><text transform='translate(54.8 7.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(29.3 22.6)' dominant-baseline='central'><tspan class='n' x='0' y='0'>N</tspan></text><text transform='translate(10.3 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"CO3^2-":{"x":[63.5,68,"<path d='M14.6 55.1L24.3 38.2M31.6 36.2L52.4 36.2M31.6 31.1L52.4 31.1M14.6 12.2L24.3 29.1'/><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text><text transform='translate(23.5 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(53.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17.6 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"HCO3^-":{"x":[64.9,68,"<path d='M15.9 55.1L25.7 38.2M32.9 36.2L53.7 36.2M32.9 31.1L53.7 31.1M15.9 12.2L25.7 29.1'/><text transform='translate(17 59.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O</tspan></text><text transform='translate(24.8 33.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(54.6 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(18.9 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"SiO3^2-":{"x":[63.5,68,"<path d='M14.6 55.1L23.1 40.3M34.2 36.2L52.4 36.2M34.2 31.1L52.4 31.1M14.6 12.2L23.1 27'/><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text><text transform='translate(23 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Si</tspan></text><text transform='translate(53.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(17.6 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O⁻</tspan></text>"]},"PO4^3-":{"x":[69,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M35.2 29.1L44.9 12.2M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(35.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"HPO4^2-":{"x":[71.8,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M35.2 29.1L44.9 12.2M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"H2PO4^-":{"x":[71.8,68,"<path d='M37.1 36.3L54 46M11.8 18.7L29.8 29.1M9.3 23.1L27.3 33.6M35.2 29.1L44.9 12.2M20.2 55.1L29.9 38.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(35.8 33.6)' text-anchor='end' y='.36em'><tspan class='x'>P</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan>H</text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"ClO^-":{"x":[43.9,31,"<path d='M14 11.5L28.7 20'/><text transform='translate(29.6 22.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(11.8 7.6)' text-anchor='end' y='.36em'><tspan class='x'>Cl</tspan></text>"]},"ClO3^-":{"x":[63.5,68,"<path d='M14.6 55.1L23.1 40.3M34.2 36.2L52.4 36.2M34.2 31.1L52.4 31.1M16.5 10.4L25.5 26.1M12.1 12.9L21.1 28.6'/><text transform='translate(14.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text><text transform='translate(22.5 33.6)' dominant-baseline='central'><tspan class='x' x='0' y='0'>Cl</tspan></text><text transform='translate(53.2 33.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(15.7 7.7)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"MnO4^-":{"x":[69,68,"<path d='M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26.1L43 10.4M17.6 54.4L26.7 38.7M22 56.9L31.1 41.2'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(39.1 33.6)' text-anchor='end' y='.36em'>Mn</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(21.3 59.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text>"]},"MnO4^2-":{"x":[69,68,"<path d='M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26.1L43 10.4M20.2 55.1L28.7 40.3'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(39.1 33.6)' text-anchor='end' y='.36em'>Mn</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"CrO4^2-":{"x":[69,68,"<path d='M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26.1L43 10.4M20.2 55.1L28.7 40.3'/><text transform='translate(54.8 48.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(37.7 33.6)' text-anchor='end' y='.36em'>Cr</text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.7)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"Cr2O7^2-":{"x":[121,67.9,"<path d='M91.2 29.8L105.9 21.2M74 10.3L83.1 26M69.6 12.9L78.7 28.6M85.9 41.2L95 56.9M90.3 38.6L99.4 54.3M63.1 46L77.8 37.5M39.2 37.5L54 46M11.8 18.7L27.5 27.8M9.3 23.1L25 32.2M38.4 28.6L47.5 12.9M34 26L43 10.3M20.2 55L28.7 40.3'/><text transform='translate(106.8 18.6)' y='.36em'><tspan class='o'>O⁻</tspan></text><text transform='translate(89.6 33.6)' text-anchor='end' y='.36em'>Cr</text><text transform='translate(73.2 7.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(95.8 59.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(54.8 48.6)' dominant-baseline='central'><tspan class='o' x='0' y='0'>O</tspan></text><text transform='translate(27.4 33.6)' dominant-baseline='central'><tspan x='0' y='0'>Cr</tspan></text><text transform='translate(10.3 18.6)' text-anchor='end' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(43.8 7.6)' y='.36em'><tspan class='o'>O</tspan></text><text transform='translate(19.8 59.6)' text-anchor='end' y='.36em'><tspan class='o'>⁻O</tspan></text>"]},"SCN^-":{"x":[68.6,46,"<path d='M37 25.3L53.9 35M11.6 6.7L30.7 17.7M8.2 12.6L27.3 23.6M11 10.3L27.9 20'/><text transform='translate(55.3 37.6)' y='.36em'>S⁻</text><text transform='translate(28.9 22.6)' dominant-baseline='central'><tspan x='0' y='0'>C</tspan></text><text transform='translate(9.7 7.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text>"]},"[Al(OH)4]^-":{"x":[90.6,74,"<path d='M51.8 38.6L68.3 43M46.4 29.2L50.8 12.7M38 60.5L42.4 44.1M20.5 30.2L36.9 34.6'/><text transform='translate(40.4 36.6)' y='.36em'>Al³⁺</text><text transform='translate(69.6 44.4)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(48.4 7.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(42.2 65.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(21 28.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Zn(OH)4]^2-":{"x":[90.6,74,"<path d='M51.8 38.6L68.3 43M46.4 29.2L50.8 12.7M38 60.5L42.4 44.1M20.5 30.2L36.9 34.6'/><text transform='translate(39.1 36.6)' y='.36em'>Zn²⁺</text><text transform='translate(69.6 44.4)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(48.4 7.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(42.2 65.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(21 28.9)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Cr(OH)6]^3-":{"x":[84.6,76,"<path d='M48.1 41.5L62.8 50M50.3 32.5L62.8 25.3M41.4 45.3L41.4 62.4M41.4 12.9L41.4 29.9M21.5 49.1L33.6 42.1M20 25.3L33.4 33.1'/><text transform='translate(49.8 37.6)' text-anchor='end' y='.36em'>Cr³⁺</text><text transform='translate(63.7 52.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(63.7 22.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(37.7 67.6)' y='.36em'><tspan class='o'>O</tspan>H⁻</text><text transform='translate(47 7.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(21 52.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text><text transform='translate(21 22.6)' text-anchor='end' y='.36em'>H<tspan class='o'>O⁻</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Fe(CN)6]^4-":{"x":[116.9,136,"<path d='M58.5 92.4L58.5 75.3M65.1 71.5L79.9 80M37 80L51.8 71.5M67.8 62.2L79.9 55.3M37 55.3L51.8 63.8M58.5 59.9L58.5 42.9M55.1 123L55.1 102.2M61.9 123L61.9 102.2M58.5 122.4L58.5 102.9M88.6 89L105.2 98.6M92 83.1L108.6 92.7M90.3 86.1L105.9 95M8.3 92.7L25.2 82.9M11.7 98.6L28.6 88.8M11 95L26.9 85.9M89.6 53.6L108.6 42.6M86.2 47.7L105.2 36.7M89 50L105.9 40.3M11.7 36.7L30.7 47.7M8.3 42.6L27.3 53.6M11 40.3L27.9 50M61.9 32.2L61.9 12.2M55.1 32.2L55.1 12.2M58.5 32.2L58.5 12.9'/><text transform='translate(53 67.6)' dominant-baseline='central'><tspan x='0' y='0'>Fe²⁺</tspan></text><text transform='translate(55 97.6)' y='.36em'>C⁻</text><text transform='translate(55.2 127.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(80.9 82.6)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(107.1 97.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(25.7 82.6)' dominant-baseline='central'><tspan x='0' y='0'>⁻C</tspan></text><text transform='translate(9.8 97.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(77.6 52.6)' y='.36em'>⁻C</text><text transform='translate(107.1 37.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(29 52.6)' y='.36em'>C⁻</text><text transform='translate(9.8 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(51.7 37.6)' y='.36em'>⁻C</text><text transform='translate(55.2 7.6)' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."},"[Fe(CN)6]^3-":{"x":[116.9,136,"<path d='M58.5 92.4L58.5 75.3M65.1 71.5L79.9 80M37 80L51.8 71.5M67.8 62.2L79.9 55.3M37 55.3L51.8 63.8M58.5 59.9L58.5 42.9M55.1 123L55.1 102.2M61.9 123L61.9 102.2M58.5 122.4L58.5 102.9M88.6 89L105.2 98.6M92 83.1L108.6 92.7M90.3 86.1L105.9 95M8.3 92.7L25.2 82.9M11.7 98.6L28.6 88.8M11 95L26.9 85.9M89.6 53.6L108.6 42.6M86.2 47.7L105.2 36.7M89 50L105.9 40.3M11.7 36.7L30.7 47.7M8.3 42.6L27.3 53.6M11 40.3L27.9 50M61.9 32.2L61.9 12.2M55.1 32.2L55.1 12.2M58.5 32.2L58.5 12.9'/><text transform='translate(53 67.6)' dominant-baseline='central'><tspan x='0' y='0'>Fe³⁺</tspan></text><text transform='translate(55 97.6)' y='.36em'>C⁻</text><text transform='translate(55.2 127.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(80.9 82.6)' dominant-baseline='central'><tspan x='0' y='0'>C⁻</tspan></text><text transform='translate(107.1 97.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(25.7 82.6)' dominant-baseline='central'><tspan x='0' y='0'>⁻C</tspan></text><text transform='translate(9.8 97.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(77.6 52.6)' y='.36em'>⁻C</text><text transform='translate(107.1 37.6)' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(29 52.6)' y='.36em'>C⁻</text><text transform='translate(9.8 37.6)' text-anchor='end' y='.36em'><tspan class='n'>N</tspan></text><text transform='translate(51.7 37.6)' y='.36em'>⁻C</text><text transform='translate(55.2 7.6)' y='.36em'><tspan class='n'>N</tspan></text>"],"n":"Комплексное соединение: центральный ион металла связан с окружающими его частицами (лигандами).","ne":"Complex compound: the central metal ion is bonded to the particles around it (ligands)."}};

/* ############################################################
   5. Английские названия и тексты (был <script id="chem-en">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ENGLISH NAMES AND TEXTS / АНГЛИЙСКИЕ НАЗВАНИЯ И ТЕКСТЫ
   subst  — вещества: формула (как в справочнике) → { n: name, a: [other names] };
   ions   — ионы: "формула|заряд" → name;
   rx     — реакции: уравнение (как в базе) → { c: conditions, d: description, n: type note };
   types, tags, topics, levels — русское слово из базы → English.
   Собрано из файлов tools/i18n-en/*.json скриптом build.py.
   ============================================================ */
window.ATOMIX_CHEM_DATA.en = {"subst":{"H2":{"n":"hydrogen"},"O2":{"n":"oxygen"},"O3":{"n":"ozone"},"N2":{"n":"nitrogen"},"Cl2":{"n":"chlorine"},"F2":{"n":"fluorine"},"Br2":{"n":"bromine"},"I2":{"n":"iodine"},"S":{"n":"sulfur","a":["sulphur"]},"C":{"n":"carbon","a":["coal","charcoal"]},"P":{"n":"phosphorus"},"Si":{"n":"silicon"},"Li":{"n":"lithium"},"Na":{"n":"sodium"},"K":{"n":"potassium"},"Mg":{"n":"magnesium"},"Ca":{"n":"calcium"},"Al":{"n":"aluminium","a":["aluminum"]},"Fe":{"n":"iron"},"Cu":{"n":"copper"},"Zn":{"n":"zinc"},"Ag":{"n":"silver"},"Hg":{"n":"mercury"},"W":{"n":"tungsten"},"H2O":{"n":"water"},"H2O2":{"n":"hydrogen peroxide"},"HCl":{"n":"hydrogen chloride","a":["hydrochloric acid"]},"HF":{"n":"hydrogen fluoride","a":["hydrofluoric acid"]},"H2S":{"n":"hydrogen sulfide"},"NH3":{"n":"ammonia"},"NaH":{"n":"sodium hydride"},"CaH2":{"n":"calcium hydride"},"CH4":{"n":"methane","a":["natural gas"]},"C3H8":{"n":"propane"},"C4H10":{"n":"butane","a":["n-butane"]},"C2H2":{"n":"acetylene","a":["ethyne"]},"C2H5OH":{"n":"ethanol","a":["ethyl alcohol","alcohol"]},"CH3COOH":{"n":"acetic acid","a":["ethanoic acid","vinegar"]},"CH3COONa":{"n":"sodium acetate","a":["sodium ethanoate"]},"C6H12O6":{"n":"glucose","a":["grape sugar","dextrose"]},"CO":{"n":"carbon monoxide","a":["carbon(II) oxide"]},"CO2":{"n":"carbon dioxide","a":["carbon(IV) oxide"]},"SO2":{"n":"sulfur dioxide","a":["sulfur(IV) oxide"]},"SO3":{"n":"sulfur trioxide","a":["sulfur(VI) oxide"]},"NO":{"n":"nitrogen monoxide","a":["nitric oxide","nitrogen(II) oxide"]},"NO2":{"n":"nitrogen dioxide","a":["nitrogen(IV) oxide"]},"P2O5":{"n":"phosphorus(V) oxide","a":["phosphorus pentoxide"]},"SiO2":{"n":"silicon dioxide","a":["silica","quartz","sand"]},"Li2O":{"n":"lithium oxide"},"Na2O":{"n":"sodium oxide"},"Na2O2":{"n":"sodium peroxide"},"K2O":{"n":"potassium oxide"},"MgO":{"n":"magnesium oxide","a":["magnesia"]},"CaO":{"n":"calcium oxide","a":["quicklime","lime"]},"BaO":{"n":"barium oxide"},"Al2O3":{"n":"aluminium oxide","a":["aluminum oxide","alumina"]},"CuO":{"n":"copper(II) oxide"},"Fe2O3":{"n":"iron(III) oxide","a":["haematite","hematite"]},"Fe3O4":{"n":"iron(II,III) oxide","a":["magnetite","iron scale"]},"HgO":{"n":"mercury(II) oxide"},"MnO2":{"n":"manganese(IV) oxide","a":["manganese dioxide"]},"Cr2O3":{"n":"chromium(III) oxide"},"WO3":{"n":"tungsten(VI) oxide"},"LiOH":{"n":"lithium hydroxide"},"NaOH":{"n":"sodium hydroxide","a":["caustic soda"]},"KOH":{"n":"potassium hydroxide","a":["caustic potash"]},"Ca(OH)2":{"n":"calcium hydroxide","a":["slaked lime","limewater"]},"Ba(OH)2":{"n":"barium hydroxide"},"Mg(OH)2":{"n":"magnesium hydroxide"},"Cu(OH)2":{"n":"copper(II) hydroxide"},"Fe(OH)2":{"n":"iron(II) hydroxide"},"Fe(OH)3":{"n":"iron(III) hydroxide"},"Al(OH)3":{"n":"aluminium hydroxide","a":["aluminum hydroxide"]},"H2SO4":{"n":"sulfuric acid","a":["sulphuric acid"]},"H2SO3":{"n":"sulfurous acid"},"HNO3":{"n":"nitric acid"},"H3PO4":{"n":"phosphoric acid","a":["orthophosphoric acid"]},"H2CO3":{"n":"carbonic acid"},"HClO":{"n":"hypochlorous acid"},"NaCl":{"n":"sodium chloride","a":["table salt","salt"]},"KCl":{"n":"potassium chloride"},"KBr":{"n":"potassium bromide"},"KI":{"n":"potassium iodide"},"MgCl2":{"n":"magnesium chloride"},"CaCl2":{"n":"calcium chloride"},"BaCl2":{"n":"barium chloride"},"ZnCl2":{"n":"zinc chloride"},"FeCl2":{"n":"iron(II) chloride"},"FeCl3":{"n":"iron(III) chloride"},"CuCl2":{"n":"copper(II) chloride"},"AlCl3":{"n":"aluminium chloride","a":["aluminum chloride"]},"MnCl2":{"n":"manganese(II) chloride"},"NH4Cl":{"n":"ammonium chloride","a":["sal ammoniac"]},"AgCl":{"n":"silver chloride"},"AgBr":{"n":"silver bromide"},"PbI2":{"n":"lead(II) iodide"},"Pb(NO3)2":{"n":"lead(II) nitrate"},"KNO3":{"n":"potassium nitrate","a":["saltpetre","saltpeter"]},"KNO2":{"n":"potassium nitrite"},"NaNO3":{"n":"sodium nitrate","a":["Chile saltpetre"]},"NaNO2":{"n":"sodium nitrite"},"AgNO3":{"n":"silver nitrate","a":["lunar caustic"]},"Cu(NO3)2":{"n":"copper(II) nitrate"},"NH4NO3":{"n":"ammonium nitrate"},"Na2SO4":{"n":"sodium sulfate"},"ZnSO4":{"n":"zinc sulfate"},"FeSO4":{"n":"iron(II) sulfate"},"MgSO4":{"n":"magnesium sulfate","a":["Epsom salt"]},"CuSO4":{"n":"copper(II) sulfate"},"CuSO4·5H2O":{"n":"copper(II) sulfate pentahydrate","a":["blue vitriol"]},"BaSO4":{"n":"barium sulfate"},"Na2SO3":{"n":"sodium sulfite"},"Na2CO3":{"n":"sodium carbonate","a":["soda ash","washing soda","soda"]},"NaHCO3":{"n":"sodium hydrogen carbonate","a":["sodium bicarbonate","baking soda","bicarbonate of soda"]},"CaCO3":{"n":"calcium carbonate","a":["chalk","marble","limestone"]},"Ca(HCO3)2":{"n":"calcium hydrogen carbonate","a":["calcium bicarbonate"]},"Cu2(OH)2CO3":{"n":"basic copper(II) carbonate","a":["malachite"]},"KMnO4":{"n":"potassium permanganate"},"K2MnO4":{"n":"potassium manganate"},"KClO3":{"n":"potassium chlorate","a":["Berthollet's salt"]},"(NH4)2Cr2O7":{"n":"ammonium dichromate"},"Na3PO4":{"n":"sodium phosphate"},"Na2SiO3":{"n":"sodium silicate","a":["water glass"]},"CaSiO3":{"n":"calcium silicate"},"Na[Al(OH)4]":{"n":"sodium tetrahydroxoaluminate"},"FeS":{"n":"iron(II) sulfide"},"ZnS":{"n":"zinc sulfide"},"Al2S3":{"n":"aluminium sulfide","a":["aluminum sulfide"]},"Ag2S":{"n":"silver sulfide"},"Mg3N2":{"n":"magnesium nitride"},"Li3N":{"n":"lithium nitride"},"HBr":{"n":"hydrogen bromide","a":["hydrobromic acid"]},"HI":{"n":"hydrogen iodide","a":["hydroiodic acid"]},"NaF":{"n":"sodium fluoride"},"NaBr":{"n":"sodium bromide"},"NaI":{"n":"sodium iodide"},"AgI":{"n":"silver iodide"},"NaClO":{"n":"sodium hypochlorite"},"NaClO3":{"n":"sodium chlorate"},"Ca(ClO)2":{"n":"calcium hypochlorite"},"KClO4":{"n":"potassium perchlorate"},"KIO3":{"n":"potassium iodate"},"HIO3":{"n":"iodic acid"},"OF2":{"n":"oxygen difluoride"},"CaF2":{"n":"calcium fluoride","a":["fluorite","fluorspar"]},"CaSO4":{"n":"calcium sulfate","a":["anhydrite"]},"SiF4":{"n":"silicon tetrafluoride","a":["silicon(IV) fluoride"]},"K2SO4":{"n":"potassium sulfate"},"NaHSO4":{"n":"sodium hydrogen sulfate","a":["sodium bisulfate"]},"FeS2":{"n":"iron(II) disulfide","a":["pyrite","iron pyrites","fool's gold"]},"Na2S":{"n":"sodium sulfide"},"K2S":{"n":"potassium sulfide"},"NaHS":{"n":"sodium hydrogen sulfide","a":["sodium hydrosulfide"]},"K2SO3":{"n":"potassium sulfite"},"NaHSO3":{"n":"sodium hydrogen sulfite","a":["sodium bisulfite"]},"CaSO3":{"n":"calcium sulfite"},"Na2S2O3":{"n":"sodium thiosulfate"},"Na2S4O6":{"n":"sodium tetrathionate"},"CuS":{"n":"copper(II) sulfide"},"PbS":{"n":"lead(II) sulfide","a":["galena"]},"PbSO4":{"n":"lead(II) sulfate"},"SF6":{"n":"sulfur hexafluoride"},"H2S2O7":{"n":"disulfuric acid","a":["pyrosulfuric acid","oleum"]},"Ag2O":{"n":"silver(I) oxide"},"BaO2":{"n":"barium peroxide"},"Ba(NO3)2":{"n":"barium nitrate"},"NH4NO2":{"n":"ammonium nitrite"},"N2O":{"n":"dinitrogen monoxide","a":["nitrous oxide","laughing gas"]},"N2O4":{"n":"dinitrogen tetroxide","a":["nitrogen dioxide dimer"]},"HNO2":{"n":"nitrous acid"},"NH3·H2O":{"n":"aqueous ammonia","a":["ammonia solution","ammonium hydroxide"]},"(NH4)2CO3":{"n":"ammonium carbonate"},"NH4HCO3":{"n":"ammonium hydrogen carbonate","a":["ammonium bicarbonate"]},"(NH4)2SO4":{"n":"ammonium sulfate"},"NH4H2PO4":{"n":"ammonium dihydrogen phosphate","a":["monoammonium phosphate"]},"Ca3N2":{"n":"calcium nitride"},"Mg(NO3)2":{"n":"magnesium nitrate"},"Zn(NO3)2":{"n":"zinc nitrate"},"Hg(NO3)2":{"n":"mercury(II) nitrate"},"Fe(NO3)2":{"n":"iron(II) nitrate"},"Fe(NO3)3":{"n":"iron(III) nitrate"},"PbO":{"n":"lead(II) oxide"},"ZnO":{"n":"zinc oxide"},"FeO":{"n":"iron(II) oxide"},"Ca3(PO4)2":{"n":"calcium phosphate","a":["phosphorite"]},"PCl3":{"n":"phosphorus trichloride","a":["phosphorus(III) chloride"]},"PCl5":{"n":"phosphorus pentachloride","a":["phosphorus(V) chloride"]},"H3PO3":{"n":"phosphorous acid"},"HPO3":{"n":"metaphosphoric acid"},"Ca3P2":{"n":"calcium phosphide"},"PH3":{"n":"phosphine"},"NaH2PO2":{"n":"sodium hypophosphite"},"NaH2PO4":{"n":"sodium dihydrogen phosphate"},"Na2HPO4":{"n":"sodium hydrogen phosphate"},"Ca(H2PO4)2":{"n":"calcium dihydrogen phosphate","a":["superphosphate"]},"CaHPO4":{"n":"calcium hydrogen phosphate","a":["precipitate (fertiliser)"]},"Ag3PO4":{"n":"silver phosphate"},"CaC2":{"n":"calcium carbide"},"Al4C3":{"n":"aluminium carbide","a":["aluminum carbide"]},"SiC":{"n":"silicon carbide","a":["carborundum"]},"CS2":{"n":"carbon disulfide"},"Mg2Si":{"n":"magnesium silicide"},"SiH4":{"n":"silane"},"SiCl4":{"n":"silicon tetrachloride","a":["silicon(IV) chloride"]},"H2SiO3":{"n":"silicic acid"},"K2CO3":{"n":"potassium carbonate","a":["potash"]},"MgCO3":{"n":"magnesium carbonate"},"BaCO3":{"n":"barium carbonate"},"HCOONa":{"n":"sodium formate","a":["sodium methanoate"]},"Ba":{"n":"barium"},"KO2":{"n":"potassium superoxide"},"LiH":{"n":"lithium hydride"},"Ca(NO3)2":{"n":"calcium nitrate"},"Cr":{"n":"chromium"},"NaAlO2":{"n":"sodium metaaluminate","a":["sodium aluminate"]},"K[Al(OH)4]":{"n":"potassium tetrahydroxoaluminate"},"Al2(SO4)3":{"n":"aluminium sulfate","a":["aluminum sulfate"]},"Al(NO3)3":{"n":"aluminium nitrate","a":["aluminum nitrate"]},"AlN":{"n":"aluminium nitride","a":["aluminum nitride"]},"AlI3":{"n":"aluminium iodide","a":["aluminum iodide"]},"Fe2(SO4)3":{"n":"iron(III) sulfate"},"FeI2":{"n":"iron(II) iodide"},"NaFeO2":{"n":"sodium ferrite"},"K2FeO4":{"n":"potassium ferrate"},"KSCN":{"n":"potassium thiocyanate"},"Fe(SCN)3":{"n":"iron(III) thiocyanate"},"K4[Fe(CN)6]":{"n":"potassium hexacyanoferrate(II)","a":["potassium ferrocyanide","yellow prussiate of potash"]},"K3[Fe(CN)6]":{"n":"potassium hexacyanoferrate(III)","a":["potassium ferricyanide","red prussiate of potash"]},"KFe[Fe(CN)6]":{"n":"potassium iron(III) hexacyanoferrate(II)","a":["Prussian blue","Turnbull's blue"]},"Cu2O":{"n":"copper(I) oxide"},"CuI":{"n":"copper(I) iodide"},"Cu2S":{"n":"copper(I) sulfide"},"[Cu(NH3)4](OH)2":{"n":"tetraamminecopper(II) hydroxide","a":["Schweizer's reagent"]},"[Cu(NH3)4]SO4":{"n":"tetraamminecopper(II) sulfate"},"[Ag(NH3)2]OH":{"n":"diamminesilver(I) hydroxide","a":["Tollens' reagent","ammoniacal silver oxide"]},"[Ag(NH3)2]Cl":{"n":"diamminesilver(I) chloride"},"Ag2SO4":{"n":"silver sulfate"},"Zn(OH)2":{"n":"zinc hydroxide"},"Na2ZnO2":{"n":"sodium zincate"},"Na2[Zn(OH)4]":{"n":"sodium tetrahydroxozincate"},"Au":{"n":"gold"},"AuCl3":{"n":"gold(III) chloride"},"H[AuCl4]":{"n":"chloroauric acid","a":["tetrachloroauric acid"]},"Pt":{"n":"platinum"},"H2[PtCl6]":{"n":"hexachloroplatinic acid","a":["chloroplatinic acid"]},"HgS":{"n":"mercury(II) sulfide","a":["cinnabar"]},"Ni":{"n":"nickel"},"NiO":{"n":"nickel(II) oxide"},"NiCl2":{"n":"nickel(II) chloride"},"NiSO4":{"n":"nickel(II) sulfate"},"Pb":{"n":"lead"},"CrCl2":{"n":"chromium(II) chloride"},"CrCl3":{"n":"chromium(III) chloride"},"Cr2(SO4)3":{"n":"chromium(III) sulfate"},"Cr(OH)3":{"n":"chromium(III) hydroxide"},"NaCrO2":{"n":"sodium chromite"},"Na3[Cr(OH)6]":{"n":"sodium hexahydroxochromate(III)"},"K3[Cr(OH)6]":{"n":"potassium hexahydroxochromate(III)"},"CrO3":{"n":"chromium(VI) oxide","a":["chromium trioxide"]},"Na2CrO4":{"n":"sodium chromate"},"K2CrO4":{"n":"potassium chromate"},"Na2Cr2O7":{"n":"sodium dichromate"},"K2Cr2O7":{"n":"potassium dichromate","a":["potassium bichromate"]},"(NH4)2S":{"n":"ammonium sulfide"},"Mn":{"n":"manganese"},"MnSO4":{"n":"manganese(II) sulfate"},"Mn(OH)2":{"n":"manganese(II) hydroxide"},"LiCl":{"n":"lithium chloride"},"AlOHCl2":{"n":"aluminium hydroxide dichloride","a":["aluminum hydroxychloride","basic aluminium chloride"]},"FeOHCl2":{"n":"iron(III) hydroxide dichloride","a":["basic iron(III) chloride"]},"ZnOHCl":{"n":"zinc hydroxide chloride","a":["basic zinc chloride"]},"(CuOH)2SO4":{"n":"basic copper(II) sulfate","a":["copper(II) hydroxide sulfate"]},"Cr2S3":{"n":"chromium(III) sulfide"},"C2H6":{"n":"ethane"},"CH3-CH(CH3)-CH3":{"n":"isobutane","a":["2-methylpropane"]},"C6H14":{"n":"hexane"},"C7H16":{"n":"heptane"},"C8H18":{"n":"octane"},"C16H34":{"n":"hexadecane","a":["cetane"]},"C4H8":{"n":"butene (mixture of isomers)"},"C8H16":{"n":"octene"},"(CH2)3":{"n":"cyclopropane"},"C6H12":{"n":"cyclohexane"},"C6H11Cl":{"n":"chlorocyclohexane"},"CH3Cl":{"n":"chloromethane","a":["methyl chloride"]},"CH2Cl2":{"n":"dichloromethane"},"CHCl3":{"n":"trichloromethane","a":["chloroform"]},"CCl4":{"n":"tetrachloromethane","a":["carbon tetrachloride"]},"CH3Br":{"n":"bromomethane"},"C2H5Cl":{"n":"chloroethane","a":["ethyl chloride"]},"C2H5Br":{"n":"bromoethane","a":["ethyl bromide"]},"CH3-CHBr-CH3":{"n":"2-bromopropane"},"CH3-CHCl-CH3":{"n":"2-chloropropane"},"CH3-CH2-CH2Br":{"n":"1-bromopropane"},"CH2Br-CH2-CH2Br":{"n":"1,3-dibromopropane"},"CH2Cl-CH2-CH2Cl":{"n":"1,3-dichloropropane"},"CH3NO2":{"n":"nitromethane"},"C2H5NO2":{"n":"nitroethane"},"HCHO":{"n":"formaldehyde","a":["methanal"]},"C2H5COONa":{"n":"sodium propanoate","a":["sodium propionate"]},"C2H4":{"n":"ethylene","a":["ethene"]},"CH2=CH-CH3":{"n":"propene","a":["propylene"]},"CH2=CH-CH2-CH3":{"n":"but-1-ene","a":["1-butene"]},"CH3-CH=CH-CH3":{"n":"but-2-ene","a":["2-butene"]},"CH2=CH-CH=CH2":{"n":"buta-1,3-diene","a":["1,3-butadiene","butadiene"]},"CH2=C(CH3)-CH=CH2":{"n":"isoprene","a":["2-methylbuta-1,3-diene"]},"CH2=CHCl":{"n":"vinyl chloride","a":["chloroethene"]},"CF2=CF2":{"n":"tetrafluoroethylene","a":["tetrafluoroethene"]},"C6H5-CH=CH2":{"n":"styrene","a":["vinylbenzene","ethenylbenzene"]},"CH2Br-CH2Br":{"n":"1,2-dibromoethane"},"CH2Cl-CH2Cl":{"n":"1,2-dichloroethane"},"CH2Br-CHBr-CH3":{"n":"1,2-dibromopropane"},"CH2=CH-CH2Cl":{"n":"3-chloropropene","a":["allyl chloride"]},"CH3-CHBr-CH2-CH3":{"n":"2-bromobutane"},"CH2Br-CH=CH-CH2Br":{"n":"1,4-dibromobut-2-ene"},"CH2Br-CHBr-CHBr-CH2Br":{"n":"1,2,3,4-tetrabromobutane"},"CH2OH-CH2OH":{"n":"ethylene glycol","a":["ethane-1,2-diol"]},"CH2OH-CHOH-CH3":{"n":"propane-1,2-diol","a":["propylene glycol"]},"CH3-CH(OH)-CH3":{"n":"propan-2-ol","a":["isopropyl alcohol","isopropanol"]},"CH3-CH(OH)-CH2-CH3":{"n":"butan-2-ol"},"ZnBr2":{"n":"zinc bromide"},"(-CH2-CH2-)n":{"n":"polyethylene","a":["polythene"]},"(-CH2-CH(CH3)-)n":{"n":"polypropylene"},"(-CH2-CHCl-)n":{"n":"polyvinyl chloride","a":["PVC"]},"(-CH2-CH(C6H5)-)n":{"n":"polystyrene"},"(-CF2-CF2-)n":{"n":"polytetrafluoroethylene","a":["PTFE","Teflon"]},"(-CH2-CH=CH-CH2-)n":{"n":"polybutadiene rubber","a":["butadiene rubber"]},"(-CH2-C(CH3)=CH-CH2-)n":{"n":"polyisoprene rubber","a":["natural rubber","isoprene rubber"]},"CH≡C-CH3":{"n":"propyne","a":["methylacetylene"]},"CHBr=CHBr":{"n":"1,2-dibromoethene"},"CHBr2-CHBr2":{"n":"1,1,2,2-tetrabromoethane"},"CH3-CBr2-CH3":{"n":"2,2-dibromopropane"},"CH3-CHCl2":{"n":"1,1-dichloroethane"},"CH2=CH-C≡CH":{"n":"vinylacetylene","a":["but-1-en-3-yne"]},"AgC≡CAg":{"n":"silver acetylide"},"CH3-C≡CAg":{"n":"silver propynide"},"NaC≡CNa":{"n":"sodium acetylide"},"K2C2O4":{"n":"potassium oxalate"},"HCN":{"n":"hydrogen cyanide","a":["hydrocyanic acid","prussic acid"]},"CH2=CH-CN":{"n":"acrylonitrile"},"C6H6":{"n":"benzene"},"C6H5-CH3":{"n":"toluene","a":["methylbenzene"]},"C6H5-C2H5":{"n":"ethylbenzene"},"C6H5-CH(CH3)2":{"n":"isopropylbenzene","a":["cumene"]},"C6H5Br":{"n":"bromobenzene"},"C6H5Cl":{"n":"chlorobenzene"},"C6H5NO2":{"n":"nitrobenzene"},"C6H6Cl6":{"n":"hexachlorocyclohexane","a":["lindane"]},"CH3-C6H2(NO2)3":{"n":"2,4,6-trinitrotoluene","a":["TNT"]},"C6H5-CH2Cl":{"n":"benzyl chloride"},"CH3-C6H4-Cl":{"n":"chlorotoluene (ortho and para)"},"C6H5COOH":{"n":"benzoic acid"},"C6H5COONa":{"n":"sodium benzoate"},"C6H5COOK":{"n":"potassium benzoate"},"C6H5-CHBr-CH2Br":{"n":"1,2-dibromo-1-phenylethane"},"C6H5-CH(OH)-CH2OH":{"n":"1-phenylethane-1,2-diol"},"CH3OH":{"n":"methanol","a":["methyl alcohol"]},"CH3-CH2-CH2OH":{"n":"propan-1-ol","a":["propyl alcohol","1-propanol"]},"C2H5ONa":{"n":"sodium ethoxide","a":["sodium ethylate"]},"CH3ONa":{"n":"sodium methoxide","a":["sodium methylate"]},"C2H5-O-C2H5":{"n":"diethyl ether","a":["ether"]},"CH3-O-CH3":{"n":"dimethyl ether"},"C3H5(OH)3":{"n":"glycerol","a":["glycerine","propane-1,2,3-triol"]},"C3H5(ONO2)3":{"n":"glyceryl trinitrate","a":["nitroglycerin"]},"C3H5(ONa)3":{"n":"sodium glyceroxide"},"Cu(C3H7O3)2":{"n":"copper(II) glyceroxide","a":["copper(II) glycerate"]},"Cu(C2H5O2)2":{"n":"copper(II) glycolate","a":["copper(II) ethylene glycoxide"]},"CH2ONa-CH2ONa":{"n":"sodium ethylene glycoxide"},"C2H5CN":{"n":"propanenitrile","a":["propionitrile"]},"KCN":{"n":"potassium cyanide"},"C6H5OH":{"n":"phenol","a":["carbolic acid"]},"C6H5ONa":{"n":"sodium phenoxide","a":["sodium phenolate"]},"C6H2Br3OH":{"n":"2,4,6-tribromophenol"},"C6H2(NO2)3OH":{"n":"2,4,6-trinitrophenol","a":["picric acid"]},"C6H11OH":{"n":"cyclohexanol"},"CH3CHO":{"n":"acetaldehyde","a":["ethanal"]},"CH3-CH2-CHO":{"n":"propanal","a":["propionaldehyde"]},"CH3-CO-CH3":{"n":"acetone","a":["propanone","dimethyl ketone"]},"CH3COONH4":{"n":"ammonium acetate"},"(CH3COO)2Ca":{"n":"calcium acetate"},"HCOOH":{"n":"formic acid","a":["methanoic acid"]},"H2C2O4":{"n":"oxalic acid","a":["ethanedioic acid"]},"Na2C2O4":{"n":"sodium oxalate"},"CH3COOK":{"n":"potassium acetate"},"(CH3COO)2Mg":{"n":"magnesium acetate"},"(CH3COO)2Cu":{"n":"copper(II) acetate"},"(CH3COO)2Zn":{"n":"zinc acetate"},"CH2ClCOOH":{"n":"chloroacetic acid"},"C17H35COOH":{"n":"stearic acid","a":["octadecanoic acid"]},"C17H33COOH":{"n":"oleic acid"},"C15H31COOH":{"n":"palmitic acid","a":["hexadecanoic acid"]},"C17H35COONa":{"n":"sodium stearate","a":["soap"]},"(C17H35COO)2Ca":{"n":"calcium stearate"},"CH2=CH-COOH":{"n":"acrylic acid","a":["propenoic acid"]},"CH2Br-CHBr-COOH":{"n":"2,3-dibromopropanoic acid"},"CH3COOC2H5":{"n":"ethyl acetate","a":["ethyl ethanoate"]},"CH3COOCH3":{"n":"methyl acetate","a":["methyl ethanoate"]},"HCOOCH3":{"n":"methyl formate","a":["methyl methanoate"]},"HCOOC2H5":{"n":"ethyl formate","a":["ethyl methanoate"]},"(C17H35COO)3C3H5":{"n":"glyceryl tristearate","a":["tristearin","solid fat"]},"(C17H33COO)3C3H5":{"n":"glyceryl trioleate","a":["triolein","liquid fat","vegetable oil"]},"(C17H33Br2COO)3C3H5":{"n":"glyceryl tri(9,10-dibromostearate)"},"C17H33COONa":{"n":"sodium oleate"},"C6H12O7":{"n":"gluconic acid"},"C5H11O5COONH4":{"n":"ammonium gluconate"},"C6H14O6":{"n":"sorbitol"},"CH3-CH(OH)-COOH":{"n":"lactic acid","a":["2-hydroxypropanoic acid"]},"C3H7COOH":{"n":"butyric acid","a":["butanoic acid"]},"C12H22O11":{"n":"sucrose","a":["sugar","cane sugar","table sugar"]},"(C6H10O5)n":{"n":"starch, cellulose","a":["starch","cellulose","fibre"]},"(C6H7O2(ONO2)3)n":{"n":"cellulose trinitrate","a":["nitrocellulose","guncotton"]},"CH3NH2":{"n":"methylamine"},"[CH3NH3]Cl":{"n":"methylammonium chloride"},"[CH3NH3]OH":{"n":"methylammonium hydroxide"},"C2H5NH2":{"n":"ethylamine"},"[C2H5NH3]Cl":{"n":"ethylammonium chloride"},"(CH3)2NH":{"n":"dimethylamine"},"[(CH3)2NH2]Cl":{"n":"dimethylammonium chloride"},"C6H5NH2":{"n":"aniline","a":["aminobenzene","phenylamine"]},"[C6H5NH3]Cl":{"n":"phenylammonium chloride","a":["aniline hydrochloride"]},"C6H2Br3NH2":{"n":"2,4,6-tribromoaniline"},"NH2CH2COOH":{"n":"glycine","a":["aminoacetic acid"]},"NH2CH2COONa":{"n":"sodium glycinate"},"[NH3CH2COOH]Cl":{"n":"glycine hydrochloride"},"NH2CH2COOCH3":{"n":"glycine methyl ester"},"(NH2CH2COO)2Cu":{"n":"copper(II) glycinate"},"NH2CH2CONHCH2COOH":{"n":"glycylglycine","a":["dipeptide"]},"CH3-CH(NH2)-COOH":{"n":"alanine"},"CH3-CH(NH2)-COONa":{"n":"sodium alaninate"},"NH2(CH2)5COOH":{"n":"6-aminohexanoic acid","a":["ε-aminocaproic acid"]},"(-NH-CH2-CO-)n":{"n":"polyglycine"},"(-NH-(CH2)5-CO-)n":{"n":"nylon-6","a":["capron","polycaprolactam"]}},"ions":{"H|1":"hydrogen ion","Li|1":"lithium ion","Na|1":"sodium ion","K|1":"potassium ion","Rb|1":"rubidium ion","Cs|1":"caesium ion","NH4|1":"ammonium ion","Ag|1":"silver ion","Be|2":"beryllium ion","Mg|2":"magnesium ion","Ca|2":"calcium ion","Sr|2":"strontium ion","Ba|2":"barium ion","Zn|2":"zinc ion","Cu|2":"copper(II) ion","Fe|2":"iron(II) ion","Fe|3":"iron(III) ion","Mn|2":"manganese(II) ion","Ni|2":"nickel(II) ion","Co|2":"cobalt(II) ion","Pb|2":"lead(II) ion","Sn|2":"tin(II) ion","Hg|2":"mercury(II) ion","Cd|2":"cadmium ion","Al|3":"aluminium ion","Cr|3":"chromium(III) ion","Cr|2":"chromium(II) ion","[Cu(NH3)4]|2":"tetraamminecopper(II) ion","[Ag(NH3)2]|1":"diamminesilver(I) ion","[CH3NH3]|1":"methylammonium ion","[C2H5NH3]|1":"ethylammonium ion","[(CH3)2NH2]|1":"dimethylammonium ion","[C6H5NH3]|1":"phenylammonium ion","[NH3CH2COOH]|1":"protonated glycine","OH|-1":"hydroxide ion","F|-1":"fluoride ion","Cl|-1":"chloride ion","Br|-1":"bromide ion","I|-1":"iodide ion","S|-2":"sulfide ion","HS|-1":"hydrogen sulfide ion","SO4|-2":"sulfate ion","HSO4|-1":"hydrogen sulfate ion","SO3|-2":"sulfite ion","HSO3|-1":"hydrogen sulfite ion","S2O3|-2":"thiosulfate ion","NO3|-1":"nitrate ion","NO2|-1":"nitrite ion","PO4|-3":"phosphate ion","HPO4|-2":"hydrogen phosphate ion","H2PO4|-1":"dihydrogen phosphate ion","CO3|-2":"carbonate ion","HCO3|-1":"hydrogen carbonate ion","SiO3|-2":"silicate ion","CrO4|-2":"chromate ion","Cr2O7|-2":"dichromate ion","MnO4|-1":"permanganate ion","MnO4|-2":"manganate ion","ClO|-1":"hypochlorite ion","ClO3|-1":"chlorate ion","ClO4|-1":"perchlorate ion","SCN|-1":"thiocyanate ion","C2O4|-2":"oxalate ion","CH3COO|-1":"acetate ion","HCOO|-1":"formate ion","C6H5COO|-1":"benzoate ion","C6H5O|-1":"phenoxide ion","C17H35COO|-1":"stearate ion","NH2CH2COO|-1":"glycinate ion","[Al(OH)4]|-1":"tetrahydroxoaluminate ion","[Zn(OH)4]|-2":"tetrahydroxozincate ion","[Cr(OH)6]|-3":"hexahydroxochromate(III) ion","[Fe(CN)6]|-3":"hexacyanoferrate(III) ion","[Fe(CN)6]|-4":"hexacyanoferrate(II) ion","AlOH|2":"hydroxoaluminium ion","FeOH|2":"hydroxoiron(III) ion","ZnOH|1":"hydroxozinc ion","CuOH|1":"hydroxocopper(II) ion"},"rx":{"2H2 + O2 -> 2H2O":{"c":"Ignition. A mixture of hydrogen and oxygen (2 : 1) is called “oxyhydrogen” — it explodes.","d":"Hydrogen burns in oxygen and water is formed. A lot of heat is released."},"H2 + Cl2 -> 2HCl":{"c":"In light or on ignition. In bright light the mixture can explode.","d":"Hydrogen combines with chlorine to form hydrogen chloride gas. Its solution in water is hydrochloric acid."},"N2 + 3H2 <=> 2NH3":{"c":"Iron catalyst, a temperature of about 400–500 °C and high pressure. This is how ammonia is made in industry.","d":"Nitrogen combines with hydrogen to form ammonia. The reaction is reversible: some of the ammonia breaks back down into nitrogen and hydrogen."},"2Na + Cl2 -> 2NaCl":{"c":"Heated sodium burns in chlorine with a bright yellow flame.","d":"Sodium, a soft metal, combines with chlorine, a poisonous gas — and the result is ordinary table salt, sodium chloride."},"4Na + O2 -> 2Na2O":{"c":"Slow oxidation of sodium by oxygen at room temperature.","d":"Sodium combines with oxygen to form sodium oxide. That is why a freshly cut surface of sodium quickly goes dull."},"2Na + O2 -> Na2O2":{"c":"Sodium burning in oxygen or in air.","d":"When sodium burns, the main product is not the oxide but sodium peroxide, Na₂O₂."},"4Li + O2 -> 2Li2O":{"c":"Lithium catches fire when heated.","d":"Lithium combines with oxygen to form lithium oxide. Unlike sodium, burning lithium gives the ordinary oxide."},"2Mg + O2 -> 2MgO":{"c":"Ignition. Magnesium burns with a dazzling white flame — do not look directly at it.","d":"Magnesium burns and turns into a white powder, magnesium oxide."},"2Ca + O2 -> 2CaO":{"c":"On heating.","d":"Calcium combines with oxygen to form calcium oxide, also known as quicklime."},"4Al + 3O2 -> 2Al2O3":{"c":"On heating (aluminium powder burns). At room temperature aluminium is covered with a thin, strong oxide film that protects it.","d":"Aluminium combines with oxygen to form aluminium oxide."},"3Fe + 2O2 -> Fe3O4":{"c":"A red-hot iron wire burns in pure oxygen, throwing out sparks.","d":"When iron burns in oxygen, iron(II,III) oxide Fe₃O₄ (iron scale) is formed — an oxide in which iron atoms have two different oxidation states."},"4Fe + 3O2 -> 2Fe2O3":{"c":"On heating. This is a simplified equation often used in school problems.","d":"Iron combines with oxygen to form iron(III) oxide. Note: when iron burns in pure oxygen the main product is Fe₃O₄, and rust forms only with the help of water and has a more complex composition."},"2Cu + O2 -> 2CuO":{"c":"On heating.","d":"Red copper heated in air becomes coated with a black layer of copper(II) oxide."},"C + O2 -> CO2":{"c":"Ignition, with enough oxygen.","d":"Carbon (for example, coal) burns and carbon dioxide is formed."},"2C + O2 -> 2CO":{"c":"Burning when oxygen is in short supply.","d":"If there is little oxygen, carbon monoxide CO forms instead of carbon dioxide. It is very poisonous and has no smell."},"S + O2 -> SO2":{"c":"Ignition. Sulfur burns with a blue flame.","d":"Sulfur burns to form sulfur dioxide, SO₂, a gas with a sharp smell."},"4P + 5O2 -> 2P2O5":{"c":"Ignition (white phosphorus can catch fire in air by itself).","d":"Phosphorus burns and gives thick white smoke — phosphorus(V) oxide. The real molecule of this oxide is P₄O₁₀, but school courses use the simplest formula, P₂O₅."},"2CO + O2 -> 2CO2":{"c":"Ignition. Carbon monoxide burns with a blue flame.","d":"Carbon monoxide burns and turns into carbon dioxide."},"2SO2 + O2 <=> 2SO3":{"c":"Vanadium(V) oxide V₂O₅ as a catalyst, a temperature of about 400–500 °C. This is a stage in the industrial production of sulfuric acid.","d":"Sulfur dioxide is oxidized by oxygen to sulfur trioxide. The reaction is reversible."},"N2 + O2 <=> 2NO":{"c":"A very high temperature — in an electric discharge (for example, a lightning strike) or in engines.","d":"Nitrogen and oxygen from the air combine only when heated very strongly, forming nitrogen monoxide. Heat is absorbed."},"2NO + O2 -> 2NO2":{"c":"Takes place under ordinary conditions.","d":"Colourless nitrogen monoxide quickly turns into brown nitrogen dioxide in air."},"3O2 -> 2O3":{"c":"In an electric discharge (for example, during a thunderstorm) or under ultraviolet light.","d":"Ordinary oxygen O₂ turns into ozone O₃ — another form of the same element. Ozone in the upper atmosphere protects the Earth from ultraviolet light.","n":"conversion of one allotrope of oxygen into another (not redox)"},"Fe + S -> FeS":{"c":"On heating a mixture of the powders.","d":"Iron and sulfur combine to form iron(II) sulfide. After the reaction the iron can no longer be separated with a magnet — this is a new substance."},"Zn + S -> ZnS":{"c":"On heating.","d":"Zinc combines with sulfur to form zinc sulfide."},"2Al + 3S -> Al2S3":{"c":"On heating.","d":"Aluminium combines with sulfur to form aluminium sulfide."},"H2 + S -> H2S":{"c":"On heating.","d":"Hydrogen combines with sulfur to form hydrogen sulfide — a poisonous gas that smells of rotten eggs."},"2Fe + 3Cl2 -> 2FeCl3":{"c":"On heating, iron burns in chlorine.","d":"With chlorine, iron forms iron(III) chloride because chlorine is a strong oxidizing agent. (With hydrochloric acid a different product forms — FeCl₂.)"},"Cu + Cl2 -> CuCl2":{"c":"On heating.","d":"Copper combines with chlorine to form copper(II) chloride."},"2Al + 3Cl2 -> 2AlCl3":{"c":"On heating.","d":"Aluminium combines with chlorine to form aluminium chloride."},"2K + Cl2 -> 2KCl":{"c":"","d":"Potassium combines with chlorine to form potassium chloride."},"3Mg + N2 -> Mg3N2":{"c":"When magnesium burns in air, part of it combines with nitrogen rather than oxygen.","d":"Magnesium combines with nitrogen to form magnesium nitride."},"6Li + N2 -> 2Li3N":{"c":"Happens even at room temperature — lithium is the only alkali metal that reacts with nitrogen like this.","d":"Lithium combines with nitrogen to form lithium nitride."},"2Na + H2 -> 2NaH":{"c":"On heating.","d":"Sodium combines with hydrogen to form sodium hydride. Here hydrogen acts as the oxidizing agent."},"Ca + H2 -> CaH2":{"c":"On heating.","d":"Calcium combines with hydrogen to form calcium hydride."},"Si + O2 -> SiO2":{"c":"On strong heating.","d":"Silicon combines with oxygen to form silicon dioxide — the main substance of quartz and sand."},"CO2 + C -> 2CO":{"c":"At a high temperature (red-hot coal).","d":"Carbon dioxide passing through red-hot coal turns into carbon monoxide. This is how CO forms in a blast furnace."},"CaO + H2O -> Ca(OH)2":{"c":"Under ordinary conditions; the mixture gets very hot.","d":"Quicklime combines with water to form slaked lime, calcium hydroxide. This process is called slaking lime."},"Li2O + H2O -> 2LiOH":{"c":"","d":"Lithium oxide reacts with water to form an alkali, lithium hydroxide."},"Na2O + H2O -> 2NaOH":{"c":"","d":"Sodium oxide reacts with water to form an alkali, sodium hydroxide."},"K2O + H2O -> 2KOH":{"c":"","d":"Potassium oxide reacts with water to form an alkali, potassium hydroxide."},"BaO + H2O -> Ba(OH)2":{"c":"","d":"Barium oxide reacts with water to form an alkali, barium hydroxide."},"CO2 + H2O <=> H2CO3":{"c":"Only a small part of the dissolved carbon dioxide turns into the acid.","d":"Carbon dioxide combines with water to form carbonic acid. It is very unstable and easily breaks down again — that is why fizzy drinks go flat."},"SO2 + H2O <=> H2SO3":{"c":"","d":"Sulfur dioxide combines with water to form sulfurous acid. It is unstable, and the reaction is reversible."},"SO3 + H2O -> H2SO4":{"c":"In industry SO₃ is absorbed not in water but in concentrated sulfuric acid: with water it forms a mist that is hard to capture.","d":"Sulfur trioxide combines with water to form sulfuric acid. A great deal of heat is released."},"P2O5 + 3H2O -> 2H3PO4":{"c":"On heating with excess water.","d":"Phosphorus(V) oxide combines with water to form phosphoric acid."},"CaO + CO2 -> CaCO3":{"c":"","d":"Calcium oxide, a basic oxide, combines with carbon dioxide, an acidic oxide, to form calcium carbonate (chalk)."},"Na2O + CO2 -> Na2CO3":{"c":"","d":"Sodium oxide combines with carbon dioxide to form sodium carbonate (soda)."},"SiO2 + CaO -> CaSiO3":{"c":"On fusing (at a high temperature).","d":"Silicon dioxide, an acidic oxide, combines with calcium oxide, a basic oxide, to form calcium silicate."},"NH3 + HCl -> NH4Cl":{"c":"Takes place under ordinary conditions, directly between the gases.","d":"Ammonia and hydrogen chloride gases meet and form white smoke — tiny crystals of ammonium chloride."},"NH3 + HNO3 -> NH4NO3":{"c":"","d":"Ammonia reacts with nitric acid to form ammonium nitrate, a nitrogen fertilizer."},"4NO2 + O2 + 2H2O -> 4HNO3":{"c":"A stage in the industrial production of nitric acid.","d":"Brown NO₂ gas is absorbed by water in the presence of oxygen, forming nitric acid."},"CuSO4 + 5H2O -> CuSO4·5H2O":{"c":"Under ordinary conditions.","d":"White anhydrous copper(II) sulfate takes up water and turns blue, forming copper(II) sulfate pentahydrate. This is a way to detect water."},"Al(OH)3 + NaOH -> Na[Al(OH)4]":{"c":"In an alkali solution.","d":"Aluminium hydroxide dissolves in alkali: it is amphoteric, meaning it reacts with both acids and alkalis. A complex salt is formed."},"CaCO3 + H2O + CO2 <=> Ca(HCO3)2":{"c":"Water saturated with carbon dioxide. The reverse reaction takes place on heating or when the water evaporates.","d":"Limestone slowly dissolves in water containing carbon dioxide, forming soluble calcium hydrogen carbonate. This is how caves form in nature, and the reverse process makes stalactites grow."},"2H2O -> 2H2 + O2":{"c":"Under an electric current (electrolysis). A little alkali or sulfuric acid is added so that the water conducts current better.","d":"An electric current splits water into hydrogen and oxygen. By volume, twice as much hydrogen as oxygen is produced."},"2NaCl -> 2Na + Cl2":{"c":"Electrolysis of molten sodium chloride (about 800 °C). In solution the process goes differently.","d":"An electric current splits the molten salt into metallic sodium and chlorine. This is how sodium is produced in industry."},"2H2O2 -> 2H2O + O2":{"c":"Manganese(IV) oxide MnO₂ as a catalyst. Without a catalyst the reaction is slow; it speeds up in light and on heating.","d":"Hydrogen peroxide decomposes into water and oxygen. A glowing splint flares up brightly in the gas that is released."},"2KMnO4 -> K2MnO4 + MnO2 + O2":{"c":"On heating. A laboratory method for making oxygen.","d":"Potassium permanganate decomposes on heating, releasing oxygen."},"2KClO3 -> 2KCl + 3O2":{"c":"On heating, with manganese(IV) oxide MnO₂ as a catalyst.","d":"Potassium chlorate (Berthollet's salt) decomposes into potassium chloride and oxygen."},"2HgO -> 2Hg + O2":{"c":"On heating. Mercury vapour is poisonous!","d":"Red mercury(II) oxide decomposes into mercury and oxygen. This is exactly how oxygen was discovered in the 18th century."},"CaCO3 -> CaO + CO2":{"c":"On strong heating (about 900 °C). This is how limestone is roasted in industry.","d":"Calcium carbonate (limestone, chalk) decomposes into quicklime and carbon dioxide."},"Cu(OH)2 -> CuO + H2O":{"c":"On heating.","d":"Blue copper(II) hydroxide turns black on heating: it decomposes into black copper(II) oxide and water."},"2Fe(OH)3 -> Fe2O3 + 3H2O":{"c":"On heating.","d":"Brown iron(III) hydroxide decomposes into iron(III) oxide and water."},"2Al(OH)3 -> Al2O3 + 3H2O":{"c":"On heating.","d":"Aluminium hydroxide decomposes into aluminium oxide and water."},"Ca(OH)2 -> CaO + H2O":{"c":"On strong heating.","d":"Slaked lime decomposes into calcium oxide and water."},"H2CO3 -> H2O + CO2":{"c":"Happens by itself: carbonic acid is very unstable.","d":"Carbonic acid breaks down into water and carbon dioxide."},"2NaHCO3 -> Na2CO3 + H2O + CO2":{"c":"On heating.","d":"Baking soda decomposes, releasing carbon dioxide. That is why it is used as a raising agent for dough."},"NH4Cl -> NH3 + HCl":{"c":"On heating. On the cold walls of the test tube the gases combine again into NH₄Cl.","d":"Ammonium chloride decomposes into ammonia and hydrogen chloride. It looks like sublimation, but it is a chemical reaction."},"2NaNO3 -> 2NaNO2 + O2":{"c":"On heating.","d":"Sodium nitrate decomposes into sodium nitrite and oxygen."},"2KNO3 -> 2KNO2 + O2":{"c":"On heating.","d":"Potassium nitrate (saltpetre) decomposes into potassium nitrite and oxygen."},"2Cu(NO3)2 -> 2CuO + 4NO2 + O2":{"c":"On heating. Poisonous brown NO₂ gas is released.","d":"Copper(II) nitrate decomposes into copper(II) oxide, nitrogen dioxide and oxygen."},"2AgNO3 -> 2Ag + 2NO2 + O2":{"c":"On heating.","d":"Silver nitrate decomposes into metallic silver, brown NO₂ gas and oxygen."},"(NH4)2Cr2O7 -> Cr2O3 + N2 + 4H2O":{"c":"On ignition. The “chemical volcano” experiment is done only in a fume cupboard: ammonium dichromate is poisonous.","d":"Orange crystals of ammonium dichromate decompose with sparks, giving fluffy green chromium(III) oxide, nitrogen and water vapour."},"Cu2(OH)2CO3 -> 2CuO + H2O + CO2":{"c":"On heating.","d":"Green malachite (basic copper(II) carbonate) decomposes into black copper(II) oxide, water and carbon dioxide."},"C6H12O6 -> 2C2H5OH + 2CO2":{"c":"By yeast enzymes, without access to air.","d":"Yeast turns glucose into ethanol and carbon dioxide. Bubbles of this gas make dough rise.","n":"alcoholic fermentation — driven by enzymes"},"Zn + 2HCl -> ZnCl2 + H2":{"c":"Under ordinary conditions.","d":"Zinc displaces hydrogen from hydrochloric acid: bubbles of hydrogen appear on the metal, and zinc chloride forms."},"Fe + 2HCl -> FeCl2 + H2":{"c":"Under ordinary conditions.","d":"Iron displaces hydrogen from hydrochloric acid, forming iron(II) chloride. With the acid it is FeCl₂ that forms, not FeCl₃."},"Mg + 2HCl -> MgCl2 + H2":{"c":"Under ordinary conditions.","d":"Magnesium reacts vigorously with hydrochloric acid: hydrogen is released and the solution warms up."},"2Al + 6HCl -> 2AlCl3 + 3H2":{"c":"The reaction may not start at once: the acid first dissolves the protective oxide film.","d":"Aluminium displaces hydrogen from hydrochloric acid, forming aluminium chloride."},"Zn + H2SO4 -> ZnSO4 + H2":{"c":"With dilute sulfuric acid. Concentrated acid reacts differently — no hydrogen is released.","d":"Zinc displaces hydrogen from dilute sulfuric acid, forming zinc sulfate. This is a common laboratory method for making hydrogen."},"Fe + H2SO4 -> FeSO4 + H2":{"c":"With dilute sulfuric acid. Cold concentrated sulfuric acid passivates iron, and the reaction does not happen.","d":"Iron displaces hydrogen from dilute sulfuric acid, forming iron(II) sulfate."},"Mg + H2SO4 -> MgSO4 + H2":{"c":"With dilute sulfuric acid.","d":"Magnesium displaces hydrogen from dilute sulfuric acid, forming magnesium sulfate."},"2Na + 2H2O -> 2NaOH + H2":{"c":"Vigorous, under ordinary conditions. The experiment is done with a small piece of sodium.","d":"Sodium darts around on the water, melts into a ball and hisses: hydrogen is released and the alkali NaOH forms in the water."},"2K + 2H2O -> 2KOH + H2":{"c":"Very vigorous: the hydrogen released catches fire with a violet flame.","d":"Potassium reacts with water even more vigorously than sodium, giving the alkali KOH and hydrogen."},"2Li + 2H2O -> 2LiOH + H2":{"c":"Under ordinary conditions; calmer than sodium.","d":"Lithium reacts with water, giving the alkali LiOH and hydrogen."},"Ca + 2H2O -> Ca(OH)2 + H2":{"c":"Under ordinary conditions.","d":"Calcium reacts with water: hydrogen is released and the solution turns cloudy because calcium hydroxide is only slightly soluble."},"Mg + 2H2O -> Mg(OH)2 + H2":{"c":"With hot water; with cold water it hardly happens.","d":"Magnesium slowly displaces hydrogen from hot water."},"3Fe + 4H2O -> Fe3O4 + 4H2":{"c":"Red-hot iron and steam (high temperature).","d":"Red-hot iron takes oxygen from steam, giving iron scale (Fe₃O₄) and hydrogen. This is an old method of making hydrogen."},"Fe + CuSO4 -> FeSO4 + Cu":{"c":"In solution, under ordinary conditions.","d":"An iron nail in copper(II) sulfate solution becomes coated with red copper: the more reactive iron displaces copper from the salt."},"Zn + CuSO4 -> ZnSO4 + Cu":{"c":"In solution, under ordinary conditions.","d":"Zinc displaces copper from copper(II) sulfate solution: the blue solution becomes paler and copper is deposited on the zinc."},"Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag":{"c":"In solution, under ordinary conditions.","d":"Copper displaces silver from silver nitrate solution: silver crystals appear on the copper and the solution turns blue."},"Cl2 + 2KBr -> 2KCl + Br2":{"c":"In solution.","d":"Chlorine is more reactive than bromine and displaces it from the bromide: the solution turns the yellow-brown colour of bromine."},"Cl2 + 2KI -> 2KCl + I2":{"c":"In solution.","d":"Chlorine displaces iodine from potassium iodide, and the solution turns brown because of the iodine released."},"Br2 + 2KI -> 2KBr + I2":{"c":"In solution.","d":"Bromine is more reactive than iodine and displaces it from potassium iodide."},"CuO + H2 -> Cu + H2O":{"c":"On heating.","d":"Hydrogen takes oxygen from copper(II) oxide: the black powder turns red — that is copper — and drops of water appear on the walls."},"Fe2O3 + 3H2 -> 2Fe + 3H2O":{"c":"On heating.","d":"Hydrogen reduces iron(III) oxide to iron."},"WO3 + 3H2 -> W + 3H2O":{"c":"At a high temperature. This is how pure tungsten for lamp filaments is made.","d":"Hydrogen reduces tungsten oxide to tungsten."},"Fe2O3 + 2Al -> Al2O3 + 2Fe":{"c":"The mixture (thermite) is ignited; the temperature rises so high that the iron comes out molten.","d":"Aluminium takes oxygen from iron(III) oxide. This is the thermite reaction — used, for example, to weld rails."},"2CuO + C -> 2Cu + CO2":{"c":"On heating.","d":"Carbon reduces copper(II) oxide to copper, and carbon dioxide is released."},"2Mg + CO2 -> 2MgO + C":{"c":"Burning magnesium keeps burning in carbon dioxide.","d":"Magnesium takes oxygen even from carbon dioxide, giving magnesium oxide and soot (carbon). That is why burning magnesium must not be put out with a CO₂ extinguisher."},"2F2 + 2H2O -> 4HF + O2":{"c":"Under ordinary conditions.","d":"Fluorine is so reactive that it displaces oxygen from water."},"2H2S + O2 -> 2S + 2H2O":{"c":"When oxygen is in short supply.","d":"If there is little oxygen, hydrogen sulfide is oxidized only to sulfur — a yellow deposit forms on cold objects."},"NaOH + HCl -> NaCl + H2O":{"c":"In solution, under ordinary conditions.","d":"An alkali and an acid neutralize each other, giving a salt (sodium chloride) and water."},"2NaOH + H2SO4 -> Na2SO4 + 2H2O":{"c":"In solution, under ordinary conditions.","d":"Sodium hydroxide neutralizes sulfuric acid, giving sodium sulfate and water."},"KOH + HNO3 -> KNO3 + H2O":{"c":"In solution, under ordinary conditions.","d":"Potassium hydroxide neutralizes nitric acid, giving potassium nitrate and water."},"Ca(OH)2 + 2HCl -> CaCl2 + 2H2O":{"c":"","d":"Calcium hydroxide neutralizes hydrochloric acid, giving calcium chloride and water."},"3NaOH + H3PO4 -> Na3PO4 + 3H2O":{"c":"Three times as much alkali as acid is needed; with less alkali, acid salts form.","d":"Sodium hydroxide completely neutralizes phosphoric acid, forming sodium phosphate."},"Ba(OH)2 + H2SO4 -> BaSO4 + 2H2O":{"c":"","d":"Barium hydroxide reacts with sulfuric acid, and a white precipitate of barium sulfate forms."},"Cu(OH)2 + 2HCl -> CuCl2 + 2H2O":{"c":"","d":"The blue precipitate of copper(II) hydroxide dissolves in hydrochloric acid, giving a solution of copper(II) chloride."},"Al(OH)3 + 3HCl -> AlCl3 + 3H2O":{"c":"","d":"Aluminium hydroxide dissolves in the acid, giving aluminium chloride and water."},"CuO + 2HCl -> CuCl2 + H2O":{"c":"On heating.","d":"Black copper(II) oxide dissolves in hydrochloric acid, giving a solution of copper(II) chloride and water."},"CuO + H2SO4 -> CuSO4 + H2O":{"c":"On heating.","d":"Copper(II) oxide dissolves in sulfuric acid, giving a blue solution of copper(II) sulfate."},"MgO + 2HCl -> MgCl2 + H2O":{"c":"","d":"Magnesium oxide dissolves in hydrochloric acid, giving magnesium chloride and water."},"Fe2O3 + 6HCl -> 2FeCl3 + 3H2O":{"c":"","d":"Iron(III) oxide dissolves in hydrochloric acid, giving a yellow-brown solution of iron(III) chloride. That is why acids dissolve rust."},"CaCO3 + 2HCl -> CaCl2 + H2O + CO2":{"c":"Under ordinary conditions.","d":"Chalk or marble fizzes in hydrochloric acid as carbon dioxide is released. The carbonic acid formed immediately breaks down into water and CO₂."},"Na2CO3 + 2HCl -> 2NaCl + H2O + CO2":{"c":"Under ordinary conditions.","d":"Sodium carbonate reacts with hydrochloric acid, releasing carbon dioxide. This is how carbonates are detected."},"NaHCO3 + HCl -> NaCl + H2O + CO2":{"c":"Under ordinary conditions.","d":"Baking soda reacts with hydrochloric acid, releasing carbon dioxide."},"NaHCO3 + CH3COOH -> CH3COONa + H2O + CO2":{"c":"Under ordinary conditions — for example, when baking soda is mixed with vinegar.","d":"Baking soda reacts with acetic acid, and the mixture foams with carbon dioxide."},"AgNO3 + NaCl -> AgCl + NaNO3":{"c":"In solution.","d":"A white curdy precipitate of silver chloride forms. This is how chloride ions are detected."},"AgNO3 + KBr -> AgBr + KNO3":{"c":"In solution.","d":"A pale yellow precipitate of silver bromide forms. This is how bromide ions are detected."},"BaCl2 + H2SO4 -> BaSO4 + 2HCl":{"c":"In solution.","d":"A white precipitate of barium sulfate forms that does not dissolve in acids. This is how sulfate ions are detected."},"BaCl2 + Na2SO4 -> BaSO4 + 2NaCl":{"c":"In solution.","d":"Barium chloride and sodium sulfate swap partners, and a white precipitate of barium sulfate forms."},"CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4":{"c":"In solution.","d":"A blue precipitate of copper(II) hydroxide forms. This is how copper(II) ions are detected."},"FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl":{"c":"In solution.","d":"A brown precipitate of iron(III) hydroxide forms. This is how iron(III) ions are detected."},"FeSO4 + 2NaOH -> Fe(OH)2 + Na2SO4":{"c":"In solution.","d":"A pale green precipitate of iron(II) hydroxide forms; in air it slowly turns brown as it is oxidized."},"Pb(NO3)2 + 2KI -> PbI2 + 2KNO3":{"c":"In solution. Lead compounds are poisonous.","d":"A bright yellow precipitate of lead(II) iodide forms. If it is dissolved in hot water and cooled, shiny crystals appear — the “golden rain” experiment."},"NH4Cl + NaOH -> NaCl + NH3 + H2O":{"c":"On heating.","d":"Ammonia with its sharp smell is released; moist red litmus paper turns blue. This is how ammonium ions are detected."},"FeS + 2HCl -> FeCl2 + H2S":{"c":"Only in a fume cupboard: hydrogen sulfide is poisonous.","d":"Iron(II) sulfide reacts with hydrochloric acid, releasing hydrogen sulfide, which smells of rotten eggs. A laboratory method for making H₂S."},"Na2SO3 + 2HCl -> 2NaCl + H2O + SO2":{"c":"","d":"Sodium sulfite reacts with hydrochloric acid, releasing sulfur dioxide with its sharp smell."},"Ca(OH)2 + CO2 -> CaCO3 + H2O":{"c":"Under ordinary conditions.","d":"Clear limewater turns milky as insoluble calcium carbonate forms. This is how carbon dioxide is detected — for example, in exhaled air.","n":"alkali + acidic oxide"},"2NaOH + CO2 -> Na2CO3 + H2O":{"c":"","d":"The alkali absorbs carbon dioxide, giving sodium carbonate and water.","n":"alkali + acidic oxide"},"SiO2 + 2NaOH -> Na2SiO3 + H2O":{"c":"On fusing.","d":"Silicon dioxide fused with an alkali forms sodium silicate — its solution is called water glass.","n":"alkali + acidic oxide"},"Cl2 + H2O <=> HCl + HClO":{"c":"When chlorine dissolves in water (chlorine water).","d":"Some of the chlorine reacts with water, giving hydrochloric and hypochlorous acids. Hypochlorous acid disinfects water and bleaches fabrics.","n":"chlorine is both the oxidizing and the reducing agent (disproportionation)"},"CH4 + 2O2 -> CO2 + 2H2O":{"c":"Ignition. A mixture of methane and air is explosive.","d":"Methane (the main part of natural gas) burns, giving carbon dioxide and water.","n":"combustion"},"C3H8 + 5O2 -> 3CO2 + 4H2O":{"c":"Ignition.","d":"Propane (bottled gas) burns to carbon dioxide and water.","n":"combustion"},"2C4H10 + 13O2 -> 8CO2 + 10H2O":{"c":"Ignition.","d":"Butane (lighter gas) burns to carbon dioxide and water.","n":"combustion"},"2C2H2 + 5O2 -> 4CO2 + 2H2O":{"c":"Ignition.","d":"Acetylene burns with a very hot flame — it is used for welding and cutting metals.","n":"combustion"},"C2H5OH + 3O2 -> 2CO2 + 3H2O":{"c":"Ignition.","d":"Ethanol burns with an almost colourless bluish flame, giving carbon dioxide and water.","n":"combustion"},"2H2S + 3O2 -> 2H2O + 2SO2":{"c":"Ignition, with enough oxygen.","d":"Hydrogen sulfide burns, giving water and sulfur dioxide.","n":"combustion"},"4NH3 + 3O2 -> 2N2 + 6H2O":{"c":"Ammonia burns in pure oxygen (it does not burn in air), without a catalyst.","d":"When ammonia burns, nitrogen and water are formed.","n":"combustion"},"4NH3 + 5O2 -> 4NO + 6H2O":{"c":"Platinum catalyst, high temperature. This is the first stage of the industrial production of nitric acid.","d":"On a platinum catalyst, ammonia is oxidized not to nitrogen but to nitrogen monoxide.","n":"catalytic oxidation of ammonia"},"C6H12O6 + 6O2 -> 6CO2 + 6H2O":{"c":"In the cells of living organisms it happens gradually, in many steps, with the help of enzymes.","d":"Glucose is oxidized by oxygen to carbon dioxide and water. The energy released keeps the cell alive.","n":"oxidation of glucose — the overall equation of cellular respiration"},"6CO2 + 6H2O -> C6H12O6 + 6O2":{"c":"In light, in the green parts of plants, with the help of chlorophyll.","d":"Using the energy of light, plants turn carbon dioxide and water into glucose. Oxygen is released into the atmosphere.","n":"photosynthesis — the overall equation"},"Fe2O3 + 3CO -> 2Fe + 3CO2":{"c":"At a high temperature in a blast furnace.","d":"Carbon monoxide takes oxygen from iron(III) oxide, and iron is formed. This is how pig iron is smelted.","n":"reduction of a metal by carbon monoxide"},"Cu + 4HNO3 -> Cu(NO3)2 + 2NO2 + 2H2O":{"c":"With concentrated nitric acid. A poisonous brown gas is released — only in a fume cupboard.","d":"Copper does not displace hydrogen from acids, but concentrated nitric acid oxidizes it. Brown NO₂ gas is released, not hydrogen.","n":"metal + oxidizing acid"},"3Cu + 8HNO3 -> 3Cu(NO3)2 + 2NO + 4H2O":{"c":"With dilute nitric acid.","d":"Dilute nitric acid also oxidizes copper, but colourless NO is released (in air it turns brown, becoming NO₂).","n":"metal + oxidizing acid"},"Cu + 2H2SO4 -> CuSO4 + SO2 + 2H2O":{"c":"With concentrated sulfuric acid, on heating. Copper does not react with dilute sulfuric acid.","d":"Concentrated sulfuric acid oxidizes copper, and sulfur dioxide is released.","n":"metal + oxidizing acid"},"MnO2 + 4HCl -> MnCl2 + Cl2 + 2H2O":{"c":"With concentrated hydrochloric acid, on heating. Chlorine is poisonous — only in a fume cupboard.","d":"Manganese(IV) oxide oxidizes hydrogen chloride to chlorine. This is a laboratory method for making chlorine.","n":"oxidation of hydrogen chloride"},"2Al + 2NaOH + 6H2O -> 2Na[Al(OH)4] + 3H2":{"c":"In an alkali solution.","d":"Aluminium dissolves in alkali, releasing hydrogen: the alkali destroys the protective oxide film, and the amphoteric nature of aluminium shows.","n":"amphoteric metal + alkali"},"4Ag + 2H2S + O2 -> 2Ag2S + 2H2O":{"c":"Slowly, under ordinary conditions, if the air contains traces of hydrogen sulfide.","d":"This is why silver jewellery tarnishes: black silver sulfide forms on its surface.","n":"oxidation of a metal"},"H2 + F2 -> 2HF":{"c":"Explosively, even in the dark and in the cold.","d":"Fluorine is the most reactive nonmetal: it reacts with hydrogen instantly."},"H2 + Br2 -> 2HBr":{"c":"On heating.","d":"Bromine combines with hydrogen less readily than chlorine — heating is needed."},"H2 + I2 <=> 2HI":{"c":"On heating; the reaction is reversible and does not go to completion.","d":"The reactivity of the halogens falls down the group: iodine combines with hydrogen the least readily of all."},"Cl2 + 2NaOH -> NaCl + NaClO + H2O":{"c":"In a cold alkali solution.","d":"Chlorine is oxidized and reduced at the same time, giving sodium chloride and sodium hypochlorite. This solution is bleach.","n":"disproportionation of chlorine in alkali"},"3Cl2 + 6NaOH -> 5NaCl + NaClO3 + 3H2O":{"c":"In a hot alkali solution.","d":"On heating, chlorate forms instead of hypochlorite.","n":"disproportionation of chlorine in hot alkali"},"3Cl2 + 6KOH -> 5KCl + KClO3 + 3H2O":{"c":"In a hot alkali solution.","d":"This is how potassium chlorate (Berthollet's salt) KClO₃ is made.","n":"disproportionation of chlorine in hot alkali"},"2Cl2 + 2Ca(OH)2 -> CaCl2 + Ca(ClO)2 + 2H2O":{"c":"Chlorine is passed through slaked lime.","d":"A mixture of calcium chloride and calcium hypochlorite forms — the basis of bleaching powder used for disinfection.","n":"disproportionation of chlorine"},"2KMnO4 + 16HCl -> 2KCl + 2MnCl2 + 5Cl2 + 8H2O":{"c":"With concentrated hydrochloric acid, at room temperature. Only in a fume cupboard.","d":"Potassium permanganate oxidizes chloride ions to chlorine — a convenient laboratory method for making chlorine.","n":"oxidation of hydrogen chloride"},"KClO3 + 6HCl -> KCl + 3Cl2 + 3H2O":{"c":"With concentrated hydrochloric acid.","d":"Chlorine from the chlorate (+5) and from hydrogen chloride (−1) ends up in the same oxidation state, 0.","n":"comproportionation of chlorine"},"NaClO + 2HCl -> NaCl + Cl2 + H2O":{"c":"Under ordinary conditions.","d":"Hypochlorite bleach must never be mixed with acidic cleaners: poisonous chlorine is released.","n":"comproportionation of chlorine"},"Ca(ClO)2 + 4HCl -> CaCl2 + 2Cl2 + 2H2O":{"c":"Under ordinary conditions.","d":"Calcium hypochlorite also releases chlorine with hydrochloric acid.","n":"comproportionation of chlorine"},"2NaCl + H2SO4 -> Na2SO4 + 2HCl":{"c":"Solid salt and concentrated sulfuric acid, strong heating.","d":"Non-volatile sulfuric acid drives out volatile hydrogen chloride. A laboratory method for making HCl."},"NaCl + H2SO4 -> NaHSO4 + HCl":{"c":"Solid salt and concentrated sulfuric acid, gentle heating.","d":"With gentle heating an acid salt, sodium hydrogen sulfate, forms."},"CaF2 + H2SO4 -> CaSO4 + 2HF":{"c":"Concentrated sulfuric acid, heating.","d":"This is how hydrogen fluoride is made from fluorite."},"SiO2 + 4HF -> SiF4 + 2H2O":{"c":"Under ordinary conditions.","d":"Hydrofluoric acid eats into glass — it is kept in plastic containers, and the reaction is used to etch glass.","n":"acidic oxide + hydrogen fluoride"},"2KBr + 2H2SO4 -> K2SO4 + Br2 + SO2 + 2H2O":{"c":"Solid bromide and concentrated sulfuric acid.","d":"The bromide ion is a stronger reducing agent than chloride: sulfuric acid oxidizes it to bromine.","n":"oxidation of bromide by concentrated sulfuric acid"},"8KI + 5H2SO4 -> 4K2SO4 + 4I2 + H2S + 4H2O":{"c":"Solid iodide and concentrated sulfuric acid.","d":"The iodide ion is a strong reducing agent: sulfuric acid is reduced all the way to hydrogen sulfide.","n":"oxidation of iodide by concentrated sulfuric acid"},"2HBr + H2SO4 -> Br2 + SO2 + 2H2O":{"c":"Concentrated sulfuric acid.","d":"That is why hydrogen bromide cannot be made from bromides with concentrated sulfuric acid.","n":"oxidation of hydrogen bromide"},"8HI + H2SO4 -> 4I2 + H2S + 4H2O":{"c":"Concentrated sulfuric acid.","d":"Hydrogen iodide reduces sulfuric acid to hydrogen sulfide.","n":"oxidation of hydrogen iodide"},"Cl2 + H2S -> S + 2HCl":{"c":"Under ordinary conditions (for example, in solution).","d":"Chlorine oxidizes hydrogen sulfide: yellow sulfur precipitates."},"4Cl2 + H2S + 4H2O -> H2SO4 + 8HCl":{"c":"Excess chlorine water.","d":"With excess chlorine, sulfur is oxidized to its highest oxidation state, +6.","n":"oxidation of hydrogen sulfide by excess chlorine"},"Cl2 + SO2 + 2H2O -> H2SO4 + 2HCl":{"c":"In aqueous solution.","d":"Chlorine oxidizes sulfur dioxide to sulfuric acid.","n":"oxidation of sulfur dioxide"},"Br2 + SO2 + 2H2O -> H2SO4 + 2HBr":{"c":"In aqueous solution.","d":"Bromine water loses its colour — this can be used to detect sulfur dioxide.","n":"oxidation of sulfur dioxide"},"I2 + SO2 + 2H2O -> H2SO4 + 2HI":{"c":"In aqueous solution.","d":"Sulfur dioxide decolourizes iodine solution.","n":"oxidation of sulfur dioxide"},"I2 + H2S -> S + 2HI":{"c":"In aqueous solution.","d":"Iodine oxidizes hydrogen sulfide to sulfur."},"2HClO -> 2HCl + O2":{"c":"In light.","d":"Hypochlorous acid is unstable and breaks down in light, releasing oxygen."},"4KClO3 -> 3KClO4 + KCl":{"c":"Careful heating without a catalyst.","d":"Without a catalyst, potassium chlorate turns into potassium perchlorate and potassium chloride; no oxygen is released.","n":"disproportionation"},"2NaBr + Cl2 -> 2NaCl + Br2":{"c":"In solution.","d":"Chlorine displaces bromine from bromides."},"2NaI + Cl2 -> 2NaCl + I2":{"c":"In solution.","d":"Chlorine displaces iodine from iodides."},"5Cl2 + I2 + 6H2O -> 2HIO3 + 10HCl":{"c":"Excess chlorine water.","d":"If there is a lot of chlorine, the iodine released is oxidized further, to iodic acid, and the brown colour disappears.","n":"oxidation of iodine by excess chlorine"},"3I2 + 6KOH -> 5KI + KIO3 + 3H2O":{"c":"In an alkali solution on heating.","d":"In alkali, iodine is oxidized to iodate and reduced to iodide at the same time.","n":"disproportionation of iodine"},"2KI + O3 + H2O -> I2 + O2 + 2KOH":{"c":"Under ordinary conditions.","d":"Ozone oxidizes iodide to iodine, but oxygen does not. This is how ozone is told apart from oxygen (paper soaked in starch and KI turns blue).","n":"oxidation of iodide by ozone"},"2KI + H2O2 + H2SO4 -> I2 + K2SO4 + 2H2O":{"c":"In acidic solution.","d":"Hydrogen peroxide oxidizes iodide ions to iodine — the solution turns brown.","n":"oxidation of iodide by hydrogen peroxide"},"AgNO3 + KI -> AgI + KNO3":{"c":"In solution.","d":"A yellow precipitate of silver iodide forms — this is how iodide ions are detected."},"AgNO3 + HCl -> AgCl + HNO3":{"c":"In solution.","d":"A white curdy precipitate of silver chloride forms."},"2AgCl -> 2Ag + Cl2":{"c":"In light.","d":"Silver chloride darkens in light as silver is released. Photography is based on similar reactions of silver halides."},"2F2 + 2NaOH -> 2NaF + OF2 + H2O":{"c":"Dilute cold alkali solution.","d":"Fluorine oxidizes even oxygen: oxygen difluoride forms, in which oxygen has the oxidation state +2.","n":"oxidation by fluorine"},"2H2S + SO2 -> 3S + 2H2O":{"c":"Under ordinary conditions.","d":"Sulfur from hydrogen sulfide (−2) and from sulfur dioxide (+4) both become elemental sulfur (0). This is how sulfur is recovered from gases.","n":"comproportionation of sulfur"},"3S + 6KOH -> 2K2S + K2SO3 + 3H2O":{"c":"On heating in concentrated alkali.","d":"Sulfur is oxidized (to +4) and reduced (to −2) at the same time.","n":"disproportionation of sulfur"},"S + 2H2SO4 -> 3SO2 + 2H2O":{"c":"With concentrated sulfuric acid, on heating.","d":"Concentrated sulfuric acid oxidizes sulfur and is itself reduced to sulfur dioxide.","n":"comproportionation"},"S + 6HNO3 -> H2SO4 + 6NO2 + 2H2O":{"c":"With concentrated nitric acid, on heating.","d":"Concentrated nitric acid oxidizes sulfur to sulfuric acid, and a brown gas is released.","n":"oxidation of a nonmetal by nitric acid"},"S + 2HNO3 -> H2SO4 + 2NO":{"c":"With dilute nitric acid, on heating.","d":"Dilute nitric acid is reduced to NO.","n":"oxidation of a nonmetal by nitric acid"},"2Na + S -> Na2S":{"c":"On grinding or heating.","d":"Sodium combines with sulfur to form sodium sulfide."},"S + 3F2 -> SF6":{"c":"Under ordinary conditions.","d":"Fluorine oxidizes sulfur to its highest oxidation state, +6."},"4FeS2 + 11O2 -> 2Fe2O3 + 8SO2":{"c":"On strong heating in air. The first stage of sulfuric acid production.","d":"When pyrite is roasted, both the iron and the sulfur are oxidized.","n":"roasting of pyrite"},"H2S + 2NaOH -> Na2S + 2H2O":{"c":"Excess alkali.","d":"Hydrosulfuric acid is neutralized by the alkali, giving a normal salt."},"H2S + NaOH -> NaHS + H2O":{"c":"Not enough alkali (1 : 1).","d":"If there is little alkali, an acid salt, the hydrogen sulfide, forms."},"Na2S + 2HCl -> 2NaCl + H2S":{"c":"In solution.","d":"A strong acid drives out weak hydrosulfuric acid: there is a smell of rotten eggs."},"CuSO4 + H2S -> CuS + H2SO4":{"c":"In solution.","d":"Black copper(II) sulfide precipitates. It does not dissolve even in acid, so here a weak acid displaces a strong one."},"Pb(NO3)2 + H2S -> PbS + 2HNO3":{"c":"In solution.","d":"Black lead sulfide precipitates — this is how hydrogen sulfide is detected (paper soaked in a lead salt turns black)."},"CuSO4 + Na2S -> CuS + Na2SO4":{"c":"In solution.","d":"A black precipitate of copper(II) sulfide forms."},"Pb(NO3)2 + Na2S -> PbS + 2NaNO3":{"c":"In solution.","d":"A black precipitate of lead sulfide forms — an identification test for sulfide ions."},"ZnS + 2HCl -> ZnCl2 + H2S":{"c":"In solution.","d":"Zinc sulfide dissolves in hydrochloric acid, releasing hydrogen sulfide."},"FeS + H2SO4 -> FeSO4 + H2S":{"c":"With dilute sulfuric acid. Only in a fume cupboard.","d":"Another laboratory method for making hydrogen sulfide."},"H2S + 4Br2 + 4H2O -> H2SO4 + 8HBr":{"c":"Excess bromine water.","d":"Bromine water loses its colour, and sulfur is oxidized to +6.","n":"oxidation of hydrogen sulfide"},"H2S + 8HNO3 -> H2SO4 + 8NO2 + 4H2O":{"c":"With concentrated nitric acid.","d":"Concentrated nitric acid oxidizes hydrogen sulfide to sulfuric acid.","n":"oxidation of hydrogen sulfide"},"H2S + H2SO4 -> S + SO2 + 2H2O":{"c":"With concentrated sulfuric acid.","d":"Hydrogen sulfide is oxidized to sulfur, and sulfuric acid is reduced to SO₂.","n":"oxidation of hydrogen sulfide"},"SO2 + 2NaOH -> Na2SO3 + H2O":{"c":"Excess alkali.","d":"Sulfur dioxide is absorbed by the alkali, giving a sulfite.","n":"acidic oxide + alkali"},"SO2 + NaOH -> NaHSO3":{"c":"Not enough alkali.","d":"With excess sulfur dioxide, an acid salt, the hydrogen sulfite, forms.","n":"acidic oxide + alkali"},"SO2 + CaO -> CaSO3":{"c":"On heating.","d":"An acidic oxide combines with a basic one, giving calcium sulfite."},"2Na2SO3 + O2 -> 2Na2SO4":{"c":"Slowly, in air.","d":"Sulfites are gradually oxidized by oxygen in the air to sulfates."},"Na2SO3 + S -> Na2S2O3":{"c":"On boiling the solution with sulfur.","d":"This is how sodium thiosulfate is made."},"Na2S2O3 + H2SO4 -> Na2SO4 + S + SO2 + H2O":{"c":"In solution, under ordinary conditions.","d":"The solution turns cloudy as sulfur is released. This reaction is used in experiments on reaction rate.","n":"decomposition of thiosulfuric acid"},"Na2S2O3 + 4Cl2 + 5H2O -> Na2SO4 + H2SO4 + 8HCl":{"c":"In solution.","d":"Thiosulfate removes leftover chlorine — that is why it is called an antichlor.","n":"oxidation of thiosulfate"},"2Na2S2O3 + I2 -> Na2S4O6 + 2NaI":{"c":"In solution.","d":"The iodine solution loses its colour. The reaction is used in quantitative analysis (iodometry).","n":"oxidation of thiosulfate by iodine"},"SO2 + NO2 -> SO3 + NO":{"c":"Under ordinary conditions.","d":"Nitrogen dioxide oxidizes sulfur dioxide. The old lead-chamber (nitrous) process for sulfuric acid is based on this.","n":"oxidation of sulfur dioxide"},"SO3 + MgO -> MgSO4":{"c":"","d":"An acidic oxide combines with a basic one, giving magnesium sulfate."},"SO3 + 2NaOH -> Na2SO4 + H2O":{"c":"","d":"Sulfur trioxide reacts with an alkali, giving sodium sulfate.","n":"acidic oxide + alkali"},"H2SO4 + SO3 -> H2S2O7":{"c":"Sulfur trioxide is dissolved in concentrated sulfuric acid. The last stage of sulfuric acid production.","d":"Oleum forms — a solution of SO₃ in sulfuric acid; it is then diluted with water."},"C + 2H2SO4 -> CO2 + 2SO2 + 2H2O":{"c":"With concentrated sulfuric acid, on heating.","d":"Concentrated sulfuric acid oxidizes carbon (coal) to carbon dioxide.","n":"oxidation of a nonmetal by sulfuric acid"},"2P + 5H2SO4 -> 2H3PO4 + 5SO2 + 2H2O":{"c":"With concentrated sulfuric acid, on heating.","d":"Phosphorus is oxidized to phosphoric acid.","n":"oxidation of a nonmetal by sulfuric acid"},"H2SO4 + Na2CO3 -> Na2SO4 + H2O + CO2":{"c":"In solution.","d":"Sulfuric acid drives carbon dioxide out of the carbonate."},"Ba(NO3)2 + H2SO4 -> BaSO4 + 2HNO3":{"c":"In solution.","d":"A white precipitate of barium sulfate forms — an identification test for sulfate ions."},"2O3 -> 3O2":{"c":"Happens by itself, faster on heating.","d":"Ozone is unstable and gradually turns into ordinary oxygen.","n":"conversion of ozone into oxygen"},"PbS + 4O3 -> PbSO4 + 4O2":{"c":"Under ordinary conditions.","d":"Ozone is a very strong oxidizing agent: it turns black lead sulfide into white lead sulfate.","n":"oxidation of a sulfide by ozone"},"PbS + 4H2O2 -> PbSO4 + 4H2O":{"c":"Under ordinary conditions.","d":"This is how restorers brighten darkened lead white on old paintings.","n":"oxidation of a sulfide by hydrogen peroxide"},"2Ag2O -> 4Ag + O2":{"c":"On heating.","d":"Silver oxide easily decomposes into silver and oxygen."},"H2O2 + Ag2O -> 2Ag + O2 + H2O":{"c":"Under ordinary conditions.","d":"Here hydrogen peroxide is the reducing agent: it is itself oxidized to oxygen.","n":"hydrogen peroxide as a reducing agent"},"BaO2 + H2SO4 -> BaSO4 + H2O2":{"c":"With dilute sulfuric acid in the cold.","d":"A laboratory method for making hydrogen peroxide."},"Na2SO4 + 4C -> Na2S + 4CO":{"c":"On strong heating.","d":"Carbon reduces the sulfate to a sulfide.","n":"reduction of a sulfate by carbon"},"NH4NO2 -> N2 + 2H2O":{"c":"On heating.","d":"Ammonium nitrite decomposes into nitrogen and water — a laboratory method for making nitrogen."},"NaNO2 + NH4Cl -> NaCl + N2 + 2H2O":{"c":"On heating the solutions.","d":"Ammonium nitrite forms first and immediately decomposes, releasing nitrogen.","n":"making nitrogen"},"NH4NO3 -> N2O + 2H2O":{"c":"On heating (about 200–250 °C).","d":"Ammonium nitrate decomposes, forming dinitrogen monoxide — “laughing gas”."},"2NH4NO3 -> 2N2 + O2 + 4H2O":{"c":"On strong heating or detonation; explosive.","d":"At a high temperature, ammonium nitrate explosively decomposes into nitrogen and oxygen."},"(NH4)2CO3 -> 2NH3 + CO2 + H2O":{"c":"On heating.","d":"Ammonium carbonate turns completely into gases and vapour."},"NH4HCO3 -> NH3 + CO2 + H2O":{"c":"On heating.","d":"Ammonium hydrogen carbonate is used as a raising agent (baker's ammonia): during baking it turns entirely into gases."},"2NH4Cl + Ca(OH)2 -> CaCl2 + 2NH3 + 2H2O":{"c":"On heating a mixture of the solids.","d":"A laboratory method for making ammonia."},"(NH4)2SO4 + 2NaOH -> Na2SO4 + 2NH3 + 2H2O":{"c":"On heating.","d":"Ammonia with its sharp smell is released — an identification test for the ammonium ion."},"NH3 + H2O <=> NH3·H2O":{"c":"When ammonia dissolves in water.","d":"Ammonia is very soluble in water. The solution (aqueous ammonia) is a weak base."},"2NH3 + H2SO4 -> (NH4)2SO4":{"c":"","d":"Ammonia, acting as a base, takes up the acid, giving ammonium sulfate — a nitrogen fertilizer."},"2NH3 + 3CuO -> 3Cu + N2 + 3H2O":{"c":"On heating.","d":"Ammonia reduces copper(II) oxide to copper and is itself oxidized to nitrogen.","n":"ammonia as a reducing agent"},"8NH3 + 3Cl2 -> N2 + 6NH4Cl":{"c":"Under ordinary conditions.","d":"Chlorine oxidizes ammonia to nitrogen; the excess ammonia binds the hydrogen chloride into white NH₄Cl smoke.","n":"ammonia as a reducing agent"},"N2 + 3Ca -> Ca3N2":{"c":"On heating.","d":"Calcium combines with nitrogen to form calcium nitride."},"Ca3N2 + 6H2O -> 3Ca(OH)2 + 2NH3":{"c":"Under ordinary conditions.","d":"Nitrides of reactive metals are completely broken down by water, releasing ammonia.","n":"hydrolysis of a nitride"},"Mg3N2 + 6H2O -> 3Mg(OH)2 + 2NH3":{"c":"Under ordinary conditions.","d":"Magnesium nitride is broken down by water, giving magnesium hydroxide and ammonia.","n":"hydrolysis of a nitride"},"Li3N + 3H2O -> 3LiOH + NH3":{"c":"Under ordinary conditions.","d":"Lithium nitride is broken down by water, giving an alkali and ammonia.","n":"hydrolysis of a nitride"},"Mg3N2 + 8HCl -> 3MgCl2 + 2NH4Cl":{"c":"With excess hydrochloric acid.","d":"In acid, an ammonium salt forms instead of ammonia."},"4HNO3 -> 4NO2 + O2 + 2H2O":{"c":"In light or on heating.","d":"Nitric acid is unstable and gradually turns yellow from the NO₂ it releases, so it is kept in dark bottles."},"2Mg(NO3)2 -> 2MgO + 4NO2 + O2":{"c":"On heating.","d":"Nitrates of metals from Mg to Cu in the reactivity series decompose into the metal oxide, NO₂ and oxygen."},"2Zn(NO3)2 -> 2ZnO + 4NO2 + O2":{"c":"On heating.","d":"Zinc nitrate decomposes into zinc oxide, nitrogen dioxide and oxygen."},"2Pb(NO3)2 -> 2PbO + 4NO2 + O2":{"c":"On heating.","d":"Lead nitrate decomposes into lead(II) oxide, NO₂ and oxygen."},"4Fe(NO3)3 -> 2Fe2O3 + 12NO2 + 3O2":{"c":"On heating.","d":"Iron(III) nitrate decomposes into iron(III) oxide."},"4Fe(NO3)2 -> 2Fe2O3 + 8NO2 + O2":{"c":"On heating.","d":"When iron(II) nitrate decomposes, the iron is oxidized to +3, so Fe₂O₃ is formed."},"Hg(NO3)2 -> Hg + 2NO2 + O2":{"c":"On heating.","d":"Nitrates of unreactive metals (those after copper) decompose into the metal."},"4Zn + 10HNO3 -> 4Zn(NO3)2 + NH4NO3 + 3H2O":{"c":"With very dilute nitric acid.","d":"A reactive metal reduces very dilute nitric acid to the ammonium ion. No hydrogen is released.","n":"metal + nitric acid"},"3Zn + 8HNO3 -> 3Zn(NO3)2 + 2NO + 4H2O":{"c":"With dilute nitric acid.","d":"The reduction product of nitric acid depends on its concentration and on how reactive the metal is.","n":"metal + nitric acid"},"Zn + 4HNO3 -> Zn(NO3)2 + 2NO2 + 2H2O":{"c":"With concentrated nitric acid.","d":"Concentrated nitric acid is reduced to brown NO₂.","n":"metal + nitric acid"},"4Mg + 10HNO3 -> 4Mg(NO3)2 + N2O + 5H2O":{"c":"With dilute nitric acid.","d":"Magnesium reduces nitric acid to dinitrogen monoxide.","n":"metal + nitric acid"},"5Mg + 12HNO3 -> 5Mg(NO3)2 + N2 + 6H2O":{"c":"With very dilute nitric acid.","d":"The more dilute the acid and the more reactive the metal, the further nitrogen is reduced — right down to N₂ and NH₄⁺.","n":"metal + nitric acid"},"4Mg + 10HNO3 -> 4Mg(NO3)2 + NH4NO3 + 3H2O":{"c":"With very dilute nitric acid.","d":"In very dilute acid, nitrogen is reduced to the ammonium ion.","n":"metal + nitric acid"},"Ag + 2HNO3 -> AgNO3 + NO2 + H2O":{"c":"With concentrated nitric acid.","d":"Silver dissolves in concentrated nitric acid, and a brown gas is released.","n":"metal + nitric acid"},"3Ag + 4HNO3 -> 3AgNO3 + NO + 2H2O":{"c":"With dilute nitric acid.","d":"With dilute acid, colourless NO is released.","n":"metal + nitric acid"},"Fe + 4HNO3 -> Fe(NO3)3 + NO + 2H2O":{"c":"With dilute nitric acid.","d":"Nitric acid oxidizes iron straight to +3.","n":"metal + nitric acid"},"Fe + 6HNO3 -> Fe(NO3)3 + 3NO2 + 3H2O":{"c":"With concentrated nitric acid, only on heating (in the cold, iron is passivated).","d":"On heating, concentrated nitric acid dissolves iron.","n":"metal + nitric acid"},"C + 4HNO3 -> CO2 + 4NO2 + 2H2O":{"c":"With concentrated nitric acid, on heating.","d":"Carbon is oxidized to carbon dioxide.","n":"oxidation of a nonmetal by nitric acid"},"P + 5HNO3 -> H3PO4 + 5NO2 + H2O":{"c":"With concentrated nitric acid, on heating.","d":"Phosphorus is oxidized to phosphoric acid.","n":"oxidation of a nonmetal by nitric acid"},"3P + 5HNO3 + 2H2O -> 3H3PO4 + 5NO":{"c":"With dilute nitric acid, on heating.","d":"Dilute nitric acid is reduced to NO.","n":"oxidation of a nonmetal by nitric acid"},"I2 + 10HNO3 -> 2HIO3 + 10NO2 + 4H2O":{"c":"With concentrated nitric acid.","d":"Iodine is oxidized to iodic acid.","n":"oxidation of a nonmetal by nitric acid"},"CuO + 2HNO3 -> Cu(NO3)2 + H2O":{"c":"","d":"A basic oxide reacts with an acid, giving a salt and water."},"FeO + 4HNO3 -> Fe(NO3)3 + NO2 + 2H2O":{"c":"With concentrated nitric acid.","d":"Nitric acid not only dissolves iron(II) oxide but also oxidizes the iron to +3.","n":"iron(II) oxide + nitric acid"},"3FeO + 10HNO3 -> 3Fe(NO3)3 + NO + 5H2O":{"c":"With dilute nitric acid.","d":"Iron(II) is oxidized to iron(III), and the acid is reduced to NO.","n":"iron(II) oxide + nitric acid"},"2NO2 + 2NaOH -> NaNO3 + NaNO2 + H2O":{"c":"In an alkali solution.","d":"Nitrogen (+4) goes simultaneously to +5 (nitrate) and +3 (nitrite).","n":"disproportionation of NO₂"},"4NO2 + O2 + 4NaOH -> 4NaNO3 + 2H2O":{"c":"In an alkali solution, with access to oxygen.","d":"If oxygen is present, all the nitrogen ends up as nitrate.","n":"absorption of NO₂ by an alkali in the presence of oxygen"},"3NO2 + H2O -> 2HNO3 + NO":{"c":"In warm water.","d":"Nitrogen dioxide reacts with water, giving nitric acid and NO.","n":"disproportionation of NO₂"},"2NO2 + H2O -> HNO3 + HNO2":{"c":"In cold water.","d":"In the cold, two acids form at once — nitric and nitrous.","n":"disproportionation of NO₂"},"2NO2 <=> N2O4":{"c":"On cooling the equilibrium shifts to the right (the gas gets paler), on heating to the left (it turns brown).","d":"Two molecules of brown NO₂ join into one colourless N₂O₄ molecule. A classic example of chemical equilibrium."},"2NaNO2 + 2KI + 2H2SO4 -> 2NO + I2 + K2SO4 + Na2SO4 + 2H2O":{"c":"In acidic solution.","d":"Nitrite oxidizes iodide to iodine and is itself reduced to NO.","n":"nitrite as an oxidizing agent"},"5NaNO2 + 2KMnO4 + 3H2SO4 -> 5NaNO3 + 2MnSO4 + K2SO4 + 3H2O":{"c":"In acidic solution.","d":"Permanganate oxidizes nitrite to nitrate and loses its colour.","n":"nitrite as a reducing agent"},"Ca3(PO4)2 + 3SiO2 + 5C -> 3CaSiO3 + 2P + 5CO":{"c":"In an electric furnace at about 1500 °C.","d":"The industrial method of making phosphorus from phosphate rock.","n":"production of phosphorus"},"2P + 3Cl2 -> 2PCl3":{"c":"When chlorine is in short supply.","d":"Phosphorus burns in chlorine, forming phosphorus trichloride."},"2P + 5Cl2 -> 2PCl5":{"c":"With excess chlorine.","d":"With excess chlorine, phosphorus is oxidized to +5."},"PCl3 + Cl2 -> PCl5":{"c":"","d":"Phosphorus trichloride adds chlorine and turns into phosphorus pentachloride."},"PCl5 + 4H2O -> H3PO4 + 5HCl":{"c":"Under ordinary conditions.","d":"Nonmetal halides are completely broken down by water, forming two acids.","n":"hydrolysis of a nonmetal halide"},"PCl3 + 3H2O -> H3PO3 + 3HCl":{"c":"Under ordinary conditions.","d":"Phosphorus trichloride is broken down by water, giving phosphorous acid and hydrochloric acid.","n":"hydrolysis of a nonmetal halide"},"2P + 3Ca -> Ca3P2":{"c":"On heating.","d":"With reactive metals, phosphorus forms phosphides — here phosphorus is the oxidizing agent."},"Ca3P2 + 6H2O -> 3Ca(OH)2 + 2PH3":{"c":"Under ordinary conditions.","d":"Calcium phosphide is broken down by water, releasing poisonous phosphine.","n":"hydrolysis of a phosphide"},"Ca3P2 + 6HCl -> 3CaCl2 + 2PH3":{"c":"Under ordinary conditions.","d":"Calcium phosphide also releases phosphine with an acid."},"2PH3 + 4O2 -> P2O5 + 3H2O":{"c":"Phosphine catches fire in air by itself (because of impurities).","d":"Phosphine burns to phosphorus(V) oxide and water. It is thought to cause the “will-o'-the-wisp” lights over marshes.","n":"combustion"},"6P + 5KClO3 -> 3P2O5 + 5KCl":{"c":"On friction or impact — this is how a match lights.","d":"Red phosphorus on the matchbox and potassium chlorate in the match head react with a flash.","n":"oxidation of phosphorus by potassium chlorate"},"4P + 3NaOH + 3H2O -> PH3 + 3NaH2PO2":{"c":"White phosphorus in an alkali solution on heating.","d":"Phosphorus is reduced to phosphine and oxidized to hypophosphite at the same time.","n":"disproportionation of phosphorus"},"P2O5 + H2O -> 2HPO3":{"c":"In cold water.","d":"In the cold, phosphorus(V) oxide gives metaphosphoric acid."},"P2O5 + 6NaOH -> 2Na3PO4 + 3H2O":{"c":"Excess alkali.","d":"Phosphorus(V) oxide reacts with an alkali, giving sodium phosphate.","n":"acidic oxide + alkali"},"P2O5 + 3CaO -> Ca3(PO4)2":{"c":"On fusing.","d":"An acidic oxide combines with a basic one, giving calcium phosphate."},"H3PO4 + NaOH -> NaH2PO4 + H2O":{"c":"Equal amounts of acid and alkali (1 : 1).","d":"A triprotic acid is neutralized step by step; the first step gives the dihydrogen phosphate."},"H3PO4 + 2NaOH -> Na2HPO4 + 2H2O":{"c":"Twice as much alkali (1 : 2).","d":"The second step of neutralization gives the hydrogen phosphate."},"Na3PO4 + 3AgNO3 -> Ag3PO4 + 3NaNO3":{"c":"In solution.","d":"A yellow precipitate of silver phosphate forms — an identification test for phosphate ions."},"2H3PO4 + 3Ca(OH)2 -> Ca3(PO4)2 + 6H2O":{"c":"","d":"When phosphoric acid is neutralized with calcium hydroxide, calcium phosphate precipitates."},"Ca3(PO4)2 + 3H2SO4 -> 3CaSO4 + 2H3PO4":{"c":"With sulfuric acid, on heating.","d":"The industrial method of making phosphoric acid from phosphate rock."},"Ca3(PO4)2 + 2H2SO4 -> 2CaSO4 + Ca(H2PO4)2":{"c":"Not enough sulfuric acid.","d":"Single superphosphate forms — a mixture of calcium dihydrogen phosphate and calcium sulfate."},"Ca3(PO4)2 + 4H3PO4 -> 3Ca(H2PO4)2":{"c":"","d":"Triple superphosphate: it contains no useless gypsum."},"Ca(H2PO4)2 + Ca(OH)2 -> 2CaHPO4 + 2H2O":{"c":"","d":"This gives calcium hydrogen phosphate (“precipitate”) — a phosphorus fertilizer and an animal feed supplement."},"H3PO4 + NH3 -> NH4H2PO4":{"c":"","d":"This gives ammonium dihydrogen phosphate — a compound fertilizer containing nitrogen and phosphorus."},"C + 2H2 -> CH4":{"c":"Nickel catalyst, heating and pressure.","d":"Carbon combines with hydrogen to form methane."},"3C + 4Al -> Al4C3":{"c":"On strong heating.","d":"With metals, carbon forms carbides; here carbon is the oxidizing agent."},"Ca + 2C -> CaC2":{"c":"On heating.","d":"Calcium combines with carbon to form calcium carbide."},"CaO + 3C -> CaC2 + CO":{"c":"In an electric furnace, about 2000 °C.","d":"The industrial method of making calcium carbide from lime and coke.","n":"production of calcium carbide"},"Al4C3 + 12H2O -> 4Al(OH)3 + 3CH4":{"c":"Under ordinary conditions.","d":"Aluminium carbide is broken down by water, releasing methane.","n":"hydrolysis of a carbide"},"Al4C3 + 12HCl -> 4AlCl3 + 3CH4":{"c":"Under ordinary conditions.","d":"With an acid, aluminium carbide also gives methane, and the aluminium goes into a salt."},"CaC2 + 2H2O -> Ca(OH)2 + C2H2":{"c":"Under ordinary conditions.","d":"Calcium carbide reacts vigorously with water — this is how acetylene is made.","n":"hydrolysis of a carbide"},"CaC2 + 2HCl -> CaCl2 + C2H2":{"c":"Under ordinary conditions.","d":"With hydrochloric acid, calcium carbide also releases acetylene."},"C + H2O <=> CO + H2":{"c":"Steam is passed through red-hot coal (about 1000 °C).","d":"This gives “water gas” — a mixture of carbon monoxide and hydrogen, a valuable fuel and raw material."},"CO + H2O <=> CO2 + H2":{"c":"Catalyst, heating.","d":"Carbon monoxide turns into carbon dioxide, and extra hydrogen is obtained from water.","n":"water–gas shift"},"CuO + CO -> Cu + CO2":{"c":"On heating.","d":"Carbon monoxide reduces copper oxide to copper.","n":"reduction of a metal by carbon monoxide"},"CO + NaOH -> HCOONa":{"c":"On heating and at increased pressure.","d":"CO, a non-salt-forming oxide, still reacts with an alkali under harsh conditions — sodium formate forms."},"Fe2O3 + 3C -> 2Fe + 3CO":{"c":"On strong heating.","d":"Carbon reduces iron oxide to iron."},"ZnO + C -> Zn + CO":{"c":"On strong heating.","d":"This is how zinc is obtained from its oxide."},"C + 2S -> CS2":{"c":"On strong heating.","d":"Carbon combines with sulfur vapour to form carbon disulfide."},"C + Si -> SiC":{"c":"About 2000 °C.","d":"This gives carborundum — a very hard substance used for abrasives."},"SiO2 + 3C -> SiC + 2CO":{"c":"In an electric furnace, about 2000 °C.","d":"The industrial method of making carborundum from sand and coke.","n":"production of silicon carbide"},"CO2 + NaOH -> NaHCO3":{"c":"Excess carbon dioxide.","d":"With excess CO₂, an acid salt, the hydrogen carbonate, forms."},"Na2CO3 + CO2 + H2O -> 2NaHCO3":{"c":"Bubbling CO₂ through soda solution.","d":"The carbonate turns into the hydrogen carbonate."},"NaHCO3 + NaOH -> Na2CO3 + H2O":{"c":"In solution.","d":"An acid salt turns into a normal salt with an alkali."},"Ca(OH)2 + 2CO2 -> Ca(HCO3)2":{"c":"Bubbling CO₂ through limewater for a long time.","d":"First the limewater turns milky (CaCO₃), and with excess CO₂ it becomes clear again: a soluble hydrogen carbonate forms."},"Ca(HCO3)2 -> CaCO3 + CO2 + H2O":{"c":"On boiling.","d":"This removes temporary water hardness; this reaction is why limescale builds up in a kettle."},"Ca(HCO3)2 + Ca(OH)2 -> 2CaCO3 + 2H2O":{"c":"","d":"Adding lime also removes temporary water hardness."},"Ca(HCO3)2 + Na2CO3 -> CaCO3 + 2NaHCO3":{"c":"In solution.","d":"Soda binds calcium ions and softens the water."},"Na2CO3 + CaCl2 -> CaCO3 + 2NaCl":{"c":"In solution.","d":"A white precipitate of calcium carbonate forms."},"Ca(OH)2 + Na2CO3 -> CaCO3 + 2NaOH":{"c":"In solution.","d":"This is how caustic soda used to be made from soda (causticization)."},"K2CO3 + 2HCl -> 2KCl + H2O + CO2":{"c":"In solution.","d":"Potash fizzes with acid as carbon dioxide is released."},"BaCl2 + K2CO3 -> BaCO3 + 2KCl":{"c":"In solution.","d":"A white precipitate of barium carbonate forms."},"BaCO3 + 2HCl -> BaCl2 + H2O + CO2":{"c":"","d":"Unlike barium sulfate, barium carbonate dissolves in acid — this is how the two are told apart."},"MgCO3 -> MgO + CO2":{"c":"On heating.","d":"Magnesium carbonate decomposes into magnesium oxide and carbon dioxide."},"BaCO3 -> BaO + CO2":{"c":"On strong heating.","d":"Barium carbonate decomposes into barium oxide and carbon dioxide."},"Si + 2NaOH + H2O -> Na2SiO3 + 2H2":{"c":"In an alkali solution on heating.","d":"Silicon dissolves in alkali, releasing hydrogen.","n":"silicon + alkali"},"Si + 2Mg -> Mg2Si":{"c":"On heating.","d":"With reactive metals, silicon forms silicides and acts as the oxidizing agent."},"Mg2Si + 4HCl -> 2MgCl2 + SiH4":{"c":"Under ordinary conditions.","d":"This gives silane — a compound of silicon and hydrogen."},"SiH4 + 2O2 -> SiO2 + 2H2O":{"c":"Catches fire in air by itself.","d":"Silane burns to silicon dioxide and water.","n":"combustion"},"SiO2 + 2Mg -> Si + 2MgO":{"c":"On heating.","d":"Magnesium reduces silicon dioxide to silicon — a laboratory method for making silicon."},"SiO2 + 2C -> Si + 2CO":{"c":"In an electric furnace at a high temperature.","d":"The industrial method of making silicon from sand and coke.","n":"production of silicon"},"SiO2 + Na2CO3 -> Na2SiO3 + CO2":{"c":"On fusing.","d":"Non-volatile silicon dioxide drives out volatile carbon dioxide. This reaction is the basis of glassmaking.","n":"fusing an acidic oxide with a salt"},"SiO2 + CaCO3 -> CaSiO3 + CO2":{"c":"On fusing.","d":"This gives calcium silicate — another component of glass.","n":"fusing an acidic oxide with a salt"},"Na2SiO3 + 2HCl -> H2SiO3 + 2NaCl":{"c":"In solution.","d":"A jelly-like precipitate of silicic acid forms — this is how silicate ions are detected."},"Na2SiO3 + CO2 + H2O -> Na2CO3 + H2SiO3":{"c":"On bubbling CO₂ through a silicate solution.","d":"Carbonic acid is stronger than silicic acid and displaces it from the salt."},"H2SiO3 -> SiO2 + H2O":{"c":"On heating.","d":"Silicic acid loses water on heating. This is how silica gel, a moisture absorber, is made."},"Si + 2Cl2 -> SiCl4":{"c":"On heating.","d":"Silicon combines with chlorine."},"Si + 2F2 -> SiF4":{"c":"Under ordinary conditions.","d":"Silicon reacts with fluorine even without heating."},"SiCl4 + 3H2O -> H2SiO3 + 4HCl":{"c":"Under ordinary conditions (it fumes in air).","d":"Silicon tetrachloride is completely broken down by water.","n":"hydrolysis of a nonmetal halide"},"SiCl4 + 2H2 -> Si + 4HCl":{"c":"At a high temperature.","d":"This is how very pure silicon for microchips and solar cells is made."},"K + O2 -> KO2":{"c":"Potassium burning in air or oxygen.","d":"When potassium burns, it forms not an oxide but the superoxide KO₂."},"2Na2O2 + 2H2O -> 4NaOH + O2":{"c":"Under ordinary conditions.","d":"Sodium peroxide and water give an alkali and oxygen.","n":"peroxide + water"},"2Na2O2 + 2CO2 -> 2Na2CO3 + O2":{"c":"Under ordinary conditions.","d":"Sodium peroxide absorbs carbon dioxide and releases oxygen — this is how air is renewed in submarines and spacecraft.","n":"regeneration of oxygen"},"4KO2 + 2CO2 -> 2K2CO3 + 3O2":{"c":"Under ordinary conditions.","d":"Potassium superoxide is even better at releasing oxygen in exchange for carbon dioxide.","n":"regeneration of oxygen"},"4KO2 + 2H2O -> 4KOH + 3O2":{"c":"Under ordinary conditions.","d":"With water, potassium superoxide gives an alkali and oxygen.","n":"superoxide + water"},"Na2O2 + 2Na -> 2Na2O":{"c":"On heating.","d":"This is how sodium oxide is made from the peroxide."},"NaH + H2O -> NaOH + H2":{"c":"Vigorous, under ordinary conditions.","d":"Hydrogen from the hydride (−1) and hydrogen from the water (+1) both become hydrogen gas.","n":"hydride + water"},"CaH2 + 2H2O -> Ca(OH)2 + 2H2":{"c":"Under ordinary conditions.","d":"Calcium hydride is used as a compact source of hydrogen.","n":"hydride + water"},"2Li + H2 -> 2LiH":{"c":"On heating.","d":"Lithium combines with hydrogen to form lithium hydride."},"Mg + H2O -> MgO + H2":{"c":"Magnesium is heated in steam.","d":"At a high temperature, magnesium takes oxygen from water and forms its oxide."},"Ba + 2H2O -> Ba(OH)2 + H2":{"c":"Under ordinary conditions.","d":"Barium reacts vigorously with water, forming an alkali."},"Ca + Cl2 -> CaCl2":{"c":"On heating.","d":"Calcium combines with chlorine."},"Mg + Cl2 -> MgCl2":{"c":"On heating.","d":"Magnesium burns in chlorine, forming magnesium chloride."},"Mg + CuSO4 -> MgSO4 + Cu":{"c":"In solution.","d":"Magnesium is more reactive than copper and displaces it from the salt."},"MgO + H2O -> Mg(OH)2":{"c":"Slowly, on heating.","d":"Unlike alkali metal oxides, magnesium oxide reacts with water only poorly."},"Mg(OH)2 -> MgO + H2O":{"c":"On heating.","d":"Insoluble bases decompose on heating into an oxide and water."},"MgCl2 + 2NaOH -> Mg(OH)2 + 2NaCl":{"c":"In solution.","d":"A white precipitate of magnesium hydroxide forms."},"Mg(OH)2 + 2HCl -> MgCl2 + 2H2O":{"c":"","d":"Magnesium hydroxide dissolves in acid. That is why it is used in medicines for heartburn."},"MgCO3 + 2HCl -> MgCl2 + H2O + CO2":{"c":"","d":"Magnesium carbonate dissolves in acid, releasing carbon dioxide."},"CaO + 2HCl -> CaCl2 + H2O":{"c":"","d":"A basic oxide reacts with an acid, giving a salt and water."},"Na2O + 2HCl -> 2NaCl + H2O":{"c":"","d":"Sodium oxide is a basic oxide and reacts with acids."},"K2O + SO3 -> K2SO4":{"c":"","d":"A basic oxide combines with an acidic one, giving a salt."},"3CaCl2 + 2Na3PO4 -> Ca3(PO4)2 + 6NaCl":{"c":"In solution.","d":"Sodium phosphate precipitates calcium ions — this is how water is softened."},"Ba(OH)2 + CO2 -> BaCO3 + H2O":{"c":"On bubbling CO₂ through baryta water.","d":"Baryta water turns milky — another way to detect carbon dioxide.","n":"alkali + acidic oxide"},"Ba(OH)2 + 2HCl -> BaCl2 + 2H2O":{"c":"In solution.","d":"An alkali neutralizes an acid."},"Ba(OH)2 + 2HNO3 -> Ba(NO3)2 + 2H2O":{"c":"In solution.","d":"Barium hydroxide neutralizes nitric acid."},"KOH + HCl -> KCl + H2O":{"c":"In solution.","d":"A neutralization reaction: a salt and water are formed."},"2KOH + H2SO4 -> K2SO4 + 2H2O":{"c":"In solution.","d":"Potassium hydroxide neutralizes sulfuric acid."},"NaOH + HNO3 -> NaNO3 + H2O":{"c":"In solution.","d":"Sodium hydroxide neutralizes nitric acid."},"Ca(OH)2 + 2HNO3 -> Ca(NO3)2 + 2H2O":{"c":"In solution.","d":"Calcium hydroxide neutralizes nitric acid."},"2Al + 6H2O -> 2Al(OH)3 + 3H2":{"c":"Only if the protective oxide film is removed (for example, by amalgamation).","d":"Without its film, aluminium readily displaces hydrogen from water."},"2Al + 2KOH + 6H2O -> 2K[Al(OH)4] + 3H2":{"c":"In an alkali solution.","d":"Aluminium dissolves in potassium hydroxide solution, releasing hydrogen.","n":"amphoteric metal + alkali"},"2Al + 2NaOH + 2H2O -> 2NaAlO2 + 3H2":{"c":"A simplified way to write aluminium dissolving in alkali: the metaaluminate is shown instead of the complex salt.","d":"The reaction is often written this way in problems; more precisely, Na[Al(OH)₄] is formed.","n":"amphoteric metal + alkali"},"Al2O3 + 2NaOH -> 2NaAlO2 + H2O":{"c":"On fusing.","d":"When fused, aluminium oxide behaves like an acidic oxide.","n":"amphoteric oxide + alkali"},"Al2O3 + 2NaOH + 3H2O -> 2Na[Al(OH)4]":{"c":"In a concentrated alkali solution.","d":"In solution a complex salt, the tetrahydroxoaluminate, forms.","n":"amphoteric oxide + alkali"},"Al2O3 + Na2CO3 -> 2NaAlO2 + CO2":{"c":"On fusing.","d":"The amphoteric oxide drives carbon dioxide out of the soda.","n":"fusing an amphoteric oxide with soda"},"Al2O3 + 6HCl -> 2AlCl3 + 3H2O":{"c":"","d":"With acids, aluminium oxide behaves like a basic oxide."},"Al2O3 + 3H2SO4 -> Al2(SO4)3 + 3H2O":{"c":"On heating.","d":"Aluminium oxide dissolves in sulfuric acid."},"Al(OH)3 + NaOH -> NaAlO2 + 2H2O":{"c":"On fusing.","d":"When fused, aluminium hydroxide forms the metaaluminate.","n":"amphoteric hydroxide + alkali"},"Al(OH)3 + KOH -> K[Al(OH)4]":{"c":"In an alkali solution.","d":"Aluminium hydroxide dissolves in excess alkali.","n":"amphoteric hydroxide + alkali"},"2Al(OH)3 + 3H2SO4 -> Al2(SO4)3 + 6H2O":{"c":"","d":"Aluminium hydroxide dissolves in sulfuric acid."},"Na[Al(OH)4] + CO2 -> Al(OH)3 + NaHCO3":{"c":"On bubbling carbon dioxide through the solution.","d":"Even weak carbonic acid destroys the complex — aluminium hydroxide precipitates."},"Na[Al(OH)4] + HCl -> NaCl + Al(OH)3 + H2O":{"c":"Not enough acid.","d":"If there is little acid, a precipitate of aluminium hydroxide forms."},"Na[Al(OH)4] + 4HCl -> NaCl + AlCl3 + 4H2O":{"c":"Excess acid.","d":"In excess acid no precipitate forms: the aluminium goes straight into a salt."},"NaAlO2 + 4HCl -> NaCl + AlCl3 + 2H2O":{"c":"Excess acid.","d":"In excess acid, the metaaluminate turns into aluminium chloride."},"AlCl3 + 3NaOH -> Al(OH)3 + 3NaCl":{"c":"Not enough alkali, added drop by drop.","d":"A white jelly-like precipitate of aluminium hydroxide forms."},"AlCl3 + 4NaOH -> Na[Al(OH)4] + 3NaCl":{"c":"Excess alkali.","d":"In excess alkali the precipitate dissolves — a sign of amphoteric behaviour."},"AlCl3 + 3NH3 + 3H2O -> Al(OH)3 + 3NH4Cl":{"c":"Ammonia solution.","d":"Ammonia precipitates aluminium hydroxide but does not dissolve it — this is how pure Al(OH)₃ is made."},"2AlCl3 + 3Na2CO3 + 3H2O -> 2Al(OH)3 + 3CO2 + 6NaCl":{"c":"In solution.","d":"Aluminium carbonate does not exist in solution: both salts hydrolyse, the hydroxide precipitates and a gas is released.","n":"mutual hydrolysis"},"2AlCl3 + 3Na2S + 6H2O -> 2Al(OH)3 + 3H2S + 6NaCl":{"c":"In solution.","d":"Aluminium sulfide does not exist in water: aluminium hydroxide precipitates and hydrogen sulfide is released.","n":"mutual hydrolysis"},"Al2S3 + 6H2O -> 2Al(OH)3 + 3H2S":{"c":"Under ordinary conditions.","d":"Aluminium sulfide is completely broken down by water.","n":"hydrolysis"},"Al2(SO4)3 + 6NaOH -> 2Al(OH)3 + 3Na2SO4":{"c":"Not enough alkali.","d":"A precipitate of aluminium hydroxide forms."},"Al2(SO4)3 + 3BaCl2 -> 3BaSO4 + 2AlCl3":{"c":"In solution.","d":"A white precipitate of barium sulfate forms."},"2Al + 3CuSO4 -> Al2(SO4)3 + 3Cu":{"c":"In solution (the reaction starts once the oxide film is destroyed).","d":"Aluminium displaces copper from a solution of its salt."},"2Al + 3H2SO4 -> Al2(SO4)3 + 3H2":{"c":"With dilute sulfuric acid.","d":"Aluminium displaces hydrogen from the dilute acid."},"2Al + 6H2SO4 -> Al2(SO4)3 + 3SO2 + 6H2O":{"c":"With concentrated sulfuric acid, only on heating (in the cold, aluminium is passivated).","d":"Concentrated sulfuric acid is reduced to sulfur dioxide.","n":"metal + concentrated sulfuric acid"},"8Al + 30HNO3 -> 8Al(NO3)3 + 3NH4NO3 + 9H2O":{"c":"With very dilute nitric acid. Cold concentrated acid passivates aluminium.","d":"Nitric acid is reduced to the ammonium ion.","n":"metal + nitric acid"},"Al + 4HNO3 -> Al(NO3)3 + NO + 2H2O":{"c":"With dilute nitric acid.","d":"Aluminium dissolves in dilute nitric acid, releasing NO.","n":"metal + nitric acid"},"4Al(NO3)3 -> 2Al2O3 + 12NO2 + 3O2":{"c":"On heating.","d":"Aluminium nitrate decomposes into aluminium oxide."},"2Al + Cr2O3 -> Al2O3 + 2Cr":{"c":"Igniting the mixture (aluminothermy).","d":"This is how chromium and other high-melting metals are obtained."},"8Al + 3Fe3O4 -> 4Al2O3 + 9Fe":{"c":"Igniting the mixture (thermite).","d":"Aluminium reduces iron(II,III) oxide (iron scale) to iron."},"2Al + 3I2 -> 2AlI3":{"c":"A drop of water acts as the catalyst; the mixture flares up with violet clouds of iodine vapour.","d":"A spectacular experiment: water triggers a violent reaction between aluminium and iodine."},"2Al + N2 -> 2AlN":{"c":"On strong heating.","d":"Aluminium combines with nitrogen to form aluminium nitride."},"AlN + 3H2O -> Al(OH)3 + NH3":{"c":"Under ordinary conditions.","d":"Aluminium nitride is broken down by water, releasing ammonia.","n":"hydrolysis of a nitride"},"Fe + 2FeCl3 -> 3FeCl2":{"c":"In solution.","d":"Iron reduces iron(III) to iron(II): oxidation states 0 and +3 “meet” at +2."},"Fe2(SO4)3 + Fe -> 3FeSO4":{"c":"In solution.","d":"This is how solutions of iron(II) salts are protected from oxidation — an iron nail is put in them."},"2FeCl3 + 2KI -> 2FeCl2 + I2 + 2KCl":{"c":"In solution.","d":"Iron(III) ions oxidize iodide to iodine.","n":"iron(III) as an oxidizing agent"},"2FeCl3 + H2S -> 2FeCl2 + S + 2HCl":{"c":"In solution.","d":"Iron(III) oxidizes hydrogen sulfide to sulfur — the solution turns cloudy.","n":"iron(III) as an oxidizing agent"},"Cu + 2FeCl3 -> CuCl2 + 2FeCl2":{"c":"In solution.","d":"Iron(III) chloride solution dissolves copper — this is how copper tracks on printed circuit boards are etched.","n":"iron(III) as an oxidizing agent"},"2FeCl2 + Cl2 -> 2FeCl3":{"c":"In solution.","d":"Chlorine oxidizes iron(II) to iron(III)."},"4Fe(OH)2 + O2 + 2H2O -> 4Fe(OH)3":{"c":"In air, under ordinary conditions.","d":"The pale green precipitate of iron(II) hydroxide turns brown in air as it is oxidized to iron(III) hydroxide."},"Fe(OH)2 -> FeO + H2O":{"c":"On heating without access to air.","d":"Iron(II) hydroxide decomposes into its oxide and water."},"2Fe(OH)3 + 3H2SO4 -> Fe2(SO4)3 + 6H2O":{"c":"","d":"Iron(III) hydroxide dissolves in sulfuric acid."},"Fe(OH)3 + 3HCl -> FeCl3 + 3H2O":{"c":"","d":"The brown precipitate dissolves in hydrochloric acid."},"Fe(OH)2 + 2HCl -> FeCl2 + 2H2O":{"c":"","d":"Iron(II) hydroxide dissolves in hydrochloric acid."},"Fe(OH)3 + NaOH -> NaFeO2 + 2H2O":{"c":"On fusing.","d":"Iron(III) hydroxide is weakly amphoteric: fused with an alkali, it forms a ferrite.","n":"amphoteric behaviour"},"FeCl2 + 2NaOH -> Fe(OH)2 + 2NaCl":{"c":"In solution.","d":"A pale green precipitate of iron(II) hydroxide forms."},"Fe2(SO4)3 + 6NaOH -> 2Fe(OH)3 + 3Na2SO4":{"c":"In solution.","d":"A brown precipitate of iron(III) hydroxide forms."},"2FeSO4 + H2SO4 + H2O2 -> Fe2(SO4)3 + 2H2O":{"c":"In acidic solution.","d":"Hydrogen peroxide oxidizes iron(II) to iron(III).","n":"oxidation of iron(II)"},"10FeSO4 + 2KMnO4 + 8H2SO4 -> 5Fe2(SO4)3 + 2MnSO4 + K2SO4 + 8H2O":{"c":"In acidic solution (sulfuric acid).","d":"The purple permanganate solution loses its colour: manganese(+7) is reduced to +2.","n":"oxidation of iron(II) by permanganate"},"6FeSO4 + K2Cr2O7 + 7H2SO4 -> 3Fe2(SO4)3 + Cr2(SO4)3 + K2SO4 + 7H2O":{"c":"In acidic solution (sulfuric acid).","d":"The orange dichromate solution turns green: chromium(+6) is reduced to +3.","n":"oxidation of iron(II) by dichromate"},"2Fe + 6H2SO4 -> Fe2(SO4)3 + 3SO2 + 6H2O":{"c":"With concentrated sulfuric acid, only on heating (in the cold, iron is passivated).","d":"Hot concentrated sulfuric acid oxidizes iron straight to +3.","n":"metal + concentrated sulfuric acid"},"Fe3O4 + 8HCl -> FeCl2 + 2FeCl3 + 4H2O":{"c":"","d":"Iron(II,III) oxide contains both iron(II) and iron(III), so two salts are formed."},"Fe3O4 + 4H2 -> 3Fe + 4H2O":{"c":"On heating.","d":"Hydrogen reduces iron(II,III) oxide to iron."},"Fe3O4 + 10HNO3 -> 3Fe(NO3)3 + NO2 + 5H2O":{"c":"With concentrated nitric acid.","d":"Nitric acid oxidizes the iron(II) in Fe₃O₄ to iron(III).","n":"oxidation of the iron(II) in Fe₃O₄"},"3Fe3O4 + 28HNO3 -> 9Fe(NO3)3 + NO + 14H2O":{"c":"With dilute nitric acid.","d":"With dilute acid, NO is released.","n":"oxidation of the iron(II) in Fe₃O₄"},"3Fe2O3 + CO -> 2Fe3O4 + CO2":{"c":"In a blast furnace, about 500 °C.","d":"First stage: iron(III) oxide is reduced to Fe₃O₄.","n":"reduction in a blast furnace"},"Fe3O4 + CO -> 3FeO + CO2":{"c":"In a blast furnace, about 700 °C.","d":"Second stage: Fe₃O₄ is reduced to iron(II) oxide.","n":"reduction in a blast furnace"},"FeO + CO -> Fe + CO2":{"c":"In a blast furnace, about 1000 °C.","d":"Third stage: iron is obtained.","n":"reduction in a blast furnace"},"FeO + H2 -> Fe + H2O":{"c":"On heating.","d":"Hydrogen reduces iron(II) oxide to iron."},"FeO + 2HCl -> FeCl2 + H2O":{"c":"","d":"Iron(II) oxide, a basic oxide, dissolves in acid."},"Fe2O3 + 3H2SO4 -> Fe2(SO4)3 + 3H2O":{"c":"On heating.","d":"Iron(III) oxide dissolves in sulfuric acid."},"Fe2O3 + 2NaOH -> 2NaFeO2 + H2O":{"c":"On fusing.","d":"Fused with an alkali, iron(III) oxide forms a ferrite.","n":"amphoteric behaviour"},"Fe2O3 + Na2CO3 -> 2NaFeO2 + CO2":{"c":"On fusing.","d":"Iron(III) oxide drives carbon dioxide out of the soda.","n":"fusing an amphoteric oxide with soda"},"Fe2O3 + 3KNO3 + 4KOH -> 2K2FeO4 + 3KNO2 + 2H2O":{"c":"On fusing.","d":"In an alkaline melt with an oxidizing agent, iron is oxidized to +6 and a ferrate forms.","n":"oxidative fusion"},"2FeCl3 + 3Na2CO3 + 3H2O -> 2Fe(OH)3 + 3CO2 + 6NaCl":{"c":"In solution.","d":"Iron(III) carbonate does not exist in water: the brown hydroxide precipitates and carbon dioxide is released.","n":"mutual hydrolysis"},"FeCl3 + 3KSCN -> Fe(SCN)3 + 3KCl":{"c":"In solution.","d":"The solution turns blood red — a very sensitive test for iron(III) ions."},"FeCl3 + K4[Fe(CN)6] -> KFe[Fe(CN)6] + 3KCl":{"c":"In solution.","d":"A dark blue precipitate forms — Prussian blue. An identification test for iron(III) ions."},"FeSO4 + K3[Fe(CN)6] -> KFe[Fe(CN)6] + K2SO4":{"c":"In solution.","d":"A blue precipitate forms (Turnbull's blue) — an identification test for iron(II) ions."},"FeCl3 + 3AgNO3 -> Fe(NO3)3 + 3AgCl":{"c":"In solution.","d":"A white precipitate of silver chloride forms."},"4FeS + 7O2 -> 2Fe2O3 + 4SO2":{"c":"On heating in air.","d":"When the sulfide is roasted, both the iron (to +3) and the sulfur (to +4) are oxidized.","n":"roasting of a sulfide"},"Fe + I2 -> FeI2":{"c":"On heating.","d":"Iodine is a weak oxidizing agent, so with it iron forms an iron(II) salt, not an iron(III) one."},"2FeSO4 -> Fe2O3 + SO2 + SO3":{"c":"On strong heating.","d":"When iron(II) sulfate decomposes, the iron is oxidized and part of the sulfur is reduced."},"4CuO -> 2Cu2O + O2":{"c":"On strong heating (above 1000 °C).","d":"Black copper(II) oxide turns into red copper(I) oxide."},"Cu2O + H2 -> 2Cu + H2O":{"c":"On heating.","d":"Hydrogen reduces copper(I) oxide to copper."},"Cu2O + 6HNO3 -> 2Cu(NO3)2 + 2NO2 + 3H2O":{"c":"With concentrated nitric acid.","d":"Nitric acid oxidizes copper(I) to copper(II).","n":"oxidation of copper(I)"},"Cu(OH)2 + 4NH3 -> [Cu(NH3)4](OH)2":{"c":"Ammonia solution.","d":"The blue precipitate dissolves, giving a deep blue solution of a complex compound.","n":"complex formation"},"CuSO4 + 4NH3 -> [Cu(NH3)4]SO4":{"c":"Excess ammonia solution.","d":"The solution turns deep blue — an identification test for copper(II) ions.","n":"complex formation"},"2CuSO4 + 4KI -> 2CuI + I2 + 2K2SO4":{"c":"In solution.","d":"Copper(II) oxidizes iodide: a precipitate of copper(I) iodide forms and iodine is released.","n":"oxidation of iodide by copper(II)"},"CuS + 8HNO3 -> CuSO4 + 8NO2 + 4H2O":{"c":"With concentrated nitric acid on heating.","d":"Insoluble copper sulfide dissolves only in an oxidizing acid: the sulfur is oxidized to +6.","n":"oxidation of a sulfide by nitric acid"},"2Cu2S + 3O2 -> 2Cu2O + 2SO2":{"c":"On heating in air.","d":"The first stage of extracting copper from sulfide ore.","n":"roasting of a sulfide"},"Cu2S + 2Cu2O -> 6Cu + SO2":{"c":"On strong heating.","d":"Copper(I) sulfide and copper(I) oxide react with each other, giving crude (blister) copper.","n":"production of copper"},"2Cu + O2 + H2O + CO2 -> Cu2(OH)2CO3":{"c":"Slowly, in moist air.","d":"This is how copper and bronze become covered with green patina."},"Cu2(OH)2CO3 + 4HCl -> 2CuCl2 + CO2 + 3H2O":{"c":"","d":"Malachite dissolves in acid, releasing carbon dioxide."},"CuCl2 + 2NaOH -> Cu(OH)2 + 2NaCl":{"c":"In solution.","d":"A blue precipitate of copper(II) hydroxide forms."},"CuSO4 + BaCl2 -> BaSO4 + CuCl2":{"c":"In solution.","d":"A white precipitate of barium sulfate forms, while the solution stays coloured."},"2AgNO3 + 2NaOH -> Ag2O + 2NaNO3 + H2O":{"c":"In solution.","d":"Silver hydroxide is unstable, so a brown precipitate of silver oxide forms straight away."},"Ag2O + 4NH3 + H2O -> 2[Ag(NH3)2]OH":{"c":"Ammonia solution.","d":"This gives ammoniacal silver oxide (Tollens' reagent) for the “silver mirror” reaction.","n":"complex formation"},"AgCl + 2NH3 -> [Ag(NH3)2]Cl":{"c":"Ammonia solution.","d":"The silver chloride precipitate dissolves in ammonia, but silver iodide does not. This is how they are told apart.","n":"complex formation"},"2AgBr -> 2Ag + Br2":{"c":"In light.","d":"Silver bromide is sensitive to light — classic photographic film is based on this."},"2Ag + 2H2SO4 -> Ag2SO4 + SO2 + 2H2O":{"c":"With concentrated sulfuric acid on heating.","d":"Silver dissolves in hot concentrated sulfuric acid.","n":"metal + concentrated sulfuric acid"},"2Ag + S -> Ag2S":{"c":"On heating.","d":"Silver combines with sulfur to form black silver sulfide."},"ZnO + 2NaOH -> Na2ZnO2 + H2O":{"c":"On fusing.","d":"Zinc oxide is amphoteric: fused with an alkali, it forms a zincate.","n":"amphoteric oxide + alkali"},"ZnO + 2NaOH + H2O -> Na2[Zn(OH)4]":{"c":"In an alkali solution.","d":"In solution a complex salt, the tetrahydroxozincate, forms.","n":"amphoteric oxide + alkali"},"Zn(OH)2 + 2NaOH -> Na2[Zn(OH)4]":{"c":"Excess alkali.","d":"Zinc hydroxide dissolves in excess alkali — a sign of amphoteric behaviour.","n":"amphoteric hydroxide + alkali"},"Zn + 2NaOH + 2H2O -> Na2[Zn(OH)4] + H2":{"c":"In an alkali solution.","d":"Zinc dissolves in alkali, releasing hydrogen.","n":"amphoteric metal + alkali"},"Zn + 2NaOH -> Na2ZnO2 + H2":{"c":"On fusing.","d":"Fused with an alkali, zinc forms a zincate and releases hydrogen.","n":"amphoteric metal + alkali"},"ZnCl2 + 2NaOH -> Zn(OH)2 + 2NaCl":{"c":"Not enough alkali.","d":"A white precipitate of zinc hydroxide forms."},"ZnSO4 + 2NaOH -> Zn(OH)2 + Na2SO4":{"c":"Not enough alkali.","d":"A white precipitate of zinc hydroxide forms."},"Zn(OH)2 + 2HCl -> ZnCl2 + 2H2O":{"c":"","d":"Zinc hydroxide also dissolves in acid."},"Zn(OH)2 -> ZnO + H2O":{"c":"On heating.","d":"Zinc hydroxide decomposes into its oxide and water."},"ZnO + 2HCl -> ZnCl2 + H2O":{"c":"","d":"Zinc oxide dissolves in acid."},"ZnO + CO -> Zn + CO2":{"c":"On heating.","d":"Carbon monoxide reduces zinc oxide to zinc.","n":"reduction of a metal by carbon monoxide"},"2ZnS + 3O2 -> 2ZnO + 2SO2":{"c":"On heating in air.","d":"The first stage of extracting zinc from zinc blende.","n":"roasting of a sulfide"},"Zn + 2H2SO4 -> ZnSO4 + SO2 + 2H2O":{"c":"With concentrated sulfuric acid.","d":"With zinc, concentrated sulfuric acid releases not hydrogen but sulfur dioxide.","n":"metal + concentrated sulfuric acid"},"3Zn + 4H2SO4 -> 3ZnSO4 + S + 4H2O":{"c":"With less concentrated (but still concentrated) sulfuric acid.","d":"Sulfuric acid can also be reduced to sulfur.","n":"metal + concentrated sulfuric acid"},"4Zn + 5H2SO4 -> 4ZnSO4 + H2S + 4H2O":{"c":"With concentrated sulfuric acid.","d":"With a reactive metal, sulfuric acid is reduced the furthest — to hydrogen sulfide.","n":"metal + concentrated sulfuric acid"},"Zn + Pb(NO3)2 -> Zn(NO3)2 + Pb":{"c":"In solution.","d":"Beautiful lead crystals grow on the zinc — a “lead tree”."},"Au + HNO3 + 4HCl -> H[AuCl4] + NO + 2H2O":{"c":"A mixture of concentrated nitric and hydrochloric acids (1 : 3) — “aqua regia”.","d":"Nitric acid oxidizes the gold, and chloride ions bind it into a stable complex.","n":"dissolving gold in aqua regia"},"2Au + 3Cl2 -> 2AuCl3":{"c":"On heating.","d":"Gold reacts with chlorine to form gold(III) chloride."},"3Pt + 4HNO3 + 18HCl -> 3H2[PtCl6] + 4NO + 8H2O":{"c":"Hot aqua regia.","d":"Like gold, platinum dissolves only in aqua regia.","n":"dissolving platinum in aqua regia"},"Hg + S -> HgS":{"c":"When mercury is ground with sulfur.","d":"This is how spilled mercury is cleaned up: poisonous mercury turns into a non-volatile sulfide."},"Hg + 4HNO3 -> Hg(NO3)2 + 2NO2 + 2H2O":{"c":"With concentrated nitric acid.","d":"Mercury dissolves in concentrated nitric acid.","n":"metal + nitric acid"},"Ni + 2HCl -> NiCl2 + H2":{"c":"On heating, slowly.","d":"Nickel is above hydrogen in the reactivity series and slowly displaces it from acids."},"NiO + H2 -> Ni + H2O":{"c":"On heating.","d":"Hydrogen reduces nickel oxide to nickel."},"Ni + CuSO4 -> NiSO4 + Cu":{"c":"In solution.","d":"Nickel is more reactive than copper and displaces it from the salt."},"PbO + C -> Pb + CO":{"c":"On heating.","d":"Carbon reduces lead oxide to lead."},"4Cr + 3O2 -> 2Cr2O3":{"c":"On heating.","d":"Chromium burns to green chromium(III) oxide."},"2Cr + 3Cl2 -> 2CrCl3":{"c":"On heating.","d":"With chlorine, chromium forms chromium(III) chloride."},"Cr + 2HCl -> CrCl2 + H2":{"c":"Without access to air.","d":"Chromium displaces hydrogen from hydrochloric acid, giving a blue solution of a chromium(II) salt."},"Cr2O3 + 2NaOH -> 2NaCrO2 + H2O":{"c":"On fusing.","d":"Chromium(III) oxide is amphoteric: fused with an alkali, it forms a chromite.","n":"amphoteric oxide + alkali"},"Cr2O3 + 6HCl -> 2CrCl3 + 3H2O":{"c":"On heating.","d":"With acids, chromium(III) oxide forms chromium(III) salts."},"Cr2O3 + KClO3 + 4KOH -> 2K2CrO4 + KCl + 2H2O":{"c":"On fusing.","d":"In an alkaline melt with an oxidizing agent, chromium(+3) is oxidized to chromate (+6).","n":"oxidative fusion"},"Cr2O3 + 3KNO3 + 2K2CO3 -> 2K2CrO4 + 3KNO2 + 2CO2":{"c":"On fusing.","d":"Saltpetre oxidizes chromium to +6, and soda makes the medium alkaline.","n":"oxidative fusion"},"CrCl3 + 3NaOH -> Cr(OH)3 + 3NaCl":{"c":"Not enough alkali.","d":"A grey-green precipitate of chromium(III) hydroxide forms."},"Cr2(SO4)3 + 6NaOH -> 2Cr(OH)3 + 3Na2SO4":{"c":"Not enough alkali.","d":"A precipitate of chromium(III) hydroxide forms."},"CrCl3 + 6NaOH -> Na3[Cr(OH)6] + 3NaCl":{"c":"Excess alkali.","d":"In excess alkali, an emerald-green solution of a complex salt forms."},"Cr(OH)3 + 3NaOH -> Na3[Cr(OH)6]":{"c":"Excess alkali.","d":"Chromium(III) hydroxide is amphoteric and dissolves in alkali.","n":"amphoteric hydroxide + alkali"},"Cr(OH)3 + 3HCl -> CrCl3 + 3H2O":{"c":"","d":"Chromium(III) hydroxide also dissolves in acid."},"2Cr(OH)3 -> Cr2O3 + 3H2O":{"c":"On heating.","d":"Chromium(III) hydroxide decomposes into its oxide and water."},"2Na3[Cr(OH)6] + 3H2O2 -> 2Na2CrO4 + 2NaOH + 8H2O":{"c":"In alkaline solution.","d":"Hydrogen peroxide oxidizes chromium(+3) to chromate: the green solution turns yellow.","n":"oxidation of chromium(III) in alkaline solution"},"2Cr(OH)3 + 3H2O2 + 4NaOH -> 2Na2CrO4 + 8H2O":{"c":"In alkaline solution.","d":"Chromium(III) hydroxide is oxidized by hydrogen peroxide to chromate.","n":"oxidation of chromium(III) in alkaline solution"},"2CrCl3 + 3H2O2 + 10NaOH -> 2Na2CrO4 + 6NaCl + 8H2O":{"c":"In alkaline solution.","d":"In alkali, chromium(III) salts are oxidized to chromates.","n":"oxidation of chromium(III) in alkaline solution"},"2CrCl3 + 3Br2 + 16NaOH -> 2Na2CrO4 + 6NaBr + 6NaCl + 8H2O":{"c":"In alkaline solution.","d":"In alkali, bromine oxidizes chromium(+3) to chromate (+6).","n":"oxidation of chromium(III) in alkaline solution"},"2Na2CrO4 + H2SO4 -> Na2Cr2O7 + Na2SO4 + H2O":{"c":"On acidifying.","d":"In acidic solution, yellow chromate turns into orange dichromate. The oxidation state of chromium does not change.","n":"chromate turning into dichromate"},"2K2CrO4 + H2SO4 -> K2Cr2O7 + K2SO4 + H2O":{"c":"On acidifying.","d":"The yellow solution turns orange.","n":"chromate turning into dichromate"},"K2Cr2O7 + 2KOH -> 2K2CrO4 + H2O":{"c":"On adding alkali.","d":"In alkaline solution, orange dichromate turns back into yellow chromate.","n":"dichromate turning into chromate"},"Na2Cr2O7 + 2NaOH -> 2Na2CrO4 + H2O":{"c":"On adding alkali.","d":"In alkaline solution, sodium dichromate turns into the chromate.","n":"dichromate turning into chromate"},"K2Cr2O7 + 14HCl -> 2KCl + 2CrCl3 + 3Cl2 + 7H2O":{"c":"With concentrated hydrochloric acid, on heating.","d":"Dichromate oxidizes chloride ions to chlorine, and the solution turns from orange to green.","n":"dichromate as an oxidizing agent"},"K2Cr2O7 + 3H2S + 4H2SO4 -> Cr2(SO4)3 + 3S + K2SO4 + 7H2O":{"c":"In acidic solution.","d":"Dichromate oxidizes hydrogen sulfide to sulfur.","n":"dichromate as an oxidizing agent"},"K2Cr2O7 + 3Na2SO3 + 4H2SO4 -> Cr2(SO4)3 + 3Na2SO4 + K2SO4 + 4H2O":{"c":"In acidic solution.","d":"Sulfite is oxidized to sulfate, and chromium is reduced to +3.","n":"dichromate as an oxidizing agent"},"K2Cr2O7 + 6KI + 7H2SO4 -> Cr2(SO4)3 + 3I2 + 4K2SO4 + 7H2O":{"c":"In acidic solution.","d":"Dichromate oxidizes iodide to iodine.","n":"dichromate as an oxidizing agent"},"K2Cr2O7 + 3SO2 + H2SO4 -> Cr2(SO4)3 + K2SO4 + H2O":{"c":"In solution.","d":"Sulfur dioxide reduces dichromate to a chromium(III) salt.","n":"dichromate as an oxidizing agent"},"4K2Cr2O7 -> 4K2CrO4 + 2Cr2O3 + 3O2":{"c":"On strong heating.","d":"Potassium dichromate decomposes into the chromate, chromium(III) oxide and oxygen."},"K2Cr2O7 + H2SO4 -> 2CrO3 + K2SO4 + H2O":{"c":"With concentrated sulfuric acid.","d":"Dark red crystals of chromium(VI) oxide separate out; this mixture is the “chromic acid mixture” used for cleaning glassware."},"2K2CrO4 + 3(NH4)2S + 2KOH + 2H2O -> 2K3[Cr(OH)6] + 3S + 6NH3":{"c":"In alkaline solution.","d":"Sulfide reduces chromate to a complex chromium(III) salt, and sulfur precipitates.","n":"chromate as an oxidizing agent in alkaline solution"},"CrO3 + 2NaOH -> Na2CrO4 + H2O":{"c":"","d":"Chromium(VI) oxide is an acidic oxide: with an alkali it gives a chromate.","n":"acidic oxide + alkali"},"4CrO3 -> 2Cr2O3 + 3O2":{"c":"On heating.","d":"Chromium(VI) oxide is unstable and decomposes to chromium(III) oxide."},"2CrO3 + 2NH3 -> Cr2O3 + N2 + 3H2O":{"c":"Under ordinary conditions (the ammonia may catch fire).","d":"Chromium(VI) oxide is a strong oxidizing agent: it oxidizes ammonia to nitrogen.","n":"chromium(VI) oxide as an oxidizing agent"},"2KMnO4 + 5Na2SO3 + 3H2SO4 -> 2MnSO4 + 5Na2SO4 + K2SO4 + 3H2O":{"c":"Acidic solution.","d":"In acidic solution, manganese(+7) is reduced to +2: the solution loses its colour.","n":"permanganate in acidic solution"},"2KMnO4 + 3Na2SO3 + H2O -> 2MnO2 + 3Na2SO4 + 2KOH":{"c":"Neutral solution.","d":"In neutral solution, manganese(+7) is reduced to +4: a brown precipitate of MnO₂ forms.","n":"permanganate in neutral solution"},"2KMnO4 + Na2SO3 + 2KOH -> 2K2MnO4 + Na2SO4 + H2O":{"c":"Alkaline solution.","d":"In alkaline solution, manganese(+7) is reduced to +6: the solution turns green (manganate).","n":"permanganate in alkaline solution"},"2KMnO4 + 5H2S + 3H2SO4 -> 2MnSO4 + 5S + K2SO4 + 8H2O":{"c":"Acidic solution.","d":"Permanganate oxidizes hydrogen sulfide to sulfur.","n":"permanganate in acidic solution"},"2KMnO4 + 10KI + 8H2SO4 -> 2MnSO4 + 5I2 + 6K2SO4 + 8H2O":{"c":"Acidic solution.","d":"Permanganate oxidizes iodide to iodine.","n":"permanganate in acidic solution"},"2KMnO4 + 5H2O2 + 3H2SO4 -> 2MnSO4 + 5O2 + K2SO4 + 8H2O":{"c":"Acidic solution.","d":"Hydrogen peroxide is oxidized to oxygen, and the permanganate loses its colour.","n":"hydrogen peroxide as a reducing agent"},"2KMnO4 + 5SO2 + 2H2O -> 2MnSO4 + K2SO4 + 2H2SO4":{"c":"In solution.","d":"Sulfur dioxide decolourizes permanganate solution.","n":"permanganate as an oxidizing agent"},"2KMnO4 + 3MnSO4 + 2H2O -> 5MnO2 + K2SO4 + 2H2SO4":{"c":"In solution.","d":"Manganese(+7) and manganese(+2) meet at oxidation state +4 — MnO₂ precipitates.","n":"comproportionation of manganese"},"4KMnO4 + 4KOH -> 4K2MnO4 + O2 + 2H2O":{"c":"On heating with concentrated alkali.","d":"Permanganate is reduced to green manganate, and oxygen is released.","n":"permanganate in concentrated alkali"},"3MnO2 + KClO3 + 6KOH -> 3K2MnO4 + KCl + 3H2O":{"c":"On fusing.","d":"In an alkaline melt, manganese(+4) is oxidized to manganate (+6).","n":"oxidative fusion"},"2MnO2 + O2 + 4KOH -> 2K2MnO4 + 2H2O":{"c":"On fusing in air.","d":"Even oxygen from the air oxidizes manganese(IV) oxide in molten alkali.","n":"oxidative fusion"},"3K2MnO4 + 2H2O -> 2KMnO4 + MnO2 + 4KOH":{"c":"On dilution with water.","d":"Green manganate is unstable in neutral solution: it turns into purple permanganate and brown MnO₂.","n":"disproportionation of manganate"},"3K2MnO4 + 2CO2 -> 2KMnO4 + MnO2 + 2K2CO3":{"c":"On bubbling carbon dioxide through.","d":"Carbon dioxide speeds up the conversion of manganate into permanganate.","n":"disproportionation of manganate"},"2K2MnO4 + Cl2 -> 2KMnO4 + 2KCl":{"c":"In solution.","d":"Chlorine oxidizes manganate to permanganate — the industrial method of making potassium permanganate.","n":"oxidation of manganate"},"Mn + 2HCl -> MnCl2 + H2":{"c":"Under ordinary conditions.","d":"Manganese is a fairly reactive metal and displaces hydrogen from acids."},"MnSO4 + 2NaOH -> Mn(OH)2 + Na2SO4":{"c":"In solution.","d":"A pale precipitate of manganese(II) hydroxide forms and turns brown in air."},"3MnO2 + 4Al -> 2Al2O3 + 3Mn":{"c":"Igniting the mixture (aluminothermy).","d":"Aluminium reduces manganese oxide to manganese."},"CuCl2 -> Cu + Cl2":{"c":"Electrolysis of the solution, inert electrodes.","d":"Copper is deposited on the cathode, and chlorine is released at the anode."},"2CuSO4 + 2H2O -> 2Cu + O2 + 2H2SO4":{"c":"Electrolysis of the solution, inert electrodes.","d":"Copper is deposited on the cathode. Sulfate ions are not oxidized at the anode — water is, releasing oxygen, and acid builds up in the solution.","n":"electrolysis of a solution"},"2NaCl + 2H2O -> H2 + Cl2 + 2NaOH":{"c":"Electrolysis of a sodium chloride solution (brine).","d":"No sodium comes out of the solution: water is reduced at the cathode (hydrogen) and chlorine forms at the anode. This is how chlorine and alkali are made in industry.","n":"electrolysis of a solution"},"2KBr + 2H2O -> H2 + Br2 + 2KOH":{"c":"Electrolysis of the solution, inert electrodes.","d":"Hydrogen forms at the cathode, bromine at the anode, and an alkali remains in solution.","n":"electrolysis of a solution"},"2KI + 2H2O -> H2 + I2 + 2KOH":{"c":"Electrolysis of the solution, inert electrodes.","d":"Iodine is released at the anode, and hydrogen at the cathode.","n":"electrolysis of a solution"},"4AgNO3 + 2H2O -> 4Ag + O2 + 4HNO3":{"c":"Electrolysis of the solution, inert electrodes.","d":"Silver is deposited on the cathode, oxygen is released at the anode, and nitric acid forms in the solution.","n":"electrolysis of a solution"},"2Cu(NO3)2 + 2H2O -> 2Cu + O2 + 4HNO3":{"c":"Electrolysis of the solution, inert electrodes.","d":"Copper forms at the cathode, oxygen at the anode.","n":"electrolysis of a solution"},"2ZnSO4 + 2H2O -> 2Zn + O2 + 2H2SO4":{"c":"Electrolysis of the solution. A simplified equation: some hydrogen is also released at the cathode along with the zinc.","d":"In electrolysis of solutions, metals of medium reactivity are deposited on the cathode together with hydrogen.","n":"electrolysis of a solution"},"2NiSO4 + 2H2O -> 2Ni + O2 + 2H2SO4":{"c":"Electrolysis of the solution. A simplified equation: some hydrogen is also released at the cathode.","d":"This is how metal parts are nickel-plated.","n":"electrolysis of a solution"},"2HCl -> H2 + Cl2":{"c":"Electrolysis of hydrochloric acid.","d":"Hydrogen is released at the cathode, and chlorine at the anode."},"2Al2O3 -> 4Al + 3O2":{"c":"Electrolysis of molten aluminium oxide dissolved in cryolite, about 950 °C.","d":"This is how all the world's aluminium is produced. Cryolite is needed to lower the melting point."},"MgCl2 -> Mg + Cl2":{"c":"Electrolysis of the melt.","d":"Reactive metals are obtained only by electrolysis of melts: they are not deposited from solutions."},"CaCl2 -> Ca + Cl2":{"c":"Electrolysis of the melt.","d":"This is how metallic calcium is produced."},"2KCl -> 2K + Cl2":{"c":"Electrolysis of the melt.","d":"Potassium is released at the cathode, and chlorine at the anode."},"2LiCl -> 2Li + Cl2":{"c":"Electrolysis of the melt.","d":"This is how lithium for batteries is produced."},"4NaOH -> 4Na + O2 + 2H2O":{"c":"Electrolysis of the molten alkali.","d":"Sodium is released at the cathode, and hydroxide ions are oxidized to oxygen at the anode."},"Na2CO3 + H2O <=> NaHCO3 + NaOH":{"c":"In solution; the solution is alkaline (pH > 7).","d":"A salt of a strong base and a weak acid hydrolyses at the anion, which is why soda solution feels soapy.","n":"anion hydrolysis"},"Na2S + H2O <=> NaHS + NaOH":{"c":"In solution; the solution is alkaline.","d":"The sulfide ion takes hydrogen ions from water, and hydroxide ions build up in the solution.","n":"anion hydrolysis"},"Na2SO3 + H2O <=> NaHSO3 + NaOH":{"c":"In solution; the solution is alkaline.","d":"Sulfite is a salt of weak sulfurous acid, so its solution is alkaline.","n":"anion hydrolysis"},"Na3PO4 + H2O <=> Na2HPO4 + NaOH":{"c":"In solution; the solution is strongly alkaline.","d":"Sodium phosphate solution is strongly alkaline, so it is used as a cleaning agent.","n":"anion hydrolysis"},"CH3COONa + H2O <=> CH3COOH + NaOH":{"c":"In solution; the solution is weakly alkaline.","d":"Acetate is a salt of weak acetic acid, so it hydrolyses at the anion.","n":"anion hydrolysis"},"NH4Cl + H2O <=> NH3·H2O + HCl":{"c":"In solution; the solution is acidic (pH < 7).","d":"A salt of a weak base and a strong acid hydrolyses at the cation.","n":"cation hydrolysis"},"AlCl3 + H2O <=> AlOHCl2 + HCl":{"c":"In solution; the solution is acidic.","d":"The aluminium cation takes hydroxide ions from water, and hydrogen ions build up in the solution.","n":"cation hydrolysis"},"FeCl3 + H2O <=> FeOHCl2 + HCl":{"c":"In solution; the solution is acidic. On heating, hydrolysis increases and the solution turns brown.","d":"Iron(III) salts hydrolyse noticeably, so their solutions are acidic.","n":"cation hydrolysis"},"ZnCl2 + H2O <=> ZnOHCl + HCl":{"c":"In solution; the solution is acidic.","d":"Zinc chloride hydrolyses at the cation. Soldering flux made from it etches metal because the solution is acidic.","n":"cation hydrolysis"},"2CuSO4 + 2H2O <=> (CuOH)2SO4 + H2SO4":{"c":"In solution; the solution is acidic.","d":"Copper(II) sulfate is a salt of a weak base and a strong acid, so its solution is acidic.","n":"cation hydrolysis"},"Cr2S3 + 6H2O -> 2Cr(OH)3 + 3H2S":{"c":"On contact with water.","d":"A salt of a weak base and a weak acid is completely broken down by water.","n":"complete hydrolysis"},"Cr2(SO4)3 + 3Na2CO3 + 3H2O -> 2Cr(OH)3 + 3CO2 + 3Na2SO4":{"c":"In solution.","d":"Chromium(III) carbonate does not exist in solution: the hydroxide precipitates and carbon dioxide is released.","n":"mutual hydrolysis"},"2CuSO4 + 2Na2CO3 + H2O -> Cu2(OH)2CO3 + 2Na2SO4 + CO2":{"c":"In solution.","d":"Instead of copper carbonate, a basic salt precipitates — green malachite.","n":"mutual hydrolysis"},"2FeCl3 + 3Na2S -> 2FeS + S + 6NaCl":{"c":"In solution.","d":"Iron(III) is an oxidizing agent and sulfide is a reducing agent, so instead of mutual hydrolysis a redox reaction takes place: iron(II) sulfide and sulfur precipitate.","n":"a redox reaction instead of hydrolysis"},"CH4 + Cl2 -> CH3Cl + HCl":{"c":"In light (hν).","d":"A chlorine atom replaces a hydrogen atom in methane. The reaction goes by a radical chain mechanism."},"CH3Cl + Cl2 -> CH2Cl2 + HCl":{"c":"In light.","d":"Chlorination continues: a second hydrogen atom is replaced."},"CH2Cl2 + Cl2 -> CHCl3 + HCl":{"c":"In light.","d":"This gives chloroform — it was once used as an anaesthetic."},"CHCl3 + Cl2 -> CCl4 + HCl":{"c":"In light.","d":"All four hydrogen atoms are replaced — tetrachloromethane is formed."},"CH4 + Br2 -> CH3Br + HBr":{"c":"In light, on heating.","d":"Bromine replaces hydrogen in methane more slowly than chlorine does."},"C2H6 + Cl2 -> C2H5Cl + HCl":{"c":"In light.","d":"Chlorination of ethane gives chloroethane."},"C3H8 + Br2 -> CH3-CHBr-CH3 + HBr":{"c":"In light, on heating.","d":"Bromine mainly replaces a hydrogen on the middle (secondary) carbon atom — 2-bromopropane is formed."},"C3H8 + Cl2 -> CH3-CHCl-CH3 + HCl":{"c":"In light. A mixture of 1- and 2-chloropropane forms; the main product is 2-chloropropane.","d":"A hydrogen atom on a secondary carbon atom is replaced more easily."},"CH4 + HNO3 -> CH3NO2 + H2O":{"c":"Dilute nitric acid, about 140 °C, pressure.","d":"A nitro group replaces a hydrogen atom — nitromethane is formed.","n":"nitration (Konovalov reaction)"},"C2H6 + HNO3 -> C2H5NO2 + H2O":{"c":"Dilute nitric acid, heating, pressure.","d":"Nitration of ethane gives nitroethane.","n":"nitration (Konovalov reaction)"},"2CH4 -> C2H2 + 3H2":{"c":"About 1500 °C, very rapid cooling.","d":"The industrial method of making acetylene from natural gas.","n":"dehydrogenation of methane"},"CH4 -> C + 2H2":{"c":"About 1000 °C without access to air.","d":"Methane decomposes into soot and hydrogen."},"CH4 + H2O -> CO + 3H2":{"c":"Nickel catalyst, about 800 °C.","d":"The main industrial method of producing hydrogen and synthesis gas.","n":"steam reforming of methane"},"CH4 + CO2 -> 2CO + 2H2":{"c":"Catalyst, high temperature.","d":"Synthesis gas is made from two greenhouse gases.","n":"dry (CO₂) reforming of methane"},"CH4 + O2 -> HCHO + H2O":{"c":"Catalyst, heating.","d":"With mild oxidation, methane turns into formaldehyde.","n":"catalytic oxidation"},"2C2H6 + 7O2 -> 4CO2 + 6H2O":{"c":"Ignition.","d":"Ethane burns to carbon dioxide and water.","n":"combustion"},"2C4H10 + 5O2 -> 4CH3COOH + 2H2O":{"c":"Catalyst, about 200 °C, pressure.","d":"An industrial method of making acetic acid from butane.","n":"catalytic oxidation"},"C2H6 -> C2H4 + H2":{"c":"Catalyst (Ni or Pt), heating.","d":"Removing hydrogen from an alkane gives an alkene.","n":"dehydrogenation"},"C3H8 -> CH2=CH-CH3 + H2":{"c":"Catalyst, heating.","d":"Propane gives propene.","n":"dehydrogenation"},"C4H10 -> C2H6 + C2H4":{"c":"Heating to 450–700 °C (thermal cracking) or with a catalyst.","d":"In cracking, a long molecule breaks into a shorter alkane and alkene.","n":"cracking"},"C4H10 -> CH4 + CH2=CH-CH3":{"c":"Cracking on heating.","d":"A butane molecule can also break at a different bond.","n":"cracking"},"C8H18 -> C4H10 + C4H8":{"c":"Cracking of petroleum products.","d":"Cracking turns heavy oil fractions into petrol (gasoline) and gases.","n":"cracking"},"C16H34 -> C8H18 + C8H16":{"c":"Catalytic cracking.","d":"A heavy hydrocarbon gives components of petrol (gasoline).","n":"cracking"},"C4H10 -> CH3-CH(CH3)-CH3":{"c":"AlCl₃ catalyst, heating.","d":"An unbranched butane molecule rearranges into branched isobutane with the same formula, C₄H₁₀."},"C6H14 -> C6H6 + 4H2":{"c":"Catalyst (Pt or Cr₂O₃), heating.","d":"A chain of six carbon atoms closes into a benzene ring.","n":"aromatization (dehydrocyclization)"},"C7H16 -> C6H5-CH3 + 4H2":{"c":"Catalyst, heating.","d":"Heptane gives toluene.","n":"aromatization (dehydrocyclization)"},"2CH3Cl + 2Na -> C2H6 + 2NaCl":{"c":"On heating.","d":"Sodium removes the chlorine atoms and two radicals join together — the carbon chain gets longer.","n":"Wurtz reaction"},"2C2H5Br + 2Na -> C4H10 + 2NaBr":{"c":"On heating.","d":"Bromoethane gives butane.","n":"Wurtz reaction"},"CH3COONa + NaOH -> CH4 + Na2CO3":{"c":"On fusing the solids.","d":"A laboratory method for making methane: the carboxyl group is removed from the salt molecule.","n":"decarboxylation (Dumas reaction)"},"C2H5COONa + NaOH -> C2H6 + Na2CO3":{"c":"On fusing.","d":"Sodium propanoate gives ethane — the carbon chain becomes one atom shorter.","n":"decarboxylation"},"(CH2)3 + H2 -> C3H8":{"c":"Nickel catalyst, heating.","d":"The strained three-membered ring opens easily.","n":"hydrogenation with ring opening"},"(CH2)3 + Br2 -> CH2Br-CH2-CH2Br":{"c":"Under ordinary conditions.","d":"Unlike other cycloalkanes, cyclopropane decolourizes bromine water.","n":"with ring opening"},"(CH2)3 + HBr -> CH3-CH2-CH2Br":{"c":"Under ordinary conditions.","d":"The ring opens, giving 1-bromopropane.","n":"with ring opening"},"CH2Cl-CH2-CH2Cl + Zn -> (CH2)3 + ZnCl2":{"c":"On heating.","d":"Zinc removes two chlorine atoms, and the ends of the chain join into a ring.","n":"making a cycloalkane"},"C6H12 -> C6H6 + 3H2":{"c":"Catalyst (Pt or Pd), about 300 °C.","d":"Cyclohexane turns into benzene.","n":"dehydrogenation"},"C6H12 + Cl2 -> C6H11Cl + HCl":{"c":"In light.","d":"The six-membered ring is stable: like alkanes, cyclohexane undergoes substitution rather than addition."},"C2H4 + H2 -> C2H6":{"c":"Catalyst (Ni, Pt or Pd), heating.","d":"Hydrogen adds across the double bond, and the alkene turns into an alkane.","n":"hydrogenation"},"C2H4 + Br2 -> CH2Br-CH2Br":{"c":"Under ordinary conditions (bromine water).","d":"Bromine water loses its colour — the test for a double bond.","n":"bromination"},"C2H4 + Cl2 -> CH2Cl-CH2Cl":{"c":"Under ordinary conditions.","d":"Chlorine adds across the double bond, giving 1,2-dichloroethane.","n":"chlorination"},"C2H4 + HCl -> C2H5Cl":{"c":"Under ordinary conditions.","d":"Hydrogen chloride adds to ethylene.","n":"hydrohalogenation"},"C2H4 + HBr -> C2H5Br":{"c":"Under ordinary conditions.","d":"Hydrogen bromide adds to ethylene.","n":"hydrohalogenation"},"C2H4 + H2O -> C2H5OH":{"c":"H₃PO₄ catalyst, about 300 °C, pressure.","d":"The industrial method of making ethanol.","n":"hydration"},"CH2=CH-CH3 + HBr -> CH3-CHBr-CH3":{"c":"Under ordinary conditions.","d":"Hydrogen adds to the carbon atom that already has more hydrogens, and bromine to its neighbour (Markovnikov's rule).","n":"following Markovnikov's rule"},"CH2=CH-CH3 + HCl -> CH3-CHCl-CH3":{"c":"Under ordinary conditions.","d":"The main product is 2-chloropropane.","n":"following Markovnikov's rule"},"CH2=CH-CH3 + H2O -> CH3-CH(OH)-CH3":{"c":"Acid catalyst, heating.","d":"A secondary alcohol, propan-2-ol, is formed.","n":"hydration following Markovnikov's rule"},"CH2=CH-CH3 + Br2 -> CH2Br-CHBr-CH3":{"c":"Under ordinary conditions.","d":"Propene decolourizes bromine water.","n":"bromination"},"CH2=CH-CH3 + H2 -> C3H8":{"c":"Nickel catalyst, heating.","d":"Propene turns into propane.","n":"hydrogenation"},"CH2=CH-CH3 + Cl2 -> CH2=CH-CH2Cl + HCl":{"c":"About 500 °C.","d":"At a high temperature chlorine does not add on but replaces a hydrogen in the CH₃ group.","n":"allylic chlorination"},"CH2=CH-CH2-CH3 + HBr -> CH3-CHBr-CH2-CH3":{"c":"Under ordinary conditions.","d":"But-1-ene gives 2-bromobutane.","n":"following Markovnikov's rule"},"CH2=CH-CH2-CH3 + H2O -> CH3-CH(OH)-CH2-CH3":{"c":"Acid catalyst, heating.","d":"A secondary alcohol, butan-2-ol, is formed.","n":"hydration following Markovnikov's rule"},"3C2H4 + 2KMnO4 + 4H2O -> 3CH2OH-CH2OH + 2MnO2 + 2KOH":{"c":"Aqueous permanganate solution in the cold (neutral solution).","d":"The purple solution loses its colour, brown MnO₂ precipitates, and the alkene turns into a diol.","n":"Wagner reaction (mild oxidation)"},"3CH2=CH-CH3 + 2KMnO4 + 4H2O -> 3CH2OH-CHOH-CH3 + 2MnO2 + 2KOH":{"c":"Aqueous permanganate solution in the cold.","d":"Propene gives propane-1,2-diol.","n":"Wagner reaction (mild oxidation)"},"5C2H4 + 12KMnO4 + 18H2SO4 -> 10CO2 + 12MnSO4 + 6K2SO4 + 28H2O":{"c":"Acidified permanganate solution, heating.","d":"In acidic solution the double bond breaks; ethylene gives carbon dioxide.","n":"vigorous oxidation"},"5CH2=CH-CH3 + 10KMnO4 + 15H2SO4 -> 5CH3COOH + 5CO2 + 10MnSO4 + 5K2SO4 + 20H2O":{"c":"Acidified permanganate solution, heating.","d":"The molecule breaks at the double bond: the CH₂= group gives CO₂, and the rest gives acetic acid.","n":"vigorous oxidation"},"5CH3-CH=CH-CH3 + 8KMnO4 + 12H2SO4 -> 10CH3COOH + 8MnSO4 + 4K2SO4 + 12H2O":{"c":"Acidified permanganate solution, heating.","d":"Symmetrical but-2-ene breaks into two identical molecules of acetic acid.","n":"vigorous oxidation"},"2C2H4 + O2 -> 2CH3CHO":{"c":"PdCl₂ and CuCl₂ catalysts in aqueous solution.","d":"The industrial method of making acetaldehyde.","n":"catalytic oxidation (Wacker process)"},"C2H4 + 3O2 -> 2CO2 + 2H2O":{"c":"Ignition.","d":"Ethylene burns with a luminous flame.","n":"combustion"},"nC2H4 -> (-CH2-CH2-)n":{"c":"Catalyst or high pressure, heating.","d":"Thousands of ethylene molecules join into a long chain — polyethylene is formed."},"nCH2=CH-CH3 -> (-CH2-CH(CH3)-)n":{"c":"Catalyst.","d":"Propylene gives polypropylene."},"nCH2=CHCl -> (-CH2-CHCl-)n":{"c":"Initiator, heating.","d":"Vinyl chloride gives polyvinyl chloride (PVC) — a material for pipes and window frames."},"nC6H5-CH=CH2 -> (-CH2-CH(C6H5)-)n":{"c":"Initiator, heating.","d":"Styrene gives polystyrene."},"nCF2=CF2 -> (-CF2-CF2-)n":{"c":"Initiator, pressure.","d":"This gives Teflon (PTFE) — a very resistant polymer used for non-stick coatings."},"C2H5OH -> C2H4 + H2O":{"c":"Concentrated sulfuric acid, above 140 °C.","d":"Water is removed from the alcohol molecule and a double bond forms — a laboratory method for making ethylene.","n":"intramolecular dehydration"},"C2H5Cl + KOH -> C2H4 + KCl + H2O":{"c":"Alcoholic alkali solution, heating.","d":"In alcoholic solution, the alkali removes hydrogen chloride and an alkene forms.","n":"dehydrohalogenation"},"CH3-CHBr-CH3 + KOH -> CH2=CH-CH3 + KBr + H2O":{"c":"Alcoholic alkali solution, heating.","d":"2-Bromopropane gives propene.","n":"dehydrohalogenation"},"CH3-CHBr-CH2-CH3 + KOH -> CH3-CH=CH-CH3 + KBr + H2O":{"c":"Alcoholic alkali solution, heating.","d":"Hydrogen is removed from the neighbouring carbon atom that has fewer hydrogens, so the main product is but-2-ene.","n":"following Zaitsev's rule"},"CH2Br-CH2Br + Zn -> C2H4 + ZnBr2":{"c":"On heating.","d":"Zinc removes two neighbouring bromine atoms, and a double bond forms.","n":"dehalogenation"},"CH2=CH-CH=CH2 + 2H2 -> C4H10":{"c":"Nickel catalyst, heating.","d":"Both double bonds are saturated with hydrogen.","n":"hydrogenation"},"CH2=CH-CH=CH2 + Br2 -> CH2Br-CH=CH-CH2Br":{"c":"Under ordinary conditions.","d":"Conjugated dienes add bromine at the ends of the molecule, and the double bond moves to the middle.","n":"1,4-addition"},"CH2=CH-CH=CH2 + 2Br2 -> CH2Br-CHBr-CHBr-CH2Br":{"c":"Excess bromine.","d":"With excess bromine, both double bonds are saturated.","n":"bromination"},"nCH2=CH-CH=CH2 -> (-CH2-CH=CH-CH2-)n":{"c":"Catalyst (sodium in Lebedev's process).","d":"Synthetic butadiene rubber is formed."},"nCH2=C(CH3)-CH=CH2 -> (-CH2-C(CH3)=CH-CH2-)n":{"c":"Catalyst.","d":"Isoprene rubber is close in structure to natural rubber from the sap of the rubber tree."},"2C2H5OH -> CH2=CH-CH=CH2 + 2H2O + H2":{"c":"Catalyst (ZnO, Al₂O₃), about 425 °C.","d":"The first industrial method of making butadiene for synthetic rubber (USSR, 1932).","n":"Lebedev process"},"C4H10 -> CH2=CH-CH=CH2 + 2H2":{"c":"Catalyst, heating.","d":"The modern industrial method of making butadiene from butane.","n":"dehydrogenation"},"C2H2 + H2 -> C2H4":{"c":"Catalyst (palladium with additives), heating.","d":"On a special catalyst, the triple bond turns into a double bond.","n":"partial hydrogenation"},"C2H2 + 2H2 -> C2H6":{"c":"Catalyst (Ni or Pt), heating.","d":"Acetylene adds two molecules of hydrogen and turns into ethane.","n":"complete hydrogenation"},"C2H2 + Br2 -> CHBr=CHBr":{"c":"Not enough bromine.","d":"The triple bond adds one molecule of bromine and becomes a double bond.","n":"bromination"},"C2H2 + 2Br2 -> CHBr2-CHBr2":{"c":"Excess bromine water.","d":"Acetylene decolourizes bromine water by adding two molecules of bromine.","n":"bromination"},"C2H2 + HCl -> CH2=CHCl":{"c":"HgCl₂ catalyst, heating.","d":"This gives vinyl chloride — the raw material for PVC.","n":"hydrochlorination"},"C2H2 + H2O -> CH3CHO":{"c":"Mercury(II) salts (HgSO₄) in acidic solution.","d":"Unstable vinyl alcohol forms first and immediately rearranges into acetaldehyde.","n":"Kucherov reaction (hydration of alkynes)"},"CH≡C-CH3 + H2O -> CH3-CO-CH3":{"c":"Mercury(II) salts in acidic solution.","d":"Homologues of acetylene give not aldehydes but ketones in this reaction — here, acetone.","n":"Kucherov reaction (hydration of alkynes)"},"CH≡C-CH3 + 2HBr -> CH3-CBr2-CH3":{"c":"Under ordinary conditions.","d":"Both bromine atoms add to the middle carbon atom.","n":"following Markovnikov's rule"},"3C2H2 -> C6H6":{"c":"Activated carbon, about 600 °C.","d":"Three acetylene molecules close into a benzene ring.","n":"trimerization (Zelinsky reaction)"},"2C2H2 -> CH2=CH-C≡CH":{"c":"Catalyst (CuCl in NH₄Cl solution).","d":"This gives vinylacetylene — the raw material for chloroprene rubber.","n":"dimerization"},"C2H2 + 2[Ag(NH3)2]OH -> AgC≡CAg + 4NH3 + 2H2O":{"c":"Ammoniacal silver oxide solution.","d":"A greyish-white precipitate of silver acetylide forms — the test for a triple bond at the end of a chain. Dry acetylide is explosive."},"CH≡C-CH3 + [Ag(NH3)2]OH -> CH3-C≡CAg + 2NH3 + H2O":{"c":"Ammoniacal silver oxide solution.","d":"Propyne also gives a precipitate, but but-2-yne does not: it has no hydrogen atom on the triple bond."},"C2H2 + 2Na -> NaC≡CNa + H2":{"c":"On heating.","d":"The hydrogen atoms on the triple bond are mobile: acetylene shows weak acidic properties."},"C2H2 + 2KMnO4 + 3H2SO4 -> 2CO2 + 2MnSO4 + K2SO4 + 4H2O":{"c":"Acidified permanganate solution.","d":"In acidic solution, acetylene is oxidized to carbon dioxide and the solution loses its colour.","n":"vigorous oxidation"},"3C2H2 + 8KMnO4 -> 3K2C2O4 + 8MnO2 + 2KOH + 2H2O":{"c":"Aqueous permanganate solution (neutral).","d":"In neutral solution the carbon chain is kept — potassium oxalate forms and brown MnO₂ precipitates.","n":"oxidation in neutral solution"},"5CH≡C-CH3 + 8KMnO4 + 12H2SO4 -> 5CH3COOH + 5CO2 + 8MnSO4 + 4K2SO4 + 12H2O":{"c":"Acidified permanganate solution, heating.","d":"The triple bond breaks: the end carbon atom goes into CO₂, and the rest becomes acetic acid.","n":"vigorous oxidation"},"CH2Br-CH2Br + 2KOH -> C2H2 + 2KBr + 2H2O":{"c":"Alcoholic alkali solution, heating.","d":"Two molecules of hydrogen bromide are removed — a triple bond forms.","n":"dehydrohalogenation"},"CH3-CHCl2 + 2KOH -> C2H2 + 2KCl + 2H2O":{"c":"Alcoholic alkali solution, heating.","d":"1,1-Dichloroethane also gives acetylene.","n":"dehydrohalogenation"},"C2H2 + HCN -> CH2=CH-CN":{"c":"CuCl catalyst.","d":"This gives acrylonitrile — the raw material for acrylic fibre."},"C6H6 + Br2 -> C6H5Br + HBr":{"c":"Catalyst (FeBr₃ or iron filings).","d":"Benzene does not decolourize bromine water: with bromine it undergoes substitution, and only with a catalyst.","n":"bromination"},"C6H6 + Cl2 -> C6H5Cl + HCl":{"c":"Catalyst (AlCl₃ or FeCl₃).","d":"A chlorine atom replaces a hydrogen atom in the benzene ring.","n":"chlorination"},"C6H6 + HNO3 -> C6H5NO2 + H2O":{"c":"Nitrating mixture: concentrated nitric and sulfuric acids, heating.","d":"This gives nitrobenzene — a yellow liquid that smells of bitter almonds and is used to make aniline.","n":"nitration"},"C6H6 + 3H2 -> C6H12":{"c":"Catalyst (Ni or Pt), heating, pressure.","d":"Under harsh conditions, benzene adds hydrogen and turns into cyclohexane.","n":"hydrogenation"},"C6H6 + 3Cl2 -> C6H6Cl6":{"c":"In light (hν).","d":"In light, benzene adds chlorine — this gives hexachlorocyclohexane, once used as an insecticide.","n":"radical chlorination"},"C6H6 + CH3Cl -> C6H5-CH3 + HCl":{"c":"AlCl₃ catalyst.","d":"A methyl group replaces a hydrogen atom — toluene is formed.","n":"alkylation"},"C6H6 + C2H4 -> C6H5-C2H5":{"c":"Acid catalyst.","d":"The industrial method of making ethylbenzene — the raw material for styrene.","n":"alkylation with an alkene"},"C6H6 + CH2=CH-CH3 -> C6H5-CH(CH3)2":{"c":"Acid catalyst.","d":"This gives cumene — the raw material for making phenol and acetone.","n":"alkylation with an alkene"},"2C6H6 + 15O2 -> 12CO2 + 6H2O":{"c":"Ignition.","d":"Benzene burns with a very smoky flame.","n":"combustion"},"C6H5-CH3 + 3HNO3 -> CH3-C6H2(NO2)3 + 3H2O":{"c":"Concentrated nitric and sulfuric acids, heating.","d":"The methyl group makes substitution easier, so toluene is nitrated at three positions at once — TNT is formed.","n":"nitration"},"C6H5-CH3 + Cl2 -> C6H5-CH2Cl + HCl":{"c":"In light (hν).","d":"In light, chlorine replaces hydrogen in the methyl group, not in the ring.","n":"side-chain chlorination"},"C6H5-CH3 + Cl2 -> CH3-C6H4-Cl + HCl":{"c":"FeCl₃ catalyst.","d":"With a catalyst, chlorine replaces hydrogen in the ring, at the ortho and para positions.","n":"ring chlorination"},"5C6H5-CH3 + 6KMnO4 + 9H2SO4 -> 5C6H5COOH + 6MnSO4 + 3K2SO4 + 14H2O":{"c":"Acidified permanganate solution, heating.","d":"Benzene is not oxidized by permanganate, but toluene is: the methyl group turns into a carboxyl group."},"C6H5-CH3 + 2KMnO4 -> C6H5COOK + 2MnO2 + KOH + H2O":{"c":"Aqueous permanganate solution, heating.","d":"In neutral solution a salt is formed — potassium benzoate.","n":"oxidation in neutral solution"},"5C6H5-C2H5 + 12KMnO4 + 18H2SO4 -> 5C6H5COOH + 5CO2 + 12MnSO4 + 6K2SO4 + 28H2O":{"c":"Acidified permanganate solution, heating.","d":"Any side chain is oxidized to a −COOH group, and the extra carbon atom goes into CO₂."},"C6H5-CH=CH2 + Br2 -> C6H5-CHBr-CH2Br":{"c":"Under ordinary conditions.","d":"Unlike benzene, styrene decolourizes bromine water: it has a double bond in the side chain.","n":"bromination"},"C6H5-CH=CH2 + H2 -> C6H5-C2H5":{"c":"Catalyst, heating.","d":"Hydrogen adds across the double bond of the side chain.","n":"hydrogenation"},"3C6H5-CH=CH2 + 2KMnO4 + 4H2O -> 3C6H5-CH(OH)-CH2OH + 2MnO2 + 2KOH":{"c":"Aqueous permanganate solution in the cold.","d":"Like alkenes, styrene decolourizes permanganate solution.","n":"Wagner reaction (mild oxidation)"},"C6H5-C2H5 -> C6H5-CH=CH2 + H2":{"c":"Catalyst, heating.","d":"The industrial method of making styrene.","n":"dehydrogenation"},"C6H5COONa + NaOH -> C6H6 + Na2CO3":{"c":"On fusing.","d":"The carboxyl group is removed from the benzoate, giving benzene.","n":"decarboxylation"},"C6H5COOH + NaOH -> C6H5COONa + H2O":{"c":"In solution.","d":"Benzoic acid is neutralized by an alkali. Sodium benzoate is the food preservative E211.","n":"neutralization"},"C2H5Cl + NaOH -> C2H5OH + NaCl":{"c":"Aqueous alkali solution, heating.","d":"In aqueous solution a hydroxide ion replaces the chlorine atom — an alcohol is formed.","n":"hydrolysis of a haloalkane"},"C2H5Br + KOH -> C2H5OH + KBr":{"c":"Aqueous alkali solution, heating.","d":"Bromoethane turns into ethanol. In an alcoholic alkali solution a different reaction, elimination, would take place.","n":"hydrolysis of a haloalkane"},"CH3-CH2-CH2Br + NaOH -> CH3-CH2-CH2OH + NaBr":{"c":"Aqueous alkali solution, heating.","d":"1-Bromopropane gives propan-1-ol.","n":"hydrolysis of a haloalkane"},"CH2Cl-CH2Cl + 2NaOH -> CH2OH-CH2OH + 2NaCl":{"c":"Aqueous alkali solution, heating.","d":"A dihalide with the halogen atoms on different carbon atoms gives a diol.","n":"hydrolysis of a haloalkane"},"CH3-CHCl2 + 2NaOH -> CH3CHO + 2NaCl + H2O":{"c":"Aqueous alkali solution, heating.","d":"If both chlorine atoms are on the same carbon atom, an aldehyde forms instead of an alcohol.","n":"hydrolysis of a haloalkane"},"CH3Cl + 2NH3 -> CH3NH2 + NH4Cl":{"c":"Excess ammonia, heating.","d":"An amino group replaces the chlorine atom — methylamine is formed.","n":"alkylation of ammonia"},"C2H5Br + KCN -> C2H5CN + KBr":{"c":"On heating in alcoholic solution.","d":"The cyanide ion replaces the bromine, and the carbon chain grows by one atom."},"2C2H5OH + 2Na -> 2C2H5ONa + H2":{"c":"Under ordinary conditions.","d":"Sodium replaces the hydrogen of the hydroxyl group, and hydrogen is released. Alcohols react more calmly than water."},"2CH3OH + 2Na -> 2CH3ONa + H2":{"c":"Under ordinary conditions.","d":"Methanol reacts with sodium, forming sodium methoxide."},"C2H5ONa + H2O -> C2H5OH + NaOH":{"c":"Under ordinary conditions.","d":"Alcohols are weaker acids than water, so alkoxides are completely broken down by water.","n":"hydrolysis of an alkoxide"},"C2H5OH + HBr -> C2H5Br + H2O":{"c":"Concentrated sulfuric acid, heating (HBr is often made right in the mixture from KBr).","d":"A bromine atom replaces the hydroxyl group."},"C2H5OH + HCl -> C2H5Cl + H2O":{"c":"ZnCl₂ catalyst, heating.","d":"Chloroethane is formed."},"2C2H5OH -> C2H5-O-C2H5 + H2O":{"c":"Concentrated sulfuric acid, below 140 °C.","d":"At a lower temperature, water is removed from two alcohol molecules — an ether is formed.","n":"intermolecular dehydration"},"2CH3OH -> CH3-O-CH3 + H2O":{"c":"Acid catalyst, heating.","d":"Dimethyl ether is formed.","n":"intermolecular dehydration"},"C2H5OH + CuO -> CH3CHO + Cu + H2O":{"c":"A red-hot copper wire coated with CuO is dipped into the alcohol.","d":"The black wire turns red, and there is a smell of aldehyde. A primary alcohol is oxidized to an aldehyde."},"CH3OH + CuO -> HCHO + Cu + H2O":{"c":"On heating.","d":"Methanol is oxidized to formaldehyde."},"CH3-CH(OH)-CH3 + CuO -> CH3-CO-CH3 + Cu + H2O":{"c":"On heating.","d":"A secondary alcohol is oxidized to a ketone — here, acetone."},"CH3-CH2-CH2OH + CuO -> CH3-CH2-CHO + Cu + H2O":{"c":"On heating.","d":"Propan-1-ol is oxidized to propanal."},"C2H5OH -> CH3CHO + H2":{"c":"Copper catalyst, heating.","d":"Removing hydrogen from an alcohol also gives an aldehyde.","n":"dehydrogenation"},"2CH3OH + O2 -> 2HCHO + 2H2O":{"c":"Catalyst (Ag or Cu), heating.","d":"The industrial method of making formaldehyde.","n":"catalytic oxidation"},"C2H5OH + O2 -> CH3COOH + H2O":{"c":"By bacteria (enzymes), with access to air.","d":"This is how wine turns sour and becomes vinegar.","n":"acetic fermentation"},"3C2H5OH + K2Cr2O7 + 4H2SO4 -> 3CH3CHO + Cr2(SO4)3 + K2SO4 + 7H2O":{"c":"Acidified dichromate solution.","d":"The orange solution turns green — old breathalyser tubes were based on this."},"5C2H5OH + 4KMnO4 + 6H2SO4 -> 5CH3COOH + 4MnSO4 + 2K2SO4 + 11H2O":{"c":"Acidified permanganate solution, heating.","d":"A strong oxidizing agent oxidizes a primary alcohol straight to an acid."},"3CH3-CH(OH)-CH3 + K2Cr2O7 + 4H2SO4 -> 3CH3-CO-CH3 + Cr2(SO4)3 + K2SO4 + 7H2O":{"c":"Acidified dichromate solution.","d":"A secondary alcohol is oxidized to a ketone."},"5CH3OH + 6KMnO4 + 9H2SO4 -> 5CO2 + 6MnSO4 + 3K2SO4 + 19H2O":{"c":"Acidified permanganate solution, heating.","d":"Methanol is oxidized completely — to carbon dioxide."},"CO + 2H2 -> CH3OH":{"c":"Catalyst (ZnO, Cr₂O₃ or copper), heating, pressure.","d":"The industrial method of making methanol from synthesis gas."},"2CH3OH + 3O2 -> 2CO2 + 4H2O":{"c":"Ignition.","d":"Methanol burns with an almost invisible flame. It is very poisonous!","n":"combustion"},"CH3-CH2-CH2OH -> CH2=CH-CH3 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Propan-1-ol gives propene.","n":"intramolecular dehydration"},"CH3-CH(OH)-CH3 -> CH2=CH-CH3 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Propan-2-ol also gives propene.","n":"intramolecular dehydration"},"CH2OH-CH2OH + 2Na -> CH2ONa-CH2ONa + H2":{"c":"Under ordinary conditions.","d":"In both hydroxyl groups of ethylene glycol, hydrogen is replaced by sodium."},"CH2OH-CH2OH + 2HBr -> CH2Br-CH2Br + 2H2O":{"c":"On heating.","d":"Both hydroxyl groups are replaced by bromine."},"2CH2OH-CH2OH + Cu(OH)2 -> Cu(C2H5O2)2 + 2H2O":{"c":"Freshly made copper(II) hydroxide in alkaline solution.","d":"The blue precipitate dissolves, giving a deep blue solution — the test for polyhydric alcohols."},"2C3H5(OH)3 + Cu(OH)2 -> Cu(C3H7O3)2 + 2H2O":{"c":"Freshly made copper(II) hydroxide in alkaline solution.","d":"Glycerol dissolves copper(II) hydroxide, forming a deep blue solution."},"C3H5(OH)3 + 3HNO3 -> C3H5(ONO2)3 + 3H2O":{"c":"Concentrated nitric and sulfuric acids.","d":"This gives nitroglycerin — an explosive and a heart medicine.","n":"esterification"},"2C3H5(OH)3 + 6Na -> 2C3H5(ONa)3 + 3H2":{"c":"On heating.","d":"All three hydroxyl groups of glycerol react with sodium."},"C6H5OH + NaOH -> C6H5ONa + H2O":{"c":"In solution.","d":"Unlike alcohols, phenol reacts with alkalis: the benzene ring strengthens the acidic properties of the −OH group.","n":"acidic properties of phenol"},"2C6H5OH + 2Na -> 2C6H5ONa + H2":{"c":"In molten phenol.","d":"Like alcohols, phenol reacts with sodium."},"C6H5ONa + HCl -> C6H5OH + NaCl":{"c":"In solution.","d":"A strong acid drives out weak phenol — the solution turns cloudy."},"C6H5ONa + CO2 + H2O -> C6H5OH + NaHCO3":{"c":"On bubbling carbon dioxide through.","d":"Even carbonic acid is stronger than phenol: it drives phenol out of the phenoxide."},"C6H5OH + 3Br2 -> C6H2Br3OH + 3HBr":{"c":"Bromine water, no catalyst.","d":"A white precipitate of tribromophenol forms — the test for phenol. The −OH group makes substitution in the ring much easier."},"C6H5OH + 3HNO3 -> C6H2(NO2)3OH + 3H2O":{"c":"Concentrated nitric acid in the presence of sulfuric acid.","d":"This gives picric acid — a yellow explosive.","n":"nitration"},"C6H5OH + 3H2 -> C6H11OH":{"c":"Nickel catalyst, heating.","d":"The benzene ring is saturated with hydrogen, giving cyclohexanol.","n":"hydrogenation"},"C6H5Cl + NaOH -> C6H5OH + NaCl":{"c":"About 300 °C, pressure.","d":"A chlorine atom on a benzene ring is hard to replace — harsh conditions are needed."},"C6H5-CH(CH3)2 + O2 -> C6H5OH + CH3-CO-CH3":{"c":"Cumene is oxidized by oxygen in air, then the intermediate hydroperoxide is broken down with sulfuric acid.","d":"The main industrial method: cumene gives two valuable products at once — phenol and acetone.","n":"cumene process (overall equation)"},"CH3CHO + H2 -> C2H5OH":{"c":"Nickel catalyst, heating.","d":"An aldehyde is reduced to a primary alcohol.","n":"hydrogenation (reduction)"},"HCHO + H2 -> CH3OH":{"c":"Nickel catalyst, heating.","d":"Formaldehyde is reduced to methanol.","n":"hydrogenation (reduction)"},"CH3-CH2-CHO + H2 -> CH3-CH2-CH2OH":{"c":"Nickel catalyst, heating.","d":"Propanal is reduced to propan-1-ol.","n":"hydrogenation (reduction)"},"CH3-CO-CH3 + H2 -> CH3-CH(OH)-CH3":{"c":"Nickel catalyst, heating.","d":"A ketone is reduced to a secondary alcohol.","n":"hydrogenation (reduction)"},"CH3CHO + 2[Ag(NH3)2]OH -> CH3COONH4 + 2Ag + 3NH3 + H2O":{"c":"Ammoniacal silver oxide solution, gentle heating.","d":"A shiny layer of silver forms on the walls of the test tube — the test for an aldehyde group. Ketones do not react this way.","n":"“silver mirror” reaction"},"CH3CHO + Ag2O -> CH3COOH + 2Ag":{"c":"Ammoniacal silver oxide solution, heating.","d":"A simplified school equation for the silver mirror reaction.","n":"“silver mirror”, simplified equation"},"HCHO + 4[Ag(NH3)2]OH -> (NH4)2CO3 + 4Ag + 6NH3 + 2H2O":{"c":"Ammoniacal silver oxide solution, heating.","d":"Formaldehyde is oxidized further than any other aldehyde — to carbonate — and reduces four times as much silver.","n":"“silver mirror” reaction"},"CH3CHO + 2Cu(OH)2 -> CH3COOH + Cu2O + 2H2O":{"c":"Freshly made copper(II) hydroxide, heating.","d":"The blue precipitate turns brick red (Cu₂O) — another test for aldehydes."},"CH3CHO + 2Cu(OH)2 + NaOH -> CH3COONa + Cu2O + 3H2O":{"c":"Copper(II) hydroxide in excess alkali, heating.","d":"In alkaline solution, the acid immediately turns into a salt."},"HCHO + 4Cu(OH)2 -> CO2 + 2Cu2O + 5H2O":{"c":"On heating.","d":"Formaldehyde is oxidized to carbon dioxide."},"5CH3CHO + 2KMnO4 + 3H2SO4 -> 5CH3COOH + 2MnSO4 + K2SO4 + 3H2O":{"c":"Acidified permanganate solution.","d":"An aldehyde is easily oxidized to a carboxylic acid."},"3CH3CHO + K2Cr2O7 + 4H2SO4 -> 3CH3COOH + Cr2(SO4)3 + K2SO4 + 4H2O":{"c":"Acidified dichromate solution.","d":"Dichromate oxidizes the aldehyde to an acid, and the solution turns green."},"5HCHO + 4KMnO4 + 6H2SO4 -> 5CO2 + 4MnSO4 + 2K2SO4 + 11H2O":{"c":"Acidified permanganate solution.","d":"Formaldehyde is oxidized to carbon dioxide."},"2CH3CHO + O2 -> 2CH3COOH":{"c":"Catalyst (manganese salts), heating.","d":"An industrial method of making acetic acid from the aldehyde.","n":"catalytic oxidation"},"CH3CHO + Br2 + H2O -> CH3COOH + 2HBr":{"c":"Bromine water.","d":"Aldehydes decolourize bromine water, but unlike with alkenes, bromine does not add on — it oxidizes the aldehyde."},"CH3-CO-CH3 + 4O2 -> 3CO2 + 3H2O":{"c":"Ignition.","d":"Acetone catches fire easily.","n":"combustion"},"(CH3COO)2Ca -> CaCO3 + CH3-CO-CH3":{"c":"On heating.","d":"An old method of making acetone — dry distillation of calcium acetate."},"2CH3COOH + Mg -> (CH3COO)2Mg + H2":{"c":"In solution.","d":"Like inorganic acids, acetic acid reacts with reactive metals, releasing hydrogen."},"2CH3COOH + Zn -> (CH3COO)2Zn + H2":{"c":"In solution.","d":"Zinc dissolves in acetic acid more slowly than in hydrochloric acid: acetic acid is weak."},"2CH3COOH + 2Na -> 2CH3COONa + H2":{"c":"Under ordinary conditions.","d":"Sodium replaces the hydrogen of the carboxyl group."},"CH3COOH + NaOH -> CH3COONa + H2O":{"c":"In solution.","d":"Acetic acid is neutralized by an alkali."},"CH3COOH + KOH -> CH3COOK + H2O":{"c":"In solution.","d":"Potassium acetate is formed."},"2CH3COOH + CaO -> (CH3COO)2Ca + H2O":{"c":"","d":"A carboxylic acid reacts with a basic oxide."},"2CH3COOH + Na2CO3 -> 2CH3COONa + H2O + CO2":{"c":"In solution.","d":"Acetic acid is stronger than carbonic acid: carbon dioxide is released. This is how carboxylic acids are told apart from phenol."},"2CH3COOH + CaCO3 -> (CH3COO)2Ca + H2O + CO2":{"c":"Under ordinary conditions.","d":"That is why vinegar can remove limescale from a kettle."},"2CH3COOH + Cu(OH)2 -> (CH3COO)2Cu + 2H2O":{"c":"","d":"The blue precipitate dissolves, forming a blue-green solution of copper(II) acetate."},"CH3COOH + NH3 -> CH3COONH4":{"c":"","d":"The acid takes up ammonia — ammonium acetate is formed."},"CH3COOH + Cl2 -> CH2ClCOOH + HCl":{"c":"Red phosphorus catalyst, heating.","d":"Chlorine replaces hydrogen in the methyl group (the α-position)."},"CH2ClCOOH + 2NH3 -> NH2CH2COOH + NH4Cl":{"c":"Excess ammonia.","d":"An amino group replaces the chlorine — this is how the simplest amino acid, glycine, is made."},"CH3COONa + H2SO4 -> CH3COOH + NaHSO4":{"c":"Concentrated sulfuric acid, heating.","d":"A laboratory method for making acetic acid: a strong non-volatile acid drives out a weak volatile one."},"CH3COONa + HCl -> CH3COOH + NaCl":{"c":"In solution.","d":"A strong acid drives out weak acetic acid — a smell of vinegar appears."},"HCOOH + Ag2O -> CO2 + H2O + 2Ag":{"c":"Ammoniacal silver oxide solution, heating.","d":"Formic acid is the only carboxylic acid that gives a silver mirror: its molecule contains an aldehyde group.","n":"“silver mirror”"},"HCOOH + 2[Ag(NH3)2]OH -> (NH4)2CO3 + 2Ag + 2NH3 + H2O":{"c":"Ammoniacal silver oxide solution, heating.","d":"The full equation of the silver mirror reaction for formic acid.","n":"“silver mirror”"},"HCOOH -> CO + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"A laboratory method for making carbon monoxide.","n":"dehydration"},"5HCOOH + 2KMnO4 + 3H2SO4 -> 5CO2 + 2MnSO4 + K2SO4 + 8H2O":{"c":"Acidified permanganate solution.","d":"Formic acid decolourizes permanganate as it is oxidized to carbon dioxide."},"HCOOH + Br2 -> CO2 + 2HBr":{"c":"Bromine water.","d":"Formic acid decolourizes bromine water, but acetic acid does not."},"HCOOH + NaOH -> HCOONa + H2O":{"c":"In solution.","d":"Sodium formate is formed."},"HCOONa + HCl -> HCOOH + NaCl":{"c":"In solution.","d":"Hydrochloric acid drives out the weaker formic acid."},"2HCOONa -> Na2C2O4 + H2":{"c":"On heating.","d":"On heating, formate turns into oxalate."},"H2C2O4 -> CO + CO2 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Oxalic acid decomposes into carbon monoxide, carbon dioxide and water."},"5H2C2O4 + 2KMnO4 + 3H2SO4 -> 10CO2 + 2MnSO4 + K2SO4 + 8H2O":{"c":"Acidified permanganate solution, heating.","d":"A classic reaction for finding the concentration of permanganate."},"H2C2O4 + 2NaOH -> Na2C2O4 + 2H2O":{"c":"In solution.","d":"Diprotic oxalic acid is neutralized by two molecules of alkali."},"C17H33COOH + H2 -> C17H35COOH":{"c":"Nickel catalyst, heating.","d":"Liquid unsaturated oleic acid turns into solid stearic acid.","n":"hydrogenation"},"C17H35COONa + HCl -> C17H35COOH + NaCl":{"c":"In solution.","d":"Stearic acid precipitates from the soap solution."},"2C17H35COONa + CaCl2 -> (C17H35COO)2Ca + 2NaCl":{"c":"In hard water.","d":"In hard water, soap forms insoluble flakes (scum) and does not lather well."},"CH2=CH-COOH + Br2 -> CH2Br-CHBr-COOH":{"c":"Bromine water.","d":"Unsaturated acrylic acid decolourizes bromine water at its double bond."},"CH3COOH + 2O2 -> 2CO2 + 2H2O":{"c":"Ignition.","d":"Acetic acid burns to carbon dioxide and water.","n":"combustion"},"CH3COOH + C2H5OH <=> CH3COOC2H5 + H2O":{"c":"Concentrated sulfuric acid as a catalyst, heating. The reaction is reversible.","d":"An acid and an alcohol form an ester with a fruity smell. The water comes from the −OH group of the acid and the hydrogen of the alcohol.","n":"esterification"},"CH3COOH + CH3OH <=> CH3COOCH3 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Methyl acetate is formed.","n":"esterification"},"HCOOH + CH3OH <=> HCOOCH3 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Methyl formate is formed.","n":"esterification"},"HCOOH + C2H5OH <=> HCOOC2H5 + H2O":{"c":"Concentrated sulfuric acid, heating.","d":"Ethyl formate is formed — it smells of rum.","n":"esterification"},"CH3COOC2H5 + H2O <=> CH3COOH + C2H5OH":{"c":"Acidic solution, heating. The reaction is reversible.","d":"The reverse of esterification: the ester splits into an acid and an alcohol.","n":"acid hydrolysis of an ester"},"CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH":{"c":"Alkali solution, heating.","d":"In alkaline solution hydrolysis goes to completion: instead of the acid, its salt forms.","n":"alkaline hydrolysis (saponification)"},"CH3COOCH3 + NaOH -> CH3COONa + CH3OH":{"c":"Alkali solution, heating.","d":"Methyl acetate is saponified to sodium acetate and methanol.","n":"alkaline hydrolysis (saponification)"},"HCOOC2H5 + NaOH -> HCOONa + C2H5OH":{"c":"Alkali solution, heating.","d":"Ethyl formate is saponified to sodium formate and ethanol.","n":"alkaline hydrolysis (saponification)"},"(C17H35COO)3C3H5 + 3NaOH -> C3H5(OH)3 + 3C17H35COONa":{"c":"Alkali solution, heating.","d":"This is how soap is made: the fat splits into glycerol and salts of fatty acids.","n":"saponification of a fat"},"(C17H35COO)3C3H5 + 3H2O -> C3H5(OH)3 + 3C17H35COOH":{"c":"Acidic solution with heating, or enzymes (lipases) in the body.","d":"During digestion, fats are broken down into glycerol and fatty acids.","n":"hydrolysis of a fat"},"C3H5(OH)3 + 3C17H35COOH -> (C17H35COO)3C3H5 + 3H2O":{"c":"Acid catalyst, heating.","d":"Fats are esters of glycerol and fatty acids.","n":"esterification (making a fat)"},"(C17H33COO)3C3H5 + 3H2 -> (C17H35COO)3C3H5":{"c":"Nickel catalyst, heating, pressure.","d":"Liquid vegetable oil turns into solid fat — this is how margarine is made.","n":"hydrogenation of a fat"},"(C17H33COO)3C3H5 + 3Br2 -> (C17H33Br2COO)3C3H5":{"c":"Bromine water.","d":"Vegetable oil decolourizes bromine water — it contains double bonds."},"(C17H33COO)3C3H5 + 3NaOH -> C3H5(OH)3 + 3C17H33COONa":{"c":"Alkali solution, heating.","d":"Vegetable oil gives liquid soap and glycerol.","n":"saponification of a fat"},"C6H12O6 + 2[Ag(NH3)2]OH -> C5H11O5COONH4 + 2Ag + 3NH3 + H2O":{"c":"Ammoniacal silver oxide solution, heating.","d":"Glucose is an aldehyde alcohol: its aldehyde group is oxidized and silver is deposited on the walls.","n":"“silver mirror”"},"C6H12O6 + Ag2O -> C6H12O7 + 2Ag":{"c":"Ammoniacal silver oxide solution, heating.","d":"A simplified equation: glucose is oxidized to gluconic acid.","n":"“silver mirror”, simplified equation"},"C6H12O6 + 2Cu(OH)2 -> C6H12O7 + Cu2O + 2H2O":{"c":"On heating.","d":"Heated with copper(II) hydroxide, glucose gives a red precipitate of Cu₂O. (In the cold, as a polyhydric alcohol, it gives a blue solution.)"},"C6H12O6 + Br2 + H2O -> C6H12O7 + 2HBr":{"c":"Bromine water.","d":"Glucose decolourizes bromine water as it is oxidized to gluconic acid. Fructose does not react this way."},"C6H12O6 + H2 -> C6H14O6":{"c":"Nickel catalyst, heating.","d":"This gives sorbitol, an alcohol with six −OH groups that is used as a sweetener.","n":"hydrogenation (reduction)"},"C6H12O6 -> 2CH3-CH(OH)-COOH":{"c":"By lactic acid bacteria.","d":"This is how milk turns sour and cabbage is pickled.","n":"lactic acid fermentation"},"C6H12O6 -> C3H7COOH + 2CO2 + 2H2":{"c":"By butyric acid bacteria.","d":"Butyric acid is why rancid butter smells unpleasant.","n":"butyric fermentation"},"C12H22O11 + H2O -> 2C6H12O6":{"c":"Acidic solution with heating, or enzymes.","d":"Sucrose splits into two molecules with the same formula C₆H₁₂O₆ — glucose and fructose.","n":"hydrolysis of sucrose"},"C12H22O11 + 12O2 -> 12CO2 + 11H2O":{"c":"On burning; in the body — gradually, with the help of enzymes.","d":"Sugar is a source of energy: a lot of heat is released when it is oxidized.","n":"complete oxidation"},"(C6H10O5)n + nH2O -> nC6H12O6":{"c":"Acidic solution with heating, or enzymes (salivary amylase).","d":"Complete hydrolysis of starch and cellulose gives glucose.","n":"hydrolysis of a polysaccharide"},"6nCO2 + 5nH2O -> (C6H10O5)n + 6nO2":{"c":"In light, in green plants.","d":"Plants store the energy of sunlight as starch.","n":"photosynthesis of starch (overall equation)"},"(C6H10O5)n + 3nHNO3 -> (C6H7O2(ONO2)3)n + 3nH2O":{"c":"Concentrated nitric and sulfuric acids.","d":"Each cellulose unit has three −OH groups that are esterified — this gives guncotton for smokeless powder.","n":"esterification of cellulose"},"CH3NH2 + HCl -> [CH3NH3]Cl":{"c":"Under ordinary conditions.","d":"Amines are organic bases: like ammonia, they take up acids.","n":"basic properties of amines"},"CH3NH2 + H2O <=> [CH3NH3]OH":{"c":"In aqueous solution.","d":"Methylamine solution is alkaline — phenolphthalein turns pink.","n":"basic properties of amines"},"[CH3NH3]Cl + NaOH -> CH3NH2 + NaCl + H2O":{"c":"On heating.","d":"An alkali drives the amine out of its salt."},"4CH3NH2 + 9O2 -> 4CO2 + 10H2O + 2N2":{"c":"Ignition.","d":"When amines burn, the nitrogen is released as nitrogen gas.","n":"combustion"},"C2H5NH2 + HCl -> [C2H5NH3]Cl":{"c":"Under ordinary conditions.","d":"Ethylamine takes up hydrogen chloride.","n":"basic properties of amines"},"4C2H5NH2 + 15O2 -> 8CO2 + 14H2O + 2N2":{"c":"Ignition.","d":"Ethylamine burns to carbon dioxide, water and nitrogen.","n":"combustion"},"C2H5NH2 + HNO2 -> C2H5OH + N2 + H2O":{"c":"In the cold (nitrous acid is made from NaNO₂ and an acid).","d":"With nitrous acid, primary amines turn into alcohols, releasing nitrogen.","n":"a primary amine with nitrous acid"},"(CH3)2NH + HCl -> [(CH3)2NH2]Cl":{"c":"Under ordinary conditions.","d":"A secondary amine also shows basic properties.","n":"basic properties of amines"},"C6H5NH2 + HCl -> [C6H5NH3]Cl":{"c":"Under ordinary conditions.","d":"Aniline is a very weak base, but it forms salts with strong acids.","n":"basic properties of aniline"},"[C6H5NH3]Cl + NaOH -> C6H5NH2 + NaCl + H2O":{"c":"In solution.","d":"An alkali drives aniline out of its salt — the solution turns cloudy."},"C6H5NH2 + 3Br2 -> C6H2Br3NH2 + 3HBr":{"c":"Bromine water.","d":"A white precipitate of tribromoaniline forms — the test for aniline."},"C6H5NO2 + 3H2 -> C6H5NH2 + 2H2O":{"c":"Catalyst, heating.","d":"The industrial method of making aniline, discovered by the Russian chemist N. N. Zinin.","n":"reduction of a nitro compound (Zinin reaction)"},"C6H5NO2 + 3Fe + 6HCl -> C6H5NH2 + 3FeCl2 + 2H2O":{"c":"Iron in hydrochloric acid.","d":"The hydrogen formed as iron reacts with the acid reduces nitrobenzene.","n":"reduction of a nitro compound"},"C6H5NO2 + 3Zn + 7HCl -> [C6H5NH3]Cl + 3ZnCl2 + 2H2O":{"c":"Zinc in excess hydrochloric acid.","d":"In excess acid, aniline immediately forms a salt.","n":"reduction of a nitro compound"},"CH3NO2 + 3H2 -> CH3NH2 + 2H2O":{"c":"Catalyst, heating.","d":"Nitromethane is reduced to methylamine.","n":"reduction of a nitro compound"},"NH2CH2COOH + NaOH -> NH2CH2COONa + H2O":{"c":"In solution.","d":"Amino acids are amphoteric: the carboxyl group reacts with an alkali.","n":"acidic properties of an amino acid"},"NH2CH2COOH + HCl -> [NH3CH2COOH]Cl":{"c":"In solution.","d":"The amino group takes up the acid.","n":"basic properties of an amino acid"},"CH3-CH(NH2)-COOH + NaOH -> CH3-CH(NH2)-COONa + H2O":{"c":"In solution.","d":"Alanine also reacts with alkalis.","n":"acidic properties of an amino acid"},"NH2CH2COOH + CH3OH -> NH2CH2COOCH3 + H2O":{"c":"In the presence of hydrogen chloride.","d":"Like carboxylic acids, amino acids form esters.","n":"esterification"},"2NH2CH2COOH + Cu(OH)2 -> (NH2CH2COO)2Cu + 2H2O":{"c":"In solution.","d":"A deep blue complex compound forms — copper glycinate."},"2NH2CH2COOH -> NH2CH2CONHCH2COOH + H2O":{"c":"On heating, or in the body (on ribosomes).","d":"The amino group of one molecule and the carboxyl group of another form a peptide bond −CO−NH−.","n":"forming a dipeptide"},"nNH2CH2COOH -> (-NH-CH2-CO-)n + nH2O":{"c":"On heating.","d":"This is how polypeptides — the basis of proteins — are built from amino acids."},"nNH2(CH2)5COOH -> (-NH-(CH2)5-CO-)n + nH2O":{"c":"On heating.","d":"This gives nylon-6 — a strong synthetic fibre."}},"types":{"соединение":"combination","разложение":"decomposition","замещение":"substitution","обмен":"double displacement","другое":"other","окисление":"oxidation","отщепление":"elimination","изомеризация":"isomerization","присоединение":"addition","полимеризация":"polymerization","гидролиз":"hydrolysis","поликонденсация":"polycondensation"},"tags":{"ОВР":"redox","горение":"combustion","экзотермическая":"exothermic","эндотермическая":"endothermic","каталитическая":"catalytic","электролиз":"electrolysis","нейтрализация":"neutralization","качественная реакция":"identification test","радикальный механизм":"radical mechanism"},"topics":{"8–9 класс":"Grades 8–9","8–9 класс · реакции соединения":"Grades 8–9 · combination reactions","8–9 класс · реакции разложения":"Grades 8–9 · decomposition reactions","8–9 класс · реакции замещения":"Grades 8–9 · substitution reactions","8–9 класс · реакции обмена":"Grades 8–9 · double displacement reactions","8–9 класс · другие реакции":"Grades 8–9 · other reactions","Галогены и их соединения":"Halogens and their compounds","Кислород, сера и их соединения":"Oxygen, sulfur and their compounds","Азот, фосфор и их соединения":"Nitrogen, phosphorus and their compounds","Углерод, кремний и их соединения":"Carbon, silicon and their compounds","Щелочные и щёлочноземельные металлы, магний":"Alkali and alkaline earth metals, magnesium","Алюминий и его соединения":"Aluminium and its compounds","Железо и его соединения":"Iron and its compounds","Медь, цинк, серебро, золото и другие металлы":"Copper, zinc, silver, gold and other metals","Хром, марганец и их соединения":"Chromium, manganese and their compounds","Электролиз растворов и расплавов":"Electrolysis of solutions and melts","Гидролиз солей":"Hydrolysis of salts","Органика: алканы и циклоалканы":"Organic: alkanes and cycloalkanes","Органика: алкены, диены и полимеры":"Organic: alkenes, dienes and polymers","Органика: алкины":"Organic: alkynes","Органика: ароматические углеводороды":"Organic: aromatic hydrocarbons","Органика: галогенпроизводные и спирты":"Organic: halogen derivatives and alcohols","Органика: фенол":"Organic: phenol","Органика: альдегиды и кетоны":"Organic: aldehydes and ketones","Органика: карбоновые кислоты":"Organic: carboxylic acids","Органика: сложные эфиры и жиры":"Organic: esters and fats","Органика: углеводы":"Organic: carbohydrates","Органика: амины, аминокислоты, белки":"Organic: amines, amino acids, proteins"},"levels":{"8–9 класс":"Grades 8–9","10–11 класс · ЕГЭ":"Grades 10–11 · exam level"}};

/* ############################################################
   6. Химическая логика: разбор формул, коэффициенты, поиск реакций (был <script id="chem-core">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ХИМИЧЕСКАЯ ЛОГИКА
   Здесь нет ничего про кнопки и страницу — только химия:
   - разбор формул и уравнений (неорганика, органика со связями,
     полимеры с «n», ионы с зарядами) и понятные ошибки;
   - расстановка коэффициентов (точная математика, без угадывания);
   - поиск реакций в базе (данные лежат в chem-data и пакетах по темам);
   - ионные уравнения для реакций из базы;
   - подсказки при вводе.
   Подключение: const chem = AtomixChem.create(данные, таблица)
   ============================================================ */
(function (global) {
"use strict";

/* ---------- язык сообщений: tr("по-русски", "in English") ----------
   Язык выбирается на странице (AtomixI18n); без страницы (тесты в Node) — русский. */
function isEn() { return !!(global.AtomixI18n && global.AtomixI18n.lang === "en"); }
function tr(ru, en) { return isEn() ? en : ru; }

/* ---------- точные дроби (BigInt), чтобы коэффициенты не «плыли» ---------- */
function bgcd(a, b) { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) { const t = a % b; a = b; b = t; } return a; }
function frac(n, d) {
  if (d === undefined) d = 1n;
  if (d < 0n) { n = -n; d = -d; }
  const g = bgcd(n, d) || 1n;
  return [n / g, d / g];
}
function fsub(a, b) { return frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]); }
function fmul(a, b) { return frac(a[0] * b[0], a[1] * b[1]); }
function fdiv(a, b) { return frac(a[0] * b[1], a[1] * b[0]); }

// Нуль-пространство матрицы: все наборы коэффициентов x, при которых A·x = 0
function nullspace(A, cols) {
  const rows = A.length;
  const M = A.map(function (r) { return r.map(function (v) { return [BigInt(v), 1n]; }); });
  const pivots = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = -1;
    for (let i = r; i < rows; i++) if (M[i][c][0] !== 0n) { p = i; break; }
    if (p < 0) continue;
    const tmp = M[r]; M[r] = M[p]; M[p] = tmp;
    const pv = M[r][c];
    for (let k = 0; k < cols; k++) M[r][k] = fdiv(M[r][k], pv);
    for (let i = 0; i < rows; i++) {
      if (i === r || M[i][c][0] === 0n) continue;
      const f = M[i][c];
      for (let k = 0; k < cols; k++) M[i][k] = fsub(M[i][k], fmul(f, M[r][k]));
    }
    pivots.push(c);
    r++;
  }
  const basis = [];
  for (let f = 0; f < cols; f++) {
    if (pivots.indexOf(f) !== -1) continue;
    const v = new Array(cols).fill(null).map(function () { return [0n, 1n]; });
    v[f] = [1n, 1n];
    pivots.forEach(function (pc, i) { v[pc] = frac(-M[i][f][0], M[i][f][1]); });
    basis.push(v);
  }
  return basis;
}
function toIntegers(v) {
  let l = 1n;
  v.forEach(function (x) { l = l / bgcd(l, x[1]) * x[1]; });
  let ints = v.map(function (x) { return x[0] * (l / x[1]); });
  let g = 0n;
  ints.forEach(function (x) { g = bgcd(g, x); });
  if (g > 1n) ints = ints.map(function (x) { return x / g; });
  const firstNonZero = ints.find(function (x) { return x !== 0n; });
  if (firstNonZero !== undefined && firstNonZero < 0n) ints = ints.map(function (x) { return -x; });
  return ints;
}
function igcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }

/* ---------- текст: приводим разные способы записи к одному ---------- */
const FWD = "\u0002", REV = "\u0001";
const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-" };
const SUP_BACK = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };

function preNormalize(t) {
  let s = String(t);
  s = s.replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); }); // H₂O → H2O
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, function (run) { return "^" + run.split("").map(function (c) { return SUP[c]; }).join(""); }); // SO₄²⁻ → SO4^2-
  s = s.replace(/ /g, " ").replace(/[−‒–—]/g, "-"); // разные тире → «-»
  // агрегатные состояния и пометки: (г), (ж), (тв), (р-р), (aq), (s), (l), (g), (конц.), (разб.)
  s = s.replace(/\((?:aq|s|l|g|тв|ж|г|р-р|р|конц\.?|разб\.?|крист\.?|изб\.?|недост\.?|спирт\.?|водн\.?)\)/gi, "");
  s = s.replace(/[↑↓]/g, "");
  // точка в кристаллогидратах: CuSO4·5H2O, CuSO4*5H2O, CuSO4.5H2O
  s = s.replace(/[•∙⋅*]/g, "·").replace(/\.(?=\s*\d)/g, "·");
  return s;
}

// Где стрелка, а где двойная связь. «=» считается знаком реакции, только если
// других стрелок нет; если знаков «=» несколько, реакцией считается тот, что с пробелами.
function placeArrows(s) {
  s = s.replace(/<\s*-+\s*>|<\s*=+\s*>|[⇌⇄↔⇆]/g, " " + REV + " ");
  s = s.replace(/-+>|=+>|[→⟶⇒➝➔]/g, " " + FWD + " ");
  if (s.indexOf(REV) !== -1 || s.indexOf(FWD) !== -1) return { s: s };
  s = s.replace(/={2,}/g, "=");
  const pos = [];
  for (let i = 0; i < s.length; i++) if (s[i] === "=") pos.push(i);
  if (!pos.length) return { s: s };
  let at;
  if (pos.length === 1) at = pos[0];
  else {
    const spaced = pos.filter(function (i) { return /\s/.test(s[i - 1] || "") || /\s/.test(s[i + 1] || ""); });
    if (spaced.length !== 1) return { s: s, error: spaced.length ? "arrows" : "ambiguousEq" };
    at = spaced[0];
  }
  return { s: s.slice(0, at) + " " + FWD + " " + s.slice(at + 1) };
}

// Делим часть уравнения на вещества по «+», но «+» после иона (Na+, Fe3+) — это заряд
function splitTerms(text) {
  const out = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "+") {
      const prev = text[i - 1] || "", next = text[i + 1];
      const caretOpen = /\^\s*\d*\s*$/.test(cur);
      const isCharge = caretOpen || (/[A-Za-z0-9)\]]/.test(prev) && (next === undefined || /[\s+)]/.test(next)));
      if (isCharge) { cur += ch; continue; }
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function chargeStr(z) { const a = Math.abs(z); return (a === 1 ? "" : String(a)) + (z > 0 ? "+" : "-"); }
function chargeSup(z) { return chargeStr(z).split("").map(function (c) { return SUP_BACK[c]; }).join(""); }
function stripBonds(f) { return String(f).replace(/[-=≡]/g, ""); }

const LOOKALIKE = { "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X", "У": "Y",
  "а": "a", "с": "c", "е": "e", "о": "o", "р": "p", "х": "x", "у": "y", "к": "k", "м": "m", "т": "t" };
const CYR = /[А-Яа-яЁё]/;

function normName(t) { return String(t).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim(); }

function create(data, table) {
  const SYMS = table.symbols;
  const SYMSET = new Set(SYMS);
  const EN_DATA = data.en || {};      // английские названия и тексты (скрипт chem-en)
  const EL_NAME = {};
  const EL_NAME_EN = {};
  const MASS = {};
  SYMS.forEach(function (s, i) {
    EL_NAME[s] = table.names[i];
    EL_NAME_EN[s] = (table.namesEn || table.names)[i];
    const raw = String(table.masses[i]);
    MASS[s] = { v: parseFloat(raw.replace(/[\[\]]/g, "").replace(",", ".")), approx: raw.indexOf("[") !== -1 };
  });
  const PROBLEMS = [];

  /* ---------- разбор одной формулы (без связей и зарядов) ---------- */
  function fail(code, msg, extra) {
    const e = { chem: true, code: code, msg: msg };
    if (extra) Object.assign(e, extra);
    throw e;
  }
  function parseFormulaStrict(src) {
    const s = src;
    let i = 0;
    function number() {
      const m = /^\d+/.exec(s.slice(i));
      if (!m) return null;
      if (m[0][0] === "0") fail("zero", tr("Индекс не может быть нулём и не может начинаться с нуля.", "A subscript cannot be zero or start with zero."));
      i += m[0].length;
      return parseInt(m[0], 10);
    }
    function add(to, from, k) { Object.keys(from).forEach(function (e) { to[e] = (to[e] || 0) + from[e] * k; }); }
    function seq(closer) {
      const atoms = {};
      let any = false;
      while (i < s.length) {
        const ch = s[i];
        if (ch === closer) break;
        if (ch === "·") break;
        if (ch === "(" || ch === "[") {
          const close = ch === "(" ? ")" : "]";
          i++;
          const inner = seq(close);
          if (s[i] !== close) fail("unclosed", tr("Не закрыта скобка «" + ch + "».", "The bracket “" + ch + "” is not closed."));
          if (!inner.any) fail("emptyParen", tr("Внутри скобок нет ни одного элемента.", "There are no elements inside the brackets."));
          i++;
          const n = number();
          add(atoms, inner.atoms, n === null ? 1 : n);
          any = true;
          continue;
        }
        if (ch === ")" || ch === "]") fail("extraClose", tr("Лишняя закрывающая скобка «" + ch + "».", "Extra closing bracket “" + ch + "”."));
        if (/[A-Z]/.test(ch)) {
          let sym = ch;
          if (/[a-z]/.test(s[i + 1] || "")) {
            sym = ch + s[i + 1];
            if (!SYMSET.has(sym)) fail("unknownEl", tr("В таблице Менделеева нет элемента «" + sym + "».", "There is no element “" + sym + "” in the periodic table."), { symbol: sym });
          } else if (!SYMSET.has(sym)) {
            fail("unknownEl", tr("В таблице Менделеева нет элемента «" + sym + "»." + (sym === "J" ? " Йод обозначается латинской буквой I." : ""),
            "There is no element “" + sym + "” in the periodic table." + (sym === "J" ? " Iodine is written with the letter I." : "")), { symbol: sym });
          }
          i += sym.length;
          const n = number();
          atoms[sym] = (atoms[sym] || 0) + (n === null ? 1 : n);
          any = true;
          continue;
        }
        if (/[a-z]/.test(ch)) fail("lower", tr("Символ элемента пишется с заглавной буквы: H, O, Na, Cl.", "Element symbols start with a capital letter: H, O, Na, Cl."));
        if (/\d/.test(ch)) fail("digitPos", tr("Цифра стоит не на своём месте. Индекс пишут сразу после символа элемента или скобки: H2O, Ca(OH)2.",
          "A digit is in the wrong place. A subscript goes right after an element symbol or a bracket: H2O, Ca(OH)2."));
        if (ch === "^") fail("char", tr("Заряд иона пишут в конце формулы: SO4^2-, Fe^3+.", "An ion’s charge goes at the end of the formula: SO4^2-, Fe^3+."));
        fail("char", tr("Недопустимый символ «" + ch + "».", "Invalid character “" + ch + "”."));
      }
      return { atoms: atoms, any: any };
    }
    if (!s) fail("empty", tr("Пустая формула.", "Empty formula."));
    const total = {};
    let part = 0;
    while (i <= s.length) {
      let mult = 1;
      if (part > 0) {
        const n = number();
        if (n !== null) mult = n;
      }
      const res = seq(null);
      if (!res.any) fail(part > 0 ? "hydrate" : "empty", part > 0 ? tr("После точки «·» должна идти формула, например CuSO4·5H2O.", "A formula must follow the dot “·”, for example CuSO4·5H2O.") : tr("Пустая формула.", "Empty formula."));
      add(total, res.atoms, mult);
      if (i >= s.length) break;
      if (s[i] === "·") { i++; part++; continue; }
      if (s[i] === ")" || s[i] === "]") fail("extraClose", tr("Лишняя закрывающая скобка «" + s[i] + "».", "Extra closing bracket “" + s[i] + "”."));
      fail("char", tr("Недопустимый символ «" + s[i] + "».", "Invalid character “" + s[i] + "”."));
    }
    return total;
  }
  function parseFormula(src) {
    try { return { ok: true, atoms: parseFormulaStrict(src) }; }
    catch (e) { if (e && e.chem) return { ok: false, error: e }; throw e; }
  }
  function compKey(atoms) { return Object.keys(atoms).sort().map(function (k) { return k + atoms[k]; }).join(""); }
  function isSimple(atoms) { return Object.keys(atoms).length === 1; }
  function polyUnit(key) { const m = /^[(\[]([\s\S]+)[)\]]n$/.exec(key); return m ? m[1] : null; }

  /* ---------- пакеты данных: базовый школьный курс + темы 10–11 класса ---------- */
  const PACKS = [{ base: true, topic: null, level: "8–9 класс", substances: data.substances || [], reactions: data.reactions || [], ions: data.ions || [] }]
    .concat(data.packs || []);

  /* ---------- справочник веществ ---------- */
  const SUBST = {};            // ключ (формула без связей) → вещество
  const ALIAS = {};            // другое написание формулы → ключ
  const BY_COMP = {};          // состав → [ключи]
  const NAME_INDEX = [];       // для поиска по названию
  const NAME_INDEX_EN = [];    // то же по-английски
  PACKS.forEach(function (pk) {
    (pk.substances || []).forEach(function (s) {
      const key = stripBonds(s.f);
      if (SUBST[key]) {
        if (SUBST[key].n !== s.n) { PROBLEMS.push("вещество " + s.f + " описано дважды: «" + SUBST[key].n + "» и «" + s.n + "»"); return; }
        // то же вещество в другом пакете: добавляем новые названия
        (s.a || []).forEach(function (nm) {
          if (SUBST[key].a.indexOf(nm) === -1) { SUBST[key].a.push(nm); NAME_INDEX.push({ name: normName(nm), key: key }); }
        });
        return;
      }
      const unit = polyUnit(key);
      const p = parseFormula(unit || key);
      if (!p.ok) { PROBLEMS.push("ошибка в справочнике, формула " + s.f + ": " + p.error.msg); return; }
      const en = (EN_DATA.subst || {})[s.f] || (EN_DATA.subst || {})[key] || null;
      const obj = { f: s.f, key: key, n: s.n, a: (s.a || []).slice(), fa: s.fa || [], atoms: p.atoms, polymer: !!unit, en: en ? en.n : null };
      SUBST[key] = obj;
      if (!unit) { const ck = compKey(p.atoms); (BY_COMP[ck] = BY_COMP[ck] || []).push(key); }
      [s.n].concat(s.a || []).forEach(function (nm) { NAME_INDEX.push({ name: normName(nm), key: key }); });
      if (en) [en.n].concat(en.a || []).forEach(function (nm) { NAME_INDEX_EN.push({ name: normName(nm), key: key }); });
    });
  });
  PACKS.forEach(function (pk) {
    (pk.substances || []).forEach(function (s) {
      (s.fa || []).forEach(function (a) {
        const ak = stripBonds(a);
        if (SUBST[ak] && ak !== stripBonds(s.f)) PROBLEMS.push("другое написание " + a + " совпадает с веществом " + SUBST[ak].f);
        else if (ALIAS[ak] && ALIAS[ak] !== stripBonds(s.f)) PROBLEMS.push("другое написание " + a + " указано у двух веществ");
        else ALIAS[ak] = stripBonds(s.f);
      });
    });
  });
  const SIMPLE_OF = {};
  Object.keys(SUBST).forEach(function (k) { const s = SUBST[k]; if (!s.polymer && isSimple(s.atoms)) { const el = Object.keys(s.atoms)[0]; if (!SIMPLE_OF[el]) SIMPLE_OF[el] = k; } });

  /* ---------- ионы ---------- */
  const ION_BY_KEY = {};
  PACKS.forEach(function (pk) {
    (pk.ions || []).forEach(function (io) {
      const key = stripBonds(io.f) + "^" + chargeStr(io.z);
      const p = parseFormula(stripBonds(io.f));
      if (!p.ok) { PROBLEMS.push("ошибка в таблице ионов: " + io.f); return; }
      if (!ION_BY_KEY[key]) ION_BY_KEY[key] = { f: io.f, base: stripBonds(io.f), z: io.z, n: io.n, en: (EN_DATA.ions || {})[io.f + "|" + io.z] || null, org: !!io.org, atoms: p.atoms, key: key };
    });
  });

  // название (по-русски или по-английски) → формула
  function substanceByName(text) {
    const q = normName(text);
    const hit = NAME_INDEX.find(function (x) { return x.name === q; }) || NAME_INDEX_EN.find(function (x) { return x.name === q; });
    if (hit) return SUBST[hit.key].f;
    const idx = SYMS.findIndex(function (s) { return normName(EL_NAME[s]) === q || normName(EL_NAME_EN[s]) === q; });
    if (idx !== -1) return SIMPLE_OF[SYMS[idx]] ? SUBST[SIMPLE_OF[SYMS[idx]]].f : SYMS[idx];
    return null;
  }
  function elName(sym) { return isEn() ? EL_NAME_EN[sym] : EL_NAME[sym]; }
  function substName(s) { return isEn() && s.en ? s.en : s.n; }
  function ionName(io) { return isEn() && io.en ? io.en : io.n; }
  function nameOf(key) {
    if (SUBST[key]) return substName(SUBST[key]);
    if (ION_BY_KEY[key]) return ionName(ION_BY_KEY[key]);
    if (SYMSET.has(key)) return elName(key).toLowerCase();
    return null;
  }
  function molarMass(atoms) {
    let m = 0, approx = false;
    Object.keys(atoms).forEach(function (e) { m += MASS[e].v * atoms[e]; if (MASS[e].approx) approx = true; });
    return { value: m, approx: approx };
  }

  /* ---------- подсказки исправлений ---------- */
  // Все способы прочитать буквы как символы элементов: "nacl" → "NaCl", "co2" → "CO2", "Co2"
  function caseVariants(str, limit) {
    limit = limit || 60;
    const low = str.toLowerCase();
    const out = [];
    (function rec(i, acc) {
      if (out.length >= limit) return;
      if (i === low.length) { out.push(acc); return; }
      const c = low[i];
      if (/[a-z]/.test(c)) {
        if (/[a-z]/.test(low[i + 1] || "")) {
          const two = c.toUpperCase() + low[i + 1];
          if (SYMSET.has(two)) rec(i + 2, acc + two);
        }
        const one = c.toUpperCase();
        if (SYMSET.has(one)) rec(i + 1, acc + one);
      } else rec(i + 1, acc + c);
    })(0, "");
    return out.filter(function (v) { return parseFormula(v).ok; });
  }
  function sameCaseScore(a, b) { let n = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++; return n; }
  function known(k) { return SUBST[k] || ALIAS[k]; }
  function suggestFormula(str) {
    if (!/[A-Za-z]/.test(str)) return null;
    const vars = caseVariants(str).filter(function (v) { return v !== str; });
    if (!vars.length) return null;
    const kn = vars.filter(known);
    if (kn.length) return kn.sort(function (a, b) { return sameCaseScore(b, str) - sameCaseScore(a, str); })[0];
    return vars.sort(function (a, b) { return sameCaseScore(b, str) - sameCaseScore(a, str) || a.length - b.length; })[0];
  }

  /* ---------- заряд иона: SO4^2-, SO4 2-, SO4(2-), SO₄²⁻, Fe3+, NH4+ ---------- */
  function finishCharge(base, digits, sign) {
    if (digits && digits[0] === "0") return { error: { code: "charge", msg: tr("Заряд иона не может быть нулём.", "An ion’s charge cannot be zero.") } };
    return { body: base.trim(), charge: (digits ? parseInt(digits, 10) : 1) * (sign === "+" ? 1 : -1) };
  }
  // «SO42-»: где кончается индекс и начинается заряд? Сначала ищем известный ион.
  function resolveTrailing(base, digits, sign) {
    const s = sign === "+" ? 1 : -1;
    for (let k = 0; k <= digits.length; k++) {
      const idx = digits.slice(0, digits.length - k), ch = digits.slice(digits.length - k);
      if (ch && ch[0] === "0") continue;
      const z = (ch ? parseInt(ch, 10) : 1) * s;
      if (ION_BY_KEY[stripBonds(base + idx) + "^" + chargeStr(z)]) return { body: base + idx, charge: z };
    }
    if (digits && /^[A-Z][a-z]?$/.test(base)) return { body: base, charge: parseInt(digits, 10) * s };
    if (digits.length >= 2) return { body: base + digits.slice(0, -1), charge: parseInt(digits.slice(-1), 10) * s };
    return { body: base + digits, charge: s };
  }
  function extractCharge(body) {
    const b = body.trim();
    let m;
    const caret = b.indexOf("^");
    if (caret !== -1) {
      const c = b.slice(caret + 1).replace(/\s+/g, "");
      if ((m = /^(\d*)([+-])$/.exec(c))) return finishCharge(b.slice(0, caret), m[1], m[2]);
      if ((m = /^([+-])(\d*)$/.exec(c))) return finishCharge(b.slice(0, caret), m[2], m[1]);
      return { error: { code: "charge", msg: tr("Заряд иона записан непонятно. Пишите так: SO4^2-, SO4 2- или SO₄²⁻.", "The ion’s charge is unclear. Write it like this: SO4^2-, SO4 2- or SO₄²⁻.") } };
    }
    if ((m = /^([\s\S]*\S)\((\d*)([+-])\)$/.exec(b))) return finishCharge(m[1], m[2], m[3]);
    if ((m = /^([\s\S]*\S)\s+(\d*)([+-])$/.exec(b))) return finishCharge(m[1], m[2], m[3]);
    if ((m = /^([\s\S]*?[A-Za-zē)\]])(\d*)([+-])$/.exec(b))) return resolveTrailing(m[1], m[2], m[3]);
    return { body: b, charge: 0 };
  }

  /* ---------- разбор уравнения ---------- */
  function parseTerm(raw) {
    const t = raw.trim();
    const term = { raw: t, coef: null, nPoly: false, formula: null, disp: null, key: null, atoms: null, charge: 0, polymer: false, error: null, fix: null };
    if (!t) { term.error = { code: "emptyTerm", msg: tr("Пропущено вещество: два знака подряд или знак в начале или в конце.", "A substance is missing: two signs in a row, or a sign at the start or the end.") }; return term; }
    const m = /^(\d+)?\s*(n(?=\s*[A-Z(\[]))?\s*([\s\S]*)$/.exec(t);
    let body = m[3];
    let coefTxt = "";
    if (m[1]) {
      if (m[1][0] === "0") { term.error = { code: "coefZero", msg: tr("Коэффициент не может быть нулём или начинаться с нуля.", "A coefficient cannot be zero or start with zero.") }; term.fix = ((m[2] || "") + body) || null; return term; }
      term.coef = parseInt(m[1], 10);
      coefTxt = m[1];
    }
    if (m[2]) { term.nPoly = true; coefTxt += "n"; }
    if ((m[1] || m[2]) && !body) { term.error = { code: "coefOnly", msg: tr("После коэффициента «" + coefTxt + "» нет формулы вещества.", "There is no formula after the coefficient “" + coefTxt + "”.") }; return term; }
    const ch = extractCharge(body);
    if (ch.error) { term.error = ch.error; return term; }
    body = ch.body;
    term.charge = ch.charge;
    const chTxt = ch.charge ? "^" + chargeStr(ch.charge) : "";
    if (/^[eē]$/.test(body)) { term.error = { code: "electron", msg: tr("Электроны (полуреакции) пока не поддерживаются. Запишите уравнение целиком.", "Electrons (half-reactions) are not supported yet. Write the whole equation.") }; return term; }
    if (!body) { term.error = { code: "emptyTerm", msg: tr("Перед знаком заряда нет формулы.", "There is no formula before the charge sign.") }; return term; }
    // английское название вместо формулы: «water», «sodium chloride»
    if (!ch.charge && /^[a-z][a-z0-9 ,()'\-]*$/i.test(body) && /[a-z]{3}/.test(body)) {
      const byNameEn = substanceByName(body);
      if (byNameEn) {
        term.error = { code: "name", msg: tr("Здесь нужна формула, а не название. «" + body + "» — это " + byNameEn + ".", "A formula is needed here, not a name: “" + body + "” is " + byNameEn + ".") };
        term.fix = coefTxt + byNameEn;
        return term;
      }
    }
    if (/\s/.test(body)) {
      term.error = { code: "space", msg: tr("Внутри формулы пробел. Возможно, между веществами пропущен знак «+».", "There is a space inside the formula. Perhaps a “+” is missing between two substances.") };
      const parts = body.split(/\s+/);
      if (parts.every(function (p) { return parseFormula(stripBonds(p)).ok; })) term.fix = coefTxt + parts.join(" + ");
      return term;
    }
    if (CYR.test(body)) {
      const mapped = body.replace(/[А-Яа-яЁё]/g, function (c) { return LOOKALIKE[c] || c; });
      if (!CYR.test(mapped)) {
        const fixed = parseFormula(stripBonds(mapped)).ok ? mapped : suggestFormula(stripBonds(mapped));
        term.error = { code: "cyrillic", msg: tr("В формуле есть русские буквы. Символы элементов пишутся латиницей.", "The formula contains Cyrillic letters. Element symbols are written in Latin letters.") };
        if (fixed) term.fix = coefTxt + fixed + chTxt;
        return term;
      }
      const byName = substanceByName(body);
      if (byName) {
        term.error = { code: "name", msg: tr("Здесь нужна формула, а не название. «" + body + "» — это " + byName + ".", "A formula is needed here, not a name: “" + body + "” is " + byName + ".") };
        term.fix = coefTxt + byName;
      } else {
        term.error = { code: "cyrillic", msg: tr("Формулу нужно писать латинскими буквами, например H2O, NaCl.", "Write formulas in Latin letters, for example H2O, NaCl.") };
      }
      return term;
    }
    const core = stripBonds(body);
    const unit = polyUnit(core);
    const p = parseFormula(unit || core);
    if (!p.ok) {
      term.error = p.error;
      const sug = suggestFormula(unit || core);
      if (sug) term.fix = coefTxt + (unit ? "(" + sug + ")n" : sug) + chTxt;
      return term;
    }
    term.atoms = p.atoms;
    term.polymer = !!unit;
    term.formula = core;
    term.disp = body;
    term.key = core + chTxt;
    return term;
  }
  function parseSide(text) {
    const t = text.trim();
    if (!t || /^[?.…\s]+$/.test(t)) return { empty: true, terms: [] };
    return { empty: false, terms: splitTerms(text).map(parseTerm) };
  }
  const EMPTY_SIDE = { empty: true, terms: [] };
  function parseEquation(input) {
    const out = { input: input, arrow: null, left: EMPTY_SIDE, right: EMPTY_SIDE, errors: [], ionic: false, spectators: [] };
    const ar = placeArrows(preNormalize(input));
    if (ar.error) {
      out.errors.push(ar.error === "arrows"
        ? { code: "arrows", msg: tr("Знак реакции («=» или стрелка) должен встречаться в уравнении один раз.", "The reaction sign (“=” or an arrow) must appear in the equation exactly once.") }
        : { code: "ambiguousEq", msg: tr("Непонятно, какой из знаков «=» означает реакцию. Поставьте пробелы вокруг него или используйте стрелку →. Двойную связь пишите без пробелов: CH2=CH2.",
            "It is unclear which “=” is the reaction sign. Put spaces around it or use the arrow →. Write double bonds without spaces: CH2=CH2.") });
      return out;
    }
    const s = ar.s;
    const nArrows = (s.match(/[\u0001\u0002]/g) || []).length;
    if (nArrows > 1) {
      out.errors.push({ code: "arrows", msg: tr("Знак реакции («=» или стрелка) должен встречаться в уравнении один раз.", "The reaction sign (“=” or an arrow) must appear in the equation exactly once.") });
      return out;
    }
    if (nArrows === 1) {
      out.arrow = s.indexOf(REV) !== -1 ? "<=>" : "->";
      const parts = s.split(/[\u0001\u0002]/);
      out.left = parseSide(parts[0]);
      out.right = parseSide(parts[1]);
    } else {
      out.left = parseSide(s);
    }
    [out.left, out.right].forEach(function (side, si) {
      side.terms.forEach(function (t) { if (t.error) out.errors.push(Object.assign({ term: t.raw, side: si, fix: t.fix }, t.error)); });
    });
    if (!out.errors.length) {
      out.ionic = out.left.terms.concat(out.right.terms).some(function (t) { return t.charge !== 0; });
      const seen = {};
      [out.left, out.right].forEach(function (side, si) {
        side.terms.forEach(function (t) {
          if (seen[t.key] === undefined) { seen[t.key] = si; return; }
          if (seen[t.key] === si) {
            out.errors.push({ code: "duplicate", term: t.raw, msg: tr("Вещество " + t.disp + " записано дважды в одной части. Объедините его в одно слагаемое с коэффициентом.", "The substance " + t.disp + " appears twice on the same side. Combine it into one term with a coefficient.") });
          } else if (t.charge !== 0) {
            if (out.spectators.indexOf(t.key) === -1) out.spectators.push(t.key); // ион-«наблюдатель» в полном ионном уравнении
          } else {
            out.errors.push({ code: "duplicate", term: t.raw, msg: tr("Вещество " + t.disp + " стоит и слева, и справа. Так не бывает: исходное вещество не может быть и продуктом.", "The substance " + t.disp + " is on both sides. That is impossible: a reactant cannot also be a product.") });
          }
        });
      });
    }
    if (out.left.empty && out.right.empty && !out.errors.length) out.errors.push({ code: "emptyEq", msg: tr("Не найдено ни одной формулы.", "No formulas found.") });
    if (out.errors.length && out.errors.every(function (e) { return e.fix; })) {
      const side = function (sd) { return sd.terms.map(function (t) { return t.fix || t.raw; }).join(" + "); };
      out.fixInput = side(out.left) + (out.arrow ? (out.arrow === "<=>" ? " ⇌ " : " = ") + side(out.right) : "");
    }
    return out;
  }

  /* ---------- расстановка коэффициентов (атомы + заряд) ---------- */
  function speciesRows(L, R) {
    const species = L.map(function (t) { return { atoms: t.atoms, q: t.charge || 0, sign: 1 }; })
      .concat(R.map(function (t) { return { atoms: t.atoms, q: t.charge || 0, sign: -1 }; }));
    const els = [];
    species.forEach(function (s) { Object.keys(s.atoms).forEach(function (e) { if (els.indexOf(e) === -1) els.push(e); }); });
    const A = els.map(function (e) { return species.map(function (s) { return (s.atoms[e] || 0) * s.sign; }); });
    const hasQ = species.some(function (s) { return s.q !== 0; });
    if (hasQ) A.push(species.map(function (s) { return s.q * s.sign; }));
    return { A: A, els: els, hasQ: hasQ, n: species.length };
  }
  function balance(L, R) {
    const sr = speciesRows(L, R);
    const basis = nullspace(sr.A, sr.n);
    const res = { elements: sr.els, status: null, coefs: null };
    if (basis.length === 0) { res.status = "none"; return res; }
    if (basis.length > 1) { res.status = "multiple"; return res; }
    const ints = toIntegers(basis[0]);
    if (ints.some(function (x) { return x <= 0n; })) { res.status = "signs"; return res; }
    res.status = "unique";
    res.coefs = ints.map(Number);
    return res;
  }
  function isBalanced(L, R, coefs) {
    return speciesRows(L, R).A.every(function (row) { return row.reduce(function (s, v, i) { return s + v * coefs[i]; }, 0) === 0; });
  }
  function balanceTable(L, R, cl, cr) {
    const count = function (ts, cs) {
      const c = { "заряд": 0 };
      ts.forEach(function (t, i) {
        Object.keys(t.atoms).forEach(function (e) { c[e] = (c[e] || 0) + t.atoms[e] * cs[i]; });
        c["заряд"] += (t.charge || 0) * cs[i];
      });
      return c;
    };
    const a = count(L, cl), b = count(R, cr);
    const els = [];
    L.concat(R).forEach(function (t) { Object.keys(t.atoms).forEach(function (e) { if (els.indexOf(e) === -1) els.push(e); }); });
    const rows = els.map(function (e) { return { el: e, left: a[e] || 0, right: b[e] || 0, ok: (a[e] || 0) === (b[e] || 0) }; });
    if (L.concat(R).some(function (t) { return t.charge; })) rows.push({ el: "заряд", charge: true, left: a["заряд"], right: b["заряд"], ok: a["заряд"] === b["заряд"] });
    return rows;
  }

  /* ---------- соли, кислоты и основания → ионы (для полных ионных уравнений) ---------- */
  const SPLIT = {};
  (function () {
    const ions = Object.keys(ION_BY_KEY).map(function (k) { return ION_BY_KEY[k]; });
    const cats = ions.filter(function (i) { return i.z > 0; }), ans = ions.filter(function (i) { return i.z < 0; });
    const single = function (f) { return /^[A-Z][a-z]?$/.test(f); };
    const part = function (f, k) { return k === 1 ? f : (single(f) || f[0] === "[" ? f + k : "(" + f + ")" + k); };
    cats.forEach(function (c) {
      ans.forEach(function (a) {
        const g = igcd(c.z, a.z);
        const m = -a.z / g, n = c.z / g;
        const entry = { parts: [{ ion: c, count: m }, { ion: a, count: n }] };
        const catPart = c.base === "H" ? (m === 1 ? "H" : "H" + m) : part(c.base, m);
        const put = function (s) { if (!SPLIT[s]) SPLIT[s] = entry; };
        put(catPart + part(a.base, n));
        if (a.org) put(part(a.base, n) + catPart);
      });
    });
  })();
  function ionTerm(io, coef) { return { disp: io.f, formula: io.base, key: io.key, atoms: io.atoms, charge: io.z, coef: coef }; }
  function mergeTerms(list) {
    const out = [], at = {};
    list.forEach(function (t) {
      if (at[t.key] !== undefined) { out[at[t.key]].coef += t.coef; return; }
      at[t.key] = out.length;
      out.push(Object.assign({}, t));
    });
    return out;
  }
  // Полное ионное уравнение: всё, что в сокращённом уравнении записано молекулой, оставляем молекулой,
  // остальные вещества (растворимые сильные электролиты) раскладываем на ионы.
  function deriveFull(rx, net) {
    const molecular = {};
    net.L.concat(net.R).forEach(function (t) { if (!t.charge) molecular[t.key] = true; });
    const side = function (terms) {
      const list = [];
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        if (molecular[t.key] || t.charge) { list.push(Object.assign({}, t)); continue; }
        const sp = SPLIT[t.key];
        if (!sp) return { fail: t.disp };
        sp.parts.forEach(function (p) { list.push(ionTerm(p.ion, p.count * t.coef)); });
      }
      return { terms: mergeTerms(list) };
    };
    const L = side(rx.reactants), R = side(rx.products);
    if (L.fail || R.fail) return { fail: L.fail || R.fail };
    // проверка: после сокращения одинаковых ионов должно получиться сокращённое уравнение из базы
    const map = function (ts) { const m = {}; ts.forEach(function (t) { m[t.key] = (m[t.key] || 0) + t.coef; }); return m; };
    const a = map(L.terms), b = map(R.terms);
    Object.keys(a).forEach(function (k) { if (b[k]) { const c = Math.min(a[k], b[k]); a[k] -= c; b[k] -= c; } });
    const norm = function (m) {
      const keys = Object.keys(m).filter(function (k) { return m[k] > 0; });
      let g = 0;
      keys.forEach(function (k) { g = igcd(g, m[k]); });
      return keys.sort().map(function (k) { return m[k] / g + "·" + k; }).join(" ");
    };
    const n1 = norm(a) + " = " + norm(b);
    const n2 = norm(map(net.L)) + " = " + norm(map(net.R));
    return { L: L.terms, R: R.terms, consistent: n1 === n2 };
  }

  /* ---------- база реакций ---------- */
  function sideKey(terms) { return terms.map(function (t) { return t.key; }).sort().join(" + "); }
  function elementsOf(terms) {
    const s = new Set();
    terms.forEach(function (t) { Object.keys(t.atoms).forEach(function (e) { s.add(e); }); });
    return s;
  }
  function dbTerm(t) {
    return { disp: t.disp, formula: t.formula, key: t.key, atoms: t.atoms, charge: t.charge, coef: t.coef || 1, nPoly: t.nPoly, polymer: t.polymer };
  }
  const BASE_TOPIC = {
    "соединение": "8–9 класс · реакции соединения",
    "разложение": "8–9 класс · реакции разложения",
    "замещение": "8–9 класс · реакции замещения",
    "обмен": "8–9 класс · реакции обмена",
    "другое": "8–9 класс · другие реакции"
  };
  const ION_FOR = {};
  PACKS.forEach(function (pk) { if (pk.ionFor) Object.keys(pk.ionFor).forEach(function (k) { ION_FOR[k] = pk.ionFor[k]; }); });
  const REACTIONS = [];
  const SEEN_RX = {};
  const ION_INDEX = {};
  PACKS.forEach(function (pk) {
    (pk.reactions || []).forEach(function (r) {
      const p = parseEquation(r.eq);
      if (p.errors.length || p.left.empty || p.right.empty) { PROBLEMS.push(r.eq + ": " + (p.errors[0] ? p.errors[0].msg : "нет продуктов")); return; }
      const rx = Object.assign({}, r, {
        id: REACTIONS.length,
        topic: pk.topic || BASE_TOPIC[r.type] || "8–9 класс",
        level: pk.level || "8–9 класс",
        reversible: p.arrow === "<=>",
        reactants: p.left.terms.map(dbTerm),
        products: p.right.terms.map(dbTerm)
      });
      if (!rx.ion && ION_FOR[r.eq]) rx.ion = ION_FOR[r.eq];
      rx.en = (EN_DATA.rx || {})[r.eq] || null;
      rx.rKey = sideKey(rx.reactants);
      rx.pKey = sideKey(rx.products);
      rx.reactantElements = elementsOf(rx.reactants);
      rx.allElements = elementsOf(rx.reactants.concat(rx.products));
      rx.reactants.concat(rx.products).forEach(function (t) { if (!SUBST[t.key]) PROBLEMS.push(r.eq + ": вещества " + t.disp + " нет в справочнике"); });
      const given = rx.reactants.concat(rx.products).map(function (t) { return t.coef; });
      const b = balance(rx.reactants, rx.products);
      if (b.status === "unique") {
        if (b.coefs.join() !== given.join()) PROBLEMS.push(r.eq + ": коэффициенты не совпадают с расчётом (" + b.coefs.join(",") + ")");
      } else if (b.status === "multiple" && isBalanced(rx.reactants, rx.products, given)) {
        rx.multi = true; // коэффициенты можно расставить по-разному; в базе — общепринятый вариант
      } else {
        PROBLEMS.push(r.eq + ": уравнение не сходится (" + b.status + ")");
      }
      const dk = rx.rKey + " -> " + rx.pKey;
      if (SEEN_RX[dk]) PROBLEMS.push(r.eq + ": такая реакция уже есть в базе (" + SEEN_RX[dk].eq + ")");
      else SEEN_RX[dk] = rx;
      if (rx.ion) {
        const ip = parseEquation(rx.ion);
        if (ip.errors.length || ip.left.empty || ip.right.empty) PROBLEMS.push(r.eq + ": ошибка в ионном уравнении " + rx.ion + (ip.errors[0] ? " — " + ip.errors[0].msg : ""));
        else {
          const net = { L: ip.left.terms.map(dbTerm), R: ip.right.terms.map(dbTerm), reversible: ip.arrow === "<=>" };
          const nc = net.L.concat(net.R).map(function (t) { return t.coef; });
          if (!isBalanced(net.L, net.R, nc)) PROBLEMS.push(r.eq + ": ионное уравнение не уравнено: " + rx.ion);
          rx.ionNet = net;
          const full = deriveFull(rx, net);
          if (full.fail) PROBLEMS.push(r.eq + ": не удалось разложить на ионы " + full.fail);
          else if (!full.consistent) PROBLEMS.push(r.eq + ": ионное уравнение не сходится с молекулярным: " + rx.ion);
          else rx.ionFull = full;
          const ik = sideKey(net.L) + " -> " + sideKey(net.R);
          (ION_INDEX[ik] = ION_INDEX[ik] || []).push(rx);
        }
      }
      REACTIONS.push(rx);
    });
  });

  /* ---------- степени окисления и электронный баланс ----------
     Степени окисления считаются автоматически по школьным правилам:
     F −1; O −2; H +1 (в гидридах металлов −1); металлы IA +1, IIA +2, Al +3, Zn +2, Ag +1;
     соли раскладываются на ионы из таблицы ионов; последний неизвестный элемент
     находится из того, что сумма степеней окисления равна заряду частицы.
     Для органических веществ степени окисления каждого атома углерода
     заданы в данных (ATOMIX_CHEM_DATA.oxidation), иначе берётся средняя. */
  const NONMETALS = new Set("H He B C N O F Ne Si P S Cl Ar As Se Br Kr Te I Xe At Rn".split(" "));
  const FIXED_OX = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2, Al: 3, Zn: 2, Cd: 2, Ag: 1 };
  const NEG_OX = { F: -1, Cl: -1, Br: -1, I: -1, O: -2, S: -2, Se: -2, Te: -2, N: -3, P: -3, As: -3, C: -4, Si: -4, B: -3 };
  const EN = { F: 3.98, O: 3.44, Cl: 3.16, N: 3.04, Br: 2.96, I: 2.66, S: 2.58, C: 2.55, Se: 2.55, H: 2.2, P: 2.19, As: 2.18, Te: 2.1, B: 2.04, Si: 1.9 };

  // рациональные числа [числитель, знаменатель] — для средних степеней окисления вроде +8/3
  function rat(n, d) {
    if (d === undefined) d = 1;
    if (d < 0) { n = -n; d = -d; }
    const g = igcd(n, d) || 1;
    return [n / g, d / g];
  }
  function rkey(r) { return r[1] === 1 ? String(r[0]) : r[0] + "/" + r[1]; }
  function rparse(k) { const p = String(k).split("/"); return rat(Number(p[0]), p[1] ? Number(p[1]) : 1); }
  function rsumGroups(groups) { // Σ n·v
    let n = 0, d = 1;
    groups.forEach(function (g) { const a = g.n * g.v[0], b = g.v[1]; n = n * b + a * d; d = d * b; const q = igcd(n, d) || 1; n /= q; d /= q; });
    return rat(n, d);
  }

  const OX_OVR = {};
  Object.keys(data.oxidation || {}).forEach(function (f) {
    let key = stripBonds(f);
    const unit = polyUnit(key);
    if (unit) key = unit;
    const preset = {};
    String(data.oxidation[f]).split(";").forEach(function (part) {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return;
      const list = [];
      bits.slice(1).forEach(function (x) {
        const m = /^(.+?)(?:\*(\d+))?$/.exec(x.replace("−", "-"));
        for (let i = 0; i < Number(m[2] || 1); i++) list.push(rparse(m[1]));
      });
      preset[bits[0]] = list;
    });
    OX_OVR[key] = preset;
  });

  function addGroup(res, el, v, n) {
    const list = res[el] = res[el] || [];
    const k = rkey(v);
    const g = list.find(function (x) { return rkey(x.v) === k; });
    if (g) g.n += n; else list.push({ v: v, n: n });
  }
  function solveRules(atoms, charge, preset) {
    const res = {};
    const els = Object.keys(atoms);
    Object.keys(preset || {}).forEach(function (el) {
      if (!atoms[el] || preset[el].length !== atoms[el]) throw { ox: true, msg: "у элемента " + el + " указано " + preset[el].length + " степеней окисления, а атомов " + (atoms[el] || 0) };
      preset[el].forEach(function (v) { addGroup(res, el, v, 1); });
    });
    const rest = els.filter(function (e) { return !res[e]; });
    if (els.length === 1 && rest.length === 1) { addGroup(res, els[0], rat(charge, atoms[els[0]]), atoms[els[0]]); return res; }
    const hasO = !!atoms.O, hasF = !!atoms.F;
    const onlyMetals = els.filter(function (e) { return e !== "H"; }).every(function (e) { return !NONMETALS.has(e); });
    let unknown = [];
    rest.forEach(function (e) {
      let v = null;
      if (e === "F") v = -1;
      else if (e === "O" && !hasF) v = -2;
      else if (e === "H") v = onlyMetals ? -1 : 1;
      else if (FIXED_OX[e] !== undefined) v = FIXED_OX[e];
      if (v === null) unknown.push(e); else addGroup(res, e, rat(v), atoms[e]);
    });
    while (unknown.length > 1) {
      if (hasO || hasF) return null;
      const cand = unknown.filter(function (e) { return NEG_OX[e] !== undefined; }).sort(function (a, b) { return (EN[b] || 0) - (EN[a] || 0); });
      if (!cand.length) return null;
      addGroup(res, cand[0], rat(NEG_OX[cand[0]]), atoms[cand[0]]);
      unknown = unknown.filter(function (e) { return e !== cand[0]; });
    }
    let known = [0, 1];
    Object.keys(res).forEach(function (e) { const s = rsumGroups(res[e]); known = rat(known[0] * s[1] + s[0] * known[1], known[1] * s[1]); });
    if (unknown.length === 1) {
      const e = unknown[0];
      const left = rat(charge * known[1] - known[0], known[1]);
      addGroup(res, e, rat(left[0], left[1] * atoms[e]), atoms[e]);
    } else if (known[1] !== 1 || known[0] !== charge) {
      throw { ox: true, msg: "сумма степеней окисления " + rkey(known) + " не равна заряду " + charge };
    }
    return res;
  }

  const OX_MEMO = {};
  // Возвращает { groups: {элемент: [{v, n}]}, cExact } или null, если степени окисления определить не удалось
  function oxStates(formula, charge) {
    const memoKey = formula + "^" + charge;
    if (OX_MEMO[memoKey] !== undefined) return OX_MEMO[memoKey];
    let out = null;
    try {
      if (OX_OVR[formula]) {
        const g = solveRules(parseFormulaStrict(formula), charge, OX_OVR[formula]);
        if (g) out = { groups: g, cExact: true };
      } else if (formula.indexOf("·") !== -1) {
        const res = {};
        let exact = true, ok = true;
        formula.split("·").forEach(function (part, i) {
          let mult = 1, f = part;
          const m = /^(\d+)(.+)$/.exec(part);
          if (i > 0 && m) { mult = Number(m[1]); f = m[2]; }
          const s = oxStates(f, 0);
          if (!s) { ok = false; return; }
          if (!s.cExact) exact = false;
          Object.keys(s.groups).forEach(function (el) { s.groups[el].forEach(function (gr) { addGroup(res, el, gr.v, gr.n * mult); }); });
        });
        if (ok) out = { groups: res, cExact: exact };
      }
      if (!out && charge === 0 && SPLIT[formula]) {
        const res = {};
        let exact = true, ok = true;
        SPLIT[formula].parts.forEach(function (p) {
          const s = oxStates(p.ion.base, p.ion.z);
          if (!s) { ok = false; return; }
          if (!s.cExact) exact = false;
          Object.keys(s.groups).forEach(function (el) { s.groups[el].forEach(function (gr) { addGroup(res, el, gr.v, gr.n * p.count); }); });
        });
        if (ok) out = { groups: res, cExact: exact };
      }
      if (!out) {
        const atoms = parseFormulaStrict(formula);
        const g = solveRules(atoms, charge, null);
        if (g) out = { groups: g, cExact: (atoms.C || 0) <= 1 };
      }
    } catch (e) {
      if (e && e.ox) { PROBLEMS.push("степени окисления " + formula + ": " + e.msg); out = null; }
      else throw e;
    }
    OX_MEMO[memoKey] = out;
    return out;
  }
  Object.keys(OX_OVR).forEach(function (k) {
    const io = Object.keys(ION_BY_KEY).map(function (x) { return ION_BY_KEY[x]; }).find(function (x) { return x.base === k; });
    oxStates(k, io ? io.z : 0);
  });
  function termOx(t) {
    const unit = polyUnit(t.formula);
    return oxStates(unit || t.formula, t.charge || 0);
  }

  function supOx(v) { // +2, −1, 0, +8/3
    if (v[0] === 0) return "0";
    return (v[0] > 0 ? "+" : "−") + Math.abs(v[0]) + (v[1] === 1 ? "" : "/" + v[1]);
  }
  // Электронный баланс для уравнения (коэффициенты берутся из terms[i].coef или из coefs)
  function electronBalance(L, R, coefs, opts) {
    const sideData = function (terms, offset) {
      const det = {}, per = {}, avg = {}, src = {};
      let cInexact = false;
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        const s = termOx(t);
        if (!s) return null;
        const k = coefs ? coefs[offset + i] : (t.coef || 1);
        if (s.groups.C && !s.cExact) cInexact = true;
        Object.keys(s.groups).forEach(function (el) {
          const groups = s.groups[el];
          const n = groups.reduce(function (a, g) { return a + g.n; }, 0);
          const sum = rsumGroups(groups);
          const av = rat(sum[0], sum[1] * n);
          const add = function (map, v, cnt) { map[el] = map[el] || {}; map[el][rkey(v)] = (map[el][rkey(v)] || 0) + cnt; };
          groups.forEach(function (g) {
            add(per, g.v, g.n * k);
            src[el] = src[el] || {};
            (src[el][rkey(g.v)] = src[el][rkey(g.v)] || []).push(t);
            if (el !== "C") add(det, g.v, g.n * k);
          });
          add(avg, av, n * k);
          src[el]["avg:" + rkey(av)] = (src[el]["avg:" + rkey(av)] || []).concat([t]);
          if (el === "C") add(det, av, n * k);
        });
      }
      return { det: det, per: per, avg: avg, src: src, cInexact: cInexact };
    };
    const A = sideData(L, 0), B = sideData(R, L.length);
    if (!A || !B) return null;
    const same = function (x, y) {
      x = x || {}; y = y || {};
      const ks = Object.keys(x).concat(Object.keys(y));
      return ks.every(function (k) { return (x[k] || 0) === (y[k] || 0); });
    };
    // Реакция окислительно-восстановительная, если меняется степень окисления не только углерода.
    // Перестройки углеродного скелета (изомеризация, гидратация, этерификация, алкилирование)
    // по школьной традиции к ОВР не относят, хотя степени окисления отдельных атомов C там «перетекают».
    const changedPer = function (el) { return !same(A.per[el], B.per[el]); };
    const changedAvg = function (el) { return !same(A.avg[el], B.avg[el]); };
    const others = Object.keys(A.det).filter(function (el) { return el !== "C" && changedPer(el); });
    if (!others.length && !(opts && opts.forceCarbon && A.det.C && changedAvg("C"))) return { redox: false };
    const els = others.slice();
    if (A.det.C && (changedAvg("C") || (!A.cInexact && !B.cInexact && changedPer("C")))) els.unshift("C");

    const lines = [];
    let failed = null;
    els.forEach(function (el) {
      const tryBuild = function (mode, allowPair) {
        const lm = Object.assign({}, A[mode][el]), rm = Object.assign({}, B[mode][el]);
        Object.keys(lm).forEach(function (k) { if (rm[k]) { const c = Math.min(lm[k], rm[k]); lm[k] -= c; rm[k] -= c; } });
        const clean = function (m) { return Object.keys(m).filter(function (k) { return m[k] > 0; }).map(function (k) { return { v: rparse(k), k: k, n: m[k] }; }).sort(function (a, b) { return a.v[0] / a.v[1] - b.v[0] / b.v[1]; }); };
        const l = clean(lm), r = clean(rm);
        const val = function (x) { return x.v[0] / x.v[1]; };
        const total = function (arr) { return arr.reduce(function (a, x) { return a + x.n; }, 0); };
        if (!l.length || total(l) !== total(r)) return null;
        const srcKey = function (k) { return mode === "avg" ? "avg:" + k : k; };
        const mk = function (left, right) { return { el: el, left: left, right: right, srcL: A.src[el], srcR: B.src[el], srcKey: srcKey }; };
        if (l.length === 1) return r.map(function (x) { return mk([{ v: l[0].v, k: l[0].k, n: x.n }], [x]); });
        if (r.length === 1) return l.map(function (x) { return mk([x], [{ v: r[0].v, k: r[0].k, n: x.n }]); });
        if (val(r[0]) > val(l[l.length - 1]) || val(r[r.length - 1]) < val(l[0])) return [mk(l, r)];
        // обе части смешанные (H2S + H2SO4 → S + SO2): ставим атомы по порядку — низшая к низшей
        if (!allowPair) return null;
        const expand = function (arr) { const o = []; arr.forEach(function (x) { for (let i = 0; i < x.n; i++) o.push(x); }); return o; };
        const el1 = expand(l), er1 = expand(r), pairs = {};
        el1.forEach(function (x, i) { const key = x.k + ">" + er1[i].k; pairs[key] = pairs[key] || { a: x, b: er1[i], n: 0 }; pairs[key].n++; });
        return Object.keys(pairs).map(function (key) { const p = pairs[key]; return mk([{ v: p.a.v, k: p.a.k, n: p.n }], [{ v: p.b.v, k: p.b.k, n: p.n }]); });
      };
      let built = null;
      const useAvg = el === "C" && (A.cInexact || B.cInexact);
      if (!useAvg) built = tryBuild("per", el !== "C");
      if (!built) built = tryBuild("avg", true);
      if (!built) { failed = "не удалось составить полуреакции для " + el; return; }
      built.forEach(function (ln) { lines.push(ln); });
    });
    if (failed) return { redox: true, error: failed };

    // электроны, наименьшие полуреакции и множители
    let sumOx = 0, sumRed = 0;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const sl = rsumGroups(ln.left), sr = rsumGroups(ln.right);
      const diff = rat(sl[0] * sr[1] - sr[0] * sl[1], sl[1] * sr[1]);
      if (diff[1] !== 1 || diff[0] === 0) return { redox: true, error: "дробное число электронов у " + ln.el };
      ln.kind = diff[0] > 0 ? "red" : "ox"; // степень окисления выросла — окисление
      const eTotal = Math.abs(diff[0]);
      // индекс простого вещества: O₂, H₂, Cl₂ — чтобы писать «O₂⁰ + 4e⁻ → 2O⁻²»
      const unitOf = function (state, srcMap) {
        const list = srcMap[ln.srcKey(state.k)] || [];
        if (list.length && list.every(function (t) { return Object.keys(t.atoms).length === 1 && !t.charge; })) {
          const idx = list[0].atoms[ln.el];
          if (list.every(function (t) { return t.atoms[ln.el] === idx; })) return idx;
        }
        return 1;
      };
      const all = ln.left.map(function (x) { return { s: x, u: unitOf(x, ln.srcL) }; }).concat(ln.right.map(function (x) { return { s: x, u: unitOf(x, ln.srcR) }; }));
      all.forEach(function (a) { if (a.s.n % a.u) a.u = 1; });
      let k = 0;
      all.forEach(function (a) { k = igcd(k, a.s.n / a.u); });
      while (k > 1 && (eTotal % k || all.some(function (a) { return (a.s.n / a.u) % k; }))) k--;
      ln.mult = k;
      ln.e = eTotal / k;
      ln.leftShow = all.slice(0, ln.left.length).map(function (a) { return { el: ln.el, v: a.s.v, coef: a.s.n / k / a.u, index: a.u }; });
      ln.rightShow = all.slice(ln.left.length).map(function (a) { return { el: ln.el, v: a.s.v, coef: a.s.n / k / a.u, index: a.u }; });
      ln.sources = [];
      ln.left.forEach(function (x) { (ln.srcL[ln.srcKey(x.k)] || []).forEach(function (t) { if (ln.sources.indexOf(t) === -1) ln.sources.push(t); }); });
      if (ln.kind === "ox") sumOx += eTotal; else sumRed += eTotal;
    }
    if (sumOx !== sumRed) return { redox: true, error: "отдано " + sumOx + " электронов, принято " + sumRed };
    const pick = function (kind) {
      const out = [];
      lines.forEach(function (ln) { if (ln.kind !== kind) return; ln.sources.forEach(function (t) { if (out.indexOf(t) === -1) out.push(t); }); });
      return out;
    };
    lines.sort(function (a, b) { return (a.kind === "ox" ? 0 : 1) - (b.kind === "ox" ? 0 : 1); });
    return {
      redox: true,
      electrons: sumOx,
      lines: lines.map(function (ln) {
        return { el: ln.el, kind: ln.kind, e: ln.e, mult: ln.mult, left: ln.leftShow, right: ln.rightShow, sources: ln.sources };
      }),
      reducers: pick("ox"),
      oxidizers: pick("red")
    };
  }
  REACTIONS.forEach(function (rx) {
    const tagged = (rx.tags || []).indexOf("ОВР") !== -1;
    const eb = electronBalance(rx.reactants, rx.products, null, { forceCarbon: tagged });
    if (!eb) { if (tagged) PROBLEMS.push(rx.eq + ": не удалось определить степени окисления"); return; }
    if (eb.error) { PROBLEMS.push(rx.eq + ": электронный баланс — " + eb.error); return; }
    if (!eb.redox) { if (tagged) PROBLEMS.push(rx.eq + ": помечена как ОВР, но степени окисления не меняются"); return; }
    rx.redox = eb;
    if (!tagged) rx.autoRedox = true;
  });

  if (PROBLEMS.length) console.warn("ATOMIX: проблемы в базе реакций (" + PROBLEMS.length + "):\n" + PROBLEMS.join("\n"));

  // вещество пользователя → вещество из справочника (C2H6O → C2H5OH, если формула однозначна)
  function compositionList(key) { const s = SUBST[key]; return s && !s.polymer ? (BY_COMP[compKey(s.atoms)] || []) : []; }
  function resolveKey(t) {
    if (t.charge || SUBST[t.key]) return { key: t.key };
    if (ALIAS[t.key]) {
      const k = ALIAS[t.key];
      return { key: k, via: k, isomers: compositionList(k).filter(function (x) { return x !== k; }) };
    }
    if (t.polymer) return { key: t.key };
    const list = BY_COMP[compKey(t.atoms)];
    if (list && list.length === 1) return { key: list[0], via: list[0] };
    if (list && list.length > 1) return { key: t.key, ambiguous: list };
    return { key: t.key };
  }

  function formalType(L, R) {
    const simple = function (t) { return isSimple(t.atoms); };
    if (L.length >= 2 && R.length === 1) return "соединение";
    if (L.length === 1 && R.length >= 2) return "разложение";
    if (L.length === 2 && R.length === 2) {
      const ls = L.filter(simple).length, rs = R.filter(simple).length;
      if (ls === 1 && rs === 1) return "замещение";
      if (ls === 0 && rs === 0) return "обмен";
    }
    return null;
  }
  function reactionsWithReactants(rKey) { return REACTIONS.filter(function (r) { return r.rKey === rKey; }); }
  function reactionsWithProducts(keys) {
    return REACTIONS.filter(function (r) { return keys.every(function (k) { return r.products.some(function (p) { return p.key === k; }); }); });
  }

  /* ---------- главный анализ того, что ввёл пользователь ---------- */
  function analyze(input) {
    if (!String(input).trim()) return { kind: "empty" };
    const p = parseEquation(input);
    if (p.errors.length) return { kind: "syntax", errors: p.errors, fixInput: p.fixInput || null, parsed: p };

    const notes = [], warnings = [];
    const prep = function (t) {
      const r = resolveKey(t);
      t.key = r.key;
      // заметку показываем, если формулу сопоставили по составу или у неё есть изомеры в справочнике
      if (r.via && r.via !== t.formula && (!r.isomers || r.isomers.length)) {
        let msg = tr("Формулу " + t.disp + " мы прочитали как ", "We read the formula " + t.disp + " as ") + SUBST[r.via].f + " (" + substName(SUBST[r.via]) + ").";
        if (r.isomers && r.isomers.length) msg += tr(" Такой же состав у других веществ: ", " Other substances have the same composition: ") + r.isomers.map(function (k) { return substName(SUBST[k]) + " (" + SUBST[k].f + ")"; }).join(", ") +
          tr(". Если вы имели в виду другое вещество, напишите его формулу.", ". If you meant another substance, type its formula.");
        notes.push(msg);
      }
      if (r.ambiguous) {
        warnings.push({ msg: tr("Формуле " + t.disp + " соответствует несколько веществ из справочника — это изомеры. Какое вы имели в виду?", "The formula " + t.disp + " matches several substances in the database — they are isomers. Which one did you mean?"), from: t.disp,
          choices: r.ambiguous.map(function (k) { return { to: SUBST[k].f, label: substName(SUBST[k]) }; }) });
      } else if (!t.charge && !SUBST[t.key] && !t.polymer) {
        // мягкое предупреждение: Co (кобальт) вместо CO (угарный газ) и т. п.
        const alt = caseVariants(t.formula).filter(function (v) { return v !== t.formula && known(v); })[0];
        if (alt) {
          const ak = SUBST[alt] ? alt : ALIAS[alt];
          const els = Object.keys(t.atoms).map(function (e) { return e + " — " + elName(e).toLowerCase(); }).join(", ");
          warnings.push({ msg: tr("В записи " + t.disp + ": " + els + ". Может быть, вы имели в виду ", "In " + t.disp + ": " + els + ". Did you mean ") + SUBST[ak].f + " (" + substName(SUBST[ak]) + ")?", from: t.disp, choices: [{ to: SUBST[ak].f, label: SUBST[ak].f }] });
        }
      }
      return t;
    };
    const L = p.left.terms.map(prep), R = p.right.terms.map(prep);

    if (p.ionic) return analyzeIonic(p, L, R, notes, warnings);

    // указаны только исходные вещества: «Zn + HCl» или «Zn + HCl = ?»
    if (R.length === 0) return { kind: "reactants", terms: L, matches: reactionsWithReactants(sideKey(L)), warnings: warnings, notes: notes };
    // указаны только продукты: «= H2O»
    if (L.length === 0) return { kind: "products", terms: R, matches: reactionsWithProducts(R.map(function (t) { return t.key; })), warnings: warnings, notes: notes };

    const out = { kind: "equation", L: L, R: R, arrow: p.arrow, warnings: warnings, notes: notes };
    const le = elementsOf(L), re = elementsOf(R);
    out.leftOnly = Array.from(le).filter(function (e) { return !re.has(e); });
    out.rightOnly = Array.from(re).filter(function (e) { return !le.has(e); });

    const userCoefs = L.concat(R).map(function (t) { return t.coef || 1; });
    out.userGiven = L.concat(R).some(function (t) { return t.coef !== null; });
    out.userTable = balanceTable(L, R, userCoefs.slice(0, L.length), userCoefs.slice(L.length));
    out.userBalanced = out.userTable.every(function (r) { return r.ok; });

    if (!out.leftOnly.length && !out.rightOnly.length) {
      const b = balance(L, R);
      out.balanceStatus = b.status;
      if (b.status === "unique") {
        out.coefs = b.coefs;
        out.table = balanceTable(L, R, b.coefs.slice(0, L.length), b.coefs.slice(L.length));
        out.redox = electronBalance(L, R, b.coefs);
        if (out.userBalanced && out.userGiven) {
          const k = userCoefs[0] / b.coefs[0];
          out.userMultiple = k > 1 && Number.isInteger(k) ? k : null;
        }
      }
    } else {
      out.balanceStatus = "elements";
    }

    const rKey = sideKey(L), pKey = sideKey(R);
    out.match = REACTIONS.find(function (r) { return r.rKey === rKey && r.pKey === pKey; }) || null;
    out.reverse = out.match ? null : (REACTIONS.find(function (r) { return r.rKey === pKey && r.pKey === rKey; }) || null);
    out.sameReactants = reactionsWithReactants(rKey).filter(function (r) { return r !== out.match; });
    out.formalType = formalType(L, R);
    // коэффициенты не определяются однозначно, но реакция есть в базе — берём общепринятые из базы
    if (out.match && out.balanceStatus === "multiple") {
      const dbc = {};
      out.match.reactants.concat(out.match.products).forEach(function (t) { dbc[t.key] = t.coef; });
      out.coefs = L.concat(R).map(function (t) { return dbc[t.key]; });
      out.table = balanceTable(L, R, out.coefs.slice(0, L.length), out.coefs.slice(L.length));
      out.dbCoefs = true;
    }
    return out;
  }

  // Ионное уравнение: «Ba2+ + SO4 2- = BaSO4» или полное — с ионами-наблюдателями в обеих частях
  function analyzeIonic(p, L, R, notes, warnings) {
    const out = { kind: "ionic", L: L, R: R, arrow: p.arrow, notes: notes, warnings: warnings, spectators: p.spectators.slice() };
    const sp = {};
    out.spectators.forEach(function (k) { sp[k] = true; });
    const nL = L.filter(function (t) { return !sp[t.key]; }), nR = R.filter(function (t) { return !sp[t.key]; });
    out.netL = nL;
    out.netR = nR;
    if (!R.length) {
      const lk = sideKey(nL);
      out.onlyLeft = true;
      out.matches = REACTIONS.filter(function (rx) { return rx.ionNet && sideKey(rx.ionNet.L) === lk; });
      return out;
    }
    const userCoefs = L.concat(R).map(function (t) { return t.coef || 1; });
    out.userGiven = L.concat(R).some(function (t) { return t.coef !== null; });
    out.userTable = balanceTable(L, R, userCoefs.slice(0, L.length), userCoefs.slice(L.length));
    out.userBalanced = out.userTable.every(function (r) { return r.ok; });
    if (!nL.length || !nR.length) { out.balanceStatus = "empty"; out.matches = []; out.reverseMatches = []; return out; }
    const le = elementsOf(nL), re = elementsOf(nR);
    out.leftOnly = Array.from(le).filter(function (e) { return !re.has(e); });
    out.rightOnly = Array.from(re).filter(function (e) { return !le.has(e); });
    if (out.leftOnly.length || out.rightOnly.length) out.balanceStatus = "elements";
    else {
      const b = balance(nL, nR);
      out.balanceStatus = b.status;
      if (b.status === "unique") {
        out.coefs = b.coefs;
        out.table = balanceTable(nL, nR, b.coefs.slice(0, nL.length), b.coefs.slice(nL.length));
      }
    }
    out.matches = ION_INDEX[sideKey(nL) + " -> " + sideKey(nR)] || [];
    out.reverseMatches = ION_INDEX[sideKey(nR) + " -> " + sideKey(nL)] || [];
    return out;
  }

  /* ---------- поиск реакций по выбранным элементам ---------- */
  function searchByElements(symbols) {
    const S = new Set(symbols);
    const groups = { direct: [], pure: [], other: [] };
    if (!S.size) return groups;
    REACTIONS.forEach(function (r) {
      if (!symbols.every(function (s) { return r.reactantElements.has(s); })) return;
      const sameSet = function (set) { return set.size === S.size && symbols.every(function (s) { return set.has(s); }); };
      if (r.reactants.every(function (t) { return isSimple(t.atoms); }) && sameSet(r.reactantElements)) groups.direct.push(r);
      else if (sameSet(r.allElements)) groups.pure.push(r);
      else groups.other.push(r);
    });
    groups.other.sort(function (a, b) { return a.allElements.size - b.allElements.size || a.id - b.id; });
    return groups;
  }

  /* ---------- каталог по темам ---------- */
  function topics() {
    const order = [], map = {};
    REACTIONS.forEach(function (rx) {
      if (!map[rx.topic]) { map[rx.topic] = { topic: rx.topic, level: rx.level, reactions: [] }; order.push(map[rx.topic]); }
      map[rx.topic].reactions.push(rx);
    });
    return order;
  }

  /* ---------- подсказки при вводе ---------- */
  const ELEMENT_ITEMS = SYMS.map(function (s) { return { f: s, name: EL_NAME[s], nameEn: EL_NAME_EN[s] }; });
  function suggest(query, limit) {
    limit = limit || 8;
    const raw = String(query || "").replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 0x2080); }).trim();
    const q = CYR.test(raw) ? raw : stripBonds(raw); // в названиях дефис нужен: «сульфат-ион»
    if (!q) return [];
    const items = [];
    const seen = {};
    const push = function (f, name, kind, score) {
      if (seen[f] !== undefined) { if (score < items[seen[f]].score) items[seen[f]].score = score; return; }
      seen[f] = items.length;
      items.push({ formula: f, name: name, kind: kind, score: score });
    };
    if (CYR.test(q)) {
      const nq = normName(q);
      NAME_INDEX.forEach(function (x) {
        const s = SUBST[x.key];
        const label = substName(s) + (isEn() || normName(s.n) !== x.name ? " — " + x.name : "");
        if (x.name.indexOf(nq) === 0) push(s.f, label, "substance", x.name.length / 100);
        else if (x.name.split(/[\s(,-]/).some(function (w) { return w.indexOf(nq) === 0; })) push(s.f, label, "substance", 1 + x.name.length / 100);
      });
      ELEMENT_ITEMS.forEach(function (e) {
        if (normName(e.name).indexOf(nq) !== 0) return;
        const simple = SIMPLE_OF[e.f];
        if (simple) push(SUBST[simple].f, substName(SUBST[simple]) + tr(" (простое вещество)", " (elemental substance)"), "substance", 0.5);
        else push(e.f, elName(e.f) + tr(" (элемент)", " (element)"), "element", 2);
      });
      Object.keys(ION_BY_KEY).forEach(function (k) {
        const io = ION_BY_KEY[k];
        const nn = normName(io.n);
        if (nn.indexOf(nq) === 0 && nq.length > 3 && nq.indexOf("ион") !== -1) push(io.f + chargeSup(io.z), ionName(io), "ion", -0.5);
        else if (nn.split(/[\s-]/).some(function (w) { return w.indexOf(nq) === 0; })) push(io.f + chargeSup(io.z), ionName(io), "ion", 3 + io.n.length / 100);
      });
    } else {
      const ql = q.toLowerCase();
      Object.keys(SUBST).forEach(function (k) {
        const s = SUBST[k];
        if (k === q) push(s.f, substName(s), "substance", -1);
        else if (k.indexOf(q) === 0) push(s.f, substName(s), "substance", k.length / 100);
        else if (k.toLowerCase().indexOf(ql) === 0) push(s.f, substName(s), "substance", 1 + k.length / 100);
      });
      Object.keys(ALIAS).forEach(function (a) {
        const s = SUBST[ALIAS[a]];
        if (a === q) push(s.f, substName(s), "substance", -0.5);
        else if (a.indexOf(q) === 0) push(s.f, substName(s), "substance", 0.4 + a.length / 100);
      });
      ELEMENT_ITEMS.forEach(function (e) {
        if (SUBST[e.f]) return;
        if (e.f === q) push(e.f, elName(e.f) + tr(" (элемент)", " (element)"), "element", 0.2);
        else if (e.f.toLowerCase().indexOf(ql) === 0) push(e.f, elName(e.f) + tr(" (элемент)", " (element)"), "element", 1.5);
      });
      Object.keys(ION_BY_KEY).forEach(function (k) {
        const io = ION_BY_KEY[k];
        if (io.base.indexOf(q) === 0) push(io.f + chargeSup(io.z), ionName(io), "ion", 2 + io.base.length / 100);
      });
      // английские названия: «wat» → вода, «sodium ch» → хлорид натрия (после совпадений по формуле)
      if (/^[a-z][a-z ,()'\-]*$/i.test(raw) && raw.length >= 2) {
        const nq = normName(raw);
        NAME_INDEX_EN.forEach(function (x) {
          const s = SUBST[x.key];
          const label = substName(s) + (!isEn() || normName(s.en || "") !== x.name ? " — " + x.name : "");
          if (x.name.indexOf(nq) === 0) push(s.f, label, "substance", 1.2 + x.name.length / 100);
          else if (nq.length >= 3 && x.name.split(/[\s(,-]/).some(function (w) { return w.indexOf(nq) === 0; })) push(s.f, label, "substance", 2.2 + x.name.length / 100);
        });
        ELEMENT_ITEMS.forEach(function (e) {
          if (nq.length < 3 || normName(e.nameEn).indexOf(nq) !== 0) return;
          const simple = SIMPLE_OF[e.f];
          if (simple) push(SUBST[simple].f, substName(SUBST[simple]) + tr(" (простое вещество)", " (elemental substance)"), "substance", 1.1);
          else push(e.f, elName(e.f) + tr(" (элемент)", " (element)"), "element", 2.5);
        });
        Object.keys(ION_BY_KEY).forEach(function (k) {
          const io = ION_BY_KEY[k];
          if (nq.length >= 3 && io.en && normName(io.en).split(/[\s-]/).some(function (w) { return w.indexOf(nq) === 0; })) push(io.f + chargeSup(io.z), ionName(io), "ion", 3 + io.en.length / 100);
        });
      }
      // «nacl» → «NaCl»: если ничего не нашлось, пробуем прочитать регистр иначе
      if (!items.length) caseVariants(q).forEach(function (v) { const k = SUBST[v] ? v : ALIAS[v]; if (k) push(SUBST[k].f, substName(SUBST[k]), "substance", 0.8); });
    }
    items.sort(function (a, b) { return a.score - b.score || a.formula.length - b.formula.length || a.formula.localeCompare(b.formula); });
    return items.slice(0, limit);
  }

  return {
    parseFormula: parseFormula,
    parseEquation: parseEquation,
    balance: balance,
    analyze: analyze,
    searchByElements: searchByElements,
    suggest: suggest,
    suggestFormula: suggestFormula,
    topics: topics,
    nameOf: nameOf,
    molarMass: molarMass,
    chargeSup: chargeSup,
    elementName: elName,
    // тексты реакции на текущем языке: описание, условия, уточнение типа
    rxText: function (rx) {
      const e = isEn() && rx.en;
      return { desc: e ? e.d : rx.desc, cond: e ? (e.c || "") : (rx.cond || ""), note: e ? (e.n || "") : (rx.note || "") };
    },
    typeName: function (t) { return isEn() ? (EN_DATA.types || {})[t] || t : t; },
    tagName: function (t) { return isEn() ? (EN_DATA.tags || {})[t] || t : t; },
    topicName: function (t) { return isEn() ? (EN_DATA.topics || {})[t] || t : t; },
    levelName: function (t) { return isEn() ? (EN_DATA.levels || {})[t] || t : t; },
    isSymbol: function (s) { return SYMSET.has(s); },
    reactions: REACTIONS,
    electronBalance: electronBalance,
    oxText: supOx,
    problems: PROBLEMS,
    substanceCount: Object.keys(SUBST).length,
    ionCount: Object.keys(ION_BY_KEY).length,
    ionicCount: REACTIONS.filter(function (r) { return r.ionNet; }).length
  };
}

global.AtomixChem = { create: create, normalizeText: preNormalize, stripBonds: stripBonds, chargeSup: chargeSup };
})(typeof window !== "undefined" ? window : globalThis);

/* ############################################################
   7. Интерфейс составителя уравнений (был <script id="equation-ui">)
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ИНТЕРФЕЙС СОСТАВИТЕЛЯ УРАВНЕНИЙ
   Только работа со страницей: кнопки, поле ввода, подсказки,
   выбор элементов в таблице и вывод результата.
   Вся химия — в AtomixChem (chem-core), данные — в ATOMIX_CHEM_DATA.
   ============================================================ */
(function () {
"use strict";
const T = window.AtomixTable, D = window.ATOMIX_CHEM_DATA;
if (!T || !D || !window.AtomixChem) return;
const chem = window.AtomixChem.create(D, T);
const I18N = window.AtomixI18n;
const tr = I18N.tr;

const $ = function (id) { return document.getElementById(id); };
const grid = $("grid");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function smooth() { return reduceMotion.matches ? "auto" : "smooth"; }

/* ---------- отображение формул ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
// H2O → H<sub>2</sub>O; в «·5H2O» пятёрка — коэффициент, поэтому обычного размера;
// одинарная связь «-» рисуется тире, «=» и «≡» остаются как есть; заряд иона — надстрочный
function fHTML(f, charge) {
  let out = "", prev = "";
  for (let i = 0; i < f.length;) {
    if (/\d/.test(f[i])) {
      let j = i;
      while (j < f.length && /\d/.test(f[j])) j++;
      const num = f.slice(i, j);
      out += /[A-Za-z)\]]/.test(prev) ? "<sub>" + num + "</sub>" : num;
      prev = f[j - 1];
      i = j;
      continue;
    }
    out += f[i] === "-" ? '<span class="bond">–</span>' : esc(f[i]);
    prev = f[i];
    i++;
  }
  if (charge) out += "<sup>" + chargeText(charge) + "</sup>";
  return '<span class="fm">' + out + "</span>";
}
function chargeText(z) { const a = Math.abs(z); return (a === 1 ? "" : a) + (z > 0 ? "+" : "−"); }
function tDisp(t) { return t.disp || t.formula; }
function coefText(c, t) { return (c && c !== 1 ? c : "") + (t && t.nPoly ? "n" : ""); }
function termHTML(coef, t) {
  const c = coefText(coef, t);
  return (c ? '<span class="cf">' + c + "</span>" : "") + fHTML(tDisp(t), t.charge);
}
function sideHTML(terms, coefs) {
  // <wbr> — место, где длинное уравнение может перенестись на телефоне
  return terms.map(function (t, i) { return termHTML(coefs ? coefs[i] : t.coef, t); }).join('<span class="pl">+</span><wbr>');
}
function eqHTML(L, R, arrow, cl, cr) {
  return '<span class="eqv">' + sideHTML(L, cl) + '<span class="arr">' + (arrow === "<=>" ? "⇌" : "→") + "</span><wbr>" + sideHTML(R, cr) + "</span>";
}
function rxHTML(rx) { return eqHTML(rx.reactants, rx.products, rx.reversible ? "<=>" : "->"); }
function plainTerm(t, c) { return coefText(c === undefined ? t.coef : c, t) + tDisp(t) + (t.charge ? window.AtomixChem.chargeSup(t.charge) : ""); }
function plainSide(terms) { return terms.map(function (t) { return plainTerm(t); }).join(" + "); }
function rxPlain(rx) { return plainSide(rx.reactants) + (rx.reversible ? " ⇌ " : " → ") + plainSide(rx.products); }
function cap(t) { return t ? t[0].toUpperCase() + t.slice(1) : t; }
function typeText(rx) {
  const type = chem.typeName(rx.type), note = chem.rxText(rx).note;
  const base = rx.type === "другое" ? "" : cap(type);
  if (!note) return base || tr("Другая реакция", "Other reaction");
  return base ? base + " · " + note : cap(note);
}
function nf(x, d) { return I18N.num(x, { minimumFractionDigits: d, maximumFractionDigits: d }); }
function catClass(sym) {
  const z = T.symbols.indexOf(sym) + 1;
  const node = grid.querySelector('[data-z="' + z + '"]');
  const m = node && /\bc-([a-z]+)/.exec(node.className);
  return m ? "c-" + m[1] : "c-unknown";
}
function status(text) { $("eq-status").textContent = text; }


/* ---------- электронный баланс (для окислительно-восстановительных реакций) ---------- */
function oxSup(v) { return "<sup>" + esc(chem.oxText(v)) + "</sup>"; }
function atomHTML(a) {
  return '<span class="fm">' + (a.coef > 1 ? '<span class="cf">' + a.coef + "</span>" : "") + esc(a.el) +
    (a.index > 1 ? "<sub>" + a.index + "</sub>" : "") + oxSup(a.v) + "</span>";
}
function halfHTML(ln) {
  const side = function (arr) { return arr.map(atomHTML).join('<span class="pl">+</span>'); };
  const e = '<span class="ebe">' + (ln.kind === "ox" ? "−" : "+") + " " + ln.e + "e<sup>−</sup></span>";
  return '<span class="eqv">' + side(ln.left) + " " + e + '<span class="arr">→</span>' + side(ln.right) + "</span>";
}
function roleList(lines, kind) {
  const out = [];
  lines.forEach(function (ln) {
    if (ln.kind !== kind) return;
    const states = ln.left.map(function (a) { return esc(a.el) + oxSup(a.v); }).join(", ");
    ln.sources.forEach(function (t) {
      const item = fHTML(tDisp(t), t.charge) + " <span class=\"na-text\">(" + states + ")</span>";
      if (out.indexOf(item) === -1) out.push(item);
    });
  });
  return out.join(", ");
}
function electronHTML(eb, computedOnly) {
  if (!eb || !eb.redox || !eb.lines) return "";
  const rows = eb.lines.map(function (ln) {
    return '<tr><td>' + halfHTML(ln) + '</td><td class="n">×' + ln.mult + "</td><td>" +
      (ln.kind === "ox" ? tr("восстановитель · окисление", "reducing agent · oxidation") : tr("окислитель · восстановление", "oxidizing agent · reduction")) + "</td></tr>";
  }).join("");
  const both = eb.oxidizers.filter(function (t) { return eb.reducers.indexOf(t) !== -1; });
  let h = '<p class="eb-roles"><span class="na-text">' + tr("Окислитель:", "Oxidizing agent:") + "</span> " + roleList(eb.lines, "red") +
    '<br><span class="na-text">' + tr("Восстановитель:", "Reducing agent:") + "</span> " + roleList(eb.lines, "ox") + "</p>";
  h += '<div class="eb-wrap"><table class="bal eb"><thead><tr><th>' + tr("Полуреакция", "Half-reaction") + '</th><th class="n">' + tr("Множитель", "Multiplier") + "</th><th>" + tr("Роль", "Role") + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  let note = tr("Окисление — атом отдаёт электроны, его степень окисления растёт; восстановление — принимает, степень окисления уменьшается. " +
    "Множители показывают, сколько раз каждая полуреакция повторяется в уравнении: всего отдано и принято по " + eb.electrons + " e<sup>−</sup>.",
    "Oxidation: an atom gives away electrons and its oxidation state goes up; reduction: it takes electrons and its oxidation state goes down. " +
    "The multipliers show how many times each half-reaction occurs in the equation: " + eb.electrons + " e<sup>−</sup> are given and taken in total.");
  if (both.length) note += " " + both.map(function (t) { return fHTML(tDisp(t), t.charge); }).join(", ") + (both.length > 1
    ? tr(" одновременно окислители и восстановители.", " are both oxidizing and reducing agents at once.")
    : tr(" — одновременно и окислитель, и восстановитель.", " is both the oxidizing and the reducing agent."));
  if (eb.lines.some(function (ln) { return ln.el === "C"; })) note += tr(" Для органических веществ указаны степени окисления отдельных атомов углерода, которые меняются в реакции; если строение неоднозначно, берётся средняя степень окисления.",
    " For organic compounds, the oxidation states of the individual carbon atoms that change in the reaction are shown; if the structure is ambiguous, the average oxidation state is used.");
  if (computedOnly) note += tr(" Баланс рассчитан по формулам автоматически.", " The balance was calculated from the formulas automatically.");
  h += '<p class="res-note" style="margin-top:6px">' + note + "</p>";
  return block(tr("Электронный баланс", "Electron balance"), h);
}

/* ---------- блоки результата ---------- */
function block(label, html) { return '<div class="res-block"><div class="lab">' + label + "</div>" + html + "</div>"; }
function signed(n) { return n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0"; }
function balanceTableHTML(rows) {
  return '<table class="bal"><thead><tr><th>' + tr("Элемент", "Element") + '</th><th class="n">' + tr("Слева", "Left") + '</th><th class="n">' + tr("Справа", "Right") + "</th><th></th></tr></thead><tbody>" +
    rows.map(function (r) {
      const label = r.charge ? tr("Суммарный заряд", "Total charge") : esc(r.el) + ' <span class="na-text">· ' + esc(chem.elementName(r.el).toLowerCase()) + "</span>";
      const l = r.charge ? signed(r.left) : r.left, rr = r.charge ? signed(r.right) : r.right;
      return "<tr><td>" + label + '</td><td class="n">' + l + '</td><td class="n">' + rr + "</td><td>" +
        (r.ok ? '<span class="y" aria-label="' + tr("сходится", "balanced") + '">✓</span>' : '<span class="x" aria-label="' + tr("не сходится", "not balanced") + '">✗</span>') + "</td></tr>";
    }).join("") + "</tbody></table>";
}
function balanceRows(terms, coefs, nLeft) {
  const L = terms.slice(0, nLeft), R = terms.slice(nLeft);
  const count = function (ts, cs) {
    const c = { q: 0 };
    ts.forEach(function (t, i) {
      Object.keys(t.atoms).forEach(function (e) { c[e] = (c[e] || 0) + t.atoms[e] * cs[i]; });
      c.q += (t.charge || 0) * cs[i];
    });
    return c;
  };
  const a = count(L, coefs.slice(0, nLeft)), b = count(R, coefs.slice(nLeft));
  const els = [];
  terms.forEach(function (t) { Object.keys(t.atoms).forEach(function (e) { if (els.indexOf(e) === -1) els.push(e); }); });
  const rows = els.map(function (e) { return { el: e, left: a[e] || 0, right: b[e] || 0, ok: (a[e] || 0) === (b[e] || 0) }; });
  if (terms.some(function (t) { return t.charge; })) rows.push({ el: "заряд", charge: true, left: a.q, right: b.q, ok: a.q === b.q });
  return rows;
}
function substancesHTML(terms) {
  const seen = {};
  return '<ul class="subs">' + terms.filter(function (t) { const k = t.key || t.formula; if (seen[k]) return false; seen[k] = 1; return true; }).map(function (t) {
    const nm = chem.nameOf(t.key || t.formula);
    const m = chem.molarMass(t.atoms);
    const mass = t.polymer ? tr("M звена = ", "M of unit = ") : "M = ";
    return "<li>" + fHTML(tDisp(t), t.charge) + "<span>" + (nm ? esc(nm) : '<span class="na-text">' + tr("нет в справочнике", "not in the database") + "</span>") + '</span><span class="m">' + mass + (m.approx ? "≈ " : "") + nf(m.value, 2) + " " + tr("г/моль", "g/mol") + "</span>" + structHTML(t) + "</li>";
  }).join("") + "</ul>";
}
/* ---------- структурные формулы веществ и ионов ----------
   Рисунки лежат готовыми в ATOMIX_CHEM_DATA.structures (скрипт chem-structures).
   Формула выводится сразу рядом с веществом, без дополнительного клика. */
const STRUCT = D.structures || {};
let structMode = "x"; // x — развёрнутая, s — скелетная
try { if (localStorage.getItem("atomix-structure-view") === "s") structMode = "s"; } catch (e) {}
function structPanel(key) {
  const st = STRUCT[key];
  if (!st) return "";
  const mode = st.s && structMode === "s" ? "s" : "x";
  const g = st[mode];
  const nm = chem.nameOf(key);
  let h = "";
  if (st.s) {
    h += '<div class="st-modes" role="group" aria-label="' + tr("Вид структурной формулы", "Structural formula view") + '">' +
      '<button type="button" class="st-mode" data-st-mode="x" aria-pressed="' + (mode === "x") + '">' + tr("Развёрнутая", "Expanded") + "</button>" +
      '<button type="button" class="st-mode" data-st-mode="s" aria-pressed="' + (mode === "s") + '">' + tr("Скелетная", "Skeletal") + "</button></div>";
  }
  h += '<div class="st-pic"><svg class="mol" viewBox="0 0 ' + g[0] + " " + g[1] + '" style="width:calc(var(--mol-s) * ' + g[0] + 'px)" role="img" aria-label="' +
    esc((mode === "s" ? tr("Скелетная формула", "Skeletal formula") : tr("Структурная формула", "Structural formula")) + (nm ? ": " + nm : "")) + '">' + g[2] + "</svg></div>";
  if (mode === "s") h += '<p class="st-note">' + tr("В скелетной формуле атомы углерода не подписаны: они стоят в каждом изломе и на концах линий, а атомы водорода при них подразумеваются.",
    "In a skeletal formula, carbon atoms are not labelled: there is one at every corner and at the end of every line, and the hydrogen atoms on them are implied.") + "</p>";
  if (st.n) h += '<p class="st-note">' + esc(tr(st.n, st.ne || st.n)) + "</p>";
  return h;
}
function structHTML(t) {
  const key = t.key || t.formula;
  if (!STRUCT[key]) return "";
  return '<div class="st" data-st="' + esc(key) + '"><p class="st-label">' + tr("Структурная формула", "Structural formula") + '</p><div class="st-body">' + structPanel(key) + "</div></div>";
}
// переключатель вида: запоминается и сразу меняет все формулы на странице
document.addEventListener("click", function (ev) {
  const b = ev.target.closest("[data-st-mode]");
  if (!b) return;
  const stEl = b.closest(".st");
  const activeKey = stEl ? stEl.dataset.st : null;
  structMode = b.dataset.stMode;
  try { localStorage.setItem("atomix-structure-view", structMode); } catch (e) {}
  document.querySelectorAll(".st[data-st]").forEach(function (el) {
    const body = el.querySelector(".st-body");
    if (body) body.innerHTML = structPanel(el.dataset.st);
  });
  if (activeKey) {
    const again = document.querySelector('.st[data-st="' + CSS.escape(activeKey) + '"] [data-st-mode="' + structMode + '"]');
    if (again) again.focus();
  }
  status(structMode === "s" ? tr("Показаны скелетные формулы", "Showing skeletal formulas") : tr("Показаны развёрнутые формулы", "Showing expanded formulas"));
});
function ionicHTML(rx) {
  if (!rx.ionNet) return "";
  const net = rx.ionNet, arrow = net.reversible ? "<=>" : "->";
  let h = "";
  if (rx.ionFull) h += '<p class="ion-line"><span class="na-text">' + tr("Полное:", "Full:") + "</span> " + eqHTML(rx.ionFull.L, rx.ionFull.R, arrow) + "</p>";
  h += '<p class="ion-line"><span class="na-text">' + tr("Сокращённое:", "Net:") + "</span> " + eqHTML(net.L, net.R, arrow) + "</p>";
  h += '<p class="res-note">' + tr("Растворимые сильные электролиты записаны ионами; осадки, газы, вода и слабые электролиты — молекулами. Одинаковые ионы в обеих частях сокращают.",
    "Soluble strong electrolytes are written as ions; precipitates, gases, water and weak electrolytes are written as molecules. Identical ions on both sides cancel out.") + "</p>";
  return block(tr("Ионные уравнения", "Ionic equations"), h);
}
function participantsSentence(rx) {
  const names = function (ts) { return ts.map(function (t) { return esc(chem.nameOf(t.key)) + " (" + fHTML(tDisp(t)) + ")"; }).join(", "); };
  if (I18N.lang === "en") return (rx.reactants.length === 1 ? "Reactant: " : "Reactants: ") + names(rx.reactants) + ". " + (rx.products.length === 1 ? "Product: " : "Products: ") + names(rx.products) + ".";
  const one = rx.products.length === 1 ? "Образуется" : "Образуются";
  return "Вступают в реакцию: " + names(rx.reactants) + ". " + one + ": " + names(rx.products) + ".";
}
function altsHTML(list, title) {
  if (!list.length) return "";
  return block(title, '<div class="res-alts">' + list.map(function (rx) {
    return '<button type="button" class="rx-item" data-rx="' + rx.id + '">' + rxHTML(rx) + '<span class="rt">' + esc(typeText(rx)) + "</span></button>";
  }).join("") + "</div>");
}

// Полный разбор реакции из базы
function reactionCard(rx, ctx) {
  ctx = ctx || {};
  const tags = (rx.reversible ? [tr("обратимая", "reversible")] : []).concat((rx.tags || []).map(chem.tagName), rx.autoRedox ? [chem.tagName("ОВР")] : []);
  const txt = chem.rxText(rx);
  const allTerms = rx.reactants.concat(rx.products);
  let html = '<div class="res">';
  html += '<span class="pill ok">' + tr("Найдено в базе реакций", "Found in the reaction database") + "</span>";
  html += '<div><div class="res-eq">' + rxHTML(rx) + "</div>";
  if (ctx.sub) html += '<div class="res-sub">' + ctx.sub + "</div>";
  html += "</div>";
  if (ctx.before) html += ctx.before;
  html += '<div class="res-grid">';
  html += block(tr("Тип реакции", "Reaction type"), "<p>" + esc(typeText(rx)) + "</p>" + (tags.length ? '<div class="tags">' + tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" : ""));
  html += block(tr("Условия", "Conditions"), "<p>" + (txt.cond ? esc(txt.cond) : '<span class="na-text">' + tr("В базе нет надёжных данных об условиях.", "The database has no reliable data on the conditions.") + "</span>") + "</p>");
  html += "</div>";
  html += block(tr("Что происходит", "What happens"), "<p>" + esc(txt.desc) + "</p><p>" + participantsSentence(rx) + "</p>");
  html += electronHTML(rx.redox);
  html += ionicHTML(rx);
  html += '<div class="res-grid">';
  html += block(tr("Проверка баланса атомов", "Atom balance check"), balanceTableHTML(balanceRows(allTerms, allTerms.map(function (t) { return t.coef; }), rx.reactants.length)) +
    '<p class="res-note" style="margin-top:6px">' + tr("Атомов каждого элемента слева и справа поровну — закон сохранения выполняется.", "There are equal numbers of atoms of each element on the left and on the right, so mass is conserved.") +
    (rx.multi ? tr(" Математически коэффициенты здесь можно расставить несколькими способами; приведён общепринятый вариант, полученный методом электронного баланса.",
      " Mathematically, the coefficients here can be chosen in several ways; the standard set, found by the electron balance method, is shown.") : "") +
    (rx.reactants.concat(rx.products).some(function (t) { return t.nPoly || t.polymer; }) ? tr(" Для полимеров баланс считается на одно звено цепи (n = 1).", " For polymers, the balance is counted per repeating unit (n = 1).") : "") + "</p>");
  html += block(tr("Вещества", "Substances"), substancesHTML(allTerms));
  html += "</div>";
  html += '<p class="res-note">' + tr("Тема: ", "Topic: ") + esc(chem.topicName(rx.topic)) + "</p>";
  if (ctx.after) html += ctx.after;
  html += '<div class="res-actions">' + (ctx.toInput ? '<button type="button" class="btn" data-to-input="' + rx.id + '">' + tr("Разобрать в поле ввода", "Open in the input field") + "</button>" : "") + "</div>";
  html += "</div>";
  return html;
}

function notFoundMsg() {
  return '<p class="res-msg">' + tr("<strong>Эта реакция не найдена в базе данных.</strong> Проверьте формулы или попробуйте другой вариант. Это не значит, что реакция невозможна, — просто у нас нет о ней проверенных сведений.",
    "<strong>This reaction was not found in the database.</strong> Check the formulas or try another option. This does not mean the reaction is impossible — we just have no verified information about it.") + "</p>";
}
function warningsHTML(res) {
  let h = "";
  (res.warnings || []).forEach(function (w) {
    h += '<p class="res-msg">⚠ ' + esc(w.msg) + " " + (w.choices || []).map(function (c) {
      return '<button type="button" class="link" data-replace-from="' + esc(w.from) + '" data-replace-to="' + esc(c.to) + '">' +
        (c.label && c.label !== c.to ? esc(c.label) + " (" + esc(c.to) + ")" : tr("Заменить на ", "Replace with ") + esc(c.to)) + "</button>";
    }).join(" · ") + "</p>";
  });
  (res.notes || []).forEach(function (n) { h += '<p class="res-note">' + esc(n) + "</p>"; });
  return h;
}

function renderAnalysis(res) {
  if (res.kind === "empty") {
    status("");
    return '<div class="res"><span class="pill warn">' + tr("Пустое поле", "Empty field") + '</span><p class="res-msg">' +
      tr("Введите уравнение, например <code>H2 + O2 = H2O</code>, или только исходные вещества: <code>Zn + HCl</code>.", "Type an equation, for example <code>H2 + O2 = H2O</code>, or only the reactants: <code>Zn + HCl</code>.") + "</p></div>";
  }

  if (res.kind === "syntax") {
    status(tr("Ошибка в записи формулы", "Error in the formula"));
    let h = '<div class="res"><span class="pill err">' + tr("Ошибка в записи", "Writing error") + "</span>";
    h += '<ul class="errlist">' + res.errors.map(function (e) {
      return "<li>" + (e.term ? "<code>" + esc(e.term) + "</code> — " + esc(e.msg.charAt(0).toLowerCase() + e.msg.slice(1)) : esc(e.msg)) + (e.fix ? tr(" Правильно: ", " Correct: ") + "<code>" + esc(e.fix) + "</code>." : "") + "</li>";
    }).join("") + "</ul>";
    if (res.fixInput) h += '<div class="res-actions"><button type="button" class="btn-primary" data-fix="' + esc(res.fixInput) + '">' + tr("Исправить: ", "Fix: ") + esc(res.fixInput) + "</button></div>";
    h += '<p class="res-note">' + tr("Это ошибка записи, а не химии: система не смогла прочитать формулу.", "This is a writing error, not a chemistry one: the formula could not be read.") + "</p></div>";
    return h;
  }

  if (res.kind === "reactants" || res.kind === "products") {
    const prod = res.kind === "products";
    const termsTxt = res.terms.map(function (t) { return plainTerm(t, null); }).join(" + ");
    if (!prod && res.matches.length === 1) {
      status(tr("Найдена реакция в базе", "A reaction was found in the database"));
      return reactionCard(res.matches[0], { sub: tr("Вы указали только исходные вещества — вот реакция из базы.", "You gave only the reactants — here is the reaction from the database."), before: warningsHTML(res) });
    }
    if (res.matches.length) {
      const found = tr("Найдено вариантов: ", "Options found: ") + res.matches.length;
      status(found);
      return '<div class="res"><span class="pill ok">' + found + "</span>" +
        '<p class="res-msg">' + (prod ? tr("Реакции из базы, в которых образуется " + esc(termsTxt) + ".", "Reactions from the database that produce " + esc(termsTxt) + ".")
          : tr("С исходными веществами " + esc(termsTxt) + " в базе есть несколько реакций — продукты зависят от условий. Выберите нужную:", "The database has several reactions with the reactants " + esc(termsTxt) + " — the products depend on the conditions. Choose one:")) + "</p>" +
        warningsHTML(res) + altsHTML(res.matches.slice(0, 30), tr("Варианты", "Options")) + "</div>";
    }
    status(tr("Реакция не найдена в базе", "The reaction was not found in the database"));
    return '<div class="res"><span class="pill warn">' + tr("Не найдено в базе", "Not in the database") + "</span>" + notFoundMsg() +
      '<p class="res-note">' + (prod ? tr("Вы указали только продукты.", "You gave only the products.") : tr("Продукты не указаны, поэтому уравнение составить нельзя: мы не угадываем продукты реакций.", "No products are given, so the equation cannot be built: we do not guess reaction products.")) + "</p>" + warningsHTML(res) + "</div>";
  }

  if (res.kind === "ionic") return renderIonic(res);

  // полное уравнение
  const L = res.L, R = res.R;
  const allTerms = L.concat(R);
  const userCoefs = allTerms.map(function (t) { return t.coef || 1; });
  let userLine = "";
  if (res.userGiven) {
    if (res.userBalanced && !res.userMultiple) userLine = '<p class="res-msg"><span class="y">✓</span> ' + tr("Ваши коэффициенты верные.", "Your coefficients are correct.") + "</p>";
    else if (res.userBalanced && res.userMultiple) userLine = '<p class="res-msg">' + tr("Ваши коэффициенты уравнивают атомы, но их можно сократить в " + res.userMultiple + " раза. Принято писать наименьшие целые коэффициенты.",
      "Your coefficients balance the atoms, but they can all be divided by " + res.userMultiple + ". Coefficients are usually written as the smallest whole numbers.") + "</p>";
    else if (res.coefs) userLine = '<p class="res-msg"><span class="x">✗</span> ' + tr("Ваши коэффициенты не уравнивают атомы: ", "Your coefficients do not balance the atoms: ") + esc(mismatchText(res.userTable)) + tr(". Правильные коэффициенты показаны выше.", ". The correct coefficients are shown above.") + "</p>";
  }

  if (res.match) {
    status(tr("Реакция найдена в базе", "The reaction was found in the database"));
    const sub = res.userGiven ? "" : (res.coefs && res.coefs.some(function (c) { return c !== 1; }) ? tr("Коэффициенты расставлены автоматически.", "The coefficients were added automatically.") : tr("Коэффициенты не нужны: атомы уже сходятся.", "No coefficients are needed: the atoms already add up."));
    return reactionCard(res.match, {
      sub: sub,
      before: userLine + warningsHTML(res),
      after: altsHTML(res.sameReactants, tr("Другие реакции с этими же исходными веществами", "Other reactions with the same reactants"))
    });
  }

  // уравнение не найдено в базе — показываем только то, что можно проверить математически
  let h = '<div class="res">';
  if (res.balanceStatus === "unique") {
    status(tr("Реакция не найдена в базе. Коэффициенты рассчитаны", "The reaction is not in the database. Coefficients were calculated"));
    h += '<span class="pill warn">' + tr("Не найдено в базе", "Not in the database") + "</span>";
    h += '<div><div class="res-eq">' + eqHTML(L, R, res.arrow, res.coefs.slice(0, L.length), res.coefs.slice(L.length)) + "</div>" +
      '<div class="res-sub">' + tr("Коэффициенты, при которых число атомов сходится.", "Coefficients that make the numbers of atoms add up.") + "</div></div>";
    h += userLine + notFoundMsg();
    h += '<p class="res-note">' + tr("Коэффициенты рассчитаны математически: они показывают, как уравнять атомы, но не доказывают, что реакция действительно идёт. Поэтому мы не показываем описание и условия.",
      "The coefficients were calculated mathematically: they show how to balance the atoms but do not prove that the reaction actually happens. That is why no description or conditions are shown.") + "</p>";
    h += warningsHTML(res);
    h += '<div class="res-grid">';
    h += block(tr("Проверка баланса атомов", "Atom balance check"), balanceTableHTML(res.table));
    h += block(tr("Вещества", "Substances"), substancesHTML(allTerms));
    h += "</div>";
    h += electronHTML(res.redox, true);
    if (res.formalType) h += block(tr("По виду записи", "By the look of the equation"), "<p>" + tr("Похоже на реакцию типа «" + res.formalType + "». Это определено только по количеству и составу веществ в записи.",
      "It looks like a " + chem.typeName(res.formalType) + " reaction. This is judged only by the number and composition of the substances written.") + "</p>");
  } else {
    status(tr("Уравнение нельзя уравнять", "The equation cannot be balanced"));
    h += '<span class="pill warn">' + tr("Атомы не уравниваются", "The atoms do not balance") + "</span>";
    h += '<div><div class="res-eq">' + eqHTML(L, R, res.arrow, userCoefs.slice(0, L.length), userCoefs.slice(L.length)) + "</div></div>";
    let why = "";
    if (res.balanceStatus === "elements") {
      why = tr("Так записанное уравнение нельзя уравнять: ", "The equation as written cannot be balanced: ") + onlySideText(res.leftOnly, res.rightOnly) +
        tr(". Атомы не появляются и не исчезают, значит, в записи пропущено или лишнее вещество.", ". Atoms do not appear or disappear, so a substance is missing or extra.");
    } else if (res.balanceStatus === "multiple") {
      why = tr("Коэффициенты можно расставить несколькими разными способами, поэтому однозначного ответа нет. Скорее всего, в уравнении лишнее вещество, или это несколько реакций в одной записи.",
        "The coefficients can be chosen in several different ways, so there is no single answer. Most likely there is an extra substance, or several reactions are written as one.");
      if (res.userGiven && res.userBalanced) why += tr(" Ваши коэффициенты при этом атомы уравнивают.", " Your coefficients do balance the atoms, though.");
    } else {
      why = tr("Атомы не удаётся уравнять положительными коэффициентами. Проверьте формулы: возможно, какое-то вещество стоит не в той части уравнения.",
        "The atoms cannot be balanced with positive coefficients. Check the formulas: perhaps a substance is on the wrong side of the equation.");
    }
    h += '<p class="res-msg">' + esc(why) + "</p>";
    h += warningsHTML(res);
    h += '<div class="res-grid">' + block(tr("Атомы в вашей записи", "Atoms in your equation"), balanceTableHTML(res.userTable)) + block(tr("Вещества", "Substances"), substancesHTML(allTerms)) + "</div>";
  }
  if (res.reverse) h += altsHTML([res.reverse], tr("В базе есть обратная реакция", "The database has the reverse reaction"));
  if (res.sameReactants.length) h += altsHTML(res.sameReactants, tr("Реакции из базы с этими же исходными веществами", "Reactions from the database with the same reactants"));
  h += "</div>";
  return h;
}
function mismatchText(rows) {
  return rows.filter(function (r) { return !r.ok; }).map(function (r) {
    return r.charge ? tr("заряд " + signed(r.left) + " слева, " + signed(r.right) + " справа", "charge " + signed(r.left) + " on the left, " + signed(r.right) + " on the right")
      : r.el + ": " + tr(r.left + " слева, " + r.right + " справа", r.left + " on the left, " + r.right + " on the right");
  }).join("; ");
}
// «элементы Fe, S есть только слева, а элемент O есть только справа»
function onlySideText(leftOnly, rightOnly) {
  const part = [];
  if (I18N.lang === "en") {
    if (leftOnly.length) part.push((leftOnly.length > 1 ? "elements " : "element ") + leftOnly.join(", ") + " appear" + (leftOnly.length > 1 ? "" : "s") + " only on the left");
    if (rightOnly.length) part.push((rightOnly.length > 1 ? "elements " : "element ") + rightOnly.join(", ") + " appear" + (rightOnly.length > 1 ? "" : "s") + " only on the right");
    return part.join(", and ");
  }
  if (leftOnly.length) part.push("элемент" + (leftOnly.length > 1 ? "ы " : " ") + leftOnly.join(", ") + " есть только слева");
  if (rightOnly.length) part.push("элемент" + (rightOnly.length > 1 ? "ы " : " ") + rightOnly.join(", ") + " есть только справа");
  return part.join(", а ");
}

// Ионное уравнение, которое ввёл пользователь
function renderIonic(res) {
  const L = res.L, R = res.R;
  const arrow = res.arrow || "->";
  if (res.onlyLeft) {
    if (res.matches.length) {
      status(tr("Найдено реакций: ", "Reactions found: ") + res.matches.length);
      return '<div class="res"><span class="pill ok">' + tr("Найдено в базе: ", "Found in the database: ") + res.matches.length + "</span>" +
        '<p class="res-msg">' + tr("Ионы " + sideHTML(L) + " встречаются в левой части сокращённых ионных уравнений этих реакций:", "The ions " + sideHTML(L) + " appear on the left side of the net ionic equations of these reactions:") + "</p>" +
        warningsHTML(res) + altsHTML(res.matches.slice(0, 30), tr("Молекулярные уравнения", "Molecular equations")) + "</div>";
    }
    status(tr("Не найдено в базе", "Not in the database"));
    return '<div class="res"><span class="pill warn">' + tr("Не найдено в базе", "Not in the database") + "</span>" + notFoundMsg() +
      '<p class="res-note">' + tr("Продукты не указаны, поэтому уравнение составить нельзя: мы не угадываем продукты реакций.", "No products are given, so the equation cannot be built: we do not guess reaction products.") + "</p></div>";
  }
  const found = res.matches.length > 0;
  let h = '<div class="res"><span class="pill ' + (found ? "ok" : "warn") + '">' + (found ? tr("Ионное уравнение есть в базе", "The ionic equation is in the database") : tr("Не найдено в базе", "Not in the database")) + "</span>";
  const coefsL = res.coefs ? res.coefs.slice(0, res.netL.length) : null, coefsR = res.coefs ? res.coefs.slice(res.netL.length) : null;
  if (res.spectators.length) {
    h += '<div><div class="res-sub">' + tr("Ваша запись — полное ионное уравнение:", "You wrote a full ionic equation:") + '</div><div class="res-eq" style="font-size:20px">' + eqHTML(L, R, arrow) + "</div></div>";
    const spect = res.spectators.map(function (k) { const t = L.concat(R).find(function (x) { return x.key === k; }); return fHTML(tDisp(t), t.charge); }).join(", ");
    h += '<p class="res-msg">' + tr("Ионы " + spect + " есть в обеих частях — в реакции они не участвуют. Их сокращают:", "The ions " + spect + " are on both sides — they do not take part in the reaction. They cancel out:") + "</p>";
    if (res.userGiven) h += res.userBalanced ? '<p class="res-msg"><span class="y">✓</span> ' + tr("В вашей полной записи атомы и заряды сходятся.", "In your full equation, the atoms and charges add up.") + "</p>"
      : '<p class="res-msg"><span class="x">✗</span> ' + tr("В вашей полной записи не сходится: ", "In your full equation this does not add up: ") + esc(mismatchText(res.userTable)) + ".</p>";
  }
  if (res.balanceStatus === "unique") {
    h += '<div>' + (res.spectators.length ? '<div class="res-sub">' + tr("Сокращённое ионное уравнение:", "Net ionic equation:") + "</div>" : "") +
      '<div class="res-eq">' + eqHTML(res.netL, res.netR, arrow, coefsL, coefsR) + "</div></div>";
    if (!res.spectators.length && res.userGiven) h += res.userBalanced ? '<p class="res-msg"><span class="y">✓</span> ' + tr("Ваши коэффициенты верные.", "Your coefficients are correct.") + "</p>"
      : '<p class="res-msg"><span class="x">✗</span> ' + tr("Ваши коэффициенты не уравнивают: ", "Your coefficients do not balance: ") + esc(mismatchText(res.userTable)) + ".</p>";
    status(found ? tr("Ионное уравнение найдено в базе", "The ionic equation was found in the database") : tr("Ионное уравнение не найдено в базе", "The ionic equation is not in the database"));
    h += found ? '<p class="res-msg">' + tr("Такое сокращённое ионное уравнение соответствует реакциям из базы — выберите любую, чтобы увидеть молекулярное и полное ионное уравнения.",
      "This net ionic equation matches reactions from the database — choose any of them to see the molecular and full ionic equations.") + "</p>" : notFoundMsg();
    h += warningsHTML(res);
    h += '<div class="res-grid">' + block(tr("Проверка: атомы и заряды", "Check: atoms and charges"), balanceTableHTML(res.table) +
      '<p class="res-note" style="margin-top:6px">' + tr("В ионном уравнении должны сходиться не только атомы, но и суммарный заряд.", "In an ionic equation, not only the atoms but also the total charge must add up.") + "</p>") +
      block(tr("Частицы", "Particles"), substancesHTML(res.netL.concat(res.netR))) + "</div>";
  } else {
    status(tr("Ионное уравнение не уравнивается", "The ionic equation cannot be balanced"));
    let why;
    if (res.balanceStatus === "empty") why = tr("После сокращения одинаковых ионов в одной из частей ничего не осталось. Проверьте запись.", "After cancelling identical ions, nothing is left on one of the sides. Check what you wrote.");
    else if (res.balanceStatus === "elements") why = tr("Атомы не сходятся: ", "The atoms do not add up: ") + onlySideText(res.leftOnly, res.rightOnly) + ".";
    else if (res.balanceStatus === "multiple") why = tr("Коэффициенты можно расставить несколькими способами — однозначного ответа нет.", "The coefficients can be chosen in several ways — there is no single answer.");
    else why = tr("Атомы и заряды не удаётся уравнять положительными коэффициентами. Проверьте формулы и заряды ионов.", "The atoms and charges cannot be balanced with positive coefficients. Check the formulas and the ion charges.");
    h += '<div class="res-eq">' + eqHTML(res.netL, res.netR, arrow) + "</div>";
    h += '<p class="res-msg">' + esc(why) + "</p>" + warningsHTML(res);
    h += '<div class="res-grid">' + block(tr("Атомы и заряды в вашей записи", "Atoms and charges in your equation"), balanceTableHTML(res.userTable)) + block(tr("Частицы", "Particles"), substancesHTML(L.concat(R))) + "</div>";
  }
  if (found) h += altsHTML(res.matches.slice(0, 30), tr("Молекулярные уравнения из базы", "Molecular equations from the database"));
  if (res.reverseMatches && res.reverseMatches.length) h += altsHTML(res.reverseMatches.slice(0, 10), tr("В базе есть обратный процесс", "The database has the reverse process"));
  h += "</div>";
  return h;
}

/* ---------- раздел открыт всегда, без кнопки «Составить / Скрыть» ---------- */
const section = $("eq");
let tab = "manual";
function dbNote() {
  const nr = chem.reactions.length, ns = chem.substanceCount;
  $("eq-db-note").textContent = tr(
    "В базе " + nr + " " + I18N.plural(nr, "", "", "реакция", "реакции", "реакций") + " школьного курса 8–11 классов и ЕГЭ (у " + chem.ionicCount + " есть ионные уравнения), в справочнике " + ns + " " + I18N.plural(ns, "", "", "вещество", "вещества", "веществ") +
    ". У всех " + Object.keys(STRUCT).length + " веществ и ионов базы есть структурные формулы — они показываются сразу рядом с веществом в списке. Коэффициенты каждой реакции программа пересчитывает и проверяет сама. Если реакции нет в базе, это не значит, что она невозможна: база не знает всех реакций. Коэффициенты рассчитываются для любого уравнения, но описание и условия показываются только для реакций из базы.",
    "The database has " + nr + " reactions from the school course for grades 8–11 and exam-level chemistry (" + chem.ionicCount + " of them with ionic equations) and " + ns + " substances" +
    ". All " + Object.keys(STRUCT).length + " substances and ions in the database have structural formulas, shown right next to the substance in the list. The program recalculates and checks the coefficients of every reaction itself. If a reaction is not in the database, it does not mean it is impossible: the database does not know every reaction. Coefficients are calculated for any equation, but a description and conditions are shown only for reactions from the database.");
}
dbNote();

/* ---------- вкладки ---------- */
const tabs = { manual: $("tab-manual"), pick: $("tab-pick"), catalog: $("tab-catalog") };
const panels = { manual: $("panel-manual"), pick: $("panel-pick"), catalog: $("panel-catalog") };
const TAB_ORDER = ["manual", "pick", "catalog"];
function setTab(name, focus) {
  tab = name;
  Object.keys(tabs).forEach(function (k) {
    const on = k === name;
    tabs[k].setAttribute("aria-selected", on ? "true" : "false");
    tabs[k].tabIndex = on ? 0 : -1;
    panels[k].hidden = !on;
  });
  if (focus) tabs[name].focus();
  if (name === "pick") {
    setPicking(true);
    closeSugg();
    if (!picked.length) scrollToTable();
  } else {
    setPicking(false);
  }
  if (name === "catalog") renderCatalog();
}
Object.keys(tabs).forEach(function (k) { tabs[k].addEventListener("click", function () { setTab(k); }); });
$("panel-manual").parentNode.querySelector('[role="tablist"]').addEventListener("keydown", function (ev) {
  if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
  ev.preventDefault();
  const i = TAB_ORDER.indexOf(tab) + (ev.key === "ArrowRight" ? 1 : -1);
  setTab(TAB_ORDER[(i + TAB_ORDER.length) % TAB_ORDER.length], true);
});

/* ---------- каталог реакций по темам ---------- */
const catList = $("catalog-list"), resCat = $("eq-result-catalog");
let catalogBuilt = false;
let catRx = null; // реакция, открытая в каталоге
function renderCatalog() {
  if (catalogBuilt) return;
  catalogBuilt = true;
  let lastLevel = null;
  catList.innerHTML = chem.topics().map(function (tp, i) {
    const head = tp.level !== lastLevel ? '<h3 class="cat-level">' + esc(chem.levelName(tp.level)) + "</h3>" : "";
    lastLevel = tp.level;
    const title = chem.topicName(tp.topic).replace(/^(?:8–9 класс|Grades 8–9) · (.)/, function (m, c) { return c.toUpperCase(); });
    return head + '<details class="cat-topic" data-topic="' + i + '"><summary><span>' + esc(title) + '</span><span class="cat-n">' + tp.reactions.length + "</span></summary>" +
      '<ul class="rx-list"></ul></details>';
  }).join("");
}
catList.addEventListener("toggle", function (ev) {
  const d = ev.target;
  if (!d.matches || !d.matches("details") || !d.open) return;
  const ul = d.querySelector("ul");
  if (ul.childElementCount) return;
  const tp = chem.topics()[Number(d.dataset.topic)];
  ul.innerHTML = tp.reactions.map(function (rx) {
    return '<li><button type="button" class="rx-item" data-rx="' + rx.id + '">' + rxHTML(rx) + '<span class="rt">' + esc(typeText(rx)) + (rx.ionNet ? tr(" · есть ионное", " · ionic equation") : "") + "</span></button></li>";
  }).join("");
}, true);
catList.addEventListener("click", function (ev) {
  const b = ev.target.closest("[data-rx]");
  if (!b) return;
  catList.querySelectorAll('[aria-current="true"]').forEach(function (x) { x.removeAttribute("aria-current"); });
  b.setAttribute("aria-current", "true");
  const rx = chem.reactions[Number(b.dataset.rx)];
  catRx = rx;
  resCat.innerHTML = reactionCard(rx, { toInput: true });
  bindResult(resCat);
  status(tr("Открыта реакция: ", "Reaction opened: ") + rxPlain(rx));
  resCat.scrollIntoView({ behavior: smooth(), block: "start" });
});

/* ---------- ручной ввод и подсказки ---------- */
const input = $("eq-input"), sugg = $("eq-sugg"), preview = $("eq-preview"), resManual = $("eq-result-manual");
let items = [], active = -1, tokenRange = null;

// какое слово сейчас набирается (от последнего разделителя до курсора)
// связи «-», «=», «≡» внутри формулы (без пробелов вокруг) тоже считаются частью слова: CH2=CH-CH3
function currentToken() {
  const v = input.value, caret = input.selectionStart == null ? v.length : input.selectionStart;
  const F = /[A-Za-zА-Яа-яЁё0-9()\[\]·*₀-₉]/;
  const bondAt = function (i) { return /[-=≡]/.test(v[i] || "") && F.test(v[i - 1] || "") && (i + 1 >= caret || F.test(v[i + 1] || "")) && v[i + 1] !== ">"; };
  let start = caret;
  while (start > 0 && (F.test(v[start - 1]) || bondAt(start - 1))) start--;
  let end = caret;
  while (end < v.length && F.test(v[end])) end++;
  const tok = v.slice(start, caret);
  const m = /^(\d*)(.*)$/.exec(tok);
  return { start: start + m[1].length, end: end, coef: m[1], query: m[2] };
}
function openSugg() {
  const tk = currentToken();
  tokenRange = tk;
  items = tk.query ? chem.suggest(tk.query, 8) : [];
  active = -1;
  if (!items.length) { closeSugg(); return; }
  sugg.innerHTML = items.map(function (it, i) {
    return '<li role="option" id="sg-' + i + '" aria-selected="false" data-i="' + i + '"><span class="sf">' + fHTML(it.formula) + '</span><span class="sn">' + esc(it.name) + '</span><span class="sk">' +
      (it.kind === "element" ? tr("элемент", "element") : it.kind === "ion" ? tr("ион", "ion") : tr("вещество", "substance")) + "</span></li>";
  }).join("") + '<li class="sh" aria-hidden="true">' + tr("↑↓ — выбрать, Enter или Tab — вставить, Esc — закрыть", "↑↓ — choose, Enter or Tab — insert, Esc — close") + "</li>";
  sugg.hidden = false;
  input.setAttribute("aria-expanded", "true");
  input.removeAttribute("aria-activedescendant");
}
function closeSugg() {
  sugg.hidden = true;
  sugg.innerHTML = "";
  items = [];
  active = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}
function setActive(i) {
  active = i;
  Array.prototype.forEach.call(sugg.querySelectorAll('[role="option"]'), function (li, k) {
    li.setAttribute("aria-selected", k === i ? "true" : "false");
    if (k === i) li.scrollIntoView({ block: "nearest" });
  });
  if (i >= 0) input.setAttribute("aria-activedescendant", "sg-" + i);
  else input.removeAttribute("aria-activedescendant");
}
function pick(i) {
  const it = items[i];
  if (!it || !tokenRange) return;
  const v = input.value;
  const before = v.slice(0, tokenRange.start), after = v.slice(tokenRange.end);
  const tail = after.length ? "" : " ";
  input.value = before + it.formula + tail + after;
  const pos = (before + it.formula + tail).length;
  input.setSelectionRange(pos, pos);
  closeSugg();
  input.focus();
  updatePreview();
}
function insertText(txt) {
  const s = input.selectionStart == null ? input.value.length : input.selectionStart;
  const e = input.selectionEnd == null ? s : input.selectionEnd;
  let t = txt;
  const v = input.value;
  if (t.charAt(0) === " " && (s === 0 || v[s - 1] === " ")) t = t.slice(1);
  input.value = v.slice(0, s) + t + v.slice(e);
  input.setSelectionRange(s + t.length, s + t.length);
  input.focus();
  updatePreview();
}
// живая подсказка под полем: как будет выглядеть уравнение, и замечания про русские буквы
function updatePreview() {
  const v = input.value;
  if (!v.trim()) { preview.innerHTML = ""; return; }
  const p = chem.parseEquation(v);
  if (!p.errors.length) {
    const L = p.left.terms, R = p.right.terms;
    const side = function (ts) { return ts.map(function (t) { return termHTML(t.coef, t); }).join('<span class="pl">+</span>'); };
    preview.innerHTML = tr("Так читается запись: ", "This reads as: ") + '<span class="eqv">' + side(L) + (p.arrow ? '<span class="arr">' + (p.arrow === "<=>" ? "⇌" : "→") + "</span>" + (R.length ? side(R) : "?") : "") + "</span>";
    return;
  }
  const cyr = p.errors.find(function (e) { return e.code === "cyrillic" || e.code === "name"; });
  if (cyr) {
    const nameErr = cyr.code === "name";
    preview.innerHTML = (nameErr ? tr("Похоже, вместо формулы написано название.", "It looks like a name was typed instead of a formula.") : tr("Похоже, в записи русские буквы.", "It looks like there are Cyrillic letters in the equation.")) +
      (p.fixInput ? ' <button type="button" class="link" data-fix-quiet="' + esc(p.fixInput) + '">' + tr("Исправить на ", "Change to ") + esc(p.fixInput) + "</button>" : "");
    return;
  }
  preview.innerHTML = "";
}
function runCheck() {
  closeSugg();
  resManual.innerHTML = renderAnalysis(chem.analyze(input.value));
  bindResult(resManual);
}
input.addEventListener("input", function () { openSugg(); updatePreview(); });
input.addEventListener("click", function () { if (!sugg.hidden) openSugg(); });
input.addEventListener("keydown", function (ev) {
  const open = !sugg.hidden && items.length;
  if (ev.key === "ArrowDown" && open) { ev.preventDefault(); setActive((active + 1) % items.length); }
  else if (ev.key === "ArrowUp" && open) { ev.preventDefault(); setActive(active <= 0 ? items.length - 1 : active - 1); }
  else if ((ev.key === "Enter" || ev.key === "Tab") && open && active >= 0) { ev.preventDefault(); pick(active); }
  else if (ev.key === "Enter") { ev.preventDefault(); runCheck(); }
  else if (ev.key === "Escape" && open) { ev.preventDefault(); closeSugg(); }
});
input.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== input) closeSugg(); }, 150); });
sugg.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
sugg.addEventListener("click", function (ev) {
  const li = ev.target.closest('[role="option"]');
  if (li) pick(Number(li.dataset.i));
});
document.querySelectorAll(".ins").forEach(function (b) {
  b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
  b.addEventListener("click", function () { insertText(b.dataset.ins); });
});
$("eq-check").addEventListener("click", runCheck);
$("eq-clear").addEventListener("click", function () {
  input.value = "";
  resManual.innerHTML = "";
  preview.innerHTML = "";
  status("");
  closeSugg();
  input.focus();
});
preview.addEventListener("click", function (ev) {
  const b = ev.target.closest("[data-fix-quiet]");
  if (!b) return;
  input.value = b.dataset.fixQuiet;
  updatePreview();
  input.focus();
});

// кнопки внутри результата: «Исправить», «Заменить», другие варианты, «Разобрать в поле ввода»
function bindResult(container) {
  container.onclick = function (ev) {
    const fix = ev.target.closest("[data-fix]");
    if (fix) { input.value = fix.dataset.fix; updatePreview(); runCheck(); input.focus({ preventScroll: true }); return; }
    const rep = ev.target.closest("[data-replace-from]");
    if (rep) {
      const p = chem.parseEquation(input.value);
      const sideTxt = function (side) {
        return side.terms.map(function (t) {
          const d = tDisp(t) === rep.dataset.replaceFrom ? rep.dataset.replaceTo : tDisp(t);
          return coefText(t.coef, t) + d + (t.charge ? window.AtomixChem.chargeSup(t.charge) : "");
        }).join(" + ");
      };
      input.value = sideTxt(p.left) + (p.arrow ? (p.arrow === "<=>" ? " ⇌ " : " → ") + sideTxt(p.right) : "");
      updatePreview();
      runCheck();
      return;
    }
    const toIn = ev.target.closest("[data-to-input]");
    if (toIn) {
      const rx = chem.reactions[Number(toIn.dataset.toInput)];
      setTab("manual");
      input.value = rxPlain(rx);
      updatePreview();
      runCheck();
      input.scrollIntoView({ behavior: smooth(), block: "center" });
      return;
    }
    const alt = ev.target.closest("[data-rx]");
    if (alt) {
      const rx = chem.reactions[Number(alt.dataset.rx)];
      if (container === resManual) {
        input.value = rxPlain(rx);
        updatePreview();
        runCheck();
        resManual.scrollIntoView({ behavior: smooth(), block: "start" });
      } else {
        showPickReaction(rx);
      }
    }
  };
}

/* ---------- выбор элементов в таблице ---------- */
const picked = [];
let picking = false;
let currentRx = null;
const pickBar = $("pick-bar"), pickResults = $("pick-results"), resPick = $("eq-result-pick");
function symOf(btn) { return T.symbols[Number(btn.dataset.z) - 1]; }
function setPicking(on) {
  picking = on && !section.hidden;
  grid.classList.toggle("picking", picking);
  pickBar.hidden = !picking;
  grid.querySelectorAll(".el").forEach(function (b) {
    if (picking) b.setAttribute("aria-pressed", picked.indexOf(symOf(b)) !== -1 ? "true" : "false");
    else b.removeAttribute("aria-pressed");
  });
  syncPicked();
}
function togglePick(sym) {
  const i = picked.indexOf(sym);
  if (i === -1) picked.push(sym); else picked.splice(i, 1);
  currentRx = null;
  resPick.innerHTML = "";
  syncPicked();
  renderPickList();
}
function clearPicks() {
  picked.length = 0;
  currentRx = null;
  resPick.innerHTML = "";
  syncPicked();
  renderPickList();
}
function chipsHTML() {
  return picked.map(function (s) {
    return '<span class="elchip ' + catClass(s) + '">' + esc(s) + '<button type="button" data-unpick="' + esc(s) + '" aria-label="' + tr("Убрать ", "Remove ") + esc(chem.elementName(s)) + '">×</button></span>';
  }).join("");
}
let lastGroups = null;
function syncPicked() {
  grid.querySelectorAll(".el").forEach(function (b) {
    const i = picked.indexOf(symOf(b));
    const on = picking && i !== -1;
    b.classList.toggle("picked", on);
    if (on) b.dataset.order = i + 1; else delete b.dataset.order;
    if (picking) b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $("pick-chips").innerHTML = picked.length ? chipsHTML() : '<span class="na-text" style="font-size:13px">' + tr("Пока ничего не выбрано", "Nothing picked yet") + "</span>";
  $("pick-bar-chips").innerHTML = picked.length ? chipsHTML() : '<span class="pb-count">' + tr("нажмите на элементы в таблице", "tap elements in the table") + "</span>";
  const total = lastGroups ? lastGroups.direct.length + lastGroups.pure.length + lastGroups.other.length : 0;
  $("pick-bar-count").textContent = picked.length ? (total ? tr("найдено реакций: ", "reactions found: ") + total : tr("реакций в базе нет", "no reactions in the database")) : "";
  $("pick-clear").disabled = !picked.length;
  $("pick-bar-clear").disabled = !picked.length;
}
const GROUP_TITLES = {
  direct: ["Простые вещества из этих элементов реагируют друг с другом", "The elements themselves react with each other"],
  pure: ["Участвуют только эти элементы", "Only these elements take part"],
  other: ["С участием других веществ", "With other substances too"]
};
const SHOW_FIRST = 8;
let expanded = {};
function renderPickList() {
  if (!picked.length) {
    lastGroups = null;
    pickResults.innerHTML = "";
    syncPicked();
    return;
  }
  const g = chem.searchByElements(picked);
  lastGroups = g;
  const total = g.direct.length + g.pure.length + g.other.length;
  syncPicked();
  status(total ? tr("Найдено реакций: ", "Reactions found: ") + total : tr("Реакций с этими элементами в базе нет", "There are no reactions with these elements in the database"));
  if (!total) {
    pickResults.innerHTML = '<div class="res"><span class="pill warn">' + tr("Не найдено в базе", "Not in the database") + '</span><p class="res-msg">' +
      tr("В базе нет реакций, где в исходных веществах есть все выбранные элементы: " + esc(picked.join(", ")) + ". Это не значит, что таких реакций не существует, — просто у нас нет о них проверенных данных." + (picked.length > 2 ? " Попробуйте выбрать меньше элементов." : ""),
        "The database has no reactions whose reactants contain all the picked elements: " + esc(picked.join(", ")) + ". This does not mean such reactions do not exist — we just have no verified data on them." + (picked.length > 2 ? " Try picking fewer elements." : "")) + "</p></div>";
    return;
  }
  pickResults.innerHTML = ["direct", "pure", "other"].map(function (k) {
    const list = g[k];
    if (!list.length) return "";
    const shown = expanded[k] ? list : list.slice(0, SHOW_FIRST);
    return '<div class="rx-group"><h3>' + tr(GROUP_TITLES[k][0], GROUP_TITLES[k][1]) + " · " + list.length + '</h3><ul class="rx-list">' +
      shown.map(function (rx) {
        return '<li><button type="button" class="rx-item" data-rx="' + rx.id + '"' + (currentRx === rx ? ' aria-current="true"' : "") + ">" + rxHTML(rx) + '<span class="rt">' + esc(typeText(rx)) + "</span></button></li>";
      }).join("") + "</ul>" +
      (list.length > SHOW_FIRST ? '<button type="button" class="link rx-more" data-expand="' + k + '">' + (expanded[k] ? tr("Свернуть", "Show less") : tr("Показать все (", "Show all (") + list.length + ")") + "</button>" : "") + "</div>";
  }).join("");
}
function showPickReaction(rx) {
  currentRx = rx;
  renderPickList();
  resPick.innerHTML = reactionCard(rx, { toInput: true, after: "" });
  bindResult(resPick);
  status(tr("Открыта реакция: ", "Reaction opened: ") + rxPlain(rx));
  resPick.scrollIntoView({ behavior: smooth(), block: "start" });
}
pickResults.addEventListener("click", function (ev) {
  const ex = ev.target.closest("[data-expand]");
  if (ex) { expanded[ex.dataset.expand] = !expanded[ex.dataset.expand]; renderPickList(); return; }
  const b = ev.target.closest("[data-rx]");
  if (b) showPickReaction(chem.reactions[Number(b.dataset.rx)]);
});
function onUnpick(ev) {
  const b = ev.target.closest("[data-unpick]");
  if (b) togglePick(b.dataset.unpick);
}
$("pick-chips").addEventListener("click", onUnpick);
$("pick-bar-chips").addEventListener("click", onUnpick);
$("pick-clear").addEventListener("click", clearPicks);
$("pick-bar-clear").addEventListener("click", clearPicks);
function scrollToTable() { pickBar.scrollIntoView({ behavior: smooth(), block: "start" }); }
$("pick-totable").addEventListener("click", scrollToTable);
$("pick-bar-go").addEventListener("click", function () { panels.pick.scrollIntoView({ behavior: smooth(), block: "start" }); });
$("pick-bar-done").addEventListener("click", function () {
  setTab("manual");
  section.scrollIntoView({ behavior: smooth(), block: "start" });
});
// нажатие на элемент таблицы в режиме выбора (остальное поведение таблицы не меняется)
grid.addEventListener("click", function (ev) {
  if (!picking) return;
  const b = ev.target.closest(".el");
  if (b) togglePick(symOf(b));
});
syncPicked();

/* ---------- смена языка: всё, что уже на экране, рисуется заново ---------- */
I18N.on(function () {
  dbNote();
  closeSugg();
  updatePreview();
  if (resManual.innerHTML) runCheck();
  if (catalogBuilt) {
    const open = Array.prototype.map.call(catList.querySelectorAll("details[open]"), function (d) { return d.dataset.topic; });
    catalogBuilt = false;
    renderCatalog();
    open.forEach(function (i) { const d = catList.querySelector('details[data-topic="' + i + '"]'); if (d) d.open = true; });
    if (catRx) {
      const b = catList.querySelector('[data-rx="' + catRx.id + '"]');
      if (b) b.setAttribute("aria-current", "true");
      resCat.innerHTML = reactionCard(catRx, { toInput: true });
      bindResult(resCat);
    }
  }
  syncPicked();
  if (picked.length) renderPickList();
  if (currentRx) { resPick.innerHTML = reactionCard(currentRx, { toInput: true, after: "" }); bindResult(resPick); }
});
})();

/* ############################################################
   8. Форма обратной связи
   ############################################################ */
/* ============================================================
   ATOMIX LAB · ОБРАТНАЯ СВЯЗЬ
   Анонимная форма: тип обращения + текст, без имени и email.
   Отправка — через Web3Forms (https://web3forms.com): ключ доступа
   берётся из data-access-key у формы. Пока ключа нет, кнопка
   выключена и форма честно пишет, что отправка не подключена.
   ============================================================ */
(function () {
"use strict";
const form = document.getElementById("fb-form");
if (!form) return;
const I18N = window.AtomixI18n;
const tr = I18N.tr;

const ENDPOINT = "https://api.web3forms.com/submit";
const TIMEOUT = 15000;
const key = (form.dataset.accessKey || "").trim();
const msg = document.getElementById("fb-msg");
const err = document.getElementById("fb-err");
const count = document.getElementById("fb-count");
const send = document.getElementById("fb-send");
const status = document.getElementById("fb-status");
const MAX = Number(msg.getAttribute("maxlength")) || 2000;

// тексты состояний — функции, чтобы при смене языка перерисовать то, что уже на экране
const TEXT = {
  off: function () { return tr("Отправка пока не подключена.", "Sending is not set up yet."); },
  sending: function () { return tr("Отправляем…", "Sending…"); },
  ok: function () { return tr("Спасибо! Сообщение отправлено.", "Thank you! Your message has been sent."); },
  fail: function () { return tr("Не удалось отправить сообщение. Попробуйте ещё раз чуть позже.", "Could not send the message. Please try again a bit later."); },
  offline: function () { return tr("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.", "Could not reach the server. Check your connection and try again."); }
};
const ERR = {
  empty: function () { return tr("Напишите сообщение.", "Please write a message."); }
};
let statusKey = "", errKey = "", busy = false;

function setStatus(k, kind) {
  statusKey = k;
  status.textContent = k ? TEXT[k]() : "";
  status.className = "fb-status" + (kind ? " is-" + kind : "");
}
function setError(k) {
  errKey = k;
  err.hidden = !k;
  err.textContent = k ? ERR[k]() : "";
  msg.setAttribute("aria-invalid", k ? "true" : "false");
}
function updateCount() {
  const n = msg.value.length;
  count.textContent = I18N.num(n) + " / " + I18N.num(MAX);
  count.classList.toggle("is-near", n >= MAX * 0.9);
}
function syncSend() { send.disabled = busy || !key; }

msg.addEventListener("input", function () {
  updateCount();
  if (errKey && msg.value.trim()) setError("");
  if (statusKey === "ok" || statusKey === "fail" || statusKey === "offline") setStatus("");
});

form.addEventListener("submit", function (ev) {
  ev.preventDefault();
  if (busy || !key) return;
  const text = msg.value.trim();
  if (!text) { setError("empty"); msg.focus(); return; }
  setError("");

  const data = Object.fromEntries(new FormData(form));
  data.message = text;
  data.access_key = key;
  data.subject = "ATOMIX LAB: " + data.type;
  data.from_name = "ATOMIX LAB";
  data.language = I18N.lang;

  busy = true; syncSend();
  setStatus("sending");
  const ctrl = window.AbortController ? new AbortController() : null;
  const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT) : 0;
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(data),
    signal: ctrl ? ctrl.signal : undefined
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (body) {
      if (!res.ok || !body.success) throw new Error(body.message || "HTTP " + res.status);
    });
  }).then(function () {
    msg.value = "";
    updateCount();
    setStatus("ok", "ok");
  }, function (e) {
    console.error("feedback:", e);
    setStatus(e instanceof TypeError || (e && e.name === "AbortError") ? "offline" : "fail", "err");
  }).then(function () {
    clearTimeout(timer);
    busy = false; syncSend();
  });
});

updateCount();
syncSend();
if (!key) setStatus("off");

I18N.on(function () {
  updateCount();
  if (statusKey) status.textContent = TEXT[statusKey]();
  if (errKey) err.textContent = ERR[errKey]();
});
})();
