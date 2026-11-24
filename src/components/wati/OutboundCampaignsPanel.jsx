"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TablePaginationFooter from "@/components/ui/TablePaginationFooter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import useToast from "@/hooks/useToast";
import {
  cancelOutboundCampaign,
  fetchOutboundCampaignDetail,
  fetchOutboundCampaigns,
  fetchOutboundRecipients,
} from "@/redux/features/wati/watiSlice";

const STATUS_STYLES = {
  SENT: "bg-emerald-100 text-emerald-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  SENDING: "bg-amber-100 text-amber-800",
  PARTIAL_FAILED: "bg-orange-100 text-orange-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
  PENDING: "bg-muted text-muted-foreground",
  DELIVERED: "bg-sky-100 text-sky-800",
  READ: "bg-violet-100 text-violet-800",
  REPLIED: "bg-emerald-100 text-emerald-800",
};

function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status || "—"}
    </span>
  );
}

export default function OutboundCampaignsPanel({ selectedId, onSelect }) {
  const dispatch = useDispatch();
  const { showSuccessToast, showErrorToast } = useToast();
  const outbound = useSelector((state) => state.wati.outbound);
  const [page, setPage] = useState(1);
  const [recipientsPage, setRecipientsPage] = useState(1);

  useEffect(() => {
    dispatch(fetchOutboundCampaigns({ page, page_size: 20 }));
  }, [dispatch, page]);

  useEffect(() => {
    if (!selectedId) return;
    dispatch(fetchOutboundCampaignDetail(selectedId));
    dispatch(
      fetchOutboundRecipients({ campaignId: selectedId, page: recipientsPage, page_size: 50 })
    );
  }, [dispatch, selectedId, recipientsPage]);

  const results = outbound.list.data?.results || [];
  const detail = outbound.detail.data;
  const recipients = outbound.recipients.data?.results || [];

  const handleCancel = async () => {
    if (!selectedId) return;
    try {
      await dispatch(cancelOutboundCampaign(selectedId)).unwrap();
      showSuccessToast("Scheduled campaign cancelled", "top-right", "light");
      dispatch(fetchOutboundCampaigns({ page, page_size: 20 }));
    } catch (err) {
      showErrorToast(err?.detail || "Cancel failed", "top-right", "light");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Sent from dashboard</h2>
        <p className="text-xs text-muted-foreground">
          Local campaigns created from the Leads page. Status updates arrive via WATI webhooks.
        </p>
        {outbound.list.loading && !results.length ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : outbound.list.error ? (
          <p className="text-sm text-destructive">{outbound.list.error}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            No dashboard campaigns yet. Select leads on /leads and click Create campaign.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer",
                      String(selectedId) === String(row.id) && "bg-muted/40"
                    )}
                    onClick={() => {
                      setRecipientsPage(1);
                      onSelect?.(row.id);
                    }}
                  >
                    <TableCell className="font-medium max-w-[220px] truncate">
                      {row.broadcast_name}
                    </TableCell>
                    <TableCell>{row.campaign_type_name || row.campaign_type || "—"}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{row.template_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>{row.total}</TableCell>
                    <TableCell>{row.sent}</TableCell>
                    <TableCell>{row.failed}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePaginationFooter
          page={page}
          pageSize={20}
          count={outbound.list.data?.count || 0}
          onPageChange={setPage}
          itemLabel="campaigns"
        />
      </div>

      {selectedId && detail ? (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{detail.broadcast_name}</h3>
              <p className="text-xs text-muted-foreground">
                {detail.template_name} · <StatusBadge status={detail.status} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivered {detail.delivered} · Read {detail.read} · Replied {detail.replied} ·
                Failed {detail.failed}
              </p>
              {detail.last_error ? (
                <p className="mt-1 text-xs text-destructive">{detail.last_error}</p>
              ) : null}
            </div>
            {detail.status === "SCHEDULED" ? (
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel schedule
              </Button>
            ) : null}
          </div>

          {outbound.recipients.loading && !recipients.length ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                      <TableCell>{r.lead_id ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                        {r.error || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recipients.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No recipients
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
          <TablePaginationFooter
            page={recipientsPage}
            pageSize={50}
            count={outbound.recipients.data?.count || 0}
            onPageChange={setRecipientsPage}
            itemLabel="recipients"
          />
        </div>
      ) : null}
    </div>
  );
}
