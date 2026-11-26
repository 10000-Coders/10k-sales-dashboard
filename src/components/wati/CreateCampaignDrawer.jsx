"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Loader2, X, Megaphone, Check, ImageOff, FileText } from "lucide-react";
import axios from "@/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TemplateButtons, WhatsAppBody } from "@/components/wati/whatsappBubbleParts";
import useToast from "@/hooks/useToast";
import {
  createOutboundCampaign,
  estimateOutboundCampaign,
  fetchCampaignTypes,
  fetchWatiTemplates,
} from "@/redux/features/wati/watiSlice";

const LEAD_FIELD_OPTIONS = [
  { value: "name", label: "Lead name" },
  { value: "course", label: "Course" },
  { value: "mobile", label: "Mobile" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
];

const STEPS = [
  { id: 1, label: "Name" },
  { id: 2, label: "Content" },
  { id: 3, label: "Schedule" },
];

/** Suggested name for a follow-up sent from a campaign page, e.g. "D28 – Not responded follow-up". */
function suggestFollowUpName(audience) {
  if (!audience) return "";
  const combined = Array.isArray(audience.broadcastIds) && audience.broadcastIds.length > 1;
  // Joined names of several campaigns get too long for a broadcast name.
  const base = combined
    ? `${audience.broadcastIds.length} campaigns`
    : String(audience.campaignName || "").trim() || "Campaign";
  const label = String(audience.filterLabel || "").split(" · ")[0];
  return `${base} – ${label ? `${label} follow-up` : "Follow-up"}`.replace(/\s{2,}/g, " ");
}

/** Body fields naming the recipients: Leads-page `lead_ids` or a campaign-page `audience`. */
function recipientsPayload(audience, leadIds) {
  if (!audience) return { lead_ids: leadIds };
  return {
    audience: {
      // Several selected campaigns → one combined audience, one send per person.
      ...(Array.isArray(audience.broadcastIds) && audience.broadcastIds.length > 1
        ? { broadcast_ids: audience.broadcastIds }
        : { broadcast_id: audience.broadcastId }),
      ...(audience.filters || {}),
      exclude_phones: audience.excludePhones || [],
      include_phones: audience.includePhones || [],
    },
  };
}

function isCleanCampaignName(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  if (trimmed !== value.trim()) return false;
  if (/\s{2,}/.test(trimmed)) return false;
  return trimmed.length >= 3;
}

function isProxiedMediaUrl(url) {
  return typeof url === "string" && url.startsWith("/wati/");
}

/** Resolve public https URLs directly; JWT-proxy relative /wati/... URLs via blob. */
function useTemplateHeaderMedia(template) {
  const mediaUrl =
    template?.header_media_available && template?.header_media_url
      ? String(template.header_media_url).trim()
      : "";
  const headerType = String(template?.header_type || "").toUpperCase();
  const [resolved, setResolved] = useState(() =>
    mediaUrl && !isProxiedMediaUrl(mediaUrl) ? mediaUrl : ""
  );
  const [loading, setLoading] = useState(() => Boolean(mediaUrl && isProxiedMediaUrl(mediaUrl)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    if (!mediaUrl) {
      setResolved("");
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    if (!isProxiedMediaUrl(mediaUrl)) {
      setResolved(mediaUrl);
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    setLoading(true);
    setFailed(false);
    setResolved("");

    (async () => {
      try {
        const response = await axios.get(mediaUrl, {
          responseType: "blob",
          validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
        });
        if (cancelled) return;
        if (response.status === 204 || !response.data || response.data.size === 0) {
          setFailed(true);
          setResolved("");
          return;
        }
        const type = String(response.data.type || "").toLowerCase();
        if (type.includes("text/html") || type.includes("application/json")) {
          setFailed(true);
          setResolved("");
          return;
        }
        objectUrl = URL.createObjectURL(response.data);
        setResolved(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setResolved("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaUrl]);

  return { resolved, loading, failed, headerType, wantsMedia: Boolean(mediaUrl) || ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) };
}

function TemplatePreviewCard({ template, scrollable = false }) {
  const { resolved, loading, failed, headerType, wantsMedia } = useTemplateHeaderMedia(template);

  if (!template) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
        Select a template to preview the message
      </div>
    );
  }

  const headerText = template.header_text || template.header || "";
  const showTextHeader = headerText && (!headerType || headerType === "TEXT");
  const buttons =
    Array.isArray(template.buttons) && template.buttons.length
      ? template.buttons
      : Array.isArray(template.template_buttons)
        ? template.template_buttons
        : [];
  const hasHeaderBlock = wantsMedia || loading || failed;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-[#efeae2] px-4 py-4 shadow-sm",
        // Long templates scroll inside the preview instead of stretching the whole dialog.
        scrollable && "max-h-[min(56vh,500px)] overflow-y-auto overscroll-contain"
      )}
    >
      <div className="relative ml-auto w-[92%] overflow-hidden rounded-lg rounded-tr-none bg-[#d9fdd3] text-[14.2px] leading-[19px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        <div className={cn(hasHeaderBlock ? "p-[3px]" : "px-[7px] pb-[6px] pt-[6px]")}>
          {hasHeaderBlock ? (
            <div className="overflow-hidden rounded-[6px]">
              {loading ? (
                <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-black/[0.05] text-[#667781]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : failed || !resolved ? (
                <div className="flex aspect-[1.91/1] w-full flex-col items-center justify-center gap-1 bg-black/[0.05] px-3 text-center text-xs text-[#667781]">
                  <ImageOff className="h-5 w-5" />
                  <span>Header image unavailable for this template</span>
                </div>
              ) : headerType === "VIDEO" ? (
                <video src={resolved} controls className="block max-h-[340px] w-full bg-black object-contain" />
              ) : headerType === "DOCUMENT" ? (
                <a
                  href={resolved}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-black/[0.05] px-3 py-3 text-[13px] font-medium text-[#111b21] hover:bg-black/[0.08]"
                >
                  <FileText className="h-6 w-6 shrink-0 text-[#e9573f]" />
                  Open header document
                </a>
              ) : (
                // IMAGE (or unknown media type with a resolved binary) — only this template's URL
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolved}
                  alt={template.name ? `${template.name} header` : "Template header"}
                  className="block max-h-[340px] w-full object-cover"
                />
              )}
            </div>
          ) : null}
          <div className={cn(hasHeaderBlock && "px-[4px] pb-[3px] pt-[6px]")}>
            {showTextHeader ? (
              <p className="mb-1 font-semibold">{headerText}</p>
            ) : null}
            <div>
              {template.body ? (
                <WhatsAppBody text={template.body} />
              ) : (
                <span className="text-[#667781]">No body text</span>
              )}
            </div>
            {template.footer ? (
              <p className="mt-[3px] text-[13px] leading-[17px] text-[#667781]">{template.footer}</p>
            ) : null}
          </div>
        </div>
        {/* Quick-reply / CTA buttons sit inside the bubble, split by hairlines — like the phone. */}
        <TemplateButtons buttons={buttons} />
      </div>
      <p className="mt-2 truncate text-center text-[11px] text-[#667781]">{template.name}</p>
    </div>
  );
}

export default function CreateCampaignDrawer({
  open,
  onClose,
  selectedLeads = [],
  // Campaign-page follow-up: recipients resolved server-side from a campaign + filters.
  audience = null,
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useToast();
  const outbound = useSelector((state) => state.wati.outbound);

  const [step, setStep] = useState(1);
  const [broadcastName, setBroadcastName] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [paramMapping, setParamMapping] = useState({});
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);

  const leadIds = useMemo(() => selectedLeads.map((l) => l.id), [selectedLeads]);
  const recipientCount = audience ? Number(audience.count) || 0 : leadIds.length;
  const selectedTemplate = useMemo(
    () => (outbound.templates || []).find((t) => t.name === templateName) || null,
    [outbound.templates, templateName]
  );

  const nameValid = isCleanCampaignName(broadcastName);
  const contentValid =
    Boolean(campaignType) &&
    Boolean(templateName) &&
    (!(selectedTemplate?.param_names || []).length ||
      (selectedTemplate?.param_names || []).every((name) => paramMapping[name]));

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBroadcastName(suggestFollowUpName(audience));
    setCampaignType("");
    setTemplateName("");
    setParamMapping({});
    setScheduledAtLocal("");
    setSubmitting(false);
    setEstimate(null);
    dispatch(fetchCampaignTypes());
    // Audience is captured when the wizard opens; it must not reset the form mid-flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dispatch]);

  useEffect(() => {
    if (!open || !campaignType) return;
    dispatch(fetchWatiTemplates({ type: campaignType }));
    setTemplateName("");
    setParamMapping({});
  }, [open, campaignType, dispatch]);

  useEffect(() => {
    if (!selectedTemplate?.param_names?.length) {
      setParamMapping({});
      return;
    }
    const next = {};
    selectedTemplate.param_names.forEach((name) => {
      const key = String(name);
      if (LEAD_FIELD_OPTIONS.some((o) => o.value === key)) next[key] = key;
      else if (key.toLowerCase().includes("name")) next[key] = "name";
      else if (key.toLowerCase().includes("course")) next[key] = "course";
      else next[key] = "name";
    });
    setParamMapping(next);
  }, [selectedTemplate]);

  const canSend = nameValid && contentValid && recipientCount > 0 && !submitting;

  const runEstimate = async () => {
    if (!recipientCount) return;
    setEstimating(true);
    try {
      const result = await dispatch(
        estimateOutboundCampaign({
          ...recipientsPayload(audience, leadIds),
          template_name: templateName,
          template_id: selectedTemplate?.id || "",
        })
      ).unwrap();
      setEstimate(result);
    } catch (err) {
      setEstimate({
        recipient_count: recipientCount,
        estimate_available: false,
        estimate_error: err?.detail || "Could not load estimate; showing selection count.",
      });
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    if (step === 3 && open) {
      runEstimate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);

  const handleSubmit = async () => {
    if (!canSend) return;
    setSubmitting(true);
    try {
      let scheduled_at = null;
      if (scheduledAtLocal) {
        scheduled_at = new Date(scheduledAtLocal).toISOString();
      }
      const campaign = await dispatch(
        createOutboundCampaign({
          broadcast_name: broadcastName.trim(),
          campaign_type: campaignType,
          template_name: templateName,
          template_id: selectedTemplate?.id || "",
          ...recipientsPayload(audience, leadIds),
          param_mapping: paramMapping,
          scheduled_at,
        })
      ).unwrap();
      showSuccessToast(
        scheduled_at ? "Campaign scheduled" : "Campaign sent to WATI",
        "top-right",
        "light"
      );
      onClose?.();
      const watiId = campaign?.broadcast_id || campaign?.id || campaign?.wati_broadcast_ids?.[0];
      if (watiId) {
        router.push(`/wati/campaigns?campaign=${encodeURIComponent(String(watiId))}`);
      } else {
        router.push("/wati/campaigns");
      }
    } catch (err) {
      let detail = err?.detail || "Failed to create campaign";
      if (err?.wati_status === 401) detail = "WATI token expired or unauthorized (401).";
      else if (err?.wati_status === 429) detail = "WATI rate limited (429). Try again shortly.";
      showErrorToast(detail, "top-right", "light");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => (!submitting ? onClose?.() : null)} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <Dialog.Panel className="flex max-h-[min(900px,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Dialog.Title className="text-lg font-semibold">Create campaign</Dialog.Title>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {audience ? (
                  <>
                    {recipientCount} recipient{recipientCount === 1 ? "" : "s"} from{" "}
                    <span className="font-medium text-foreground">{audience.campaignName}</span>
                    {audience.filterLabel ? ` (${audience.filterLabel})` : ""}
                  </>
                ) : (
                  <>
                    {leadIds.length} lead{leadIds.length === 1 ? "" : "s"} selected
                  </>
                )}{" "}
                · Step {step} of 3
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-muted"
              onClick={() => !submitting && onClose?.()}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b px-5 py-3">
            {STEPS.map((s, idx) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      done && "bg-emerald-600 text-white",
                      active && !done && "bg-[#FF8000] text-white",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  <span
                    className={cn(
                      "truncate text-xs font-medium sm:text-sm",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                  {idx < STEPS.length - 1 ? (
                    <div className="mx-1 hidden h-px flex-1 bg-border sm:block" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {step === 1 && (
              <div className="mx-auto max-w-lg space-y-3">
                <Label htmlFor="campaign-name">Campaign name</Label>
                <Input
                  id="campaign-name"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  placeholder="Nov FSD Leads – Follow-up 1"
                  autoFocus
                  className="h-11 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Use a clear, unique name (shown in WATI Broadcast History). Example:{" "}
                  <span className="font-medium text-foreground">Nov FSD Leads – Follow-up 1</span>.
                  Avoid double spaces. If the name already exists, choose a different one.
                </p>
                {broadcastName && !nameValid ? (
                  <p className="text-sm text-destructive">
                    Enter at least 3 characters with no leading/trailing or double spaces.
                  </p>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <div className="min-w-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign type</Label>
                    {outbound.typesLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(outbound.types || []).map((t) => (
                          <button
                            key={t.slug}
                            type="button"
                            onClick={() => setCampaignType(t.slug)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted/50",
                              campaignType === t.slug && "border-[#FF8000] bg-orange-50"
                            )}
                          >
                            {t.name}
                          </button>
                        ))}
                        {!outbound.types?.length ? (
                          <p className="text-sm text-muted-foreground">No campaign types configured.</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {campaignType ? (
                    <div className="space-y-2">
                      <Label>Template</Label>
                      {outbound.templatesLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="max-h-[min(40vh,22rem)] space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
                          {(outbound.templates || []).map((t) => (
                            <button
                              key={t.id || t.name}
                              type="button"
                              onClick={() => setTemplateName(t.name)}
                              title={t.name}
                              className={cn(
                                "block w-full min-w-0 rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted/50",
                                templateName === t.name && "border-[#FF8000] bg-orange-50"
                              )}
                            >
                              <div className="truncate font-medium">{t.name}</div>
                              <div className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
                                {t.body || t.header || "No preview text"}
                              </div>
                              {t.buttons?.length ? (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {t.buttons.map((b, i) => (
                                    <span
                                      key={`${b.text}-${i}`}
                                      className="max-w-full truncate rounded-full border border-[#027eb5]/25 bg-[#027eb5]/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-[#027eb5]"
                                    >
                                      {b.text}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </button>
                          ))}
                          {!outbound.templates?.length ? (
                            <p className="text-sm text-muted-foreground">
                              No approved templates for this type.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {selectedTemplate?.param_names?.length ? (
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Map template variables
                      </Label>
                      {audience ? (
                        <p className="text-xs text-muted-foreground">
                          WhatsApp contacts that are not in the CRM only have a name — other
                          fields are sent blank for them.
                        </p>
                      ) : null}
                      <div className="space-y-2">
                        {selectedTemplate.param_names.map((name) => (
                          <div key={name} className="flex items-center gap-2">
                            <span className="w-28 shrink-0 text-xs font-mono">{`{{${name}}}`}</span>
                            <select
                              className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                              value={paramMapping[name] || "name"}
                              onChange={(e) =>
                                setParamMapping((prev) => ({ ...prev, [name]: e.target.value }))
                              }
                            >
                              {LEAD_FIELD_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 space-y-2 lg:sticky lg:top-0">
                  <Label>Template preview</Label>
                  <TemplatePreviewCard template={selectedTemplate} scrollable />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-lg space-y-5">
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <div>
                    Campaign: <strong>{broadcastName.trim()}</strong>
                  </div>
                  <div>
                    Template: <strong>{templateName || "—"}</strong>
                  </div>
                  <div>
                    Recipients:{" "}
                    <strong>{estimate?.recipient_count ?? recipientCount}</strong>
                    {estimate?.skipped_invalid_or_duplicate
                      ? ` (${estimate.skipped_invalid_or_duplicate} skipped invalid/dupes)`
                      : ""}
                  </div>
                  {audience && estimate?.crm_count != null ? (
                    <div className="text-xs text-muted-foreground">
                      {estimate.crm_count} CRM lead{estimate.crm_count === 1 ? "" : "s"} ·{" "}
                      {estimate.contact_count} WhatsApp-only contact
                      {estimate.contact_count === 1 ? "" : "s"}
                    </div>
                  ) : null}
                  {estimating ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking recipient count…
                    </div>
                  ) : estimate?.estimate_available && estimate?.estimated_cost != null ? (
                    <div>
                      Estimated cost: <strong>{estimate.estimated_cost}</strong>
                      {estimate.current_credit != null
                        ? ` · Credit: ${estimate.current_credit}`
                        : ""}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {estimate?.estimate_error ||
                        "Live WATI cost estimate unavailable — recipient count shown."}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-at">Schedule (optional)</Label>
                  <Input
                    id="schedule-at"
                    type="datetime-local"
                    value={scheduledAtLocal}
                    onChange={(e) => setScheduledAtLocal(e.target.value)}
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to send now. If set, the campaign is scheduled for that time (stored
                    as UTC).
                  </p>
                </div>

                {selectedTemplate ? (
                  <div className="space-y-2">
                    <Label>Message preview</Label>
                    <TemplatePreviewCard template={selectedTemplate} scrollable />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={submitting || step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step < 3 ? (
                <Button
                  type="button"
                  disabled={(step === 1 && !nameValid) || (step === 2 && !contentValid)}
                  onClick={() => setStep((s) => Math.min(3, s + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button type="button" disabled={!canSend} onClick={handleSubmit} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  {scheduledAtLocal ? "Schedule campaign" : "Send campaign"}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
