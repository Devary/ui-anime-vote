export interface Character {
  id: string;
  name: string;
  title: string;
  anime: string;
  image: string;
}

export interface Poll {
  id: string;
  anime: string;
  question: string;
  fighter1: Character;
  fighter2: Character;
}

const W = (wiki: string, path: string) =>
  `https://static.wikia.nocookie.net/${wiki}/images/${path}`;

const PH = (name: string, hex: string) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `https://placehold.co/300x300/${hex}/ffffff?text=${encodeURIComponent(initials)}&font=montserrat`;
};

export const CHARACTERS: Character[] = [
  // ── One Piece ─────────────────────────────────────────────────────────────
  { id: 'imu',        name: 'Imu',                   title: 'Sovereign of the World',      anime: 'One Piece',            image: W('onepiece', '2/2e/Im_Anime_Infobox.png') },
  { id: 'kaido',      name: 'Kaido',                 title: 'King of the Beasts',          anime: 'One Piece',            image: W('onepiece', '9/9d/Kaido_Anime_Infobox.png') },
  { id: 'luffy',      name: 'Monkey D. Luffy',       title: 'King of the Pirates',         anime: 'One Piece',            image: W('onepiece', '6/6d/Monkey_D._Luffy_Anime_Post_Timeskip_Infobox.png') },
  { id: 'zoro',       name: 'Roronoa Zoro',          title: "World's Greatest Swordsman",  anime: 'One Piece',            image: W('onepiece', '3/35/Roronoa_Zoro_Anime_Post_Timeskip_Infobox.png') },
  { id: 'shanks',     name: 'Shanks',                title: 'Red-Haired Emperor',          anime: 'One Piece',            image: W('onepiece', 'd/da/Shanks_Anime_Infobox.png') },
  { id: 'whitebeard', name: 'Whitebeard',            title: "World's Strongest Man",       anime: 'One Piece',            image: W('onepiece', 'e/e7/Edward_Newgate_Anime_Infobox.png') },
  { id: 'ace',        name: 'Portgas D. Ace',        title: 'Fire Fist',                   anime: 'One Piece',            image: W('onepiece', '2/2c/Portgas_D._Ace_Anime_Infobox.png') },
  { id: 'blackbeard', name: 'Blackbeard',            title: 'Emperor of the Sea',          anime: 'One Piece',            image: W('onepiece', '7/74/Marshall_D._Teach_Anime_Infobox.png') },
  { id: 'doflamingo', name: 'Doflamingo',            title: 'Heavenly Demon',              anime: 'One Piece',            image: W('onepiece', '8/8f/Donquixote_Doflamingo_Anime_Infobox.png') },
  { id: 'katakuri',   name: 'Charlotte Katakuri',    title: 'Sweet Commander',             anime: 'One Piece',            image: W('onepiece', '4/4b/Charlotte_Katakuri_Anime_Infobox.png') },
  { id: 'bigmom',     name: 'Big Mom',               title: 'Empress of Totto Land',       anime: 'One Piece',            image: W('onepiece', '0/0b/Charlotte_Linlin_Anime_Infobox.png') },

  // ── Naruto ────────────────────────────────────────────────────────────────
  { id: 'naruto',     name: 'Naruto Uzumaki',        title: '7th Hokage',                  anime: 'Naruto',               image: W('naruto', 'd/d6/Naruto_newshot.png') },
  { id: 'sasuke',     name: 'Sasuke Uchiha',         title: 'Last Uchiha',                 anime: 'Naruto',               image: W('naruto', '2/21/Sasuke_newshot.png') },
  { id: 'madara',     name: 'Madara Uchiha',         title: 'God of Shinobi',              anime: 'Naruto',               image: W('naruto', '3/35/Madara_Uchiha_Infobox.png') },
  { id: 'itachi',     name: 'Itachi Uchiha',         title: 'Prodigy of the Uchiha',       anime: 'Naruto',               image: W('naruto', 'b/bb/Itachi_Infobox.PNG') },
  { id: 'minato',     name: 'Minato Namikaze',       title: 'Yellow Flash',                anime: 'Naruto',               image: W('naruto', 'b/b4/Minato_Namikaze.png') },
  { id: 'pain',       name: 'Pain',                  title: 'God of the Akatsuki',         anime: 'Naruto',               image: W('naruto', 'b/bf/Pain.png') },
  { id: 'obito',      name: 'Obito Uchiha',          title: 'Ten-Tails Jinchuriki',        anime: 'Naruto',               image: W('naruto', 'c/c5/Obito_newshot.png') },
  { id: 'hashirama',  name: 'Hashirama Senju',       title: 'God of Shinobi (1st)',        anime: 'Naruto',               image: PH('Hashirama', 'f97316') },

  // ── Dragon Ball Z ─────────────────────────────────────────────────────────
  { id: 'goku',       name: 'Son Goku',              title: 'Ultra Instinct',              anime: 'Dragon Ball Z',        image: W('dragonball', '5/5b/Goku_DB_Manga_Infobox.png') },
  { id: 'vegeta',     name: 'Vegeta',                title: 'Prince of Saiyans',           anime: 'Dragon Ball Z',        image: W('dragonball', 'e/e4/Vegeta_Manga_Infobox.png') },
  { id: 'broly',      name: 'Broly',                 title: 'Legendary Super Saiyan',      anime: 'Dragon Ball Z',        image: PH('Broly',    '4338ca') },
  { id: 'frieza',     name: 'Frieza',                title: 'Emperor of the Universe',     anime: 'Dragon Ball Z',        image: PH('Frieza',   '4338ca') },
  { id: 'beerus',     name: 'Beerus',                title: 'God of Destruction',          anime: 'Dragon Ball Z',        image: PH('Beerus',   '4338ca') },
  { id: 'jiren',      name: 'Jiren',                 title: 'Pride Trooper',               anime: 'Dragon Ball Z',        image: PH('Jiren',    '4338ca') },
  { id: 'gohan',      name: 'Gohan',                 title: 'Beast Gohan',                 anime: 'Dragon Ball Z',        image: PH('Gohan',    '4338ca') },
  { id: 'cell',       name: 'Cell',                  title: 'Perfect Form',                anime: 'Dragon Ball Z',        image: PH('Cell',     '4338ca') },

  // ── Attack on Titan ───────────────────────────────────────────────────────
  { id: 'eren',       name: 'Eren Yeager',           title: 'The Founding Titan',          anime: 'Attack on Titan',      image: W('shingekinokyojin', 'e/ec/Eren_Yeager_%28Anime%29_character_image.png') },
  { id: 'levi',       name: 'Levi Ackerman',         title: "Humanity's Strongest",        anime: 'Attack on Titan',      image: W('shingekinokyojin', '4/4f/Levi_Ackerman_%28Anime%29_character_image.png') },
  { id: 'mikasa',     name: 'Mikasa Ackerman',       title: 'Ace Soldier',                 anime: 'Attack on Titan',      image: W('shingekinokyojin', '2/2b/Mikasa_Ackerman_%28Anime%29_character_image.png') },
  { id: 'zeke',       name: 'Zeke Yeager',           title: 'Beast Titan',                 anime: 'Attack on Titan',      image: PH('Zeke',    '6b7280') },
  { id: 'armin',      name: 'Armin Arlert',          title: 'Commander of Survey Corps',   anime: 'Attack on Titan',      image: PH('Armin',   '6b7280') },
  { id: 'reiner',     name: 'Reiner Braun',          title: 'Armored Titan',               anime: 'Attack on Titan',      image: W('shingekinokyojin', 'a/a5/Reiner_Braun_character_image.png') },

  // ── Demon Slayer ──────────────────────────────────────────────────────────
  { id: 'tanjiro',    name: 'Tanjiro Kamado',        title: 'Sun Breathing Master',        anime: 'Demon Slayer',         image: W('kimetsu-no-yaiba', '1/13/Tanjiro_anime_infobox.png') },
  { id: 'muzan',      name: 'Muzan Kibutsuji',       title: 'Demon King',                  anime: 'Demon Slayer',         image: W('kimetsu-no-yaiba', '3/3c/Muzan_Kibutsuji_anime_infobox.png') },
  { id: 'rengoku',    name: 'Rengoku Kyojuro',       title: 'Flame Hashira',               anime: 'Demon Slayer',         image: PH('Rengoku', 'dc2626') },
  { id: 'gyomei',     name: 'Gyomei Himejima',       title: 'Stone Hashira',               anime: 'Demon Slayer',         image: PH('Gyomei',  'dc2626') },
  { id: 'doma',       name: 'Doma',                  title: 'Upper Moon Two',              anime: 'Demon Slayer',         image: PH('Doma',    'dc2626') },
  { id: 'kokushibo',  name: 'Kokushibo',             title: 'Upper Moon One',              anime: 'Demon Slayer',         image: PH('Kokushibo','dc2626') },

  // ── Bleach ────────────────────────────────────────────────────────────────
  { id: 'ichigo',     name: 'Ichigo Kurosaki',       title: 'Substitute Soul Reaper',      anime: 'Bleach',               image: PH('Ichigo',   '7c3aed') },
  { id: 'aizen',      name: 'Sosuke Aizen',          title: 'Hogyoku Transcendent',        anime: 'Bleach',               image: PH('Aizen',    '7c3aed') },
  { id: 'byakuya',    name: 'Byakuya Kuchiki',       title: 'Head of Kuchiki Clan',        anime: 'Bleach',               image: PH('Byakuya',  '7c3aed') },
  { id: 'yhwach',     name: 'Yhwach',                title: 'King of Quincy',              anime: 'Bleach',               image: PH('Yhwach',   '7c3aed') },
  { id: 'zaraki',     name: 'Kenpachi Zaraki',       title: 'Captain of Squad 11',         anime: 'Bleach',               image: PH('Zaraki',   '7c3aed') },

  // ── My Hero Academia ──────────────────────────────────────────────────────
  { id: 'allmight',   name: 'All Might',             title: 'Symbol of Peace',             anime: 'My Hero Academia',     image: PH('All Might', '1d4ed8') },
  { id: 'deku',       name: 'Izuku Midoriya',        title: 'Deku',                        anime: 'My Hero Academia',     image: PH('Deku',       '1d4ed8') },
  { id: 'bakugo',     name: 'Katsuki Bakugo',        title: 'Dynamight',                   anime: 'My Hero Academia',     image: PH('Bakugo',     '1d4ed8') },
  { id: 'shigaraki',  name: 'Tomura Shigaraki',      title: 'League of Villains Leader',   anime: 'My Hero Academia',     image: PH('Shigaraki',  '1d4ed8') },
  { id: 'todoroki',   name: 'Shoto Todoroki',        title: 'Half-Cold Half-Hot',          anime: 'My Hero Academia',     image: PH('Todoroki',   '1d4ed8') },

  // ── Jujutsu Kaisen ────────────────────────────────────────────────────────
  { id: 'gojo',       name: 'Satoru Gojo',           title: 'Strongest Sorcerer',          anime: 'Jujutsu Kaisen',       image: PH('Gojo',    '0f766e') },
  { id: 'sukuna',     name: 'Ryomen Sukuna',         title: 'King of Curses',              anime: 'Jujutsu Kaisen',       image: PH('Sukuna',  '0f766e') },
  { id: 'yuji',       name: 'Yuji Itadori',          title: "Sukuna's Vessel",             anime: 'Jujutsu Kaisen',       image: PH('Yuji',    '0f766e') },
  { id: 'yuta',       name: 'Yuta Okkotsu',          title: 'Special Grade Sorcerer',      anime: 'Jujutsu Kaisen',       image: PH('Yuta',    '0f766e') },
  { id: 'megumi',     name: 'Megumi Fushiguro',      title: 'Ten Shadows Sorcerer',        anime: 'Jujutsu Kaisen',       image: PH('Megumi',  '0f766e') },

  // ── Hunter x Hunter ───────────────────────────────────────────────────────
  { id: 'gon',        name: 'Gon Freecss',           title: 'Hunter',                      anime: 'Hunter x Hunter',      image: PH('Gon',     '10b981') },
  { id: 'killua',     name: 'Killua Zoldyck',        title: 'Assassin Hunter',             anime: 'Hunter x Hunter',      image: PH('Killua',  '10b981') },
  { id: 'hisoka',     name: 'Hisoka Morow',          title: 'Magician',                    anime: 'Hunter x Hunter',      image: PH('Hisoka',  '10b981') },
  { id: 'meruem',     name: 'Meruem',                title: 'King of Chimera Ants',        anime: 'Hunter x Hunter',      image: PH('Meruem',  '10b981') },
  { id: 'netero',     name: 'Isaac Netero',          title: 'Hunter Association Chairman', anime: 'Hunter x Hunter',      image: PH('Netero',  '10b981') },
  { id: 'chrollo',    name: 'Chrollo Lucilfer',      title: 'Leader of Phantom Troupe',    anime: 'Hunter x Hunter',      image: PH('Chrollo', '10b981') },

  // ── Fullmetal Alchemist ───────────────────────────────────────────────────
  { id: 'edward',     name: 'Edward Elric',          title: 'Fullmetal Alchemist',         anime: 'Fullmetal Alchemist',  image: PH('Edward',   'd97706') },
  { id: 'roy',        name: 'Roy Mustang',           title: 'Flame Alchemist',             anime: 'Fullmetal Alchemist',  image: PH('Roy',      'd97706') },
  { id: 'father',     name: 'Father',                title: 'Dwarf in the Flask',          anime: 'Fullmetal Alchemist',  image: PH('Father',   'd97706') },
  { id: 'scar',       name: 'Scar',                  title: 'Ishvalan Warrior',            anime: 'Fullmetal Alchemist',  image: PH('Scar',     'd97706') },
];

const QUESTIONS = [
  'Who would win in a fight?',
  'Who is the strongest?',
  'Who is more powerful?',
  'Who is the greatest warrior?',
  'Who would you side with?',
  'Who has the superior power?',
  'Who would survive?',
  'Who is more iconic?',
  'Who is the fan favorite?',
  'Who is the better fighter?',
  'Who would you want on your team?',
  'Who would rule the world?',
  'Who is the bigger threat?',
  'Who has the better power set?',
  'Who is the most feared?',
];

function seededShuffle<T>(arr: T[], seed = 42): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1) ^ Math.imul(s ^ (s << 7), s | 1);
    s ^= s >>> 16;
    const j = (s >>> 0) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePolls(): Poll[] {
  const chars = CHARACTERS;
  const pairs: Array<[Character, Character]> = [];
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      pairs.push([chars[i], chars[j]]);
    }
  }

  // Always put Imu vs Kaido first
  const featuredIdx = pairs.findIndex(
    ([a, b]) => (a.id === 'imu' && b.id === 'kaido') || (a.id === 'kaido' && b.id === 'imu')
  );
  const [featured] = pairs.splice(featuredIdx, 1);

  const shuffled = seededShuffle(pairs, 1337);
  const selection: Array<[Character, Character]> = [featured, ...shuffled.slice(0, 149)];

  return selection.map(([f1, f2], i) => ({
    id: [f1.id, f2.id].sort().join('-vs-'),
    anime: f1.anime === f2.anime ? f1.anime : `${f1.anime} × ${f2.anime}`,
    question: QUESTIONS[i % QUESTIONS.length],
    fighter1: f1,
    fighter2: f2,
  }));
}

export const POLLS: Poll[] = generatePolls();
