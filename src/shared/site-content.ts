import { z } from "zod";
import { COURSES } from "./data";
export const SITE_CONTENT_KEY = "public_site_content";
export function safeWebLink(value: string) { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } }
export function safeSiteLink(value: string) { return /^\/(?!\/)[a-zA-Z0-9_/?=&%.$#-]*$/.test(value) && !value.includes("\\"); }
const text = z.string().max(2000);
const destination = z.string().refine(safeSiteLink, "Choose a page on this site");
const image = z.string().refine(v => v.startsWith("/images/") && !v.includes("..") || safeWebLink(v), "Use a public image path or HTTPS image URL");
const action = z.object({ label: text, to: destination });
const courseSlugs = z.array(z.string().refine(v => COURSES.some(c => c.slug === v), "Unknown course")).max(30);
const banner = z.object({ kicker: text, title: text, copy: text, body: text, action: text, image, to: destination });
const footerLink = z.object({ label: text, to: destination, params: z.record(z.string()).optional(), search: z.record(z.string()).optional(), badge: text.optional() });
export const siteContentSchema = z.object({
 home: z.object({ banners: z.array(banner).min(1).max(10), secondary: z.object({ kicker:text,title:text,body:text,action:text,to:destination }), popular: z.object({ title:text, groups:z.array(z.object({title:text,courses:courseSlugs})).min(1).max(6) }), path: z.object({kicker:text,title:text,body:text,action:text,to:destination,courses:courseSlugs}), find:z.object({title:text,action:text,to:destination,tabs:z.array(z.object({label:text,courses:courseSlugs})).min(1).max(8)}) }),
 about:z.object({kicker:text,title:text,description:text,primary:action,secondary:action,values:z.array(z.object({title:text,body:text})).min(1).max(12),cta:z.object({kicker:text,title:text,body:text,primary:action,secondary:action})}),
 footer:z.object({newsletter:z.object({title:text,description:text,button:text,success:text}),columns:z.array(z.object({title:text,links:z.array(footerLink).max(20)})).min(1).max(6),bottom:z.object({lead:text,first:action,join:text,second:action}),legal:z.array(z.object({doc:z.enum(["privacy","terms","cookies"]),label:text})).max(3),copyright:text,socials:z.object({Facebook:z.string(),LinkedIn:z.string(),Twitter:z.string(),YouTube:z.string(),Instagram:z.string(),TikTok:z.string()}).refine(s => Object.values(s).every(v => !v || safeWebLink(v)), "Social links must be full HTTPS addresses")})
});
export type SiteContent = z.infer<typeof siteContentSchema>;
export const defaultSiteContent: SiteContent = {
 home: { banners: [
  { kicker: "YOUR NEXT CHAPTER STARTS HERE", title: "German In Minutes", copy: "Learn German. Connect with the world.", body: "From your first words to confident conversations — find a course that fits your ambitions.", action: "Explore courses", image: "/images/learning-banner.jpg", to: "/courses" },
  { kicker: "BUILD REAL-WORLD CONFIDENCE", title: "A new language. New possibilities.", copy: "Make every conversation count.", body: "Learn together, build your skills and bring German into your everyday life.", action: "Find your level", image: "/images/study-group.jpg", to: "/levels" },
  { kicker: "TAKE THE NEXT STEP", title: "Your Goethe exam journey", copy: "Prepare with purpose.", body: "Structured practice for reading, writing, listening and speaking — all in one place.", action: "Explore exam preparation", image: "/images/learning-banner.jpg", to: "/goethe" },
],
 secondary:{kicker:"LEARN WITHOUT LIMITS",title:"Your future speaks German.",body:"Build the language skills for your next move — study, work or life abroad.",action:"Discover your course",to:"/courses"},
 popular:{ title:"New and popular",groups:[{title:"Discover the essentials",courses:COURSES.slice(0,3).map(c=>c.slug)},{title:"Take the next step",courses:COURSES.slice(2,5).map(c=>c.slug)},{title:"Go further with German",courses:COURSES.slice(3,6).map(c=>c.slug)}]},
 path:{kicker:"ONE CLEAR LEARNING PATH",title:"Introducing your German journey",body:"Build the language skills your next chapter demands.",action:"Explore all",to:"/courses",courses:COURSES.slice(0,4).map(c=>c.slug)},
 find:{title:"Find your next course",action:"View all",to:"/courses",tabs:[{label:"Featured",courses:COURSES.slice(0,4).map(c=>c.slug)},{label:"New additions",courses:[...COURSES].reverse().slice(0,4).map(c=>c.slug)},{label:"Beginner friendly",courses:COURSES.filter(c=>["A1","A2"].includes(c.level)).map(c=>c.slug)}]}
 },
 about:{kicker:"About",title:"German, in the minutes you actually have.",description:"We turn the CEFR path from A1 to C1 into short, sequenced lessons you can finish on a commute.",primary:{label:"Start free",to:"/register"},secondary:{label:"Talk to us",to:"/contact"},values:[
  {
    title: "Structure over scrolling",
    body: "Every lesson sits in a sequence with a clear goal, so you always know what comes next.",
  },
  {
    title: "Short beats long",
    body: "Ten focused minutes a day outperforms a three-hour session every other weekend.",
  },
  {
    title: "Exam-honest",
    body: "Our prep mirrors the official Goethe format and scoring criteria — no guesswork.",
  },
  {
    title: "Built for learners abroad",
    body: "Explanations in clear English, for people moving to, working in, or studying in Germany.",
  },
],cta:{kicker:"Start today",title:"Your German starts with one minute.",body:"No card required. Pick your level and speak your first sentence tonight.",primary:{label:"Start Learning Free",to:"/register"},secondary:{label:"Explore Courses",to:"/courses"}}},
 footer:{newsletter:{title:"Get one German tip every week",description:"Free lessons, Goethe exam tips and new courses. No spam.",button:"Subscribe",success:"Thank you — you're subscribed!"},columns:[
  { title: "Learn by level", links: [
    { label: "German A1", to: "/levels/$level", params: { level: "a1" }, badge: "Start" },
    { label: "German A2", to: "/levels/$level", params: { level: "a2" } },
    { label: "German B1", to: "/levels/$level", params: { level: "b1" } },
    { label: "German B2", to: "/levels/$level", params: { level: "b2" } },
    { label: "German C1", to: "/levels/$level", params: { level: "c1" } },
  ] },
  { title: "Explore categories", links: [
    { label: "Beginner German", to: "/categories", search: { category: "beginner" } },
    { label: "Conversation & fluency", to: "/categories", search: { category: "conversation" } },
    { label: "Business & professional", to: "/categories", search: { category: "professional" } },
    { label: "Exam preparation", to: "/categories", search: { category: "exam" } },
    { label: "All courses", to: "/courses" },
  ] },
  { title: "Practice", links: [
    { label: "Practice hub", to: "/practice" },
    { label: "Grammar", to: "/practice/$slug", params: { slug: "grammar" } },
    { label: "Vocabulary", to: "/practice/$slug", params: { slug: "vocabulary" } },
    { label: "Goethe exam", to: "/goethe" },
    { label: "Free PDF Download", to: "/resources" },
  ] },
  { title: "German In Minutes", links: [
    { label: "About", to: "/about" },
    { label: "For Businesses", to: "/business" },
    { label: "For Educators", to: "/educators" },
    { label: "Pricing", to: "/pricing" },
    { label: "Blog", to: "/blog" },
    { label: "FAQ", to: "/faq" },
    { label: "Contact", to: "/contact" },
  ] },
],bottom:{lead:"Not sure where to begin?",first:{label:"Browse free courses",to:"/courses"},join:"or",second:{label:"see plans",to:"/pricing"}},legal:[{doc:"privacy",label:"Privacy"},{doc:"terms",label:"Terms"},{doc:"cookies",label:"Cookies"}],copyright:"German In Minutes",socials:{Facebook:"",LinkedIn:"",Twitter:"",YouTube:"",Instagram:"",TikTok:""}}
};
export function parseSiteContent(value: unknown): SiteContent { const parsed=siteContentSchema.safeParse(value); return parsed.success ? parsed.data : defaultSiteContent; }
export function selectedCourses(slugs: string[]) { return slugs.flatMap(slug => { const course=COURSES.find(c=>c.slug===slug); return course ? [course] : []; }); }
