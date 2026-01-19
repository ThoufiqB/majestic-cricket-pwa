"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminKids } from "./useAdminKids";
import { KID_MESSAGES } from "./constants";
import type { EnhancedKidProfile, CreateKidInput, UpdateKidInput } from "./types";
import { KidsEmptyState } from "./components/KidsEmptyState";
import { KidsListCard } from "./components/KidsListCard";
import { CreateKidModal } from "./components/CreateKidModal";
import { EditKidModal } from "./components/EditKidModal";
import { LinkParentModal } from "./components/LinkParentModal";
import { DeactivateKidModal } from "./components/DeactivateKidModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Baby, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Users
} from "lucide-react";

export default function AdminKidsPage() {
  const { kids, loading, error: fetchError, createKid, updateKid, linkParent, deactivateKid, reactivateKid } = useAdminKids();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKid, setSelectedKid] = useState<EnhancedKidProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Operation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Handle create
  const handleCreateKid = async (input: CreateKidInput) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await createKid(input);
      setSuccessMessage(KID_MESSAGES.CREATE_SUCCESS);
      setShowCreateModal(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit
  const handleEditKid = async (input: UpdateKidInput) => {
    if (!selectedKid) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await updateKid(selectedKid.kid_id, input);
      setSuccessMessage(KID_MESSAGES.UPDATE_SUCCESS);
      setShowEditModal(false);
      setSelectedKid(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle link parent
  const handleLinkParent = async (parentEmail: string) => {
    if (!selectedKid) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await linkParent(selectedKid.kid_id, parentEmail);
      setSuccessMessage(KID_MESSAGES.LINK_SUCCESS);
      setShowLinkModal(false);
      setSelectedKid(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deactivate
  const handleDeactivateKid = async () => {
    if (!selectedKid) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await deactivateKid(selectedKid.kid_id);
      setSuccessMessage(KID_MESSAGES.DELETE_SUCCESS);
      setShowDeleteModal(false);
      setSelectedKid(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reactivate
  const handleReactivateKid = async (kid: EnhancedKidProfile) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await reactivateKid(kid.kid_id);
      setSuccessMessage(KID_MESSAGES.REACTIVATE_SUCCESS);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading && kids.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Loading kids profiles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="kids" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players" asChild>
            <Link href="/admin/members" className="gap-2 inline-flex items-center justify-center">
              <Users className="h-4 w-4" />
              Players
            </Link>
          </TabsTrigger>
          <TabsTrigger value="kids" className="gap-2">
            <Baby className="h-4 w-4" />
            Kids
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {kids.length} kid{kids.length !== 1 ? 's' : ''} registered
          </span>
        </div>
        
        <Button
          onClick={() => {
            setShowCreateModal(true);
            setSelectedKid(null);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Kid
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Error Messages */}
      {submitError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{submitError}</p>
          </CardContent>
        </Card>
      )}

      {fetchError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {kids.length === 0 ? (
        <KidsEmptyState
          onCreateClick={() => {
            setShowCreateModal(true);
            setSelectedKid(null);
          }}
        />
      ) : (
        <KidsListCard
          kids={kids}
          onEdit={(kid) => {
            setSelectedKid(kid);
            setShowEditModal(true);
          }}
          onLinkParent={(kid) => {
            setSelectedKid(kid);
            setShowLinkModal(true);
          }}
          onDelete={(kid) => {
            setSelectedKid(kid);
            setShowDeleteModal(true);
          }}
          onReactivate={handleReactivateKid}
        />
      )}

      {/* Modals */}
      <CreateKidModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSubmitError("");
        }}
        onSubmit={handleCreateKid}
        isLoading={isSubmitting}
        error={submitError}
      />

      <EditKidModal
        open={showEditModal && !!selectedKid}
        kid={selectedKid}
        onClose={() => {
          setShowEditModal(false);
          setSelectedKid(null);
          setSubmitError("");
        }}
        onSubmit={handleEditKid}
        isLoading={isSubmitting}
        error={submitError}
      />

      <LinkParentModal
        open={showLinkModal && !!selectedKid}
        kid={selectedKid}
        onClose={() => {
          setShowLinkModal(false);
          setSelectedKid(null);
          setSubmitError("");
        }}
        onSubmit={handleLinkParent}
        isLoading={isSubmitting}
        error={submitError}
      />

      <DeactivateKidModal
        open={showDeleteModal && !!selectedKid}
        kid={selectedKid}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedKid(null);
          setSubmitError("");
        }}
        onConfirm={handleDeactivateKid}
        isLoading={isSubmitting}
      />
    </div>
  );
}
