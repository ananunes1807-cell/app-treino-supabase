(function initializeWorkoutPdfExtractor(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutPdfExtractor = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutPdfExtractor() {
  "use strict";

  const MIN_TEXT_CHARACTERS = 24;

  function friendlyPdfError(error) {
    const name = String(error?.name || "");
    if (name === "PasswordException") return "Este PDF é protegido por senha e não pode ser importado nesta versão.";
    if (name === "InvalidPDFException" || name === "MissingPDFException" || name === "UnexpectedResponseException") {
      return "Não conseguimos abrir este PDF. Verifique o arquivo e tente novamente.";
    }
    return error?.message || "Não conseguimos ler este PDF.";
  }

  function orderItems(items) {
    return [...items].sort((left, right) => {
      const leftY = Number(left.transform?.[5] || 0);
      const rightY = Number(right.transform?.[5] || 0);
      if (Math.abs(leftY - rightY) > 2) return rightY - leftY;
      return Number(left.transform?.[4] || 0) - Number(right.transform?.[4] || 0);
    });
  }

  function buildLines(items) {
    const lines = [];
    orderItems(items).forEach((item) => {
      const text = String(item.str || "").trim();
      if (!text) return;
      const x = Number(item.transform?.[4] || 0);
      const y = Number(item.transform?.[5] || 0);
      const fontSize = Math.abs(Number(item.transform?.[3] || item.height || 0));
      const current = lines[lines.length - 1];
      if (!current || Math.abs(current.y - y) > 2) {
        lines.push({ text, x, y, font_size: fontSize });
      } else {
        current.text = `${current.text} ${text}`.replace(/\s+/g, " ").trim();
        current.font_size = Math.max(current.font_size, fontSize);
      }
    });
    return lines;
  }

  async function extractPdf(file, options = {}) {
    const pdfjs = options.pdfjs || (typeof window !== "undefined" ? window.pdfjsLib : null);
    const signal = options.signal;
    const maxPages = Number(options.maxPages || 40);
    if (!pdfjs?.getDocument) throw new Error("Leitor PDF.js indisponível.");
    if (signal?.aborted) throw new DOMException("Operação cancelada.", "AbortError");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
      const onAbort = () => loadingTask.destroy();
      signal?.addEventListener("abort", onAbort, { once: true });
      const document = await loadingTask.promise;
      if (document.numPages > maxPages) {
        await loadingTask.destroy();
        throw new Error(`O PDF excede o limite de ${maxPages} páginas.`);
      }

      const pages = [];
      let characterCount = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        if (signal?.aborted) throw new DOMException("Operação cancelada.", "AbortError");
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent({ disableCombineTextItems: false });
        const lines = buildLines(content.items);
        const text = lines.map((line) => line.text).join("\n");
        characterCount += text.replace(/\s/g, "").length;
        pages.push({ page_number: pageNumber, text, lines });
        page.cleanup();
        options.onProgress?.({ page: pageNumber, total: document.numPages });
      }
      await loadingTask.destroy();
      signal?.removeEventListener("abort", onAbort);
      const documentType = characterCount < MIN_TEXT_CHARACTERS ? "scanned" : "text";
      return { page_count: pages.length, document_type: documentType, character_count: characterCount, pages };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      const wrapped = new Error(friendlyPdfError(error));
      wrapped.name = "WorkoutPdfError";
      wrapped.cause = error;
      throw wrapped;
    }
  }

  return { MIN_TEXT_CHARACTERS, buildLines, extractPdf, friendlyPdfError };
});
