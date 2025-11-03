import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Edit3, Filter } from "lucide-react";

const CURRENT_VERSION = "2.0.0";
const VERSION_KEY = "app_version_seen";

export const ReleaseNotes = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(VERSION_KEY);
    if (seenVersion !== CURRENT_VERSION) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2 text-gray-900">
            <CheckCircle2 className="h-6 w-6 text-blue-600" />
            Novidades - Versão {CURRENT_VERSION}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <Edit3 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Sistema de Edição</h3>
                <p className="text-sm text-gray-700">
                  Agora você pode editar qualquer inspeção e completar as fotos em etapas. Perfeito para inspeções longas!
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Filter className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Filtro de Período</h3>
                <p className="text-sm text-gray-700">
                  Selecione um período completo no calendário para visualizar todas as inspeções entre duas datas.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Indicadores Visuais</h3>
                <p className="text-sm text-gray-700">
                  Acompanhe o progresso de cada inspeção com indicadores visuais de status e fotos anexadas.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          Entendi, vamos começar!
        </Button>
      </DialogContent>
    </Dialog>
  );
};
