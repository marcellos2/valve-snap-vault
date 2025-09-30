import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InspectionRecord {
  id: string;
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string | null;
  photo_during_url: string | null;
  photo_final_url: string | null;
  notes: string | null;
}

export const InspectionHistory = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("inspection_records")
        .select("*")
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from("inspection_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Registro excluído",
      });
      loadRecords();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir registro",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/50">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma inspeção registrada ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Histórico de Inspeções</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((record) => (
          <Card key={record.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">
                    {record.valve_code || "Sem código"}
                  </h3>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(record.inspection_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(record.id)}
                  className="text-primary-foreground hover:bg-white/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {record.photo_initial_url && (
                  <img
                    src={record.photo_initial_url}
                    alt="Inicial"
                    className="w-full h-20 object-cover rounded"
                  />
                )}
                {record.photo_during_url && (
                  <img
                    src={record.photo_during_url}
                    alt="Durante"
                    className="w-full h-20 object-cover rounded"
                  />
                )}
                {record.photo_final_url && (
                  <img
                    src={record.photo_final_url}
                    alt="Final"
                    className="w-full h-20 object-cover rounded"
                  />
                )}
              </div>

              {record.notes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {record.notes}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
