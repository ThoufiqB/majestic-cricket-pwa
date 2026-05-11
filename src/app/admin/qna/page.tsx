"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircleQuestion,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  Loader2,
  Send,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/app/client/api";
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

export default function AdminQnaPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "answered">("all");

  // Answer dialog
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  function openAnswerDialog(q: Question) {
    setSelectedQuestion(q);
    setAnswerText(q.answer || "");
  }

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuestion) return;
    const answer = answerText.trim();
    if (!answer) return;
    setSubmitting(true);
    try {
      await apiPost(`/api/qna/${selectedQuestion.id}/answer`, { answer });
      toast.success("Answer saved!");
      setSelectedQuestion(null);
      setAnswerText("");
      fetchQuestions();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save answer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiDelete(`/api/qna/${id}`);
      toast.success("Question deleted");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredQuestions =
    filter === "all" ? questions : questions.filter((q) => q.status === filter);

  const openCount = questions.filter((q) => q.status === "open").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Q&amp;A</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer member questions and manage the Q&amp;A board.
          </p>
        </div>
        {openCount > 0 && (
          <Badge className="bg-amber-500 text-white">
            {openCount} unanswered
          </Badge>
        )}
      </div>

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
            <p className="text-sm">No questions here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <Card key={q.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageCircleQuestion className="h-5 w-5 mt-0.5 shrink-0 text-[#1e3a5f]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{q.asked_by_name}</span>
                      {q.asked_at && (
                        <span className="text-xs text-muted-foreground">
                          &middot; {formatDate(q.asked_at)}
                        </span>
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

                    {q.status === "answered" && q.answer && (
                      <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-100">
                        <p className="text-xs font-semibold text-green-700 mb-1">Your Answer</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{q.answer}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5"
                        onClick={() => openAnswerDialog(q)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {q.status === "answered" ? "Edit Answer" : "Answer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === q.id}
                        onClick={() => handleDelete(q.id)}
                      >
                        {deletingId === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Answer dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Answer Question</DialogTitle>
            <DialogDescription className="text-sm pt-1">
              {selectedQuestion?.question}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAnswer} className="space-y-4 mt-2">
            <Textarea
              placeholder="Type your answer here…"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              maxLength={2000}
              rows={5}
              className="resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{answerText.length}/2000</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuestion(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !answerText.trim()}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a8a] gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Save Answer
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
