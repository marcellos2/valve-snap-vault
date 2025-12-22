import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, FileText, Trash2, Download, Search, Edit, CheckCircle2, Clock, Filter } from "lucide-react";
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
        } 
        else if (dateRange?.from) {
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
      
      if (!ctx) {
        throw new Error("Não foi possível criar contexto do canvas");
      }

      const width = 2000;
      const height = 752;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      const headerHeight = 108;
      ctx.fillStyle = "#dc2626";
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

        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, startY, photoWidth, photoHeight);

        const cardHeaderHeight = 70;
        ctx.fillStyle = "#dc2626";
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
          } catch (error) {
            console.error(`Erro ao carregar/desenhar foto ${i + 1}:`, error);
            ctx.fillStyle = "#f3f4f6";
            ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
            
            ctx.fillStyle = "#9ca3af";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Imagem não disponível", x + photoWidth / 2, startY + photoHeight / 2);
          }
        } else {
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(x + 15, startY + cardHeaderHeight + 15, photoWidth - 30, photoHeight - cardHeaderHeight - 30);
          
          ctx.fillStyle = "#9ca3af";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
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
          
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "Sucesso",
            description: "Imagem baixada com sucesso",
          });
        } else {
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
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 dark:border-gray-700 border-t-red-600 dark:border-t-red-500"></div>
        <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-10 min-w-[220px] border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-red-500 dark:hover:border-red-600 transition-all duration-300",
                  !dateRange && "text-gray-500 dark:text-gray-400"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {formatDate(dateRange.from.toISOString()).split(' ')[0]} - {formatDate(dateRange.to.toISOString()).split(' ')[0]}
                    </>
                  ) : (
                    formatDate(dateRange.from.toISOString()).split(' ')[0]
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800" align="start">
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

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-red-500 dark:focus:border-red-600"
            />
          </div>

          {(dateRange || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange({ from: new Date(), to: new Date() });
                setSearchTerm("");
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {filteredRecords.length === 0 ? (
        <Card className="p-12 text-center border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
          <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {searchTerm ? `Nenhum registro para "${searchTerm}"` : 
             dateRange ? 'Nenhum registro neste período' : 
             'Nenhum registro encontrado'}
          </p>
        </Card>
      ) : (
        <>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {filteredRecords.length} registro(s) encontrado(s)
          </div>

          <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-850">
                  <tr>
                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-4 py-4">
                      Código
                    </th>
                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-4 py-4">
                      Data
                    </th>
                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-4 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-4 py-4">
                      Fotos
                    </th>
                    <th className="text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider px-4 py-4">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-850 transition-colors duration-200">
                      <td className="px-4 py-4">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {record.valve_code || "Sem código"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(record.inspection_date)}
                      </td>
                      <td className="px-4 py-4">
                        {record.status === 'concluido' ? (
                          <span className="status-badge status-complete">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completo
                          </span>
                        ) : (
                          <span className="status-badge status-pending">
                            <Clock className="h-3.5 w-3.5" />
                            Em andamento
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <div className={`h-10 w-10 rounded-lg border-2 ${record.photo_initial_url ? 'border-gray-300 dark:border-gray-700 overflow-hidden' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850'}`}>
                            {record.photo_initial_url && (
                              <img
                                src={record.photo_initial_url}
                                alt="Inicial"
                                className="w-full h-full object-cover hover:scale-150 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                          </div>
                          <div className={`h-10 w-10 rounded-lg border-2 ${record.photo_during_url ? 'border-gray-300 dark:border-gray-700 overflow-hidden' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850'}`}>
                            {record.photo_during_url && (
                              <img
                                src={record.photo_during_url}
                                alt="Durante"
                                className="w-full h-full object-cover hover:scale-150 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                          </div>
                          <div className={`h-10 w-10 rounded-lg border-2 ${record.photo_final_url ? 'border-gray-300 dark:border-gray-700 overflow-hidden' : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850'}`}>
                            {record.photo_final_url && (
                              <img
                                src={record.photo_final_url}
                                alt="Final"
                                className="w-full h-full object-cover hover:scale-150 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {onEditRecord && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onEditRecord(record)}
                              className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-300"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownload(record)}
                            className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-300"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(record.id)}
                            className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 hover:scale-105 transition-all duration-300"
            >
              ← Anterior
            </Button>
            <span className="flex items-center px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">
              Página {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={filteredRecords.length < RECORDS_PER_PAGE}
              className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 hover:scale-105 transition-all duration-300"
            >
              Próxima →
            </Button>
          </div>
        </>
      )}
    </div>
  );
};