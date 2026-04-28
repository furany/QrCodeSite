"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
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
      size="icon-sm"
      aria-label="Ausloggen"
      onClick={() => void logout()}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
