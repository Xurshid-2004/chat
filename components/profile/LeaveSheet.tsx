"use client";

import { LogOut, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

interface LeaveSheetProps {
  open: boolean;
  onClose: () => void;
  onLeave: () => Promise<void>;
}

/** Leaving signs this device out of an account that has no password: say so clearly. */
export function LeaveSheet({ open, onClose, onLeave }: LeaveSheetProps) {
  const [leaving, setLeaving] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} label="Leave this account">
      <div className="flex flex-col items-center px-4 pb-2 pt-2 text-center">
        <span className="mb-3 grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="size-7" />
        </span>
        <h2 className="text-[19px] font-semibold">Leave this account?</h2>
        <p className="mt-2 text-[15px] text-fg-2">
          This account has no password, so you won&apos;t be able to come back to it. Your chats stay with the
          other person. To keep chatting on this device, just stay.
        </p>
        <div className="mt-5 flex w-full flex-col gap-2">
          <Button
            variant="danger"
            size="lg"
            loading={leaving}
            className="w-full"
            onClick={async () => {
              setLeaving(true);
              await onLeave();
            }}
          >
            <LogOut className="size-5" /> Leave
          </Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={onClose}>
            Stay
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
