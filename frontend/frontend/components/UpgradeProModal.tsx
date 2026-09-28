"use client";

import { useRouter } from "next/navigation";
import { Modal, Button } from "@/components/ui/ui";

interface UpgradeProModalProps {
    mensaje: string | null;
    onClose: () => void;
}

// Prompt reutilizable para cuando el backend responde 402 (límite del plan
// Free alcanzado). Se usa en cualquier pantalla que pueda chocar con un
// límite: crear banda, exportar Tech Rider, multitrack, aceptar invitación...
export function UpgradeProModal({ mensaje, onClose }: UpgradeProModalProps) {
    const router = useRouter();

    return (
        <Modal open={!!mensaje} onClose={onClose} title="Límite del plan gratuito">
            <div className="space-y-5">
                <div
                    className="flex items-start gap-3 p-4 rounded-lg"
                    style={{ background: "var(--ba-brand-soft)" }}
                >
                    <i className="ti ti-crown" aria-hidden="true" style={{ color: "var(--ba-brand)", fontSize: 26 }} />
                    <p className="text-sm" style={{ color: "var(--ba-text)" }}>{mensaje}</p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Ahora no</Button>
                    <Button variant="primary" icon="crown" onClick={() => router.push("/planes")}>
                        Ver planes Pro
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
