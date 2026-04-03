import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { nativeFetch, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, Calendar, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ParentInvite() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Validate the invite code and get the player's name
  const { data: invite, isLoading: isValidating, isError } = useQuery({
    queryKey: ["/api/parent-invite/validate", code],
    queryFn: () => nativeFetch(`/api/parent-invite/validate/${code}`).then(r => {
      if (!r.ok) throw new Error("Invalid invite");
      return r.json();
    }),
    enabled: !!code,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await nativeFetch("/api/parent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code, firstName, email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("playr1_auth_token", data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/parent");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    registerMutation.mutate();
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (isError || !invite?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is no longer valid or has already been used. Ask the player to send a new invite from their profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} variant="outline">Go to PLAYR1</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-500 tracking-wide mb-1">PLAYR1</h1>
          <p className="text-muted-foreground text-sm">Parent &amp; Guardian Access</p>
        </div>

        {/* Context card */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-5 pb-5">
            <p className="text-center text-sm text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{invite.playerName}</span> has invited you to follow their basketball training.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Eye, label: "View training logs" },
                { icon: Calendar, label: "See sessions" },
                { icon: MessageCircle, label: "Read messages" },
                { icon: Shield, label: "Coach connections" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Registration form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create your parent account</CardTitle>
            <CardDescription>Quick setup — takes about 30 seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">Your first name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Sarah"
                  data-testid="input-parent-firstName"
                  className="mt-1.5"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-parent-email"
                  className="mt-1.5"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Create a password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  data-testid="input-parent-password"
                  className="mt-1.5"
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2"
                disabled={registerMutation.isPending}
                data-testid="button-parent-register"
              >
                {registerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Create Account &amp; Connect</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have a PLAYR1 account?{" "}
          <a href="/auth" className="text-orange-500 hover:underline">Sign in</a>
          {" "}and go to{" "}
          <a href="/parent" className="text-orange-500 hover:underline">Parent Dashboard</a>.
        </p>
      </div>
    </div>
  );
}
