import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Wallet, Users, Share2, Loader2 } from "lucide-react";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c6.9 0 9.6-4.8 9.6-7.3 0-.5 0-.9-.1-1.3H12z"/>
  </svg>
);

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Cuenta creada");
      }
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Algo salió mal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      setSubmitting(false);
      return;
    }
    if (result.redirected) return;
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2 gap-8 px-5 py-10 md:px-10 max-w-7xl mx-auto w-full">
        <section className="flex flex-col justify-center gap-6">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Ahorro colaborativo, sin complicaciones
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Gestor de <span className="bg-gradient-primary bg-clip-text text-transparent">Sanes</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Organiza tu San, marca quién pagó y comparte una cartelera pública por WhatsApp. Tus participantes solo abren el enlace.
          </p>
          <ul className="grid gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Users className="h-4 w-4 text-primary" /> Tú gestionas, ellos solo consultan.</li>
            <li className="flex items-center gap-3"><Share2 className="h-4 w-4 text-primary" /> Enlace único por San, sin cuentas.</li>
            <li className="flex items-center gap-3"><Wallet className="h-4 w-4 text-primary" /> Estado claro: verde pagado, rojo pendiente.</li>
          </ul>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-md p-6 md:p-8 border-border/60 shadow-elegant bg-card/80 backdrop-blur">
            <h2 className="text-xl font-semibold mb-1">Acceso del Banquero</h2>
            <p className="text-sm text-muted-foreground mb-5">Solo el organizador necesita una cuenta.</p>

            <Button type="button" variant="secondary" className="w-full mb-4" onClick={handleGoogle} disabled={submitting}>
              <GoogleIcon /> Continuar con Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">o con email</span>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={submitting} className="mt-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="emailS">Email</Label>
                    <Input id="emailS" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="passwordS">Contraseña</Label>
                    <Input id="passwordS" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={submitting} className="mt-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </section>
      </div>
    </main>
  );
}
