export interface CompositeRecord {
  valve_code: string | null;
  inspection_date: string;
  photo_initial_url: string | null;
  photo_during_url: string | null;
  photo_final_url: string | null;
}

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => reject(error);
      fallback.src = url;
    };
    img.src = url;
  });

export const compositeFilename = (record: CompositeRecord) => {
  const date = new Date(record.inspection_date);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `inspecao-${record.valve_code || "sem-codigo"}-${day}-${month}-${date.getFullYear()}.png`;
};

/** Renders the full "REGISTROS FOTOGRÁFICOS" sheet (3 photos + titles) as a single PNG. */
export const buildInspectionComposite = async (
  record: CompositeRecord,
  scale = 1
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar contexto");

  const width = 2000;
  const height = 752;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.scale(scale, scale);

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
    { url: record.photo_final_url, title: "TÉRMINO DA INSPEÇÃO", subtitle: "VÁLVULA PRONTA" },
  ];

  const photoWidth = 428;
  const photoHeight = 590;
  const spacing = 40;
  const startX = (width - (photoWidth * 3 + spacing * 2)) / 2;
  const startY = headerHeight + 25;
  const cardHeaderHeight = 70;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const x = startX + i * (photoWidth + spacing);

    ctx.strokeStyle = "#a8b8d1";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, startY, photoWidth, photoHeight);

    ctx.fillStyle = "#4a6fa5";
    ctx.fillRect(x, startY, photoWidth, cardHeaderHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(photo.title, x + photoWidth / 2, startY + 28);
    ctx.font = "14px Arial";
    ctx.fillText(photo.subtitle, x + photoWidth / 2, startY + 52);

    const boxX = x + 15;
    const boxY = startY + cardHeaderHeight + 15;
    const boxWidth = photoWidth - 30;
    const boxHeight = photoHeight - cardHeaderHeight - 30;

    const drawPlaceholder = (text: string) => {
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.fillStyle = "#6b7280";
      ctx.font = "14px Arial";
      ctx.fillText(text, x + photoWidth / 2, startY + photoHeight / 2);
    };

    if (photo.url) {
      try {
        const img = await loadImage(photo.url);
        const imgScale = Math.min(boxWidth / img.width, boxHeight / img.height);
        const scaledWidth = img.width * imgScale;
        const scaledHeight = img.height * imgScale;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.drawImage(
          img,
          x + (photoWidth - scaledWidth) / 2,
          boxY + (boxHeight - scaledHeight) / 2,
          scaledWidth,
          scaledHeight
        );
      } catch {
        drawPlaceholder("Imagem não disponível");
      }
    } else {
      drawPlaceholder("Sem foto");
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/png",
      1.0
    );
  });
};

/** Simple queue so many cards don't render composites at the same time. */
let queue: Promise<unknown> = Promise.resolve();
export const enqueueComposite = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
};
