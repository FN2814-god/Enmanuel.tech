import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Share2, LogOut, Wallet, Loader2, ChevronRight } from "lucide-react";

type SanRow = {
  id: string;
  titulo: string;
  monto_cuota: number;
  frecuencia: string;
  numero_semanas: number;
  public_token: string;
  participantes: { count: number }[];
  pagos: { estatus: string }[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sanes, setSanes] = useState<SanRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("sanes")
        .select("id, titulo, monto_cuota, frecuencia, numero_semanas, public_token, participantes(count), pagos(estatus)")
        .eq("banquero_id", user.id)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setSanes((data as any) ?? []);
    })();
  }, [user]);

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/san/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            Gestor de Sanes
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /> Salir</Button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tus Sanes</h1>
            <p className="text-sm text-muted-foreground">Crea, comparte y administra.</p>
          </div>
          <Button onClick={() => navigate("/san/nuevo")} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nuevo San
          </Button>
        </div>

        {sanes === null ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : sanes.length === 0 ? (
          <Card className="p-10 text-center border-dashed bg-card/40">
            <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">Aún no tienes Sanes</h3>
            <p className="text-sm text-muted-foreground mb-5">Empieza creando tu primer San.</p>
            <Button onClick={() => navigate("/san/nuevo")} className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /> Crear San</Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {sanes.map((s) => {
              const totalPagos = s.pagos?.length ?? 0;
              const pagados = s.pagos?.filter((p) => p.estatus === "pagado").length ?? 0;
              const pct = totalPagos ? Math.round((pagados / totalPagos) * 100) : 0;
              const partCount = s.participantes?.[0]?.count ?? 0;
              return (
                <Card key={s.id} className="p-5 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{s.titulo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="capitalize">{s.frecuencia}</Badge>
                        <span className="text-xs text-muted-foreground">{partCount} participantes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Cuota</div>
                      <div className="font-semibold">${Number(s.monto_cuota).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Avance</span><span>{pagados}/{totalPagos} cuotas · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleCopy(s.public_token)} className="flex-1">
                      <Share2 className="h-4 w-4" /> Compartir
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/san/admin/${s.id}`)} className="flex-1">
                      Gestionar <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
