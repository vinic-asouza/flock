"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { OpsButton } from "@/components/ui/OpsButton";

export function OpsConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "primary",
  busy = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={busy ? () => undefined : onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
          <DialogTitle className="text-base font-semibold text-primary">
            {title}
          </DialogTitle>
          <div className="mt-2 text-sm text-muted">{body}</div>
          <div className="mt-5 flex justify-end gap-2">
            <OpsButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </OpsButton>
            <OpsButton
              type="button"
              variant={tone === "danger" ? "secondary" : "primary"}
              className={tone === "danger" ? "border-red-200 text-red-700 hover:bg-red-50" : undefined}
              disabled={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </OpsButton>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
