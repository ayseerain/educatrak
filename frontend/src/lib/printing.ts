export async function printDocumentWhenReady(): Promise<void> {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>(".print-root img, .print-page img"));
  await Promise.all(images.map(async (image) => {
    if (!image.complete) await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("A document image could not be loaded for printing.")), { once: true });
    });
    if (image.naturalWidth === 0) throw new Error("A document image could not be loaded for printing.");
    if (typeof image.decode === "function") await image.decode();
  }));
  window.print();
}
