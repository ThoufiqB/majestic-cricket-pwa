"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircleQuestion,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
} from "lucide-react";
import { apiGet, apiPost } from "@/app/client/api";
import { toast } from "sonner";

type Question = {
  id: string;
  question: string;
  asked_by: string;
  asked_by_name: string;
  asked_at: string | null;
  status: "open" | "answered";
  answer: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  is_admin_answer: boolean;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function QuestionCard({ q }: { q: Question }) {
  const [expanded, setExpanded] = useState(q.status === "answered");

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <MessageCircleQuestion className="h-5 w-5 mt-0.5 shrink-0 text-[#1e3a5f]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm leading-snug">{q.question}</p>
              <span className="shrink-0">
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{q.asked_by_name}</span>
              {q.asked_at && (
                <span className="text-xs text-muted-foreground">&middot; {formatDate(q.asked_at)}</span>
              )}
              {q.status === "answered" ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Answered
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" /> Open
                </Badge>
              )}
            </div>
          </div>
        </button>

        {expanded && q.status === "answered" && q.answer && (
          <div className="px-4 pb-4 pt-0 border-t bg-green-50/50">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 mt-3">
              Answer{q.is_admin_answer ? " (Admin)" : ""}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{q.answer}</p>
            {q.answered_by_name && (
              <p className="text-xs text-muted-foreground mt-2">
                &mdash; {q.answered_by_name}
                {q.answered_at ? `, ${formatDate(q.answered_at)}` : ""}
              </p>
            )}
          </div>
        )}

        {expanded && q.status === "open" && (
          <div className="px-4 pb-4 pt-2 border-t">
            <p className="text-sm text-muted-foreground italic">No answer yet. Check back soon!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function QnaPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "answered">("all");
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const data = await apiGet<{ questions: Question[] }>(`/api/qna${params}`);
      setQuestions(data.questions || []);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = newQuestion.trim();
    if (!q) return;
    setSubmitting(true);
    try {
      await apiPost("/api/qna", { question: q });
      toast.success("Question submitted!");
      setNewQuestion("");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredQuestions =
    filter === "all" ? questions : questions.filter((q) => q.status === filter);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Q&amp;A</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions and get answers from the admin team.
        </p>
      </div>

      {/* Ask a question */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-[#1e3a5f]" />
            Ask a Question
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Type your question here…"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              maxLength={1000}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{newQuestion.length}/1000</span>
              <Button
                type="submit"
                disabled={submitting || !newQuestion.trim()}
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a] gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "open", "answered"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className={filter === f ? "bg-[#1e3a5f] hover:bg-[#2d5a8a]" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "open" ? "Open" : "Answered"}
          </Button>
        ))}
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MessageCircleQuestion className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No questions yet. Be the first to ask!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}
