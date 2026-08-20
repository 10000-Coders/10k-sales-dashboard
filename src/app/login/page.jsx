"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const SALES_QUOTES = [
  "Every 'no' is one step closer to the 'yes' that changes everything. Keep dialing.",
  "You didn't wake up today to be average. You woke up to conquer territories no one else dares to touch.",
  "Comfort zones are graveyards for commission checks. Get uncomfortable. Get rich.",
  "Your quota isn't a ceiling — it's a floor. Decide today what kind of salesperson you really are.",
  "Make one more call. Send one more email. Show up one more time. Legends are built in the 'one more'.",
  "The best salespeople don't wait for leads — they create them, chase them, and close them before lunch.",
  "Your competition went home early today. This is your moment. The phone is still warm.",
  "Curiosity is your superpower. Ask better questions, listen harder, and you'll find the need behind every objection.",
  "You are not selling a product. You are changing someone's life. Own that responsibility. Pursue it relentlessly.",
  "Top performers don't get lucky. They make 30 more calls than everyone else until luck has no choice but to show up.",
  "Every great deal you've ever closed started as a cold conversation. Today's cold call is tomorrow's case study.",
  "The market doesn't care about your feelings. But it will reward your relentless, obsessive, hungry effort.",
  "Be so curious about your customer's world that solving their problem feels like the only logical outcome.",
  "Pain points are treasure maps. The salesperson willing to explore them deepest wins the biggest rewards.",
  "This month's record is next month's baseline. Never stop raising your own bar — no one else will do it for you.",
  "The energy you bring to the first 10 seconds of a call determines the next 10 minutes. Walk in like you've already won.",
  "Your pipeline is a garden. Water it daily with follow-ups, curiosity, and genuine care — and it will feed you forever.",
  "Hunger isn't a feeling — it's a decision you make every single morning before the world tells you otherwise.",
  "Rejection is just redirection. The universe is pushing you toward a bigger deal.",
  "Be so good at solving problems that saying no to you feels like leaving money on the table."
]
import { Mail, Loader2, LayoutDashboard, Users, Target, Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/redux/features/user/userAuth";
import { setLoginAt } from "@/lib/sessionExpiry";
import useToast from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "@/axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [quote, setQuote] = useState("Your ultimate tool to connect with leads, close deals, and smash targets. Let's make today count! 🚀");
  const [isMounted, setIsMounted] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setQuote(SALES_QUOTES[Math.floor(Math.random() * SALES_QUOTES.length)]);
  }, []);
  const [otpSent, setOtpSent] = useState(false);
  const [emptyAttempts, setEmptyAttempts] = useState(0);
  const dispatch = useDispatch();
  const { loginLoading } = useSelector((state) => state.userAuth);
  const { showSuccessToast, showErrorToast } = useToast();
  const router = useRouter();

  const remainingLabel = (remaining) => {
    if (remaining == null || remaining === "" || Number.isNaN(Number(remaining))) return "";
    const n = Number(remaining);
    if (n <= 0) return "0 chances remaining today.";
    return n === 1 ? "1 chance remaining today." : `${n} chances remaining today.`;
  };

  const toastWithRemaining = (detail, remaining, fallback) => {
    const base = detail || fallback;
    const extra = remainingLabel(remaining);
    return extra ? `${base} ${extra}` : base;
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      const next = emptyAttempts + 1;
      setEmptyAttempts(next);
      showErrorToast("Enter your email.", "top-right", "light");
      return;
    }
    // Basic format check before calling the API
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailOk) {
      showErrorToast("Enter a valid email address.", "top-right", "light");
      return;
    }
    setSendLoading(true);
    try {
      const res = await axios.post(
        "/login/otp/send/",
        { email: trimmed },
        { withCredentials: true }
      );
      setOtpSent(true);
      setEmptyAttempts(0);
      showSuccessToast(res.data?.message || "OTP sent successfully.", "top-right", "light");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const remaining = err.response?.data?.remaining_attempts;
      const showRemaining = remaining != null && (status === 429 || emptyAttempts >= 3);
      const message = showRemaining
        ? toastWithRemaining(
            detail,
            remaining,
            status === 429 ? "Too many attempts. Try again tomorrow." : "Could not send OTP."
          )
        : detail || (status === 429 ? "Too many attempts. Try again tomorrow." : "Could not send OTP.");
      showErrorToast(message, "top-right", "light");
    } finally {
      setSendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpSent) {
      await handleSendOtp();
      return;
    }
    if (otp.length < 6) {
      showErrorToast("Enter 6-digit OTP.", "top-right", "light");
      return;
    }
    const res = await dispatch(login({ email, otp }));
    if (login.fulfilled.match(res)) {
      setLoginAt(); // 30-day client session window (matches refresh lifetime)
      showSuccessToast("Logged in successfully.", "top-right", "light");
      router.push("/");
    } else {
      const detail = res.payload?.detail;
      const statusHint =
        typeof detail === "string" && detail.toLowerCase().includes("too many")
          ? detail
          : detail || "Invalid email or OTP.";
      showErrorToast(statusHint, "top-right", "light");
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* Left: Brand panel with mirrored & blurred background image */}
      <div className="relative hidden lg:flex lg:w-[48%] flex-col justify-between overflow-hidden text-white shadow-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-x-[-1] blur-[6px] shadow-none"
          style={{ backgroundImage: "url('/login-page.png')" }}
        />

        <div className="relative z-10 flex-1 flex flex-col justify-center space-y-8 px-10 pb-10 pt-16">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="mt-2 text-white/90 text-lg">Manage leads, track activities, and close more deals.</p>
          </div>
          <ul className="space-y-4">
            {[
              { icon: Target, text: "Track leads from first contact to enrollment" },
              { icon: Users, text: "Assign and manage your sales team" },
              { icon: LayoutDashboard, text: "One place for all your sales operations" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/95">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 px-10 pb-6 text-sm text-white/80">
          © 10000 Coders · Sales team portal
        </p>
      </div>

      {/* Right: Login form (OTP) — logo here so section doesn’t look empty */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex flex-col items-center justify-center text-center">
            <div className="relative h-16 w-[190px] sm:h-16 sm:w-[200px] mb-8 hover:scale-105 transition-transform duration-300">
              <Image
                src="/10k_brand_icon.png"
                alt="10000 Coders"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-4 py-1.5 text-xs font-semibold text-[#FF8000] ring-1 ring-inset ring-orange-500/30 shadow-sm hover:bg-orange-100 transition-colors cursor-default">
                <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
                <span>The Hearts of 10000 Coders</span>
              </div>
              
              <h2 className="text-2xl sm:text-[28px] leading-tight font-extrabold tracking-tight text-foreground">
                Sales Dashboard of <br className="hidden sm:block mt-1" />
                <span className="bg-gradient-to-br from-[#FF8000] to-orange-400 bg-clip-text text-transparent">10000 Coders</span>
              </h2>
              
              <div className="min-h-[60px] flex items-center justify-center">
                <p 
                  key={quote}
                  className={`text-muted-foreground text-sm leading-relaxed  pb-2 transition-all duration-700 ease-in-out ${
                    isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}
                >
                  {quote}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@10000coders.in"
                    className="h-11 border-2 border-[#FF8000] bg-background pl-10 focus-visible:border-[#FF8000] focus-visible:ring-2 outline-none focus-visible:ring-[#FF8000]/30"
                    disabled={otpSent}
                  />
                </div>
                {!otpSent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 border-2 border-[#FF8000] text-[#FF8000] hover:bg-[#FF8000] hover:text-white disabled:opacity-50"
                    disabled={sendLoading}
                    onClick={handleSendOtp}
                  >
                    {sendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                  </Button>
                )}
              </div>
            </div>

            {otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground">OTP</Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="h-11 border-2 border-[#FF8000] bg-background focus-visible:border-[#FF8000] focus-visible:ring-2 focus-visible:ring-[#FF8000]/30"
                  maxLength={6}
                />
                <button
                  type="button"
                  className="text-sm text-[#FF8000] underline hover:text-[#e67300]"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                >
                  Use a different email
                </button>
              </div>
            )}

            {otpSent && (
              <Button
                type="submit"
                className="h-11 w-full font-semibold bg-[#FF8000] text-white hover:bg-[#e67300] focus-visible:ring-[#FF8000]/40"
                size="lg"
                disabled={loginLoading || otp.length < 6}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
