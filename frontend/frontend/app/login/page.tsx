"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { Card, Field, Input, Button } from "@/components/ui/ui";

// 🔥 PEGA TU CLIENT ID AQUÍ (Solo el ID largo, no el secreto)
const GOOGLE_CLIENT_ID = "548114914663-sgmf19g4ea99sm1nf7ekvhppvps8td86.apps.googleusercontent.com";

// Separé el formulario en un componente interno para poder usar los hooks de Google
function ContenedorLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [procesando, setProcesando] = useState(false);

    // LÓGICA DE GOOGLE OAUTH
    const iniciarConGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setProcesando(true);
            try {
                // Le enviamos el token de Google a nuestro Django
                const res = await fetch("http://127.0.0.1:8000/api/v1/usuarios/google/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }, // <-- ¡OJO! La llave de headers DEBE cerrar aquí, y llevar una coma.

                    // El body debe estar al mismo nivel que 'method' y 'headers'
                    body: JSON.stringify({ access_token: tokenResponse.access_token })
                });

                if (res.ok) {
                    const data = await res.json();
                    // Guardamos los tokens JWT de Django
                    localStorage.setItem("access_token", data.access);
                    localStorage.setItem("refresh_token", data.refresh);

                    // Redirección inteligente
                    if (data.es_nuevo) {
                        router.push("/completar-perfil");
                    } else {
                        router.push("/");
                    }
                } else {
                    alert("Error al autenticar con el servidor de BandAdmin.");
                }
            } catch (error) {
                alert("Error de conexión.");
            } finally {
                setProcesando(false);
            }
        },
        onError: () => {
            console.error("El usuario canceló o hubo un error con Google.");
        }
    });

    const handleEmailContinue = (e: React.FormEvent) => {
        e.preventDefault();
        // Por ahora redirigimos al antiguo login o registro si eligen correo
        router.push("/registro");
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <i className="ti ti-music" aria-hidden="true" style={{ fontSize: 40, color: "var(--ba-brand)" }} />
                <h2 className="text-3xl font-extrabold mt-4" style={{ color: "var(--ba-text)" }}>
                    Inicia sesión o regístrate
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--ba-text-muted)" }}>
                    Tu centro de comando musical te está esperando.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card>

                    {/* BOTÓN DE GOOGLE (Ahora ejecuta la función real) */}
                    <Button variant="secondary" block onClick={() => iniciarConGoogle()} disabled={procesando}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {procesando ? "Autenticando..." : "Continuar con Google"}
                    </Button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full" style={{ borderTop: "1px solid var(--ba-border)" }}></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4" style={{ background: "var(--ba-surface)", color: "var(--ba-text-subtle)" }}>O</span>
                        </div>
                    </div>

                    <form onSubmit={handleEmailContinue}>
                        <Field label="Correo electrónico">
                            <Input
                                type="email" required
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ingresa tu correo electrónico"
                            />
                        </Field>
                        <Button type="submit" variant="primary" block disabled={procesando}>
                            Continuar con correo
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}

// Envolvemos todo el componente con el Provider de Google
export default function AutenticacionUnificada() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ContenedorLogin />
        </GoogleOAuthProvider>
    );
}
