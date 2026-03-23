"use client";

import withPrivateAuth from "@/components/withPrivateAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesPersons } from "@/hooks/useSalesData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Share2, User, UserPlus, ExternalLink } from "lucide-react";
import ReferralAssignmentCard from "./ReferralAssignmentCard";
import ReferralRewardCard from "./ReferralRewardCard";

function isManager(role) {
  return role === "manager";
}

function isManagerOrSuperAdmin(role) {
  return role === "manager" || role === "super_admin";
}

function ReferralDetailClient() {
  const params = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const isManagerOrSuper = isManagerOrSuperAdmin(user?.role);
  const { persons } = useSalesPersons({ enabled: isManagerRole });
  const id = params?.id;
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const headers = useMemo(() => getHeaders(), [getHeaders]);

  const fetchReferral = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(`/referrals/${id}/`, { headers });
      setReferral(data);
    } catch (err) {
      setReferral(null);
      setError(err.response?.data?.detail || "Referral not found.");
    } finally {
      setLoading(false);
    }
  }, [headers, id]);

  useEffect(() => {
    fetchReferral();
  }, [fetchReferral]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !referral) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/referrals")} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to referrals
        </Button>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const r = referral;

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/referrals")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isManagerOrSuper ? "Back to all referrals" : "Back to your referral leads"}
          </Button>
          <div>
            {!isManagerOrSuper ? (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Your referral lead</p>
            ) : (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Referral</p>
            )}
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Share2 className="h-6 w-6" />
              {r?.referred_name ?? "—"}
            </h1>
          </div>
        </div>
        {r?.referred_sales_student ? (
          <Button onClick={() => router.push(`/students/${r.referred_sales_student}`)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View student
          </Button>
        ) : (
          <Button onClick={() => router.push(`/students/new?referral=${id}`)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Referred person
          </CardTitle>
          <CardDescription>Details submitted via referral form</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium">{r?.referred_name ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p>{r?.referred_email ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Mobile</Label>
            <p>{r?.referred_mobile ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">College</Label>
            <p>{r?.referred_college ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Year of passing</Label>
            <p>{r?.referred_year_of_passing ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Branch</Label>
            <p>{r?.referred_branch ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Qualification</Label>
            <p>{r?.referred_qualification ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">State</Label>
            <p>{r?.referred_state ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-muted-foreground">Address</Label>
            <p>{r?.referred_address ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Present status</Label>
            <p>{r?.referred_present_status ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Interested in</Label>
            <p>{r?.referred_interested_in ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <ReferralAssignmentCard
        referral={r}
        persons={persons}
        isManagerRole={isManagerRole}
        isManagerOrSuper={isManagerOrSuper}
        headers={headers}
        onReferralChange={setReferral}
        onError={setError}
      />

      <ReferralRewardCard
        referralId={r?.id}
        reward={r?.reward}
        isManagerRole={isManagerRole}
        headers={headers}
        onRewardChange={(nextReward) => setReferral((prev) => (prev ? { ...prev, reward: nextReward } : prev))}
        onError={setError}
      />
    </div>
  );
}

export default withPrivateAuth(ReferralDetailClient);
