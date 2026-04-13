import type { ImageMetadata } from 'astro';

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
    items: [],
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
