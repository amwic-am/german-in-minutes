import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Filter, LifeBuoy, MessageSquare, Receipt, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminCard, AdminPageHeader } from "@/components/admin-layout";
import { Badge, Button, Empty, Field, Modal, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { usePageMeta } from "@/hooks/use-page-meta";
import { api, errorMessage } from "@/lib/api";
import { type AdminCertificate, type AdminOrder, type AdminTicket } from "@/lib/admin-types";
import { formatDate, formatDateTime } from "@/lib/format";
import { price } from "@/lib/money";

const ORDER_STATUSES = ["pending", "paid", "refunded", "failed"] as const;
const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

/* --------------------------------- Orders ---------------------------------- */

export function AdminOrdersPage() {
  usePageMeta("Orders | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => api.get<{ orders: AdminOrder[] }>("/admin/orders"),
  });

  const orders = useMemo(() => (data?.orders ?? []).filter((order) => status === "all" || order.status === status), [data, status]);
  const revenue = orders.reduce((total, order) => (order.status === "paid" ? total + order.amount : total), 0);

  async function update(order: AdminOrder, next: string) {
    setBusy(order.id);
    try {
      await api.patch(`/admin/orders/${order.id}`, { status: next });
      await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(`Order marked ${next}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Test checkout payments, refunds and enrolment triggers."
        actions={<Badge tone="gold">{price(revenue)} paid</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {["all", ...ORDER_STATUSES].map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
              status === option ? "bg-charcoal text-white" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <AdminCard>
        {isLoading ? <Spinner /> : orders.length === 0 ? <div className="p-6"><Empty title="No orders">Checkout orders will appear here.</Empty></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-frost/60">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs font-semibold">{order.provider_reference ?? order.id.slice(-8).toUpperCase()}</p>
                      <p className="text-[11px] text-muted-foreground">{order.id}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Link to={`/admin/students/${order.user_id}`} className="font-semibold hover:text-primary">{order.student_name || "—"}</Link>
                      <p className="text-xs text-muted-foreground">{order.student_email}</p>
                    </td>
                    <td className="px-5 py-3">{order.course_title ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold">{price(order.amount)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{order.provider ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(order.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/orders/${order.id}/receipt`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Download receipt"
                        >
                          <Download className="size-4" />
                        </a>
                        <Select
                          value={order.status}
                          onChange={(event) => update(order, event.target.value)}
                          disabled={busy === order.id}
                          className="h-8 w-auto text-xs"
                          aria-label="Order status"
                        >
                          {ORDER_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}

/* ------------------------------- Certificates ------------------------------ */

export function AdminCertificatesPage() {
  usePageMeta("Certificates | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "certificates"],
    queryFn: () => api.get<{ certificates: AdminCertificate[] }>("/admin/certificates"),
  });
  const certificates = data?.certificates ?? [];

  async function revoke(certificate: AdminCertificate) {
    if (!window.confirm(`Revoke certificate ${certificate.certificate_number} from ${certificate.student_name}?`)) return;
    try {
      await api.del(`/admin/certificates/${certificate.id}`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "certificates"] });
      toast.success("Certificate revoked");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <>
      <AdminPageHeader title="Certificates" description="Issued course certificates and their verification numbers." />
      <AdminCard>
        {isLoading ? <Spinner /> : certificates.length === 0 ? <div className="p-6"><Empty title="No certificates issued yet">Students earn certificates after completing a course.</Empty></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-frost text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Number</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Issued</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {certificates.map((certificate) => (
                  <tr key={certificate.id} className="border-t border-border hover:bg-frost/60">
                    <td className="px-5 py-3 font-mono text-xs font-semibold">{certificate.certificate_number}</td>
                    <td className="px-5 py-3">
                      <Link to={`/admin/students/${certificate.user_id}`} className="font-semibold hover:text-primary">{certificate.student_name}</Link>
                    </td>
                    <td className="px-5 py-3">{certificate.course_title}</td>
                    <td className="px-5 py-3"><Badge tone="gold">{certificate.course_level}</Badge></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatDate(certificate.issued_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <a href={`/api/certificates/${certificate.id}/pdf`} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Download PDF">
                          <Download className="size-4" />
                        </a>
                        <button onClick={() => revoke(certificate)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Revoke certificate">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}

/* --------------------------------- Support --------------------------------- */

export function AdminSupportPage() {
  usePageMeta("Support | Admin | German In Minutes");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState<AdminTicket | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "support"],
    queryFn: () => api.get<{ tickets: AdminTicket[] }>("/admin/support"),
  });
  const tickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => status === "all" || ticket.status === status), [data, status]);
  const openCount = (data?.tickets ?? []).filter((ticket) => ticket.status === "open").length;

  return (
    <>
      <AdminPageHeader
        title="Support"
        description="Student questions, replies and ticket priorities."
        actions={<Badge tone={openCount > 0 ? "gold" : "muted"}>{openCount} open</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <LifeBuoy className="size-4 text-muted-foreground" />
        {["all", ...TICKET_STATUSES].map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
              status === option ? "bg-charcoal text-white" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : tickets.length === 0 ? (
        <AdminCard><div className="p-6"><Empty title="No tickets in this view">Students can open tickets from their support page.</Empty></div></AdminCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <AdminCard key={ticket.id}>
              <div className="flex flex-wrap items-start gap-3 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <MessageSquare className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{ticket.subject}</h3>
                    <StatusBadge status={ticket.status} />
                    <Badge tone={ticket.priority === "urgent" || ticket.priority === "high" ? "danger" : "muted"}>{ticket.priority}</Badge>
                    <Badge tone="muted">{ticket.category}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ticket.message}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {ticket.student_name} · {ticket.student_email} · {formatDateTime(ticket.created_at)}
                  </p>
                  {ticket.admin_reply && (
                    <p className="mt-2 rounded-md bg-frost px-3 py-2 text-xs"><span className="font-semibold">Reply:</span> {ticket.admin_reply}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setActive(ticket)}>
                  <Receipt className="size-4" /> Manage
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {active && (
        <TicketModal
          ticket={active}
          onClose={() => setActive(null)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: ["admin", "support"] });
            setActive(null);
          }}
        />
      )}
    </>
  );
}

function TicketModal({ ticket, onClose, onSaved }: { ticket: AdminTicket; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ status: ticket.status, priority: ticket.priority, reply: ticket.admin_reply ?? "" });
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/admin/support/${ticket.id}`, form);
      toast.success(form.reply && form.reply !== (ticket.admin_reply ?? "") ? "Reply sent to student" : "Ticket updated");
      await onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket.subject}
      wide
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="ticket-form" type="submit" disabled={busy}>{busy ? "Saving…" : "Save ticket"}</Button></>}
    >
      <form id="ticket-form" onSubmit={save} className="grid gap-4">
        <div className="rounded-md bg-frost px-4 py-3 text-sm">
          <p className="font-semibold">{ticket.student_name} · {ticket.student_email}</p>
          <p className="mt-1 text-muted-foreground">{ticket.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">Opened {formatDateTime(ticket.created_at)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              {TICKET_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {PRIORITIES.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Reply" hint="Sending a reply notifies the student in their dashboard.">
          <Textarea value={form.reply} onChange={(event) => setForm({ ...form, reply: event.target.value })} rows={5} placeholder="Write your reply…" />
        </Field>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Send className="size-3.5" /> Saving with a new reply sends a notification.</p>
      </form>
    </Modal>
  );
}
