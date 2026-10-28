import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Download, FileText, Mail, Pencil, Plus, Search, Send, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { defaultSiteContent } from "@shared/site-content";
import { AdminCard, AdminPageHeader } from "@/components/admin-layout";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import type { AdminPdf, AuditEntry, NewsletterData } from "@/lib/admin-types";
import { relativeDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const PDF_STATUSES = ["published", "pending", "archived"] as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

/* ------------------------------- PDF library ------------------------------- */

type PdfForm = { name: string; description: string; tag: string; status: (typeof PDF_STATUSES)[number] };

function emptyPdf(): PdfForm {
  return { name: "", description: "", tag: "German", status: "published" };
}

export function AdminPdfsPage() {
  usePageMeta("PDF library | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPdf | null>(null);
  const [form, setForm] = useState<PdfForm>(emptyPdf());
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pdfs"],
    queryFn: () => api.get<{ pdfs: AdminPdf[] }>("/admin/pdfs"),
  });
  const { data: downloads } = useQuery({
    queryKey: ["admin", "pdf-downloads"],
    queryFn: () => api.get<{ downloads: { id: string; created_at: string; pdf_name: string; student_name: string; student_email: string }[] }>("/admin/pdf-downloads"),
  });
  const pdfs = data?.pdfs ?? [];

  function openUpload() {
    setForm(emptyPdf());
    setFile(null);
    setCover(null);
    setUploadOpen(true);
  }

  function openEdit(pdf: AdminPdf) {
    setForm({ name: pdf.name, description: pdf.description, tag: pdf.tag, status: pdf.status });
    setEditing(pdf);
  }

  async function submitUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a PDF file to upload");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("name", form.name);
      body.append("description", form.description);
      body.append("tag", form.tag);
      body.append("status", form.status);
      body.append("file", file);
      if (cover) body.append("cover", cover);
      await api.upload("/admin/pdfs", body);
      await queryClient.invalidateQueries({ queryKey: ["admin", "pdfs"] });
      await queryClient.invalidateQueries({ queryKey: ["public-pdfs"] });
      setUploadOpen(false);
      toast.success("PDF uploaded");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await api.patch(`/admin/pdfs/${editing.id}`, form);
      await queryClient.invalidateQueries({ queryKey: ["admin", "pdfs"] });
      await queryClient.invalidateQueries({ queryKey: ["public-pdfs"] });
      setEditing(null);
      toast.success("PDF updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(pdf: AdminPdf) {
    if (!window.confirm(`Delete “${pdf.name}” and its file?`)) return;
    try {
      await api.del(`/admin/pdfs/${pdf.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "pdfs"] });
      await queryClient.invalidateQueries({ queryKey: ["public-pdfs"] });
      toast.success("PDF deleted");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <AdminPageHeader
        title="PDF library"
        description="Free worksheets and guides available to students."
        actions={<Button onClick={openUpload}><Plus className="size-4" /> Upload PDF</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AdminCard>
          {isLoading ? <Spinner /> : pdfs.length === 0 ? <div className="p-6"><Empty title="No PDFs yet">Upload a worksheet to build the library.</Empty></div> : (
            <ul className="divide-y divide-border">
              {pdfs.map((pdf) => (
                <li key={pdf.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <img src={pdf.cover_path} alt="" className="h-14 w-11 rounded object-cover ring-1 ring-border" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{pdf.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{pdf.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="gold">{pdf.tag}</Badge>
                      <StatusBadge status={pdf.status} />
                      <span className="text-[11px] text-muted-foreground"><Download className="mr-0.5 inline size-3" />{pdf.downloads}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a href={`/api/pdfs/${pdf.id}/download`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Download">
                      <Download className="size-4" />
                    </a>
                    <button onClick={() => openEdit(pdf)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => remove(pdf)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Recent downloads" description="Last 50 library downloads.">
          {!downloads ? <Spinner /> : downloads.downloads.length === 0 ? <div className="p-5"><Empty title="No downloads yet" /></div> : (
            <ul className="divide-y divide-border text-sm">
              {downloads.downloads.map((download) => (
                <li key={download.id} className="px-5 py-2.5">
                  <p className="truncate font-medium">{download.pdf_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{download.student_name} · {relativeDate(download.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload a PDF"
        footer={<><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button form="upload-pdf" type="submit" disabled={busy}><Upload className="size-4" />{busy ? "Uploading…" : "Upload"}</Button></>}
      >
        <form id="upload-pdf" onSubmit={submitUpload} className="grid gap-4">
          <Field label="Title"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} placeholder="A1 vocabulary workbook" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tag"><Input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} placeholder="Grammar" /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PdfForm["status"] })}>
                {PDF_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="PDF file" hint="Maximum 25 MB, PDF only.">
            <input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm" required />
          </Field>
          <Field label="Cover image" hint="Optional — JPG or PNG; defaults to the learning banner.">
            <input type="file" accept="image/*" onChange={(event) => setCover(event.target.files?.[0] ?? null)} className="block w-full text-sm" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit PDF"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button form="edit-pdf" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}
      >
        <form id="edit-pdf" onSubmit={submitEdit} className="grid gap-4">
          <Field label="Title"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tag"><Input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PdfForm["status"] })}>
                {PDF_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------- Site settings ----------------------------- */

export function AdminSettingsPage() {
  usePageMeta("Site settings | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "site-content"],
    queryFn: () => api.get<{ content: typeof defaultSiteContent | null; contact: { supportEmail: string; phone: string; hours: string; address: string } }>("/admin/site-content"),
  });
  const [tab, setTab] = useState<"contact" | "content">("contact");
  const [contact, setContact] = useState(() => ({ supportEmail: "", phone: "", hours: "", address: "" }));
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setContact(data.contact);
    setJson(JSON.stringify(data.content ?? defaultSiteContent, null, 2));
  }, [data]);

  async function saveContact(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.put("/admin/contact", contact);
      await queryClient.invalidateQueries({ queryKey: ["site-content"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-content"] });
      toast.success("Contact details updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveContent(event: FormEvent) {
    event.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      toast.error("The content JSON is not valid");
      return;
    }
    setBusy(true);
    try {
      await api.put("/admin/site-content", { content: parsed });
      await queryClient.invalidateQueries({ queryKey: ["site-content"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-content"] });
      toast.success("Site content published");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Site settings" description="Contact details and homepage copy used across the website." />

      <div className="mb-4 flex gap-2">
        {(["contact", "content"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setTab(option)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold capitalize transition",
              tab === option ? "bg-charcoal text-white" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
            )}
          >
            {option === "contact" ? "Contact details" : "Homepage content"}
          </button>
        ))}
      </div>

      {tab === "contact" ? (
        <AdminCard title="Contact details" description="Shown on the contact page, support page and footer.">
          <form onSubmit={saveContact} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Support email"><Input type="email" value={contact.supportEmail} onChange={(event) => setContact({ ...contact, supportEmail: event.target.value })} required /></Field>
            <Field label="Phone"><Input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} required /></Field>
            <Field label="Opening hours"><Input value={contact.hours} onChange={(event) => setContact({ ...contact, hours: event.target.value })} required /></Field>
            <Field label="Address"><Input value={contact.address} onChange={(event) => setContact({ ...contact, address: event.target.value })} required /></Field>
            <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save contact details"}</Button></div>
          </form>
        </AdminCard>
      ) : (
        <AdminCard
          title="Homepage content"
          description="Banners, about values, footer links and legal copy. Edit carefully — invalid content is rejected."
          actions={<Button variant="outline" size="sm" onClick={() => setJson(JSON.stringify(defaultSiteContent, null, 2))}>Reset to default</Button>}
        >
          <form onSubmit={saveContent} className="space-y-3 p-5">
            <Textarea value={json} onChange={(event) => setJson(event.target.value)} rows={22} className="font-mono text-xs" spellCheck={false} />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish content"}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    setJson(JSON.stringify(JSON.parse(json), null, 2));
                    toast.success("JSON formatted");
                  } catch {
                    toast.error("The content JSON is not valid");
                  }
                }}
              >
                Format JSON
              </Button>
            </div>
          </form>
        </AdminCard>
      )}
    </>
  );
}

/* -------------------------------- Broadcast -------------------------------- */

export function AdminBroadcastPage() {
  usePageMeta("Broadcast | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"subscribers" | "messages">("subscribers");
  const [form, setForm] = useState<{ audience: "all" | "students" | "level"; level: string; subject: string; message: string }>({
    audience: "students",
    level: "A1",
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "newsletter"],
    queryFn: () => api.get<NewsletterData>("/admin/newsletter"),
  });

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.post<{ recipients: number }>("/admin/email", {
        audience: form.audience,
        level: form.audience === "level" ? form.level : undefined,
        subject: form.subject,
        message: form.message,
      });
      setForm({ ...form, subject: "", message: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
      toast.success(`Notification sent to ${result.recipients} ${result.recipients === 1 ? "person" : "people"}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Broadcast" description="Send an in-app notification to learners, and review newsletter sign-ups." />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <AdminCard title="New announcement" description="Delivered as a dashboard notification.">
          <form onSubmit={send} className="grid gap-4 p-5">
            <Field label="Audience">
              <Select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as typeof form.audience })}>
                <option value="all">Everyone</option>
                <option value="students">Learners (no staff roles)</option>
                <option value="level">One level</option>
              </Select>
            </Field>
            {form.audience === "level" && (
              <Field label="Level">
                <Select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                  {LEVELS.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Subject"><Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required minLength={3} placeholder="New B1 conversation lessons" /></Field>
            <Field label="Message"><Textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={6} required minLength={10} placeholder="Write your announcement…" /></Field>
            <Button type="submit" disabled={busy}><Send className="size-4" />{busy ? "Sending…" : "Send notification"}</Button>
          </form>
        </AdminCard>

        <AdminCard
          title={tab === "subscribers" ? "Newsletter subscribers" : "Contact messages"}
          actions={
            <div className="flex gap-1">
              <button onClick={() => setTab("subscribers")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "subscribers" ? "bg-charcoal text-white" : "text-muted-foreground ring-1 ring-border")}>
                <Users className="mr-1 inline size-3" />{data?.subscribers.length ?? 0}
              </button>
              <button onClick={() => setTab("messages")} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab === "messages" ? "bg-charcoal text-white" : "text-muted-foreground ring-1 ring-border")}>
                <Mail className="mr-1 inline size-3" />{data?.messages.length ?? 0}
              </button>
            </div>
          }
        >
          {isLoading ? <Spinner /> : tab === "subscribers" ? (
            (data?.subscribers.length ?? 0) === 0 ? <div className="p-5"><Empty title="No subscribers yet" /></div> : (
              <ul className="divide-y divide-border text-sm">
                {data?.subscribers.map((subscriber) => (
                  <li key={subscriber.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="truncate">{subscriber.email}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeDate(subscriber.created_at)}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            (data?.messages.length ?? 0) === 0 ? <div className="p-5"><Empty title="No contact messages yet" /></div> : (
              <ul className="divide-y divide-border text-sm">
                {data?.messages.map((message) => (
                  <li key={message.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{message.name}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(message.created_at)}</span>
                    </div>
                    <a href={`mailto:${message.email}`} className="text-xs font-medium text-primary hover:underline">{message.email}</a>
                    <p className="mt-1 text-sm text-muted-foreground">{message.message}</p>
                  </li>
                ))}
              </ul>
            )
          )}
        </AdminCard>
      </div>
    </>
  );
}

/* --------------------------------- Audit ----------------------------------- */

export function AdminAuditPage() {
  usePageMeta("Audit log | Admin | German In Minutes");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => api.get<{ logs: AuditEntry[] }>("/admin/audit?limit=300"),
  });
  const logs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data?.logs ?? [];
    return (data?.logs ?? []).filter((entry) =>
      `${entry.action} ${entry.entity_type} ${entry.actor_name ?? ""} ${JSON.stringify(entry.details)}`.toLowerCase().includes(needle),
    );
  }, [data, query]);

  return (
    <>
      <AdminPageHeader title="Audit log" description="Every administrative action, newest first." actions={<Badge tone="gold">{logs.length} events</Badge>} />

      <label className="relative mb-4 block max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by action, entity or actor…" className="pl-9" />
      </label>

      <AdminCard>
        {isLoading ? <Spinner /> : logs.length === 0 ? <div className="p-6"><Empty title="No audit events" /></div> : (
          <div className="divide-y divide-border">
            {logs.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-frost text-muted-foreground">
                  <Activity className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {entry.action}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{entry.entity_type}{entry.entity_id ? ` · ${entry.entity_id}` : ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor_name ?? "System"}{entry.actor_id ? ` · ${entry.actor_id}` : ""} · {formatDateTime(entry.created_at)}
                  </p>
                  {Object.keys(entry.details ?? {}).length > 0 && (
                    <pre className="mt-1.5 max-h-24 overflow-auto rounded bg-frost px-2 py-1.5 text-[11px] text-muted-foreground">{JSON.stringify(entry.details, null, 1)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="size-3.5" /> Showing up to 300 recent events.</p>
    </>
  );
}
