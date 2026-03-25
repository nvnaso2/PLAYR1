import { Link } from "wouter";
import { ArrowLeft, Mail, MessageCircle, BookOpen, Users, Calendar, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "How do I connect with a trainer?",
    answer: "Go to 'My Trainer' in the navigation menu and tap 'Find Trainers'. Browse trainer profiles and send a connection request. Once accepted, you can message them, request sessions, and receive drill assignments.",
  },
  {
    question: "How do I log a training session?",
    answer: "Tap 'Training Log' in the navigation menu, then tap the '+' button to start a new session. Select your drill, enter your results, and save. Your progress is tracked automatically.",
  },
  {
    question: "How do I track my shooting stats?",
    answer: "In the Training Log, select a shooting drill and tap on court zones to log makes and attempts. Your shot chart heatmap updates in real time on your progress dashboard.",
  },
  {
    question: "How do I schedule a session with my trainer?",
    answer: "Go to 'My Trainer', select your trainer, and tap 'Request Session'. Choose a date, time, and session type. Your trainer will confirm the booking and it will appear in both your schedules.",
  },
  {
    question: "I'm a trainer — how do I assign a drill to a player?",
    answer: "Go to 'Player Management', find the player, and tap 'Assign Drill' on their card. Search for the drill, add an optional due date and notes, then confirm. The player will be notified immediately.",
  },
  {
    question: "How does the parent visibility feature work?",
    answer: "When a player under 18 completes onboarding, a parent invite code is generated. Parents create their own PLAYR1 account and enter the invite code to link to their child's account. Parents get read-only access to training activity, sessions, and trainer connections.",
  },
  {
    question: "How do I reset my password?",
    answer: "On the login screen, tap 'Forgot Password' and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if you don't see it.",
  },
  {
    question: "Can I use PLAYR1 on my phone?",
    answer: "Yes! PLAYR1 is available as a native iOS app on the App Store. You can also use the web version on any device by visiting our website and adding it to your home screen.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background safe-area-top">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" className="mb-8 gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2" data-testid="text-support-title">Support</h1>
        <p className="text-muted-foreground mb-10">We're here to help you get the most out of PLAYR1.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <a
            href="mailto:support@playr1.app"
            className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card hover:bg-accent transition-colors text-center"
            data-testid="link-email-support"
          >
            <Mail className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Email Us</p>
              <p className="text-sm text-muted-foreground">support@playr1.app</p>
            </div>
          </a>

          <Link href="/privacy">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card hover:bg-accent transition-colors text-center cursor-pointer" data-testid="link-privacy-support">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">How we handle your data</p>
              </div>
            </div>
          </Link>

          <Link href="/terms">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card hover:bg-accent transition-colors text-center cursor-pointer" data-testid="link-terms-support">
              <MessageCircle className="w-8 h-8 text-primary" />
              <div>
                <p className="font-semibold">Terms of Service</p>
                <p className="text-sm text-muted-foreground">Our terms and conditions</p>
              </div>
            </div>
          </Link>
        </div>

        <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>

        <div className="space-y-4" data-testid="faq-list">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-xl border bg-card p-6" data-testid={`faq-item-${index}`}>
              <h3 className="font-semibold mb-2">{faq.question}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Still need help?</h2>
          <p className="text-muted-foreground mb-4">Our support team typically responds within 24 hours.</p>
          <a href="mailto:support@playr1.app">
            <Button className="gap-2" data-testid="button-contact-support">
              <Mail className="w-4 h-4" />
              Contact Support
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
