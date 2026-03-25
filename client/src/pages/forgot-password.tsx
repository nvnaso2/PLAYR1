import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotValues) => {
      await apiRequest("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: () => setSent(true),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background" data-testid="page-forgot-password">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <span className="font-black text-5xl tracking-widest text-primary">PLAYR1</span>
        </div>
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-2">
            {sent ? (
              <>
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold" data-testid="text-check-email-title">Check Your Email</CardTitle>
                <CardDescription>
                  If an account exists with that email, we've sent a password reset link. Check your inbox and spam folder.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl font-bold" data-testid="text-forgot-title">Forgot Password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a link to reset your password.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSent(false); form.reset(); }}
                  data-testid="button-try-another"
                >
                  Try a different email
                </Button>
                <div className="text-center">
                  <Link href="/auth" className="text-sm text-primary hover:underline inline-flex items-center gap-1" data-testid="link-back-login">
                    <ArrowLeft className="h-3 w-3" /> Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" data-testid="input-forgot-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-send-reset">
                      {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send Reset Link
                    </Button>
                  </form>
                </Form>
                <div className="mt-6 text-center">
                  <Link href="/auth" className="text-sm text-primary hover:underline inline-flex items-center gap-1" data-testid="link-back-login-form">
                    <ArrowLeft className="h-3 w-3" /> Back to sign in
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
