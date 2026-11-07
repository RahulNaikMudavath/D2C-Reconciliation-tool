
import api from "./api";

export const getReconciliationResults = async () => {
  const response = await api.get("/reconciliation");
  return response.data.data;
};

export const runReconciliation = async () => {
  const response = await api.post("/reconciliation/run");
  return response.data.data;
};
