"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Select, Button } from "@/components/ui/ui";

export default function CompletarPerfil() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [instrumento, setInstrumento] = useState("");
    const [procesando, setProcesando] = useState(false);

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesando(true);
        const token = localStorage.getItem("access_token");

        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/usuarios/perfil/", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: username,
                    instrumento_principal: instrumento
                }),
            });

            if (res.ok) {
                // Una vez guardado, lo enviamos al Dashboard principal
                router.push("/");
            } else {
                alert("Error al actualizar el perfil.");
            }
        } catch (error) {
            alert("Error de conexión.");
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
                <Card>
                    <div className="text-center mb-8">
                        <i className="ti ti-microphone-2" aria-hidden="true" style={{ fontSize: 40, color: "var(--ba-brand)" }} />
                        <h1 className="text-3xl font-bold mt-4" style={{ color: "var(--ba-text)" }}>¡Cuenta activada!</h1>
                        <p className="mt-2" style={{ color: "var(--ba-text-muted)" }}>
                            Cuéntanos un poco sobre ti para terminar de configurar tu centro de comando.
                        </p>
                    </div>

                    <form onSubmit={handleGuardar}>
                        <Field label="Tu apodo musical (username)">
                            <Input
                                type="text" required
                                value={username} onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ej: Slash_Chileno"
                            />
                        </Field>

                        <Field label="¿Qué instrumento tocas?">
                            <Select
                                required
                                value={instrumento} onChange={(e) => setInstrumento(e.target.value)}
                            >
                                <option value="" disabled>Selecciona tu instrumento...</option>
                                <option value="VOZ">Cantante/Voz</option>
                                <option value="GUITARRA">Guitarra</option>
                                <option value="GUITARRA ELECTRICA">Guitarra Eléctrica</option>
                                <option value="GUITARRA_VOZ">Guitarra &amp; Voz</option>
                                <option value="BAJO">Bajo</option>
                                <option value="BATERIA">Batería</option>
                                <option value="PIANO">Piano / Teclado</option>
                                <option value="VIOLIN">Violín</option>
                                <option value="SAXOFON">Saxofón</option>
                            </Select>
                        </Field>

                        <Button type="submit" variant="primary" block disabled={procesando}>
                            {procesando ? "Guardando..." : "Empezar a rockear"}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
