import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
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

// Função auxiliar para formatar data sem date-fns
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Função auxiliar para formatar data para nome de arquivo
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
  // Filtro de período usando DateRange
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 20;

  const loadRecords = useCallback(async () => {
    try {
      // Calcula a data atual sem hora para filtro inicial
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Busca apenas registros do dia atual por padrão (otimização)
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

  // Busca com filtro de período ou pesquisa
  useEffect(() => {
    const loadFilteredRecords = async () => {
      try {
        let query = supabase
          .from("inspection_records")
          .select("*", { count: 'exact' });
        
        // Se houver termo de pesquisa, busca em TODOS os registros (ignora filtro de data)
        if (searchTerm.trim() !== "") {
          query = query.ilike("valve_code", `%${searchTerm}%`);
        } 
        // Se NÃO houver pesquisa, aplica filtro de período
        else if (dateRange?.from) {
          const start = new Date(dateRange.from);
          start.setHours(0, 0, 0, 0);
          
          // Se tiver data final, filtra o intervalo
          if (dateRange.to) {
            const end = new Date(dateRange.to);
            end.setHours(23, 59, 59, 999);
            
            query = query
              .gte("inspection_date", start.toISOString())
              .lte("inspection_date", end.toISOString());
          } else {
            // Se só tiver data inicial, busca apenas esse dia
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            
            query = query
              .gte("inspection_date", start.toISOString())
              .lte("inspection_date", end.toISOString());
          }
        }
        
        // Aplica paginação
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

  // Remover datas com registros do calendário para otimização
  const datesWithRecords: Date[] = [];

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

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        console.log("Imagem carregada com sucesso:", url);
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error("Erro ao carregar imagem:", url, error);
        // Tentar novamente sem crossOrigin
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
      console.log("Iniciando download para registro:", record.id);
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      
      if (!ctx) {
        throw new Error("Não foi possível criar contexto do canvas");
      }

      const width = 2000;
      const height = 752;
      canvas.width = width;
      canvas.height = height;
      
      console.log("Canvas criado:", width, "x", height);

      // Fundo branco
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Header azul
      const headerHeight = 108;
      ctx.fillStyle = "#4a6fa5";
      ctx.fillRect(0, 0, width, headerHeight);

      // Título
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText("REGISTROS FOTOGRÁFICOS", width / 2, 70);

      // Carregar e desenhar as fotos
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

        // Borda do card
        ctx.strokeStyle = "#a8b8d1";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, startY, photoWidth, photoHeight);

        // Header do card
        const cardHeaderHeight = 70;
        ctx.fillStyle = "#4a6fa5";
        ctx.fillRect(x, startY, photoWidth, cardHeaderHeight);

        // Texto do card
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(photo.title, x + photoWidth / 2, startY + 28);
        
        ctx.font = "14px Arial";
        ctx.fillText(photo.subtitle, x + photoWidth / 2, startY + 52);

        // Desenhar foto se existir
        if (photo.url) {
          try {
            console.log(`Carregando foto ${i + 1}:`, photo.url);
            const img = await loadImage(photo.url);
            console.log(`Foto ${i + 1} carregada:`, img.width, "x", img.height);
            
            const imgY = startY + cardHeaderHeight + 15;
            const imgHeight = photoHeight - cardHeaderHeight - 30;
            const imgWidth = photoWidth - 30;
            
            // Calcular proporção mantendo aspect ratio
            const scale = Math.min(imgWidth / img.width, imgHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const imgX = x + (photoWidth - scaledWidth) / 2;
            const centeredImgY = imgY + (imgHeight - scaledHeight) / 2;

            // Limpar a área antes de desenhar
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
            
            ctx.drawImage(img, imgX, centeredImgY, scaledWidth, scaledHeight);
            console.log(`Foto ${i + 1} desenhada com sucesso`);
          } catch (error) {
            console.error(`Erro ao carregar/desenhar foto ${i + 1}:`, error);
            // Desenhar placeholder se falhar
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
            
            ctx.fillStyle = "#6b7280";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Imagem não disponível", x + photoWidth / 2, startY + photoHeight / 2);
          }
        } else {
          // Placeholder para foto não disponível
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
          
          ctx.fillStyle = "#6b7280";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Sem foto", x + photoWidth / 2, startY + photoHeight / 2);
        }
      }

      // Converter para blob e baixar
      canvas.toBlob((blob) => {
        if (blob) {
          console.log("Blob criado com sucesso, tamanho:", blob.size);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `inspecao-${record.valve_code || "sem-codigo"}-${formatDateForFilename(record.inspection_date)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Aguardar um pouco antes de revogar a URL
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "Sucesso",
            description: "Imagem baixada com sucesso",
          });
        } else {
          console.error("Falha ao criar blob");
          throw new Error("Falha ao criar blob da imagem");
        }
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar imagem. Verifique as permissões das imagens.",
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light tracking-wider text-white uppercase">
        Histórico de Inspeções
      </h2>
      
      <Card className="p-6 bg-black border border-white/10">
        <div className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left h-11 text-sm tracking-wide bg-black hover:bg-white/5 border-white/10 hover:border-white/20 text-white",
                  !dateRange && "text-white/40"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {formatDate(dateRange.from.toISOString()).split(' ')[0]} até {formatDate(dateRange.to.toISOString()).split(' ')[0]}
                    </>
                  ) : (
                    formatDate(dateRange.from.toISOString()).split(' ')[0]
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-black border-white/20" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range)}
                initialFocus
                className="pointer-events-auto"
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              type="text"
              placeholder="Pesquisar por código da válvula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-black border-white/10 focus:border-white/30 text-white placeholder:text-white/30"
            />
          </div>

          {(dateRange || searchTerm) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateRange({ from: new Date(), to: new Date() });
                setSearchTerm("");
              }}
              className="w-full text-xs tracking-wider text-white/40 hover:text-white hover:bg-white/5"
            >
              LIMPAR FILTROS
            </Button>
          )}
        </div>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card className="p-12 text-center bg-black border border-white/10">
          <FileText className="h-12 w-12 mx-auto mb-4 text-white/20" />
          <p className="text-sm text-white/40 tracking-wide">
            {searchTerm ? `Nenhum registro encontrado para "${searchTerm}"` : 
             dateRange ? 'Nenhum registro para este período' : 
             'Nenhum registro encontrado'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => (
              <Card 
                key={record.id} 
                className="group overflow-hidden bg-black border border-white/10 hover:border-white/20 transition-all duration-500"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-lg font-light tracking-wide text-white">
                        {record.valve_code || "Sem código"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/40 tracking-wide">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(record.inspection_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        {record.status === 'concluido' ? (
                          <div className="flex items-center gap-1.5 text-xs text-white/60">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="tracking-wide">CONCLUÍDO</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-primary/80">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="tracking-wide">EM ANDAMENTO</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {onEditRecord && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEditRecord(record)}
                          className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(record)}
                        className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(record.id)}
                        className="h-8 w-8 text-white/40 hover:text-primary hover:bg-primary/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { url: record.photo_initial_url, label: "Início" },
                      { url: record.photo_during_url, label: "Durante" },
                      { url: record.photo_final_url, label: "Final" }
                    ].map((photo, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="aspect-[3/4] rounded overflow-hidden bg-black/50 border border-white/5">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt={photo.label}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] text-white/20 tracking-wider">SEM FOTO</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-white/30 text-center tracking-wider uppercase">
                          {photo.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-center gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-xs tracking-wider bg-black hover:bg-white/5 border-white/10 hover:border-white/20 text-white disabled:opacity-30"
            >
              ANTERIOR
            </Button>
            <span className="flex items-center px-4 text-xs text-white/40 tracking-wider">
              PÁGINA {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={filteredRecords.length < RECORDS_PER_PAGE}
              className="text-xs tracking-wider bg-black hover:bg-white/5 border-white/10 hover:border-white/20 text-white disabled:opacity-30"
            >
              PRÓXIMA
            </Button>
          </div>
        </>
      )}
    </div>
  );
};