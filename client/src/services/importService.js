
import api from "./api";

export const uploadImportFile = async (file, importType) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("importType", importType);

  const response = await api.post("/imports/upload", formData);

  return response.data.data;
};

export const getImportHistory = async () => {
  const response = await api.get("/import-history");

  return response.data.data;
};

export const getImportDetails = async (importBatchId) => {
  const response = await api.get(`/import-details/${importBatchId}`);

  return response.data.data;
};

export const processSettlementImport = async (importBatchId) => {
  const response = await api.post(
    `/settlement-processing/${importBatchId}/process`
  );

  return response.data.data;
};
