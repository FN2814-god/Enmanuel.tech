import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Share2, Trash2, Check, Clock, Loader2 } from "lucide-react";

type San = {
  id: string; titulo: string; monto_cuota: number; frecuencia: string;
  numero_semanas: number; public_token: string;
};
type Participante = { id: string; nombre: string; turno_cobro: number };
type Pago = { id: string; participante_id: string; numero_semana: number; estatus: string; metodo_pago: string | null };

export default function AdminSan() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [san, setSan] = useState<San | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Pago | null>(null);
  const [metodo, setMetodo] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [sanRes, pRes, pagosRes] = await Promise.all([
        supabase.from("sanes").select("*").eq("id", id).maybeSingle(),
        supabase.from("participantes").select("*").eq("san_id", id).order("turno_cobro"),
        supabase.from("pagos").select("*").eq("san_id", id),
      ]);
      if (sanRes.error || !sanRes.data) {
        toast.error("San no encontrado");
        navigate("/dashboard", { replace: true });
        return;
      }
      if (user && sanRes.data.banquero_id !== user.id) {
        toast.error("No tienes acceso a este San");
        navigate("/dashboard", { replace: true });
        return;
      }
      setSan(sanRes.data as any);
      setParticipantes((pRes.data ?? []) as any);
      setPagos((pagosRes.data ?? []) as any);
      setLoading(false);
    })();
  }, [id, user, navigate]);

  const findPago = (pid: string, semana: number) =>
    pagos.find((p) => p.participante_id === pid && p.numero_semana === semana);

  const openCell = (pago: Pago) => {
    setEditing(pago);
    setMetodo(pago.metodo_pago ?? "");
  };

  const togglePendiente = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("pagos")
      .update({ estatus: "pendiente", metodo_pago: null, updated_at: new Date().toISOString() })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    setPagos((arr) => arr.map((p) => (p.id === editing.id ? { ...p, estatus: "pendiente", metodo_pago: null } : p)));
    setEditing(null);
    toast.success("Marcado como pendiente");
  };

  const marcarPagado = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("pagos")
      .update({ estatus: "pagado", metodo_pago: metodo.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    setPagos((arr) => arr.map((p) => (p.id === editing.id ? { ...p, estatus: "pagado", metodo_pago: metodo.trim() || null } : p)));
    setEditing(null);
    toast.success("Pago registrado");
  };

  const eliminarSan = async () => {
    if (!san) return;
    const { error } = await supabase.from("sanes").delete().eq("id", san.id);
    if (error) return toast.error(error.message);
    toast.success("San eliminado");
    navigate("/dashboard", { replace: true });
  };

  const handleCopy = () => {
    if (!san) return;
    navigator.clipboard.writeText(`${window.location.origin}/san/${san.public_token}`);
    toast.success("Enlace copiado");
  };

  if (loading || !san) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-semibold truncate flex-1">{san.titulo}</h1>
          <Button variant="secondary" size="sm" onClick={handleCopy}><Share2 className="h-4 w-4" /> Compartir</Button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-6 grid gap-5">
        <Card className="p-5 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div><div className="text-xs text-muted-foreground">Cuota</div><div className="font-semibold">${Number(san.monto_cuota).toLocaleString()}</div></div>
            <div><div className="text-xs text-muted-foreground">Frecuencia</div><div className="font-semibold capitalize">{san.frecuencia}</div></div>
            <div><div className="text-xs text-muted-foreground">Participantes</div><div className="font-semibold">{participantes.length}</div></div>
            <div><div className="text-xs text-muted-foreground">Semanas</div><div className="font-semibold">{san.numero_semanas}</div></div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /> Eliminar San</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este San?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer. Se borrarán los participantes y pagos.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={eliminarSan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Cartelera</h2>
            <p className="text-xs text-muted-foreground">Toca una celda para alternar entre pagado y pendiente.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card text-left p-3 border-b border-border min-w-[180px]">Participante</th>
                  {Array.from({ length: san.numero_semanas }, (_, i) => i + 1).map((s) => (
                    <th key={s} className="p-3 border-b border-border text-center text-xs font-medium text-muted-foreground">S{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 bg-card p-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">{p.turno_cobro}</Badge>
                        <span className="font-medium">{p.nombre}</span>
                      </div>
                    </td>
                    {Array.from({ length: san.numero_semanas }, (_, i) => i + 1).map((s) => {
                      const pago = findPago(p.id, s);
                      if (!pago) return <td key={s} className="p-2 border-b border-border" />;
                      const pagado = pago.estatus === "pagado";
                      return (
                        <td key={s} className="p-1.5 border-b border-border text-center">
                          <button
                            onClick={() => openCell(pago)}
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                              pagado
                                ? "bg-status-paid-bg text-status-paid hover:bg-status-paid-bg/80"
                                : "bg-status-pending-bg text-status-pending hover:bg-status-pending-bg/80"
                            }`}
                            aria-label={pagado ? "Pagado" : "Pendiente"}
                          >
                            {pagado ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Semana <strong>{editing.numero_semana}</strong> — estado actual: <strong className={editing.estatus === "pagado" ? "text-status-paid" : "text-status-pending"}>{editing.estatus}</strong>
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="metodo">Método de pago (opcional)</Label>
                <Input id="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} placeholder="Ej. Transferencia, efectivo..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={togglePendiente}>Marcar pendiente</Button>
            <Button onClick={marcarPagado} className="bg-status-paid text-status-paid-foreground hover:bg-status-paid/90">
              <Check className="h-4 w-4" /> Marcar pagado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
