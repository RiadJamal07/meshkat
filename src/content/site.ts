import type { ImageMetadata } from 'astro';

import andalusianPinkQuran from '~/assets/work/andalusian-pink-quran.jpg';
import damascusIncenseBurner from '~/assets/work/damascus-incense-burner.jpg';
import iznikSazTile from '~/assets/work/iznik-saz-tile.jpg';
import mamlukQuranFolio from '~/assets/work/mamluk-quran-folio.jpg';
import persianBindingFlap from '~/assets/work/persian-binding-flap.jpg';
import qajarSiyahMashq from '~/assets/work/qajar-siyah-mashq.jpg';

export type Bilingual = {
  en: string;
  ar: string;
};

export type NavLink = {
  href: string;
  label: Bilingual;
};

export type WorkItem = {
  id: string;
  title: Bilingual;
  client: Bilingual;
  discipline: Bilingual;
  year: string;
  /** Image metadata from an ES import; added by the team as assets land. */
  image?: ImageMetadata;
  /** Attribution for open-source / public-domain source imagery. */
  credit?: {
    source: string;
    url: string;
    license: string;
  };
};

export type Site = {
  name: Bilingual;
  tagline: Bilingual;
  description: Bilingual;
  nav: NavLink[];
  hero: {
    eyebrow: Bilingual;
    headline: Bilingual;
    sub: Bilingual;
    cta: {
      label: Bilingual;
      href: string;
    };
  };
  manifesto: {
    title: Bilingual;
    body: Bilingual[];
  };
  work: {
    title: Bilingual;
    sub: Bilingual;
    items: WorkItem[];
  };
  contact: {
    title: Bilingual;
    sub: Bilingual;
    email: string;
    instagram: string;
    location: Bilingual;
  };
  footer: {
    note: Bilingual;
  };
};

export const site: Site = {
  name: {
    en: 'Meshkat Studio',
    ar: 'مشكاة',
  },
  tagline: {
    en: 'A design studio in Tripoli.',
    ar: 'استوديو تصميم في طرابلس.',
  },
  description: {
    en: 'Meshkat is a design studio in Tripoli, Lebanon. We make brand, print, and digital work for people who think carefully.',
    ar: 'مشكاة استوديو تصميم في طرابلس، لبنان. نصمّم الهويات والمطبوعات والتجارب الرقمية لمن يفكّر بأناة.',
  },
  nav: [
    { href: '#work', label: { en: 'Work', ar: 'الأعمال' } },
    { href: '#manifesto', label: { en: 'Studio', ar: 'الاستوديو' } },
    { href: '#contact', label: { en: 'Contact', ar: 'تواصل' } },
  ],
  hero: {
    eyebrow: {
      en: 'Design studio · Tripoli · Est. 2026',
      ar: 'استوديو تصميم · طرابلس · تأسّس ٢٠٢٦',
    },
    headline: {
      en: 'A place for careful making.',
      ar: 'مكان للصنع المُتأنّي.',
    },
    sub: {
      en: 'Brand, print, and digital — made in the old city, for the world.',
      ar: 'هويّات ومطبوعات وتصميم رقمي، نصنعها في المدينة القديمة لكلّ العالم.',
    },
    cta: {
      label: { en: 'See the work', ar: 'شاهد الأعمال' },
      href: '#work',
    },
  },
  manifesto: {
    title: {
      en: 'The studio.',
      ar: 'الاستوديو.',
    },
    body: [
      {
        en: 'Tripoli is not a footnote. It is a city that has been arguing about beauty, geometry, and the written line for a thousand years. Meshkat is a small studio that takes that argument seriously and tries to make work worthy of it.',
        ar: 'طرابلس ليست حاشيةً. هي مدينة تتجادل حول الجمال والهندسة والخطّ منذ ألف عام. مشكاة استوديو صغير يأخذ هذا الجدل على محمل الجدّ ويحاول أن يصنع عملاً يليق به.',
      },
      {
        en: 'We work slowly, on purpose. We believe a mark should outlive a trend, and that the best brief is the one the client did not know how to write.',
        ar: 'نعمل ببطء، عن قصد. نؤمن بأنّ العلامة يجب أن تبقى بعد موضةٍ، وأنّ أفضل طلب هو الذي لم يعرف العميل كيف يصوغه.',
      },
    ],
  },
  work: {
    title: {
      en: 'Selected work.',
      ar: 'مختارات.',
    },
    sub: {
      en: 'Influences, studies, and work in progress — shown as a curation until the commissioned archive lands.',
      ar: 'تأثيرات، دراسات، وأعمال قيد التنفيذ — معروضة كتنسيق حتى يكتمل أرشيف الأعمال المُكلَّفة.',
    },
    items: [
      {
        id: 'mamluk-quran-folio',
        title: {
          en: 'Folio from a Mamluk Qur\u2019an',
          ar: 'صفحة من مصحف مملوكيّ',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Manuscript folio \u00b7 naskhi inside cloud-bands',
          ar: 'صفحة مخطوط \u00b7 خطّ النسخ داخل سُحُب مزخرفة',
        },
        year: '14th c.',
        image: mamlukQuranFolio,
        credit: {
          source: 'The Metropolitan Museum of Art \u2014 1975.29.1',
          url: 'https://www.metmuseum.org/art/collection/search/452704',
          license: 'CC0',
        },
      },
      {
        id: 'andalusian-pink-quran',
        title: {
          en: 'Bifolium from the Andalusian Pink Qur\u2019an',
          ar: 'صفحتان من المصحف الأندلسيّ الورديّ',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Manuscript bifolium \u00b7 maghribi script on pink paper',
          ar: 'ورقة مزدوجة \u00b7 الخطّ المغربيّ على ورق ورديّ',
        },
        year: '13th c.',
        image: andalusianPinkQuran,
        credit: {
          source: 'The Metropolitan Museum of Art',
          url: 'https://www.metmuseum.org/art/collection/search/751641',
          license: 'CC0',
        },
      },
      {
        id: 'iznik-saz-tile',
        title: {
          en: 'Border tiles with saz-leaf design',
          ar: 'بلاطات إزنيك بنقش ورق الساز',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Iznik tile panel \u00b7 polychrome underglaze',
          ar: 'نقش قاشانيّ من إزنيك \u00b7 تلوين تحت الطلاء',
        },
        year: '16th c.',
        image: iznikSazTile,
        credit: {
          source: 'The Metropolitan Museum of Art \u2014 1997.307a, b',
          url: 'https://www.metmuseum.org/art/collection/search/453400',
          license: 'CC0',
        },
      },
      {
        id: 'damascus-incense-burner',
        title: {
          en: 'Inlaid brass incense burner',
          ar: 'مِبخَرة نحاسيّة مُطعَّمة',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Metalwork \u00b7 brass inlaid with silver and gold',
          ar: 'مشغولات معدنيّة \u00b7 نحاس مطعَّم بالفضّة والذهب',
        },
        year: 'late 13th c.',
        image: damascusIncenseBurner,
        credit: {
          source: 'The Metropolitan Museum of Art',
          url: 'https://www.metmuseum.org/art/collection/search/447008',
          license: 'CC0',
        },
      },
      {
        id: 'persian-binding-flap',
        title: {
          en: 'Flap of a Persian bookbinding',
          ar: 'لسان تجليد فارسيّ',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Bookbinding \u00b7 painted, gilded, and lacquered leather',
          ar: 'تجليد \u00b7 جلد ملوّن ومُذهَّب ومُلكَّر',
        },
        year: '16th c.',
        image: persianBindingFlap,
        credit: {
          source: 'The Metropolitan Museum of Art \u2014 64.190',
          url: 'https://www.metmuseum.org/art/collection/search/451754',
          license: 'CC0',
        },
      },
      {
        id: 'qajar-siyah-mashq',
        title: {
          en: 'Album page \u2014 siyah mashq',
          ar: 'صفحة ألبوم \u2014 سياه مشق',
        },
        client: { en: 'Reference', ar: 'مرجع' },
        discipline: {
          en: 'Calligraphy exercise \u00b7 nasta\u2019liq in ink and gold',
          ar: 'تمرين خطّيّ \u00b7 النستعليق بالحبر والذهب',
        },
        year: '1844',
        image: qajarSiyahMashq,
        credit: {
          source: 'The Metropolitan Museum of Art \u2014 2016.535',
          url: 'https://www.metmuseum.org/art/collection/search/716305',
          license: 'CC0',
        },
      },
    ],
  },
  contact: {
    title: {
      en: 'The door is open.',
      ar: 'البابُ مفتوح.',
    },
    sub: {
      en: 'For commissions, collaborations, or coffee — write to us.',
      ar: 'للتكليفات أو التعاون أو فنجان قهوة، اكتبوا إلينا.',
    },
    email: 'hello@meshkat.studio',
    instagram: '@meshkat.studio',
    location: {
      en: 'Old City, Tripoli, Lebanon',
      ar: 'المدينة القديمة، طرابلس، لبنان',
    },
  },
  footer: {
    note: {
      en: 'Made in Tripoli.',
      ar: 'صُنع في طرابلس.',
    },
  },
};
