const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });

const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

export interface CompositeInput {
  initial: string;
  during: string;
  final: string;
}

/**
 * Builds the "REGISTROS FOTOGRÁFICOS" composite (single image) matching the
 * report layout: banner header + 3 titled columns with the photos.
 * Returns a JPEG Blob.
 */
export const buildCompositeImage = async (
  photos: CompositeInput,
  quality = 0.85
): Promise<Blob> => {
  const [imgI, imgD, imgF] = await Promise.all([
    loadImage(photos.initial),
    loadImage(photos.during),
    loadImage(photos.final),
  ]);

  // Layout constants (2000px wide, matches sample).
  const W = 2000;
  const PAD = 40;
  const GAP = 24;
  const BANNER_H = 90;
  const CARD_TITLE_H = 92;
  const CARD_INNER_PAD = 24;
  const PHOTO_H = 520;
  const CARD_H = CARD_TITLE_H + CARD_INNER_PAD * 2 + PHOTO_H;
  const H = PAD + BANNER_H + 30 + CARD_H + PAD;
  const COL_W = Math.floor((W - PAD * 2 - GAP * 2) / 3);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Banner
  ctx.fillStyle = "#4A6FA5";
  ctx.fillRect(PAD, PAD, W - PAD * 2, BANNER_H);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("REGISTROS FOTOGRÁFICOS", W / 2, PAD + BANNER_H / 2);

  const cardsTop = PAD + BANNER_H + 30;

  const cards: Array<{ title: string; subtitle: string; img: HTMLImageElement }> = [
    { title: "INÍCIO DA INSPEÇÃO", subtitle: "VÁLVULA NO RECEBIMENTO", img: imgI },
    { title: "DURANTE A INSPEÇÃO", subtitle: "VÁLVULA TRABALHANDO", img: imgD },
    { title: "TÉRMINO DA INSPEÇÃO", subtitle: "VÁLVULA PRONTA", img: imgF },
  ];

  cards.forEach((c, i) => {
    const x = PAD + i * (COL_W + GAP);
    const y = cardsTop;

    // Card border
    ctx.strokeStyle = "#d0d7e2";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, COL_W, CARD_H);

    // Title bar
    ctx.fillStyle = "#4A6FA5";
    ctx.fillRect(x, y, COL_W, CARD_TITLE_H);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(c.title, x + COL_W / 2, y + 32);
    ctx.font = "600 20px Arial, sans-serif";
    ctx.fillText(c.subtitle, x + COL_W / 2, y + 68);

    // Photo area
    const px = x + CARD_INNER_PAD;
    const py = y + CARD_TITLE_H + CARD_INNER_PAD;
    const pw = COL_W - CARD_INNER_PAD * 2;
    const ph = PHOTO_H;
    ctx.fillStyle = "#000";
    ctx.fillRect(px, py, pw, ph);
    drawCover(ctx, c.img, px, py, pw, ph);
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem composta"))),
      "image/jpeg",
      quality
    );
  });
};