(function initializeExerciseUpload(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionExerciseUpload = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createExerciseUpload() {
  "use strict";

  const BUCKET = "exercise-media";
  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const VARIANTS = Object.freeze({
    default: { folder: "default", field: "image_url", suffix: "" },
    masculino: { folder: "masculino", field: "image_url_masculino", suffix: "-masculino" },
    feminino: { folder: "feminino", field: "image_url_feminino", suffix: "-feminino" }
  });
  const MIME_EXTENSIONS = Object.freeze({
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg"
  });

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "exercicio";
  }

  function getFileExtension(fileName) {
    return String(fileName || "").trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  }

  function validateImageFile(file) {
    if (!file) throw new Error("Selecione uma imagem para enviar.");
    const extension = getFileExtension(file.name);
    const expectedExtension = MIME_EXTENSIONS[file.type];
    if (!expectedExtension) throw new Error("Formato não suportado. Use WEBP, PNG ou JPEG.");
    const compatibleExtensions = file.type === "image/jpeg" ? ["jpg", "jpeg"] : [expectedExtension];
    if (!compatibleExtensions.includes(extension)) {
      throw new Error("A extensão do arquivo não corresponde ao tipo da imagem.");
    }
    if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("O arquivo de imagem está vazio ou inválido.");
    if (file.size > MAX_FILE_SIZE) throw new Error("A imagem deve ter no máximo 2 MB.");
    return { extension: expectedExtension, contentType: file.type };
  }

  function buildStoragePath(exerciseName, variant, extension) {
    const config = VARIANTS[variant];
    if (!config) throw new Error("Tipo de imagem inválido.");
    if (!String(exerciseName || "").trim()) throw new Error("Informe o nome do exercício antes de selecionar a imagem.");
    return `images/${config.folder}/${slugify(exerciseName)}${config.suffix}.${extension}`;
  }

  function describeUploadError(error) {
    const message = String(error?.message || error || "");
    if (/bucket.*not found|not found/i.test(message)) return "Bucket exercise-media não encontrado. Aplique a migration de Storage no Supabase.";
    if (/row-level security|permission|unauthorized|forbidden|403/i.test(message)) return "Upload negado. Entre com a conta Admin legítima e confira as policies do Storage.";
    if (/network|fetch|offline/i.test(message)) return "Falha de conexão durante o upload. Confira a internet e tente novamente.";
    return message || "Não foi possível enviar a imagem.";
  }

  async function uploadExerciseImage({ client, file, exerciseName, variant, isAdmin }) {
    if (!isAdmin) throw new Error("Somente o Admin legítimo pode enviar imagens.");
    if (!client?.storage?.from) throw new Error("Supabase Storage não está disponível.");
    const { extension, contentType } = validateImageFile(file);
    const path = buildStoragePath(exerciseName, variant, extension);
    const bucket = client.storage.from(BUCKET);
    const { error } = await bucket.upload(path, file, { contentType, cacheControl: "3600", upsert: true });
    if (error) throw new Error(describeUploadError(error));
    const { data } = bucket.getPublicUrl(path);
    const publicUrl = String(data?.publicUrl || "").trim();
    if (!/^https:\/\//i.test(publicUrl)) throw new Error("O Storage não retornou uma URL pública válida.");
    return { bucket: BUCKET, path, publicUrl, field: VARIANTS[variant].field };
  }

  return { BUCKET, MAX_FILE_SIZE, MIME_EXTENSIONS, VARIANTS, buildStoragePath, describeUploadError, slugify, uploadExerciseImage, validateImageFile };
});
