import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, FileText, Trash2, Download, Search, Edit, CheckCircle2, Clock, ChevronLeft, ChevronRight, X, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

// Optimized image component with intersection observer
const LazyImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

// Record card component for better performance
const RecordCard = ({ 
  record, 
  onEdit, 
  onDownload, 
  onDelete 
}: { 
  record: InspectionRecord; 
  onEdit?: (record: InspectionRecord) => void;
  onDownload: (record: InspectionRecord) => void;
  onDelete: (id: string) => void;
}) => {
  const photos = useMemo(() => [
    record.photo_initial_url,
    record.photo_during_url,
    record.photo_final_url
  ], [record.photo_initial_url, record.photo_during_url, record.photo_final_url]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate text-base group-hover:text-primary transition-colors">
              {record.valve_code || "Sem código"}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatDate(record.inspection_date)}</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all",
            record.status === 'concluido' 
              ? "bg-success/10 text-success border border-success/20" 
              : "bg-warning/10 text-warning border border-warning/20"
          )}>
            {record.status === 'concluido' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{record.status === 'concluido' ? 'Concluído' : 'Pendente'}</span>
          </div>
        </div>
      </div>

      {/* Photos Preview */}
      <div className="grid grid-cols-3 gap-0.5 bg-border">
        {photos.map((url, i) => (
          <div key={i} className="aspect-square bg-muted">
            {url ? (
              <LazyImage 
                src={url} 
                alt={`Foto ${i + 1}`} 
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 p-2 bg-muted/30">
        {onEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(record)}
            className="flex-1 h-9 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDownload(record)}
          className="flex-1 h-9 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Baixar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(record.id)}
          className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Skeleton loader for cards
const CardSkeleton = () => (
  <div className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
    <div className="p-4 border-b border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-0.5 bg-border">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
    <div className="flex items-center gap-1 p-2 bg-muted/30">
      <Skeleton className="flex-1 h-9" />
      <Skeleton className="flex-1 h-9" />
      <Skeleton className="h-9 w-9" />
    </div>
  </div>
);

export const InspectionHistory = ({ 
  refreshTrigger, 
  onEditRecord 
}: { 
  refreshTrigger: number;
  onEditRecord?: (record: InspectionRecord) => void;
}) => {
  const { toast } = useToast();
  const [filteredRecords, setFilteredRecords] = useState<InspectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "em_andamento" | "concluido">("all");
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadRecords = useCallback(async (page: number, search: string, dates: { from: Date; to?: Date }, pageSize: number, status: "all" | "em_andamento" | "concluido") => {
    setIsLoading(true);
    try {
      let countQuery = supabase
        .from("inspection_records")
        .select("*", { count: 'exact', head: true });
      
      let query = supabase
        .from("inspection_records")
        .select("*");
      
      // Apply status filter
      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
        query = query.eq("status", status);
      }
      
      if (search.trim() !== "") {
        countQuery = countQuery.ilike("valve_code", `%${search}%`);
        query = query.ilike("valve_code", `%${search}%`);
      } else if (status === "all" && dates?.from) {
        // Only apply date filter when status is "all"
        const start = new Date(dates.from);
        start.setHours(0, 0, 0, 0);
        
        if (dates.to) {
          const end = new Date(dates.to);
          end.setHours(23, 59, 59, 999);
          countQuery = countQuery
            .gte("inspection_date", start.toISOString())
            .lte("inspection_date", end.toISOString());
          query = query
            .gte("inspection_date", start.toISOString())
            .lte("inspection_date", end.toISOString());
        } else {
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          countQuery = countQuery
            .gte("inspection_date", start.toISOString())
            .lte("inspection_date", end.toISOString());
          query = query
            .gte("inspection_date", start.toISOString())
            .lte("inspection_date", end.toISOString());
        }
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalRecords(count || 0);
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error } = await query
        .order("inspection_date", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setFilteredRecords((data || []) as InspectionRecord[]);
    } catch (error) {
      console.error("Erro ao carregar registros:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  // Main effect: Load records when dependencies change
  useEffect(() => {
    loadRecords(currentPage, debouncedSearchTerm, dateRange, recordsPerPage, statusFilter);
  }, [currentPage, debouncedSearchTerm, dateRange, recordsPerPage, statusFilter, refreshTrigger, loadRecords]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, dateRange, recordsPerPage, statusFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRecords(currentPage, debouncedSearchTerm, dateRange, recordsPerPage, statusFilter);
  };

  const clearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from("inspection_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Registro excluído" });
      loadRecords(currentPage, debouncedSearchTerm, dateRange, recordsPerPage, statusFilter);
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
      toast({ title: "Gerando imagem...", description: "Aguarde um momento" });
      
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

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const showInitialLoading = isLoading && filteredRecords.length === 0 && !searchTerm && !debouncedSearchTerm;

  // Pagination numbers
  const paginationNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Search and Date */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar por código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-11 bg-background border-border focus:border-primary transition-colors"
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isLoading && (searchTerm || statusFilter !== "all") && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "em_andamento" | "concluido") => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-44 h-11">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="em_andamento">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    Pendentes
                  </span>
                </SelectItem>
                <SelectItem value="concluido">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Concluídos
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "sm:w-auto w-full justify-start text-left font-normal h-11 gap-2",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {formatDate(dateRange.from.toISOString()).split(' ')[0]} — {formatDate(dateRange.to.toISOString()).split(' ')[0]}
                      </>
                    ) : (
                      formatDate(dateRange.from.toISOString()).split(' ')[0]
                    )
                  ) : (
                    <span>Período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range: any) => {
                    if (range) {
                      setDateRange(range);
                    }
                  }}
                  initialFocus
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-11 w-11 shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Exibir</span>
              <Select
                value={String(recordsPerPage)}
                onValueChange={(value) => setRecordsPerPage(Number(value))}
              >
                <SelectTrigger className="w-20 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="hidden sm:inline">por página</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">
                {totalRecords > 0 
                  ? `${(currentPage - 1) * recordsPerPage + 1}-${Math.min(currentPage * recordsPerPage, totalRecords)} de ${totalRecords}`
                  : "0 registros"
                }
              </span>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {totalPages > 0 && (
                  <div className="hidden sm:flex items-center gap-1">
                    {paginationNumbers.map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="icon"
                        onClick={() => goToPage(pageNum)}
                        className="h-9 w-9"
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>
                )}
                
                <span className="sm:hidden text-sm font-medium px-2">
                  {currentPage}/{totalPages || 1}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Records */}
      {showInitialLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-2xl flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "Nenhum resultado" : "Nenhum registro"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? `Não encontramos registros para "${searchTerm}"` 
                : 'Não há registros para o período selecionado'
              }
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                className="mt-4"
              >
                Limpar pesquisa
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onEdit={onEditRecord}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
