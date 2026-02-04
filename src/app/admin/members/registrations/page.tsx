"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRegistrations } from "./useRegistrations";
import { ApproveDialog } from "./components/ApproveDialog";
import { RejectDialog } from "./components/RejectDialog";
import type { RegistrationRequest } from "@/lib/types/auth";
import { UserCheck, UserX, Clock, CheckCircle, XCircle } from "lucide-react";

function formatDate(date: Date | FirebaseFirestore.Timestamp | null): string {
  if (!date) return "N/A";
  
  // Convert Firestore Timestamp to Date if needed
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

function RequestCard({ request, onApprove, onReject }: {
  request: RegistrationRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* User Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{request.name}</h3>
              {request.status === "pending" && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              )}
              {request.status === "approved" && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approved
                </Badge>
              )}
              {request.status === "rejected" && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  Rejected
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">{request.email}</p>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Requested: {formatDate(request.requested_at)}</span>
              
              {request.status === "approved" && request.approved_at && (
                <span className="text-green-600">
                  Approved: {formatDate(request.approved_at)}
                </span>
              )}
              
              {request.status === "rejected" && request.rejected_at && (
                <span className="text-red-600">
                  Rejected: {formatDate(request.rejected_at)}
                </span>
              )}
            </div>

            {request.status === "rejected" && request.rejection_reason && (
              <p className="text-xs text-muted-foreground">
                <strong>Reason:</strong> {request.rejection_reason}
              </p>
            )}
          </div>

          {/* Actions (only for pending) */}
          {request.status === "pending" && (
            <div className="flex gap-2 sm:flex-col lg:flex-row">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-1 sm:flex-none"
                onClick={onApprove}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                onClick={onReject}
              >
                <UserX className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationsPageContent() {
  const { requests, loading, error, fetchRequests, approveRequest, rejectRequest } = useRegistrations();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab]);

  function handleApproveClick(request: RegistrationRequest) {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  }

  function handleRejectClick(request: RegistrationRequest) {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  }

  async function handleApproveConfirm(details: any) {
    if (!selectedRequest) return;
    await approveRequest(selectedRequest.uid, details);
    setApproveDialogOpen(false);
    setSelectedRequest(null);
  }

  async function handleRejectConfirm(reason: string, notes?: string) {
    if (!selectedRequest) return;
    await rejectRequest(selectedRequest.uid, reason, notes);
    setRejectDialogOpen(false);
    setSelectedRequest(null);
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;
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
            <Badge variant="secondary" className="bg-yellow-500 text-white text-xs px-2">
              {pendingCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-col gap-1 py-2">
            <span>Approved</span>
            <Badge variant="secondary" className="bg-green-500 text-white text-xs px-2">
              {approvedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-col gap-1 py-2">
            <span>Rejected</span>
            <Badge variant="secondary" className="bg-red-500 text-white text-xs px-2">
              {rejectedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-col gap-1 py-2">
            <span>All</span>
            <Badge variant="secondary" className="text-xs px-2">
              {allCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading requests...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No requests found</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestCard
                key={request.uid}
                request={request}
                onApprove={() => handleApproveClick(request)}
                onReject={() => handleRejectClick(request)}
              />
            ))}
          </div>
        )}
      </Tabs>

      {/* Dialogs */}
      {selectedRequest && (
        <>
          <ApproveDialog
            open={approveDialogOpen}
            onClose={() => setApproveDialogOpen(false)}
            onApprove={handleApproveConfirm}
            requestName={selectedRequest.name}
            requestEmail={selectedRequest.email}
          />
          <RejectDialog
            open={rejectDialogOpen}
            onClose={() => setRejectDialogOpen(false)}
            onReject={handleRejectConfirm}
            requestName={selectedRequest.name}
            requestEmail={selectedRequest.email}
          />
        </>
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
