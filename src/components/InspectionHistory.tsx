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
import redBlackWaveOverlay from "@/assets/red-black-wave-overlay.png";

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
  // Filtro de período: data inicial e final
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
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
        else if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          
          query = query
            .gte("inspection_date", start.toISOString())
            .lte("inspection_date", end.toISOString());
        } else if (startDate) {
          // Se só tiver data inicial, busca do dia inicial em diante
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query = query.gte("inspection_date", start.toISOString());
        } else if (endDate) {
          // Se só tiver data final, busca até o dia final
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query = query.lte("inspection_date", end.toISOString());
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
  }, [searchTerm, startDate, endDate, currentPage]);

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Histórico de Inspeções</h2>
      </div>
      
      {/* Filtro de Período com Pesquisa */}
      <Card className="p-6 bg-card/95 backdrop-blur-md border-border shadow-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Inicial */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Data Inicial
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-transparent border-border/50 hover:bg-accent/20 h-10",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? (
                      formatDate(startDate.toISOString()).split(' ')[0]
                    ) : (
                      <span>Selecione a data inicial</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-md border-border/50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Final */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Data Final
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-transparent border-border/50 hover:bg-accent/20 h-10",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? (
                      formatDate(endDate.toISOString()).split(' ')[0]
                    ) : (
                      <span>Selecione a data final</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-md border-border/50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar por código da válvula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-transparent border-border/50 h-10"
            />
          </div>

          {/* Botão para limpar filtros */}
          {(startDate || endDate || searchTerm) && (
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
                setSearchTerm("");
              }}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card className="p-8 text-center bg-card/95 backdrop-blur-md border-border shadow-md">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {searchTerm ? `Nenhum registro encontrado para "${searchTerm}"` : 
             (startDate || endDate) ? 'Nenhum registro para este período' : 
             'Nenhum registro encontrado'}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => (
              <Card key={record.id} className="overflow-hidden hover:shadow-xl transition-all bg-card/95 backdrop-blur-md border-border shadow-md">
                <div className="relative p-4 h-24">
                  <img
                    src={redBlackWaveOverlay}
                    alt=""
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  />
                  <div className="relative z-10 flex items-center justify-between h-full">
                    <div>
                      <h3 className="font-bold text-lg text-white drop-shadow-lg">
                        {record.valve_code || "Sem código"}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-white/90 drop-shadow-md">
                        <Calendar className="h-4 w-4" />
                        {formatDate(record.inspection_date)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {onEditRecord && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEditRecord(record)}
                          className="text-white hover:bg-white/20"
                          title="Editar inspeção"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(record)}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(record.id)}
                        className="text-white hover:bg-white/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Indicador de Progresso */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {record.status === 'concluido' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-500">Completo</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-yellow-500">Em andamento</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <div className={`h-2 w-2 rounded-full ${record.photo_initial_url ? 'bg-white' : 'bg-white/30'}`} />
                      <div className={`h-2 w-2 rounded-full ${record.photo_during_url ? 'bg-white' : 'bg-white/30'}`} />
                      <div className={`h-2 w-2 rounded-full ${record.photo_final_url ? 'bg-white' : 'bg-white/30'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {record.photo_initial_url && (
                      <div className="w-full h-20 rounded overflow-hidden">
                        <img
                          src={record.photo_initial_url}
                          alt="Inicial"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {record.photo_during_url && (
                      <div className="w-full h-20 rounded overflow-hidden">
                        <img
                          src={record.photo_during_url}
                          alt="Durante"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {record.photo_final_url && (
                      <div className="w-full h-20 rounded overflow-hidden">
                        <img
                          src={record.photo_final_url}
                          alt="Final"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
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

          {/* Controles de Paginação - Sempre visível quando há registros */}
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-transparent"
            >
              Anterior
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Página {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={filteredRecords.length < RECORDS_PER_PAGE}
              className="bg-transparent"
            >
              Próxima
            </Button>
          </div>
        </>
      )}
    </div>
  );
};