import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePublicToken } from "@/lib/token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowDown, ArrowUp, Plus, Trash2, Loader2 } from "lucide-react";

export default function NuevoSan() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState("");
  const [monto, setMonto] = useState("");
  const [frecuencia, setFrecuencia] = useState<"semanal" | "quincenal">("semanal");
  const [participantes, setParticipantes] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const setName = (i: number, v: string) =>
    setParticipantes((arr) => arr.map((n, idx) => (idx === i ? v : n)));
  const addRow = () => setParticipantes((arr) => [...arr, ""]);
  const removeRow = (i: number) => setParticipantes((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setParticipantes((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const c = [...arr];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const nombres = participantes.map((n) => n.trim()).filter(Boolean);
    if (nombres.length < 2) {
      toast.error("Agrega al menos 2 participantes");
      return;
    }
    const montoNum = Number(monto);
    if (!titulo.trim() || !Number.isFinite(montoNum) || montoNum <= 0) {
      toast.error("Completa título y monto válido");
      return;
    }

    setSubmitting(true);
    try {
      const N = nombres.length;
      const token = generatePublicToken();
      const { data: san, error: sanErr } = await supabase
        .from("sanes")
        .insert({
          titulo: titulo.trim(),
          monto_cuota: montoNum,
          frecuencia,
          numero_semanas: N,
          banquero_id: user.id,
          public_token: token,
        })
        .select()
        .single();
      if (sanErr) throw sanErr;

      const { data: parts, error: partErr } = await supabase
        .from("participantes")
        .insert(nombres.map((nombre, i) => ({ san_id: san.id, nombre, turno_cobro: i + 1 })))
        .select();
      if (partErr) throw partErr;

      const pagos: any[] = [];
      for (const p of parts) {
        for (let semana = 1; semana <= N; semana++) {
          pagos.push({ san_id: san.id, participante_id: p.id, numero_semana: semana, estatus: "pendiente" });
        }
      }
      const { error: pagosErr } = await supabase.from("pagos").insert(pagos);
      if (pagosErr) throw pagosErr;

      toast.success("San creado");
      navigate(`/san/admin/${san.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear el San");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-semibold">Nuevo San</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-5 py-8 grid gap-5">
        <Card className="p-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. San de la familia" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="monto">Monto de la cuota</Label>
              <Input id="monto" required type="number" min={1} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="100" />
            </div>
            <div className="grid gap-1.5">
              <Label>Frecuencia</Label>
              <Select value={frecuencia} onValueChange={(v) => setFrecuencia(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-5 grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Participantes</h2>
              <p className="text-xs text-muted-foreground">El orden define el turno de cobro. El número de semanas será igual al número de participantes.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addRow}><Plus className="h-4 w-4" /> Agregar</Button>
          </div>
          <div className="grid gap-2">
            {participantes.map((nombre, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-semibold">{i + 1}</span>
                <Input value={nombre} onChange={(e) => setName(i, e.target.value)} placeholder={`Participante ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === participantes.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} disabled={participantes.length <= 2}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>Cancelar</Button>
          <Button type="submit" disabled={submitting} className="bg-gradient-primary text-primary-foreground">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear San"}
          </Button>
        </div>
      </form>
    </main>
  );
}
