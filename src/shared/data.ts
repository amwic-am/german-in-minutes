// German In Minutes — shared content model.
// Static for now; shaped so it can later be served from Lovable Cloud tables.

export type LevelCode = "a1" | "a2" | "b1" | "b2" | "c1";

export interface Level {
  code: LevelCode;
  label: string;
  name: string;
  tagline: string;
  focus: string[];
  lessons: number;
  weeks: number;
}

export const LEVELS: Level[] = [
  {
    code: "a1",
    label: "A1",
    name: "Beginner",
    tagline: "First words, greetings, numbers",
    focus: [
      "Alphabet & pronunciation",
      "Greetings & introductions",
      "Numbers, time & dates",
      "Family & food",
      "Daily routine",
      "Basic grammar: present tense, articles",
      "Your first real conversations",
    ],
    lessons: 42,
    weeks: 6,
  },
  {
    code: "a2",
    label: "A2",
    name: "Elementary",
    tagline: "Daily life, past tense",
    focus: [
      "Everyday communication",
      "Travel & shopping",
      "Work & appointments",
      "Past tense (Perfekt & Präteritum)",
      "Modal verbs",
      "Longer conversations",
      "Basic writing: messages & emails",
    ],
    lessons: 56,
    weeks: 8,
  },
  {
    code: "b1",
    label: "B1",
    name: "Intermediate",
    tagline: "Opinions, travel, work",
    focus: [
      "Intermediate conversations",
      "Opinions & discussions",
      "Formal communication",
      "Complex grammar: subordinate clauses, Konjunktiv II",
      "Structured writing",
      "Listening comprehension at natural speed",
    ],
    lessons: 68,
    weeks: 10,
  },
  {
    code: "b2",
    label: "B2",
    name: "Upper Intermediate",
    tagline: "Nuance, debate, media",
    focus: [
      "Advanced conversation",
      "Professional German",
      "Arguments & presentations",
      "Advanced grammar & style",
      "Academic vocabulary",
      "News, podcasts & media comprehension",
    ],
    lessons: 76,
    weeks: 12,
  },
  {
    code: "c1",
    label: "C1",
    name: "Advanced",
    tagline: "Fluency, exam mastery",
    focus: [
      "Academic & professional German",
      "Complex texts & literature",
      "Presentations & debate",
      "Advanced writing: essays & reports",
      "High-level listening",
      "Exam-level precision",
    ],
    lessons: 84,
    weeks: 14,
  },
];

export function getLevel(code: string): Level | undefined {
  return LEVELS.find((l) => l.code === code.toLowerCase());
}

export interface Course {
  slug: string;
  level: string;
  levelName: string;
  title: string;
  description: string;
  price: number;
  currency: "USD";
  per: string;
  lessons: number;
  weeks: number;
  certificate: boolean;
  featured?: boolean;
  includes: string[];
  modules: { title: string; lessons: string[] }[];
}

export const COURSES: Course[] = [
  {
    slug: "german-foundations-a1",
    level: "A1",
    levelName: "Beginner",
    title: "German Foundations",
    description:
      "Build your first 600 words and hold a real conversation — from the alphabet to ordering dinner in Berlin.",
    price: 29,
    currency: "USD",
    per: "month",
    lessons: 42,
    weeks: 6,
    certificate: true,
    featured: true,
    includes: [
      "42 video lessons",
      "Downloadable PDFs & audio",
      "Interactive exercises & quizzes",
      "Speaking practice prompts",
      "A1 completion certificate",
    ],
    modules: [
      {
        title: "First Contact",
        lessons: ["The alphabet & sounds", "Greetings & introductions", "Numbers & time"],
      },
      {
        title: "Everyday Basics",
        lessons: ["Family & people", "Food & ordering", "Daily routine"],
      },
      {
        title: "Grammar Core",
        lessons: ["Articles: der, die, das", "Present tense", "Word order basics"],
      },
      {
        title: "Real Conversations",
        lessons: ["At the café", "Asking for directions", "Final assessment"],
      },
    ],
  },
  {
    slug: "daily-german-a2",
    level: "A2",
    levelName: "Elementary",
    title: "Daily German",
    description:
      "Handle everyday life in German — shopping, travel, appointments, and talking about the past.",
    price: 34,
    currency: "USD",
    per: "month",
    lessons: 56,
    weeks: 8,
    certificate: true,
    includes: [
      "56 video lessons",
      "Past-tense masterclass",
      "Travel & work dialogues",
      "Writing practice with feedback",
      "A2 completion certificate",
    ],
    modules: [
      {
        title: "Everyday Communication",
        lessons: ["Shopping & prices", "At the doctor", "Making appointments"],
      },
      {
        title: "Talking About the Past",
        lessons: ["Perfekt tense", "Präteritum: sein & haben", "Telling stories"],
      },
      {
        title: "Modal Verbs",
        lessons: ["können, müssen, wollen", "Polite requests", "Plans & obligations"],
      },
      {
        title: "Writing & Review",
        lessons: ["Messages & emails", "Describing your day", "Final assessment"],
      },
    ],
  },
  {
    slug: "everyday-fluency-b1",
    level: "B1",
    levelName: "Intermediate",
    title: "Everyday Fluency",
    description:
      "Talk about work, travel, and opinions with real confidence — the bridge to independent German.",
    price: 39,
    currency: "USD",
    per: "month",
    lessons: 68,
    weeks: 10,
    certificate: true,
    featured: true,
    includes: [
      "68 video lessons",
      "Opinion & discussion training",
      "Formal communication toolkit",
      "Listening at natural speed",
      "B1 completion certificate",
    ],
    modules: [
      {
        title: "Opinions & Discussions",
        lessons: ["Agreeing & disagreeing", "Giving reasons", "Debating politely"],
      },
      {
        title: "Grammar Depth",
        lessons: ["Subordinate clauses", "Konjunktiv II", "Passive voice"],
      },
      {
        title: "Formal German",
        lessons: ["Formal emails", "Phone calls", "Job applications"],
      },
      {
        title: "Fluency Practice",
        lessons: ["Presentations", "Storytelling", "Final assessment"],
      },
    ],
  },
  {
    slug: "professional-german-b2",
    level: "B2",
    levelName: "Upper Intermediate",
    title: "Professional German",
    description:
      "Argue, present, and negotiate — German for the workplace, university, and serious media.",
    price: 49,
    currency: "USD",
    per: "month",
    lessons: 76,
    weeks: 12,
    certificate: true,
    includes: [
      "76 video lessons",
      "Workplace communication",
      "Academic vocabulary builder",
      "News & podcast comprehension",
      "B2 completion certificate",
    ],
    modules: [
      {
        title: "Professional Communication",
        lessons: ["Meetings & negotiations", "Presenting ideas", "Small talk that works"],
      },
      {
        title: "Advanced Grammar",
        lessons: ["Nominalisierung", "Complex connectors", "Style & register"],
      },
      {
        title: "Media & Analysis",
        lessons: ["News articles", "Podcasts", "Argumentative texts"],
      },
      {
        title: "Mastery Review",
        lessons: ["Debate practice", "Long-form writing", "Final assessment"],
      },
    ],
  },
  {
    slug: "goethe-b1-preparation",
    level: "B1",
    levelName: "Exam Prep",
    title: "Goethe B1 Preparation",
    description:
      "Timed mock exams, examiner-style feedback, and a complete strategy for all four Goethe B1 sections.",
    price: 45,
    currency: "USD",
    per: "month",
    lessons: 48,
    weeks: 8,
    certificate: true,
    featured: true,
    includes: [
      "6 full timed mock exams",
      "Writing feedback on every essay",
      "Speaking simulations",
      "Section-by-section strategy",
      "Goethe B1 prep certificate",
    ],
    modules: [
      {
        title: "Lesen — Reading",
        lessons: ["Exam format & timing", "Skimming & scanning", "Practice set 1–3"],
      },
      {
        title: "Hören — Listening",
        lessons: ["Exam format & timing", "Note-taking strategy", "Practice set 1–3"],
      },
      {
        title: "Schreiben — Writing",
        lessons: ["Formal & informal letters", "Forums & opinions", "Model answers"],
      },
      {
        title: "Sprechen — Speaking",
        lessons: ["Presentation structure", "Discussion practice", "Full mock exam"],
      },
    ],
  },
  {
    slug: "goethe-c1-prep",
    level: "C1",
    levelName: "Advanced",
    title: "Goethe C1 Prep",
    description:
      "Timed mock exams and detailed feedback for your Goethe C1 attempt — precision at the highest level.",
    price: 59,
    currency: "USD",
    per: "month",
    lessons: 84,
    weeks: 12,
    certificate: true,
    includes: [
      "8 full timed mock exams",
      "Examiner-style essay reviews",
      "Academic speaking practice",
      "Advanced grammar clinics",
      "Goethe C1 prep certificate",
    ],
    modules: [
      {
        title: "Advanced Reading",
        lessons: ["Academic texts", "Inference & tone", "Timed practice"],
      },
      {
        title: "Advanced Listening",
        lessons: ["Lectures & interviews", "Note systems", "Timed practice"],
      },
      {
        title: "Academic Writing",
        lessons: ["Essay structure", "Argumentation", "Model answers"],
      },
      {
        title: "Exam Simulation",
        lessons: ["Full mock 1", "Full mock 2", "Final review"],
      },
    ],
  },
];

export const FEATURED_COURSES = COURSES.filter((c) => c.featured);

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export interface GoetheLevel {
  code: LevelCode;
  label: string;
  title: string;
  overview: string;
  sections: { name: string; german: string; minutes: number; description: string }[];
  strategy: string[];
}

export const GOETHE_LEVELS: GoetheLevel[] = [
  {
    code: "a1",
    label: "A1",
    title: "Goethe A1 — Start Deutsch 1",
    overview:
      "The first milestone: prove you can handle simple, everyday German. Ideal for visas, family reunification, and your first certificate.",
    sections: [
      { name: "Reading", german: "Lesen", minutes: 25, description: "Short texts, ads, and notices with true/false and matching tasks." },
      { name: "Listening", german: "Hören", minutes: 20, description: "Everyday conversations and announcements played twice." },
      { name: "Writing", german: "Schreiben", minutes: 20, description: "Fill in a form and write a short personal message." },
      { name: "Speaking", german: "Sprechen", minutes: 15, description: "Introduce yourself, ask and answer simple questions in a group." },
    ],
    strategy: [
      "Master the 650-word official A1 word list first",
      "Practice filling forms — free points if you know the format",
      "Memorize 10 self-introduction sentences until they're automatic",
      "Take at least 2 full timed mocks before exam day",
    ],
  },
  {
    code: "a2",
    label: "A2",
    title: "Goethe A2 — Start Deutsch 2",
    overview:
      "Show you can manage routine situations: shopping, work, travel, and simple exchanges about familiar topics.",
    sections: [
      { name: "Reading", german: "Lesen", minutes: 30, description: "Emails, ads, and short articles with comprehension questions." },
      { name: "Listening", german: "Hören", minutes: 30, description: "Dialogues and announcements at near-natural speed." },
      { name: "Writing", german: "Schreiben", minutes: 30, description: "A short message and a semi-formal email." },
      { name: "Speaking", german: "Sprechen", minutes: 15, description: "Talk about your life and complete a joint task with a partner." },
    ],
    strategy: [
      "Drill Perfekt vs. Präteritum until the choice is instant",
      "Learn the 30 most common email openers and closers",
      "Record yourself weekly and compare against native audio",
      "Simulate the partner speaking task with a study buddy",
    ],
  },
  {
    code: "b1",
    label: "B1",
    title: "Goethe B1 — Zertifikat Deutsch",
    overview:
      "The independence threshold — required for many jobs, universities of applied sciences, and permanent residency in Germany.",
    sections: [
      { name: "Reading", german: "Lesen", minutes: 65, description: "Five parts: blogs, ads, opinions, and matching tasks." },
      { name: "Listening", german: "Hören", minutes: 40, description: "Four parts including radio pieces and everyday dialogues." },
      { name: "Writing", german: "Schreiben", minutes: 60, description: "Informal letter, forum post, and formal message." },
      { name: "Speaking", german: "Sprechen", minutes: 15, description: "Presentation, discussion, and joint planning with a partner." },
    ],
    strategy: [
      "Learn the fixed structure of all three writing tasks",
      "Build a bank of 40 opinion phrases with Redemittel",
      "Practice the 3-minute presentation weekly on new topics",
      "Review every mock exam mistake within 24 hours",
    ],
  },
  {
    code: "b2",
    label: "B2",
    title: "Goethe B2 — Zertifikat B2",
    overview:
      "Professional-level German: argue a position, understand the news, and write structured texts — the level employers trust.",
    sections: [
      { name: "Reading", german: "Lesen", minutes: 90, description: "Articles, commentaries, and detailed matching tasks." },
      { name: "Listening", german: "Hören", minutes: 40, description: "Lectures, interviews, and discussions at full speed." },
      { name: "Writing", german: "Schreiben", minutes: 80, description: "An opinion essay and a formal message or complaint." },
      { name: "Speaking", german: "Sprechen", minutes: 15, description: "Presentation on a complex topic plus structured debate." },
    ],
    strategy: [
      "Read one German news article daily and summarize it aloud",
      "Master Nominalstil — it separates B2 essays from B1 essays",
      "Build topic vocab for the 10 recurring exam themes",
      "Do full 4-hour exam simulations to build stamina",
    ],
  },
  {
    code: "c1",
    label: "C1",
    title: "Goethe C1 — Zertifikat C1",
    overview:
      "Near-native precision for academic and professional life: complex texts, nuanced argument, and effortless fluency.",
    sections: [
      { name: "Reading", german: "Lesen", minutes: 70, description: "Long academic and literary texts with inference questions." },
      { name: "Listening", german: "Hören", minutes: 55, description: "Lectures and panel discussions with detailed note tasks." },
      { name: "Writing", german: "Schreiben", minutes: 80, description: "A structured academic essay with argument and counter-argument." },
      { name: "Speaking", german: "Sprechen", minutes: 20, description: "Academic presentation and defense of your position." },
    ],
    strategy: [
      "Study with authentic material only — no simplified texts",
      "Write two essays per week and get every one corrected",
      "Learn to hedge, concede, and qualify arguments elegantly",
      "Book at least 4 full mock exams in the final month",
    ],
  },
];

export function getGoetheLevel(code: string): GoetheLevel | undefined {
  return GOETHE_LEVELS.find((l) => l.code === code.toLowerCase());
}

export interface Skill {
  slug: string;
  name: string;
  description: string;
  details: string[];
}

export const SKILLS: Skill[] = [
  {
    slug: "listening",
    name: "Listening",
    description: "Train your ear with native audio at every speed, from slow to natural.",
    details: ["Graded audio from A1 to C1", "Replay & transcript for every exercise", "Comprehension questions with explanations"],
  },
  {
    slug: "reading",
    name: "Reading",
    description: "Stories and articles tuned to your level with instant glossary taps.",
    details: ["Graded texts from dialogues to news", "Tap any word for translation", "Comprehension quiz after every text"],
  },
  {
    slug: "writing",
    name: "Writing",
    description: "Compose, get corrected line-by-line, and learn from your own mistakes.",
    details: ["Guided prompts for every level", "Model answers to compare against", "Exam-style tasks for Goethe candidates"],
  },
  {
    slug: "speaking",
    name: "Speaking",
    description: "Shadow real dialogue and record yourself against a native model.",
    details: ["Record & compare with native audio", "Guided speaking prompts", "Goethe presentation & discussion practice"],
  },
  {
    slug: "grammar",
    name: "Grammar",
    description: "Cases, tenses, word order — explained once, drilled until it sticks.",
    details: ["Full library from articles to Konjunktiv", "Examples first, rules second", "Targeted drills for your weak spots"],
  },
  {
    slug: "vocabulary",
    name: "Vocabulary",
    description: "Spaced repetition that resurfaces the words you keep forgetting.",
    details: ["4,200 core words with audio", "Save words & build your own lists", "Review queue tuned to your memory"],
  },
];

export const TESTIMONIALS = [
  {
    quote: "Passed my B1 Goethe exam on the first try. The mock tests felt exactly like the real thing.",
    name: "Marta Kowalski",
    meta: "Kraków, Poland · B1",
    initial: "M",
  },
  {
    quote: "Ten minutes on the commute got me to A2 in a month. No fluff, just structure.",
    name: "Tomás Ferreira",
    meta: "Lisbon, Portugal · A2",
    initial: "T",
  },
  {
    quote: "The speaking feedback finally made my pronunciation click. I actually sound German now.",
    name: "Aisha Rahman",
    meta: "Dubai, UAE · B2",
    initial: "A",
  },
];

export const FAQS = [
  {
    q: "Do the courses prepare me for the Goethe exam?",
    a: "Yes — every track maps to A1–C1 exam criteria, and our prep courses add timed mocks and examiner-style feedback.",
  },
  {
    q: "How much time do I need each day?",
    a: "Ten focused minutes a day is enough to keep momentum; most learners reach the next level in 6–10 weeks.",
  },
  {
    q: "Which currencies can I pay in?",
    a: "Prices are shown in US dollars; checkout supports cards and local payment methods.",
  },
  {
    q: "Is the GIM certificate the same as a Goethe certificate?",
    a: "No. Our certificates confirm course completion. The Goethe-Zertifikat is issued only by the Goethe-Institut — we prepare you to pass it.",
  },
  {
    q: "Can I switch levels after I start?",
    a: "Anytime. Take the placement quiz and your dashboard adapts to the new level immediately.",
  },
];

export const BLOG_POSTS = [
  {
    slug: "der-die-das-guide",
    category: "German Grammar",
    title: "Der, Die, Das: The Only Guide You Need",
    excerpt: "Stop guessing articles. These 7 patterns predict the gender of 80% of German nouns.",
    date: "2026-09-12",
    readTime: "6 min",
  },
  {
    slug: "goethe-b1-speaking-strategy",
    category: "Goethe Exam",
    title: "Goethe B1 Speaking: What Examiners Actually Score",
    excerpt: "We analyzed the official scoring criteria. Here's where most candidates lose points — and how to win them back.",
    date: "2026-09-05",
    readTime: "9 min",
  },
  {
    slug: "100-words-first-month",
    category: "German Vocabulary",
    title: "The 100 Words That Cover Half of Daily German",
    excerpt: "Frequency beats volume. Learn these first and every conversation gets easier.",
    date: "2026-08-28",
    readTime: "5 min",
  },
  {
    slug: "listening-faster",
    category: "German Listening",
    title: "Why Native German Sounds Fast — and How to Catch Up",
    excerpt: "Connected speech, swallowed syllables, and the 3 drills that retrain your ear.",
    date: "2026-08-20",
    readTime: "7 min",
  },
  {
    slug: "speaking-alone",
    category: "German Speaking",
    title: "How to Practice Speaking When You Have No Partner",
    excerpt: "Shadowing, self-talk scripts, and recording routines that actually build fluency solo.",
    date: "2026-08-11",
    readTime: "8 min",
  },
  {
    slug: "a1-to-b1-roadmap",
    category: "German Learning Tips",
    title: "A1 to B1 in 9 Months: A Realistic Roadmap",
    excerpt: "Week-by-week milestones, the resources that matter, and the mistakes that cost learners months.",
    date: "2026-08-02",
    readTime: "11 min",
  },
];

export const PRICING_PLANS = [
  {
    name: "Free",
    price: 0,
    per: "forever",
    tagline: "Start learning today",
    features: ["Free A1 starter lessons", "Free German PDF pack", "Daily vocabulary practice", "Blog & social content"],
    cta: "Start Learning Free",
    highlighted: false,
  },
  {
    name: "Course",
    price: 39,
    per: "month",
    tagline: "One level, fully mastered",
    features: [
      "One complete level course (A1–C1)",
      "Videos, PDFs, audio & quizzes",
      "Speaking practice prompts",
      "Progress tracking & streaks",
      "Completion certificate",
    ],
    cta: "Choose Your Course",
    highlighted: true,
  },
  {
    name: "Complete German",
    price: 99,
    per: "month",
    tagline: "Everything, A1 to C1",
    features: [
      "All 5 level courses",
      "All Goethe prep courses & mock exams",
      "Priority writing feedback",
      "Full vocabulary engine",
      "All certificates included",
    ],
    cta: "Go Complete",
    highlighted: false,
  },
];
