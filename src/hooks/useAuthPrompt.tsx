import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AuthPromptOptions {
  description?: string;
  ctaLabel?: string;
}

export function useAuthPrompt(options: AuthPromptOptions = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { description = "Create an account to continue.", ctaLabel = "Create account" } = options;

  const requireAuth = useCallback(() => {
    setOpen(true);
  }, []);

  const handleContinue = useCallback(() => {
    setOpen(false);
    navigate("/auth");
  }, [navigate]);

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create an account to continue</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button onClick={handleContinue}>{ctaLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { requireAuth, authDialog: dialog };
}

export default useAuthPrompt;
