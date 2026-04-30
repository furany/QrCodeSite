"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton({ showLabel = false }: { showLabel?: boolean }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Ausgeloggt.");
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      aria-label="Ausloggen"
      title="Ausloggen"
      onClick={() => void logout()}
    >
      <LogOut className="size-4" />
      {showLabel && <span className="hidden sm:inline">Abmelden</span>}
    </Button>
  );
}
