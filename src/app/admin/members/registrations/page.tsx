"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { useBadges } from "@/components/context/BadgeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRegistrations } from "./useRegistrations";
import { RejectDialog } from "./components/RejectDialog";
import type { RegistrationRequest } from "@/lib/types/auth";
import { UserCheck, UserX, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function formatDate(date: Date | FirebaseFirestore.Timestamp | null): string {
  if (!date) return "N/A";
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof (date as any).toDate === "function") {
    d = (date as any).toDate();
  } else {
    d = new Date(date as any);
  }
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs shrink-0">
        <Clock className="w-3 h-3 mr-1" />Pending
      </Badge>
    );
  if (status === "pending_admin_approval")
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs shrink-0">
        <UserCheck className="w-3 h-3 mr-1" />Parent Approved
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs shrink-0">
        <CheckCircle className="w-3 h-3 mr-1" />Approved
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs shrink-0">
      <XCircle className="w-3 h-3 mr-1" />Rejected
    </Badge>
  );
}

/** Compact single-row card â€” click to open detail */
function RequestRow({ request, onClick }: { request: RegistrationRequest; onClick: () => void }) {
  const primaryGroup = request.groups?.[0] ?? null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left"
    >
      <Card className="hover:shadow-md transition-shadow hover:bg-muted/30 cursor-pointer">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            {/* Avatar placeholder */}
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {request.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{request.name}</p>
              <p className="text-xs text-muted-foreground truncate">{request.email}</p>
            </div>

            {/* Group + status + chevron */}
            <div className="flex items-center gap-2 shrink-0">
              {primaryGroup && (
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">{primaryGroup}</Badge>
              )}
              <StatusBadge status={request.status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

/** Full detail shown inside a Dialog */
function RequestDetail({
  request,
  onApprove,
  onReject,
}: {
  request: RegistrationRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-base">{request.name}</p>
          <p className="text-muted-foreground text-xs">{request.email}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Personal Info */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {request.gender && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Gender:</span>
              <Badge variant="secondary" className={`text-xs ${request.gender === "Male" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}>
                {request.gender}
              </Badge>
            </div>
          )}
          {request.member_type && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Member Type:</span>
              <Badge variant="secondary" className={`text-xs ${request.member_type === "student" ? "bg-green-100 text-green-700" : ""}`}>
                {request.member_type === "student" ? "Student (25% off)" : "Standard"}
              </Badge>
            </div>
          )}
          {request.phone && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{request.phone}</span>
            </div>
          )}
          {request.yearOfBirth && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium">
                {new Date().getFullYear() - request.yearOfBirth}
                <span className="text-muted-foreground ml-1">(born {request.yearOfBirth})</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Teams */}
      {request.groups && request.groups.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teams</p>
          <div className="flex flex-wrap gap-1">
            {request.groups.map((g: string) => (
              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Payment Manager */}
      {request.hasPaymentManager && (
        <div className="bg-blue-50 rounded-lg p-3 space-y-1 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">ðŸ’³ Payment Manager (Youth)</p>
          <p className="text-sm font-medium text-blue-900">{request.paymentManagerName || "Not specified"}</p>
          {request.paymentManagerId && (
            <p className="text-xs text-blue-600 font-mono">ID: {request.paymentManagerId.substring(0, 12)}...</p>
          )}
        </div>
      )}

      {/* Timestamps */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Requested: {formatDate(request.requested_at)}</span>
        {request.status === "approved" && request.approved_at && (
          <span className="text-green-600">Approved: {formatDate(request.approved_at)}</span>
        )}
        {request.status === "rejected" && request.rejected_at && (
          <span className="text-red-600">Rejected: {formatDate(request.rejected_at)}</span>
        )}
      </div>

      {/* Rejection reason */}
      {request.status === "rejected" && request.rejection_reason && (
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
          <p className="text-xs text-red-700">
            <strong>Rejection Reason:</strong> {request.rejection_reason}
          </p>
          {request.rejection_notes && (
            <p className="text-xs text-red-600 mt-1">{request.rejection_notes}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {(request.status === "pending" || request.status === "pending_admin_approval") && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-1"
            onClick={onApprove}
          >
            <UserCheck className="w-4 h-4 mr-1" />Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
            onClick={onReject}
          >
            <UserX className="w-4 h-4 mr-1" />Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function RegistrationsPageContent() {
  const { requests, loading, error, fetchRequests, approveRequest, rejectRequest } = useRegistrations();
  const { refreshBadges } = useBadges();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchRequests("all");
  }, [fetchRequests]);

  const PENDING_STATUSES = ["pending", "pending_admin_approval"];

  const displayedRequests =
    activeTab === "all"
      ? requests
      : activeTab === "pending"
      ? requests.filter(r => PENDING_STATUSES.includes(r.status))
      : requests.filter(r => r.status === activeTab);

  function openDetail(request: RegistrationRequest) {
    setSelectedRequest(request);
    setDetailOpen(true);
  }

  async function handleApproveClick(request: RegistrationRequest) {
    if (!confirm(`Approve registration for ${request.name}?`)) return;
    try {
      await approveRequest(request.uid, {});
      toast.success(`${request.name} has been approved`);
      setDetailOpen(false);
      await fetchRequests("all");
      refreshBadges();
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve request");
    }
  }

  function handleRejectClick(request: RegistrationRequest) {
    setDetailOpen(false);
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  }

  async function handleRejectConfirm(reason: string, notes?: string) {
    if (!selectedRequest) return;
    await rejectRequest(selectedRequest.uid, reason, notes);
    setRejectDialogOpen(false);
    setSelectedRequest(null);
    await fetchRequests("all");
    refreshBadges();
  }

  const pendingCount = requests.filter(r => PENDING_STATUSES.includes(r.status)).length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const rejectedCount = requests.filter(r => r.status === "rejected").length;
  const allCount = requests.length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Registration Requests</h1>
        <p className="text-sm text-muted-foreground">Review and approve new member registrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="pending" className="flex-col gap-1 py-2">
            <span>Pending</span>
            <Badge variant="secondary" className="bg-yellow-500 text-white text-xs px-2">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-col gap-1 py-2">
            <span>Approved</span>
            <Badge variant="secondary" className="bg-green-500 text-white text-xs px-2">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-col gap-1 py-2">
            <span>Rejected</span>
            <Badge variant="secondary" className="bg-red-500 text-white text-xs px-2">{rejectedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-col gap-1 py-2">
            <span>All</span>
            <Badge variant="secondary" className="text-xs px-2">{allCount}</Badge>
          </TabsTrigger>
        </TabsList>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}
        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No requests found</p>
          </div>
        )}
        {!loading && !error && displayedRequests.length === 0 && requests.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No {activeTab} requests</p>
          </div>
        )}
        {!loading && !error && displayedRequests.length > 0 && (
          <div className="space-y-2">
            {displayedRequests.map((request) => (
              <RequestRow
                key={request.uid}
                request={request}
                onClick={() => openDetail(request)}
              />
            ))}
          </div>
        )}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>View and action this registration request</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onApprove={() => handleApproveClick(selectedRequest)}
              onReject={() => handleRejectClick(selectedRequest)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      {selectedRequest && (
        <RejectDialog
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          onReject={handleRejectConfirm}
          requestName={selectedRequest.name}
          requestEmail={selectedRequest.email}
        />
      )}
    </div>
  );
}

export default function RegistrationsPage() {
  return (
    <AdminGuard>
      <RegistrationsPageContent />
    </AdminGuard>
  );
}
