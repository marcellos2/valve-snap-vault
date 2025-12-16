import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, FileText, Trash2, Download, Search, Edit, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InspectionRecord {
  id: string;
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string | null;
  photo_during_url: string | null;
  photo_final_url: string | null;
  notes: string | null;
  status: 'em_andamento' | 'concluido';
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatDateForFilename = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const InspectionHistory = ({ 
  refreshTrigger, 
  onEditRecord 
}: { 
  refreshTrigger: number;
  onEditRecord?: (record: InspectionRecord) => void;
}) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<InspectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 20;

  const loadRecords = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("inspection_records")
        .select("*")
        .gte("inspection_date", today.toISOString())
        .lt("inspection_date", tomorrow.toISOString())
        .order("inspection_date", { ascending: false })
        .limit(RECORDS_PER_PAGE);

      if (error) throw error;
      setRecords((data || []) as InspectionRecord[]);
      setFilteredRecords((data || []) as InspectionRecord[]);
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
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger, loadRecords]);

  useEffect(() => {
    const loadFilteredRecords = async () => {
      try {
        let query = supabase
          .from("inspection_records")
          .select("*", { count: 'exact' });
        
        if (searchTerm.trim() !== "") {
          query = query.ilike("valve_code", `%${searchTerm}%`);
        } else if (dateRange?.from) {
          const start = new Date(dateRange.from);
          start.setHours(0, 0, 0, 0);
          
          if (dateRange.to) {
            const end = new Date(dateRange.to);
            end.setHours(23, 59, 59, 999);
            query = query
              .gte("inspection_date", start.toISOString())
              .lte("inspection_date", end.toISOString());
          } else {
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            query = query
              .gte("inspection_date", start.toISOString())
              .lte("inspection_date", end.toISOString());
          }
        }
        
        const from = (currentPage - 1) * RECORDS_PER_PAGE;
        const to = from + RECORDS_PER_PAGE - 1;
        
        const { data, error } = await query
          .order("inspection_date", { ascending: false })
          .range(from, to);

        if (error) throw error;
        setFilteredRecords((data || []) as InspectionRecord[]);
      } catch (error) {
        console.error("Erro ao filtrar registros:", error);
      }
    };

    loadFilteredRecords();
  }, [searchTerm, dateRange, currentPage]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from("inspection_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Registro excluído" });
      loadRecords();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir registro",
        variant: "destructive",
      });
    }
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => reject(error);
        img2.src = url;
      };
      img.src = url;
    });
  };

  const handleDownload = async (record: InspectionRecord) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) throw new Error("Não foi possível criar contexto");

      const width = 2000;
      const height = 752;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      const headerHeight = 108;
      ctx.fillStyle = "#4a6fa5";
      ctx.fillRect(0, 0, width, headerHeight);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText("REGISTROS FOTOGRÁFICOS", width / 2, 70);

      const photos = [
        { url: record.photo_initial_url, title: "INÍCIO DA INSPEÇÃO", subtitle: "VÁLVULA NO RECEBIMENTO" },
        { url: record.photo_during_url, title: "DURANTE A INSPEÇÃO", subtitle: "VÁLVULA TRABALHANDO" },
        { url: record.photo_final_url, title: "TÉRMINO DA INSPEÇÃO", subtitle: "VÁLVULA PRONTA" }
      ];

      const photoWidth = 428;
      const photoHeight = 590;
      const spacing = 40;
      const startX = (width - (photoWidth * 3 + spacing * 2)) / 2;
      const startY = headerHeight + 25;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const x = startX + i * (photoWidth + spacing);

        ctx.strokeStyle = "#a8b8d1";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, startY, photoWidth, photoHeight);

        const cardHeaderHeight = 70;
        ctx.fillStyle = "#4a6fa5";
        ctx.fillRect(x, startY, photoWidth, cardHeaderHeight);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(photo.title, x + photoWidth / 2, startY + 28);
        
        ctx.font = "14px Arial";
        ctx.fillText(photo.subtitle, x + photoWidth / 2, startY + 52);

        if (photo.url) {
          try {
            const img = await loadImage(photo.url);
            const imgY = startY + cardHeaderHeight + 15;
            const imgHeight = photoHeight - cardHeaderHeight - 30;
            const imgWidth = photoWidth - 30;
            
            const scale = Math.min(imgWidth / img.width, imgHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const imgX = x + (photoWidth - scaledWidth) / 2;
            const centeredImgY = imgY + (imgHeight - scaledHeight) / 2;

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
            ctx.drawImage(img, imgX, centeredImgY, scaledWidth, scaledHeight);
          } catch {
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
            ctx.fillStyle = "#6b7280";
            ctx.font = "14px Arial";
            ctx.fillText("Imagem não disponível", x + photoWidth / 2, startY + photoHeight / 2);
          }
        } else {
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
          ctx.fillStyle = "#6b7280";
          ctx.font = "14px Arial";
          ctx.fillText("Sem foto", x + photoWidth / 2, startY + photoHeight / 2);
        }
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `inspecao-${record.valve_code || "sem-codigo"}-${formatDateForFilename(record.inspection_date)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          toast({ title: "Download concluído" });
        }
      }, "image/png", 1.0);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao gerar imagem",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card rounded-lg p-4 space-y-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !dateRange && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {formatDate(dateRange.from.toISOString()).split(' ')[0]} — {formatDate(dateRange.to.toISOString()).split(' ')[0]}
                  </>
                ) : (
                  formatDate(dateRange.from.toISOString()).split(' ')[0]
                )
              ) : (
                <span>Selecione o período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={(range: any) => setDateRange(range)}
              initialFocus
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 input-elegant"
          />
        </div>
      </div>

      {/* Records */}
      {filteredRecords.length === 0 ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum registro encontrado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => (
            <div 
              key={record.id} 
              className="glass-card-hover rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      {record.valve_code || "Sem código"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(record.inspection_date)}
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                    record.status === 'concluido' 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {record.status === 'concluido' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span>{record.status === 'concluido' ? 'Concluído' : 'Pendente'}</span>
                  </div>
                </div>
              </div>

              {/* Photos Preview */}
              <div className="grid grid-cols-3 gap-1 p-2">
                {[record.photo_initial_url, record.photo_during_url, record.photo_final_url].map((url, i) => (
                  <div key={i} className="aspect-square bg-secondary rounded overflow-hidden">
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 p-2 border-t border-border/50">
                {onEditRecord && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditRecord(record)}
                    className="flex-1 h-8 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(record)}
                  className="flex-1 h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Baixar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(record.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
