export interface Character {
  id: string;
  name: string;
  title: string;
  anime: string;
  image: string;
}

export interface Poll {
  id: string;
  title: string;
  anime: string;
  fighter1: Character;
  fighter2: Character;
}

export const POLLS: Poll[] = [
  {
    id: 'one-piece-1',
    title: 'Who is the true supreme ruler?',
    anime: 'One Piece',
    fighter1: {
      id: 'imu',
      name: 'Imu',
      title: 'Sovereign of the World',
      anime: 'One Piece',
      image: 'https://static.wikia.nocookie.net/onepiece/images/2/2e/Im_Anime_Infobox.png'
    },
    fighter2: {
      id: 'kaido',
      name: 'Kaido',
      title: 'King of the Beasts',
      anime: 'One Piece',
      image: 'https://static.wikia.nocookie.net/onepiece/images/9/9d/Kaido_Anime_Infobox.png'
    }
  },
  {
    id: 'naruto-1',
    title: 'Strongest Hokage',
    anime: 'Naruto',
    fighter1: {
      id: 'naruto',
      name: 'Naruto',
      title: '7th Hokage',
      anime: 'Naruto',
      image: 'https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_newshot.png'
    },
    fighter2: {
      id: 'madara',
      name: 'Madara',
      title: 'God of Shinobi',
      anime: 'Naruto',
      image: 'https://static.wikia.nocookie.net/naruto/images/3/35/Madara_Uchiha_Infobox.png'
    }
  },
  {
    id: 'dbz-1',
    title: 'Strongest Saiyan',
    anime: 'Dragon Ball Z',
    fighter1: {
      id: 'goku',
      name: 'Goku',
      title: 'Ultra Instinct',
      anime: 'Dragon Ball Z',
      image: 'https://static.wikia.nocookie.net/dragonball/images/5/5b/Goku_DB_Manga_Infobox.png'
    },
    fighter2: {
      id: 'vegeta',
      name: 'Vegeta',
      title: 'Prince of Saiyans',
      anime: 'Dragon Ball Z',
      image: 'https://static.wikia.nocookie.net/dragonball/images/e/e4/Vegeta_Manga_Infobox.png'
    }
  },
  {
    id: 'aot-1',
    title: 'Most Powerful Titan',
    anime: 'Attack on Titan',
    fighter1: {
      id: 'eren',
      name: 'Eren Yeager',
      title: 'The Founding Titan',
      anime: 'Attack on Titan',
      image: 'https://static.wikia.nocookie.net/shingekinokyojin/images/e/ec/Eren_Yeager_%28Anime%29_character_image.png'
    },
    fighter2: {
      id: 'reiner',
      name: 'Reiner Braun',
      title: 'Armored Titan',
      anime: 'Attack on Titan',
      image: 'https://static.wikia.nocookie.net/shingekinokyojin/images/a/a5/Reiner_Braun_character_image.png'
    }
  },
  {
    id: 'ds-1',
    title: 'Greatest Demon Slayer',
    anime: 'Demon Slayer',
    fighter1: {
      id: 'tanjiro',
      name: 'Tanjiro Kamado',
      title: 'Sun Breathing Master',
      anime: 'Demon Slayer',
      image: 'https://static.wikia.nocookie.net/kimetsu-no-yaiba/images/1/13/Tanjiro_anime_infobox.png'
    },
    fighter2: {
      id: 'muzan',
      name: 'Muzan Kibutsuji',
      title: 'Demon King',
      anime: 'Demon Slayer',
      image: 'https://static.wikia.nocookie.net/kimetsu-no-yaiba/images/3/3c/Muzan_Kibutsuji_anime_infobox.png'
    }
  }
];
