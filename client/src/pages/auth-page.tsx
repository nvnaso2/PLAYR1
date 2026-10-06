import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, storeAuthToken } from "@/lib/queryClient";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logoLandscape from "@assets/PNG_image_auth_trimmed.png";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.token) storeAuthToken(data.token);
      const { token: _t, ...user } = data;
      queryClient.setQueryData(["/api/auth/user"], user);
       const returnTo = new URLSearchParams(window.location.search).get("returnTo");
       navigate(returnTo?.startsWith("/") ? returnTo : "/");
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  return (
    <Card className="w-full max-w-md rounded-none border-0 bg-transparent text-[#f5f2eb] shadow-none">
      <CardContent className="px-0 pb-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="sr-only">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      aria-label="Email"
                      data-testid="input-login-email"
                      className="auth-pill-input h-[58px] px-5 pr-5 text-[15px] text-[#f5f2eb] placeholder:text-[#88837e] focus-visible:ring-0 focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="sr-only">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Password"
                        aria-label="Password"
                        data-testid="input-login-password"
                        className="auth-pill-input h-[58px] px-5 pr-14 text-[15px] text-[#f5f2eb] placeholder:text-[#88837e] focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#aaa39d] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9a5e] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="h-[58px] w-full rounded-full border border-orange-300 bg-orange-500 text-[13px] font-bold tracking-[0.04em] text-black shadow-[0_8px_28px_rgba(249,115,22,0.22)] transition-colors hover:bg-orange-400 hover:text-black focus-visible:ring-2 focus-visible:ring-[#ffd0b5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
            >
              {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {loginMutation.isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </Form>
        <div className="mt-5 flex items-center justify-center gap-5 text-[13px]">
          <a
            href="/forgot-password"
            className="rounded-sm font-medium text-[#d9d3cd] transition-colors hover:text-[#ff9a5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9a5e] focus-visible:ring-offset-4 focus-visible:ring-offset-black"
            data-testid="link-forgot-password"
          >
            Forgot Password
          </a>
          <span className="h-1 w-1 rounded-full bg-[#f07836]/70" aria-hidden="true" />
          <button
            type="button"
            onClick={onSwitch}
            className="rounded-sm font-medium text-[#d9d3cd] transition-colors hover:text-[#ff9a5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9a5e] focus-visible:ring-offset-4 focus-visible:ring-offset-black"
            data-testid="button-switch-register"
          >
            New Profile?
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterValues) => {
      const { confirmPassword, ...payload } = data;
      const res = await apiRequest("POST", "/api/auth/register", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.token) storeAuthToken(data.token);
      const { token: _t, ...user } = data;
      queryClient.setQueryData(["/api/auth/user"], user);
      track("signup", { userId: user?.id });
       const returnTo = new URLSearchParams(window.location.search).get("returnTo");
       navigate(returnTo?.startsWith("/") ? returnTo : "/");
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  return (
    <Card className="w-full max-w-md rounded-none border-0 bg-transparent text-[#f5f2eb] shadow-none">
      <CardHeader className="px-0 pb-5 pt-0 text-left">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f07836]">
          <span className="h-px w-7 bg-[#f07836]" />
          Start with the fundamentals
        </div>
        <CardTitle className="font-heading text-4xl font-bold uppercase leading-none tracking-[0.04em] text-[#f5f2eb] sm:text-5xl" data-testid="text-register-title">Create Account</CardTitle>
        <CardDescription className="mt-2 text-sm text-[#a6a39c]">Make your work count. Your player profile begins now.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First" data-testid="input-register-firstname" className="h-11 rounded-sm border-[#45433f] bg-[#201f1d] px-3 text-[15px] text-[#f5f2eb] placeholder:text-[#96928a] focus-visible:border-[#f07836] focus-visible:ring-[#f07836]/35 focus-visible:ring-offset-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7d3cb]">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last" data-testid="input-register-lastname" className="h-11 rounded-sm border-[#45433f] bg-[#201f1d] px-3 text-[15px] text-[#f5f2eb] placeholder:text-[#96928a] focus-visible:border-[#f07836] focus-visible:ring-[#f07836]/35 focus-visible:ring-offset-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" data-testid="input-register-email" className="h-11 rounded-sm border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] placeholder:text-[#96928a] focus-visible:border-[#f07836] focus-visible:ring-[#f07836]/35 focus-visible:ring-offset-0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        data-testid="input-register-password"
                        className="h-11 rounded-sm border-[#45433f] bg-[#201f1d] px-4 pr-12 text-[15px] text-[#f5f2eb] placeholder:text-[#96928a] focus-visible:border-[#f07836] focus-visible:ring-[#f07836]/35 focus-visible:ring-offset-0"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-[#a6a39c] transition-colors hover:text-[#f5f2eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f07836] focus-visible:ring-offset-2 focus-visible:ring-offset-[#201f1d]"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        data-testid="button-toggle-register-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7d3cb]">Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-enter password" data-testid="input-register-confirm" className="h-11 rounded-sm border-[#45433f] bg-[#201f1d] px-4 text-[15px] text-[#f5f2eb] placeholder:text-[#96928a] focus-visible:border-[#f07836] focus-visible:ring-[#f07836]/35 focus-visible:ring-offset-0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-1 h-12 w-full rounded-sm border-[#f07836] bg-[#f07836] text-[12px] font-bold uppercase tracking-[0.17em] text-[#17120f] transition-colors hover:bg-[#ff8b4b] hover:text-[#17120f] focus-visible:ring-2 focus-visible:ring-[#ffd0b5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171716]" disabled={registerMutation.isPending} data-testid="button-register-submit">
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create your player profile
            </Button>
          </form>
        </Form>
        <div className="mt-6 border-t border-[#393835] pt-5 text-sm text-[#a6a39c]">
          Already on PLAYR1?{" "}
          <button onClick={onSwitch} className="rounded-sm font-semibold text-[#f5f2eb] underline decoration-[#f07836] decoration-2 underline-offset-4 transition-colors hover:text-[#f07836] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f07836] focus-visible:ring-offset-4 focus-visible:ring-offset-[#171716]" data-testid="button-switch-login">
            Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">(() =>
    new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login"
  );
  const [, navigate] = useLocation();

  return (
    <div
      className="flex min-h-[100dvh] w-full items-center justify-center bg-black px-5 py-12 text-[#f5f2eb] safe-area-inset sm:px-8"
      data-testid="page-auth"
    >
      <main className="w-full max-w-[400px]">
        <img
          src={logoLandscape}
          alt="PLAYR1"
          className="mx-auto mb-11 h-12 w-[200px] max-w-[72%] object-contain object-center mix-blend-screen sm:mb-12 sm:h-[58px] sm:w-[228px]"
          data-testid="img-auth-logo"
        />
        <section aria-label={mode === "login" ? "Sign in" : "Create account"}>
          {mode === "login" ? (
            <LoginForm onSwitch={() => navigate("/app-setup")} />
          ) : (
            <RegisterForm onSwitch={() => setMode("login")} />
          )}
        </section>
      </main>
    </div>
  );
}
