import api from './api';

export const plotsApi = {
  // GET /api/v1/plots?page=0&size=20
  getPlots: (page = 0, size = 100) => api.get(`/plots?page=${page}&size=${size}`),

  // GET /api/v1/plots/:plotId
  getPlotDetail: (plotId) => api.get(`/plots/${plotId}`),

  // POST /api/v1/plots
  createPlot: (data) => api.post('/plots', data),

  // PUT /api/v1/plots/:plotId
  updatePlot: (plotId, data) => api.put(`/plots/${plotId}`, data),

  // PATCH /api/v1/plots/:plotId/visibility
  updateVisibility: (plotId, isVisible) => api.patch(`/plots/${plotId}/visibility`, { isVisible })
};

export const cropSeasonsApi = {
  // POST /api/v1/plots/:plotId/crop-seasons
  createCropSeason: (plotId, data) => api.post(`/plots/${plotId}/crop-seasons`, data),

  // GET /api/v1/crop-seasons/:cropSeasonId
  getCropSeasonDetail: (cropSeasonId) => api.get(`/crop-seasons/${cropSeasonId}`),

  // PUT /api/v1/crop-seasons/:cropSeasonId
  updateCropSeason: (cropSeasonId, data) => api.put(`/crop-seasons/${cropSeasonId}`, data),

  // PATCH /api/v1/crop-seasons/:cropSeasonId/complete
  completeCropSeason: (cropSeasonId, actualYield) => 
    api.patch(`/crop-seasons/${cropSeasonId}/complete`, { actualYield: Number(actualYield) })
};

export const farmingLogsApi = {
  // POST /api/v1/crop-seasons/:cropSeasonId/logs
  createLog: (cropSeasonId, data) => api.post(`/crop-seasons/${cropSeasonId}/logs`, data),

  // PATCH /api/v1/logs/:logId
  updateLog: (logId, data) => api.patch(`/logs/${logId}`, data),

  // PATCH /api/v1/logs/:logId/visibility
  updateVisibility: (logId, isVisible) => api.patch(`/logs/${logId}/visibility`, { isVisible })
};

export const costsApi = {
  // POST /api/v1/crop-seasons/:cropSeasonId/costs
  createCost: (cropSeasonId, data) => api.post(`/crop-seasons/${cropSeasonId}/costs`, data),

  // PATCH /api/v1/costs/:costId
  updateCost: (costId, data) => api.patch(`/costs/${costId}`, data),

  // PATCH /api/v1/costs/:costId/visibility
  updateVisibility: (costId, isVisible) => api.patch(`/costs/${costId}/visibility`, { isVisible })
};

export const reportsApi = {
  // GET /api/v1/crop-seasons/:cropSeasonId/report
  getReport: (cropSeasonId) => api.get(`/crop-seasons/${cropSeasonId}/report`),

  // GET /api/v1/crop-seasons/:cropSeasonId/report/pdf (blob download)
  downloadPdf: (cropSeasonId) => 
    api.get(`/crop-seasons/${cropSeasonId}/report/pdf`, { responseType: 'blob' })
};
