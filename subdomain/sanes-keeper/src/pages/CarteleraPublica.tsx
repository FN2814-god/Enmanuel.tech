import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Check, Clock, Loader2, AlertCircle } from "lucide-react";

type San = { id: string; titulo: string; monto_cuota: number; frecuencia: string; numero_semanas: number; created_at: string };
type Participante = { id: string; nombre: string; turno_cobro: number };
type Pago = { participante_id: string; numero_semana: number; estatus: string };

export default function CarteleraPublica() {
  const { token } = useParams<{ token: string }>();
  const [san, setSan] = useState<San | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: s } = await supabase
        .from("sanes")
        .select("id, titulo, monto_cuota, frecuencia, numero_semanas, created_at")
        .eq("public_token", token)
        .maybeSingle();
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSan(s as any);
      const [pRes, pagRes] = await Promise.all([
        supabase.from("participantes").select("id, nombre, turno_cobro").eq("san_id", s.id).order("turno_cobro"),
        supabase.from("pagos").select("participante_id, numero_semana, estatus").eq("san_id", s.id),
      ]);
      setParticipantes((pRes.data ?? []) as any);
      setPagos((pagRes.data ?? []) as any);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !san) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <Card className="p-8 text-center max-w-sm">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-semibold text-lg">San no encontrado</h1>
          <p className="text-sm text-muted-foreground">El enlace puede haber sido eliminado o ser incorrecto.</p>
        </Card>
      </main>
    );
  }

  // Compute current week based on frecuencia + created_at
  const start = new Date(san.created_at).getTime();
  const now = Date.now();
  const intervalDays = san.frecuencia === "semanal" ? 7 : 14;
  const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24 * intervalDays)) + 1;
  const semanaActual = Math.min(Math.max(elapsed, 1), san.numero_semanas);

  const getEstatus = (pid: string, s: number) =>
    pagos.find((p) => p.participante_id === pid && p.numero_semana === s)?.estatus ?? "pendiente";

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="h-3.5 w-3.5 text-primary" /> Cartelera del San
          </div>
          <h1 className="text-xl md:text-2xl font-bold leading-tight">{san.titulo}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-sm">
            <Badge variant="secondary" className="capitalize">{san.frecuencia}</Badge>
            <span className="text-muted-foreground">Cuota:</span>
            <span className="font-semibold">${Number(san.monto_cuota).toLocaleString()}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{san.numero_semanas} semanas</span>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-5">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card text-left p-3 border-b border-border min-w-[160px]">Participante</th>
                  {Array.from({ length: san.numero_semanas }, (_, i) => i + 1).map((s) => (
                    <th
                      key={s}
                      className={`p-2 border-b border-border text-center text-xs font-medium ${
                        s === semanaActual ? "text-primary bg-primary/10" : "text-muted-foreground"
                      }`}
                    >
                      S{s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 bg-card p-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">{p.turno_cobro}</Badge>
                        <span className="font-medium truncate">{p.nombre}</span>
                      </div>
                    </td>
                    {Array.from({ length: san.numero_semanas }, (_, i) => i + 1).map((s) => {
                      const pagado = getEstatus(p.id, s) === "pagado";
                      return (
                        <td
                          key={s}
                          className={`p-1.5 border-b border-border text-center ${s === semanaActual ? "bg-primary/5" : ""}`}
                        >
                          <div
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md ${
                              pagado ? "bg-status-paid-bg text-status-paid" : "bg-status-pending-bg text-status-pending"
                            }`}
                            aria-label={pagado ? "Pagado" : "Pendiente"}
                          >
                            {pagado ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-status-paid-bg border border-status-paid/40" /> Pagado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-status-pending-bg border border-status-pending/40" /> Pendiente
            </span>
          </div>
          <span>Actualizado por el banquero</span>
        </div>
      </section>
    </main>
  );
}
