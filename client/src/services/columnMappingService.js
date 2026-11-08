import api from "../api";

export async function getColumnMappings(status = "ALL") {
  const response = await api.get("/column-mappings", {
    params: { status },
  });

  return response.data;
}

export async function approveColumnMapping(mappingId) {
  const response = await api.patch(
    `/imports/mappings/${mappingId}/approve`
  );

  return response.data;
}

export async function rejectColumnMapping(mappingId, rejectionReason) {
  const response = await api.patch(
    `/imports/mappings/${mappingId}/reject`,
    { rejectionReason }
  );

  return response.data;
}

