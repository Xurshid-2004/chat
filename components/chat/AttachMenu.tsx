"use client";

import { FileText, Images } from "lucide-react";

import { Sheet, SheetAction } from "@/components/ui/Sheet";

interface AttachMenuProps {
  open: boolean;
  onClose: () => void;
  onPickMedia: () => void;
  onPickFiles: () => void;
}

export function AttachMenu({ open, onClose, onPickMedia, onPickFiles }: AttachMenuProps) {
  return (
    <Sheet open={open} onClose={onClose} label="Attach">
      <div className="pb-1">
        <SheetAction
          icon={<Images className="size-5 text-accent" />}
          label="Photo or video"
          onClick={() => {
            onPickMedia();
            onClose();
          }}
        />
        <SheetAction
          icon={<FileText className="size-5 text-accent" />}
          label="File"
          onClick={() => {
            onPickFiles();
            onClose();
          }}
        />
      </div>
    </Sheet>
  );
}
