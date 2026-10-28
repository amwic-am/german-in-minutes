import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Award,
  BarChart3,
  BookOpen,
  Check,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Globe2,
  GraduationCap,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  Presentation,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BLOG_POSTS, FAQS, PRICING_PLANS, SKILLS } from "@shared/data";
import type { PdfResource } from "@shared/types";
import { PageHero, PrimaryLink, GhostLink, FinalCta } from "@/components/site-blocks";
import { Button, Field, Input, Textarea, Spinner } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useSiteContent } from "@/hooks/use-site-content";
import { useAuth } from "@/hooks/use-auth";
import { api, errorMessage } from "@/lib/api";
import { usd } from "@/lib/money";
import { cn } from "@/lib/utils";

/* ---------------------------------- Pricing --------------------------------- */

export function PricingPage() {
  usePageMeta(
    "Pricing — Free, Course and Complete German | German In Minutes",
    "Start free, take a single level, or unlock every A1–C1 course and Goethe prep plan. Cancel anytime.",
  );
  return (
    <>
      <PageHero
        kicker="Pricing"
        title="Pay for the level you're on."
        description="No lock-in, no hidden extras. Every paid plan includes certificates, downloads and progress tracking."
      >
        <PrimaryLink to="/register">Start free</PrimaryLink>
        <GhostLink to="/courses">See courses</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-5 px-5 sm:px-8 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "reveal flex flex-col rounded-xl p-6 ring-1",
                plan.highlighted ? "bg-charcoal text-white ring-charcoal" : "bg-card text-foreground ring-border",
              )}
            >
              {plan.highlighted && (
                <span className="inline-flex w-fit rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="mt-4 font-display text-lg font-bold">{plan.name}</h2>
              <p className={cn("mt-1 text-sm", plan.highlighted ? "text-white/60" : "text-muted-foreground")}>{plan.tagline}</p>
              <div className="mt-5 font-display text-4xl font-extrabold">
                {usd(plan.price)}
                <span className="text-sm font-medium opacity-60"> / {plan.per}</span>
              </div>
              <ul className={cn("mt-6 flex-1 space-y-2 text-sm", plan.highlighted ? "text-white/75" : "text-muted-foreground")}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.price === 0 ? "/register" : "/courses"}
                className={cn(
                  "mt-6 rounded-md py-2.5 text-center text-sm font-semibold transition hover:-translate-y-0.5",
                  plan.highlighted ? "bg-brand text-primary-foreground" : "bg-charcoal text-white",
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-frost py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-2xl font-bold">Billing questions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-lg bg-card p-5 ring-1 ring-border">
                <h3 className="text-sm font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

/* ----------------------------------- About ---------------------------------- */

export function AboutPage() {
  const { content } = useSiteContent();
  const about = content.about;
  usePageMeta("About German In Minutes", about.description);
  return (
    <>
      <PageHero kicker={about.kicker} title={about.title} description={about.description}>
        <PrimaryLink to={about.primary.to}>{about.primary.label}</PrimaryLink>
        <GhostLink to={about.secondary.to}>{about.secondary.label}</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-5 sm:grid-cols-2 sm:px-8">
          {about.values.map((value, index) => (
            <div key={value.title} className="reveal rounded-xl bg-card p-6 ring-1 ring-border" style={{ animationDelay: `${0.05 * index}s` }}>
              <span className="grid size-9 place-items-center rounded-md bg-primary/15 font-display text-sm font-bold text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-4 font-display text-lg font-bold">{value.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-frost py-16">
        <div className="mx-auto max-w-[1200px] rounded-2xl bg-primary/12 px-6 py-10 ring-1 ring-primary/25 sm:px-10">
          <span className="text-sm font-semibold text-primary">{about.cta.kicker}</span>
          <h2 className="mt-3 font-display text-3xl font-bold">{about.cta.title}</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">{about.cta.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryLink to={about.cta.primary.to}>{about.cta.primary.label}</PrimaryLink>
            <GhostLink to={about.cta.secondary.to} className="bg-card text-foreground ring-border">
              {about.cta.secondary.label}
            </GhostLink>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------- Contact --------------------------------- */

export function ContactPage() {
  usePageMeta(
    "Contact German In Minutes",
    "Questions about courses, Goethe preparation or billing? Send the German In Minutes team a message.",
  );
  const { contact } = useSiteContent();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };
    if (!payload.name || !payload.email.includes("@") || payload.message.length < 10) {
      toast.error("Add your name, a valid email and a message of at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/contact", payload);
      form.reset();
      setSent(true);
      toast.success("Message sent — we'll reply within two working days.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        kicker="Contact"
        title="Tell us where you're stuck."
        description="Course advice, exam questions or billing — we answer within two working days."
      />

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1100px] items-start gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <form onSubmit={send} className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
            <Field label="Name">
              <Input name="name" required maxLength={120} placeholder="Your name" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required maxLength={254} placeholder="you@example.com" />
            </Field>
            <Field label="Message">
              <Textarea name="message" rows={5} required maxLength={5000} placeholder="How can we help?" />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send message"}
            </Button>
            {sent && (
              <p role="status" className="text-sm text-emerald-700">
                Thanks — your message has reached our team.
              </p>
            )}
          </form>

          <div className="grid content-start gap-4">
            <div className="rounded-xl bg-card p-5 ring-1 ring-border">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                Visit us
              </h2>
              <p className="mt-3 text-sm leading-relaxed">
                <span className="font-semibold">German In Minutes</span>
                <br />
                {contact.address ?? "Meganagna Siti Mall, 5th Floor, Addis Ababa, Ethiopia"}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <a href={`mailto:${contact.supportEmail}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="size-4 text-primary" />
                  {contact.supportEmail}
                </a>
                <a href={`tel:${String(contact.phone ?? "").replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-foreground">
                  <Phone className="size-4 text-primary" />
                  {contact.phone}
                </a>
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  {contact.hours}
                </span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-border">
              <iframe
                title="German In Minutes location — Meganagna Siti Mall, Addis Ababa"
                src="https://www.google.com/maps?q=9.018859,38.800445&z=17&output=embed"
                className="h-full min-h-[320px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ----------------------------------- Blog ----------------------------------- */

export function BlogPage() {
  usePageMeta(
    "German Learning Blog — Grammar, Exams & Study Tips | German In Minutes",
    "Practical articles on German grammar, vocabulary, listening, speaking and Goethe exam strategy.",
  );
  return (
    <>
      <PageHero
        kicker="Blog"
        title="Learn faster between lessons."
        description="Grammar explained plainly, exam strategy from the scoring criteria, and study routines that survive real life."
      >
        <PrimaryLink to="/register">Start learning free</PrimaryLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-5 px-5 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post, index) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="reveal flex flex-col rounded-xl bg-card p-6 ring-1 ring-border transition-transform hover:-translate-y-1"
              style={{ animationDelay: `${0.06 * index}s` }}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{post.category}</span>
              <h2 className="mt-3 font-display text-lg font-bold">{post.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">{post.excerpt}</p>
              <div className="mt-5 text-xs text-muted-foreground">
                {post.date} · {post.readTime} read
              </div>
            </Link>
          ))}
        </div>
      </section>

      <FinalCta />
    </>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const post = BLOG_POSTS.find((item) => item.slug === slug);
  usePageMeta(post ? `${post.title} | German In Minutes` : "Article | German In Minutes", post?.excerpt);
  if (!post) return <Navigate to="/blog" replace />;
  const more = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PageHero kicker={post.category} title={post.title} description={post.excerpt}>
        <GhostLink to="/blog">All articles</GhostLink>
        <PrimaryLink to="/register">Start learning free</PrimaryLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto max-w-[70ch] px-5 sm:px-8">
          <p className="text-xs text-muted-foreground">
            {post.date} · {post.readTime} read
          </p>
          <div className="mt-8 rounded-xl bg-card p-6 ring-1 ring-border">
            <h2 className="font-display text-lg font-bold">Full article coming soon</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              This piece is being written by our teaching team. In the meantime, the same material is
              covered inside the course lessons — start free and you'll get it there first.
            </p>
            <Link to="/courses" className="mt-5 inline-block rounded-md bg-charcoal px-4 py-2 text-sm font-semibold text-white">
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-frost py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-xl font-bold">Keep reading</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {more.map((item) => (
              <Link
                key={item.slug}
                to={`/blog/${item.slug}`}
                className="rounded-xl bg-card p-5 ring-1 ring-border transition-transform hover:-translate-y-1"
              >
                <div className="text-xs font-semibold text-primary">{item.category}</div>
                <div className="mt-2 font-display text-base font-bold">{item.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

/* ------------------------------------ FAQ ----------------------------------- */

export function FaqPage() {
  usePageMeta(
    "FAQ — Courses, Goethe Exams & Billing | German In Minutes",
    "Answers about German In Minutes courses, Goethe exam preparation, certificates, study time and payment options.",
  );
  return (
    <>
      <PageHero
        kicker="FAQ"
        title="Everything people ask before starting."
        description="Still unsure? Send us a message and we'll point you to the right level."
      >
        <PrimaryLink to="/register">Start free</PrimaryLink>
        <GhostLink to="/contact">Contact us</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto max-w-[1000px] px-5 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((item) => (
              <div key={item.q} className="reveal rounded-xl bg-card p-5 ring-1 ring-border">
                <h2 className="text-sm font-semibold">{item.q}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

/* --------------------------------- Resources -------------------------------- */

type PdfListResponse = { pdfs: PdfResource[] };

export function ResourcesPage() {
  usePageMeta(
    "Free German PDFs — Cheat Sheets & Workbooks | German In Minutes",
    "Download free German learning PDFs: vocabulary lists, grammar cheat sheets, verb tables and Goethe exam checklists.",
  );
  const { user } = useAuth();
  const [tag, setTag] = useState("All");
  const { data, isLoading } = useQuery({
    queryKey: ["public-pdfs"],
    queryFn: () => api.get<PdfListResponse>("/pdfs"),
  });
  const pdfs = data?.pdfs ?? [];
  const tags = useMemo(() => ["All", ...Array.from(new Set(pdfs.map((pdf) => pdf.tag).filter(Boolean)))], [pdfs]);
  const list = pdfs.filter((pdf) => tag === "All" || pdf.tag === tag);

  function download(pdf: PdfResource) {
    if (!user) return;
    window.location.href = `/api/pdfs/${pdf.id}/download`;
    toast.success("Your download has started");
  }

  return (
    <>
      <PageHero
        kicker="Free PDF library"
        title="Free German PDFs to learn faster."
        description="Cheat sheets, word lists and exam checklists. Create a free account to download."
      />
      <section className="bg-frost py-14">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition",
                  tag === t ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:border-primary",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {isLoading ? (
            <Spinner label="Loading PDFs…" />
          ) : list.length === 0 ? (
            <div className="rounded-xl bg-card p-10 text-center ring-1 ring-border">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">New free PDFs are coming soon.</p>
              <p className="text-sm text-muted-foreground">Check back shortly or subscribe for updates.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((pdf) => (
                <article key={pdf.id} className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border">
                  <img
                    src={pdf.cover_path}
                    alt={`${pdf.name} cover`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">{pdf.tag}</span>
                    <h2 className="mt-1 text-lg font-bold">{pdf.name}</h2>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{pdf.description}</p>
                    {user ? (
                      <Button onClick={() => download(pdf)} className="mt-4 w-full">
                        <Download className="size-4" /> Download free
                      </Button>
                    ) : (
                      <Link
                        to="/login"
                        className="mt-4 rounded-md border border-primary py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/10"
                      >
                        Sign in to download
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <FinalCta />
    </>
  );
}

/* ---------------------------------- Practice -------------------------------- */

export function PracticePage() {
  usePageMeta(
    "Daily German Practice — Six Skills | German In Minutes",
    "Train listening, reading, writing, speaking, grammar and vocabulary with graded daily German exercises.",
  );
  return (
    <>
      <PageHero
        kicker="Practice"
        title="Ten minutes. Six skills."
        description="Short, graded exercises that keep every part of your German moving — no lesson plan required."
      >
        <PrimaryLink to="/register">Practice free today</PrimaryLink>
        <GhostLink to="/courses">Browse courses</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {SKILLS.map((skill, index) => (
            <Link
              key={skill.slug}
              to={`/practice/${skill.slug}`}
              className="reveal rounded-xl bg-card p-6 ring-1 ring-border transition-transform hover:-translate-y-1 hover:ring-primary"
              style={{ animationDelay: `${0.06 * index}s` }}
            >
              <h2 className="font-display text-lg font-bold">{skill.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{skill.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <FinalCta />
    </>
  );
}

export function SkillDetailPage() {
  const { slug } = useParams();
  const skill = SKILLS.find((item) => item.slug === slug);
  usePageMeta(skill ? `German ${skill.name} Practice | German In Minutes` : "Practice | German In Minutes", skill?.description);
  if (!skill) return <Navigate to="/practice" replace />;
  const others = SKILLS.filter((item) => item.slug !== skill.slug);

  return (
    <>
      <PageHero kicker="Practice" title={`${skill.name} practice`} description={skill.description}>
        <PrimaryLink to="/register">Start practising</PrimaryLink>
        <GhostLink to="/practice">All skills</GhostLink>
      </PageHero>

      <section className="bg-frost py-20 sm:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-2xl font-bold">What's inside</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {skill.details.map((detail) => (
              <li key={detail} className="rounded-xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-border">
                {detail}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-frost py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <h2 className="font-display text-xl font-bold">Train another skill</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {others.map((other) => (
              <Link
                key={other.slug}
                to={`/practice/${other.slug}`}
                className="rounded-md bg-card px-4 py-2 text-sm font-medium ring-1 ring-border hover:text-primary"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

/* --------------------------------- Audience --------------------------------- */

function AudienceHero(props: {
  kicker: string;
  title: string;
  text: string;
  image: string;
  alt: string;
  primary: { to: string; label: string };
  secondary: { to: string; label: string };
  points: string[];
}) {
  return (
    <section className="bg-background">
      <div className="discovery-container audience-hero">
        <div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {props.kicker}
          </span>
          <h1 className="mt-5 text-[clamp(2.3rem,5vw,3.8rem)] font-bold leading-[1.05] tracking-tight">{props.title}</h1>
          <p className="mt-5 max-w-[50ch] text-lg text-muted-foreground">{props.text}</p>
          <ul className="mt-6 space-y-2">
            {props.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink to={props.primary.to} className="px-6 py-3 text-base">{props.primary.label}</PrimaryLink>
            <Link
              to={props.secondary.to}
              className="inline-flex items-center rounded-md border border-border bg-background px-6 py-3 text-base font-semibold hover:bg-muted"
            >
              {props.secondary.label}
            </Link>
          </div>
        </div>
        <img src={props.image} alt={props.alt} width={1280} height={960} />
      </div>
    </section>
  );
}

function StatsBand({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <section className="bg-series text-series-foreground">
      <div className="discovery-container grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-3xl font-bold text-series-accent">{stat.value}</div>
            <div className="mt-1 text-sm opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: { icon: ComponentType<{ className?: string }>; title: string; body: string }[];
}) {
  return (
    <section className="discovery-container py-16">
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">{intro}</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-xl border border-border p-6 transition-colors hover:border-primary">
              <span className="explore-icon">
                <Icon className="size-4" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CtaBand({ title, text, to, label }: { title: string; text: string; to: string; label: string }) {
  return (
    <section className="discovery-container pb-4">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:p-12">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-2 opacity-90">{text}</p>
        </div>
        <Link to={to} className="rounded-md bg-charcoal px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5">
          {label}
        </Link>
      </div>
    </section>
  );
}

export function BusinessPage() {
  usePageMeta(
    "German for Teams & Businesses | German In Minutes",
    "Train international teams in German from A1 to C1 with progress reports, certificates and flexible seats.",
  );
  return (
    <>
      <AudienceHero
        kicker="For Businesses"
        title="German training that moves your team forward"
        text="Help international employees settle in, talk to customers and work with confidence — with short daily lessons built on the CEFR levels."
        image="/images/business-hero.jpg"
        alt="International team learning German together on a laptop"
        primary={{ to: "/contact", label: "Contact sales" }}
        secondary={{ to: "/courses", label: "Browse courses" }}
        points={["A1 to C1 workplace German", "Team progress tracking", "Certificates for every level"]}
      />
      <StatsBand
        stats={[
          { value: "A1–C1", label: "CEFR levels covered" },
          { value: "10 min", label: "Daily lesson length" },
          { value: "5", label: "Goethe exam levels" },
          { value: "24/7", label: "Online access" },
        ]}
      />
      <FeatureGrid
        title="Why teams choose German In Minutes"
        intro="Everything you need to roll out language learning across your organisation."
        items={[
          { icon: Users, title: "Onboard international hires", body: "Give relocating staff the everyday German they need from day one." },
          { icon: BarChart3, title: "Clear progress reports", body: "See who is learning, which levels are complete and where to help." },
          { icon: Award, title: "Recognised certificates", body: "Course certificates and Goethe-style preparation that employees value." },
          { icon: Globe2, title: "Explained in English", body: "Lessons designed for international learners, not native speakers." },
          { icon: Clock, title: "Fits busy schedules", body: "Short lessons on any device, between meetings or on the commute." },
          { icon: ShieldCheck, title: "Simple billing", body: "One invoice for your team, with seats you can adjust any time." },
        ]}
      />
      <CtaBand title="Ready to train your team?" text="Tell us about your team size and goals — we reply within two working days." to="/contact" label="Talk to us" />
    </>
  );
}

export function EducatorsPage() {
  usePageMeta(
    "German In Minutes for Educators & Teachers",
    "Ready-made German lessons, practice sets and Goethe exam material for teachers and schools.",
  );
  return (
    <>
      <AudienceHero
        kicker="For Educators"
        title="Teach German with ready-made, structured lessons"
        text="Use our A1–C1 courses, practice sets and exam material alongside your classes, so students keep learning between lessons."
        image="/images/educators-hero.jpg"
        alt="German teacher leading an international class"
        primary={{ to: "/contact", label: "Get in touch" }}
        secondary={{ to: "/resources", label: "Free materials" }}
        points={["Lessons aligned to CEFR", "Goethe exam practice", "Free printable resources"]}
      />
      <StatsBand
        stats={[
          { value: "6", label: "Course paths" },
          { value: "A1–C1", label: "Every level" },
          { value: "Free", label: "Starter PDFs" },
          { value: "Online", label: "Homework anywhere" },
        ]}
      />
      <FeatureGrid
        title="Built to support your classroom"
        intro="Save preparation time and give students more practice."
        items={[
          { icon: BookOpen, title: "Structured courses", body: "Clear lesson sequences you can assign level by level." },
          { icon: ClipboardCheck, title: "Exam practice", body: "Goethe-style tasks for reading, listening, writing and speaking." },
          { icon: FileText, title: "Printable resources", body: "Cheat sheets, verb tables and vocabulary lists for class." },
          { icon: MessagesSquare, title: "Speaking prompts", body: "Daily prompts that get students talking out loud." },
          { icon: Presentation, title: "Easy to present", body: "Clean lesson material that works on a classroom screen." },
          { icon: GraduationCap, title: "Student progress", body: "Learners track their own progress and earn certificates." },
        ]}
      />
      <CtaBand title="Bring German In Minutes to your class" text="Ask us about school and teacher access." to="/contact" label="Contact us" />
    </>
  );
}

/* ----------------------------------- Legal ---------------------------------- */

const LEGAL_DOCS: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "We store only the account details you give us (name, email) and your learning progress so we can run your courses.",
      "We never sell your data. You can ask us to delete your account at any time via the contact page.",
    ],
  },
  terms: {
    title: "Terms of Use",
    body: [
      "Your account is personal. Course materials are for your own learning and may not be redistributed.",
      "Paid course access lasts as described on the pricing page at the time of purchase.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    body: ["We use only essential browser storage to keep you signed in and remember your preferences."],
  },
};

export function LegalPage() {
  const { doc } = useParams();
  const entry = doc ? LEGAL_DOCS[doc] : undefined;
  usePageMeta(entry ? `${entry.title} | German In Minutes` : "Legal | German In Minutes", entry ? `${entry.title} for German In Minutes.` : undefined);

  if (!entry) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-2xl px-5">
        <h1 className="font-display text-3xl font-extrabold">{entry.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 1 October 2026</p>
        {entry.body.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-sm leading-7 text-muted-foreground">
            {paragraph}
          </p>
        ))}
        <div className="mt-8">
          <GhostLink to="/contact" className="bg-card text-foreground ring-border">
            Questions? Contact us
          </GhostLink>
        </div>
      </div>
    </section>
  );
}
