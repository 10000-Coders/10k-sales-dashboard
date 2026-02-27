"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2, LayoutDashboard, Users, Target } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { login } from "@/redux/features/user/userAuth";
import useToast from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const dispatch = useDispatch();
  const { loginLoading } = useSelector((state) => state.userAuth);
  const { showSuccessToast, showErrorToast } = useToast();
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(login(formData));
    if (login.fulfilled.match(res)) {
      showSuccessToast("Logged in successfully.", "top-right", "light");
      router.push("/");
    } else {
      showErrorToast(res.payload?.detail || "Invalid email or password.", "top-right", "light");
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex lg:w-[48%] flex-col justify-between bg-[hsl(24,95%,53%)] p-10 text-white">
        <div>
          <div className="relative h-10 w-[133px]">
            <Image
              src="/sideBar_Images/logo.png"
              alt="10k Coders"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <div className="space-y-8">
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
        <p className="text-sm text-white/80">© 10k Coders · Sales team portal</p>
      </div>

      {/* Right: Login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[hsl(0,0%,98%)] px-4 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="relative h-9 w-[120px]">
              <Image
                src="/sideBar_Images/logo.png"
                alt="10k Coders"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your sales account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="h-11 border-border bg-background pl-10 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="h-11 border-border bg-background pl-10 pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 h-11 w-11 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-11 w-full font-semibold"
              size="lg"
              disabled={loginLoading}
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
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Use the email and password provided by your manager.
          </p>
        </div>
      </div>
    </main>
  );
}
