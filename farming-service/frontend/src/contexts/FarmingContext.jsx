import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { plotsApi, cropSeasonsApi } from '../services/farming.service';

const FarmingContext = createContext();

export function FarmingProvider({ children }) {
  const [plots, setPlots] = useState([]);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [seasonsByPlot, setSeasonsByPlot] = useState({}); // { [plotId]: [Season] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to load plots from real API
  const refreshPlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plotsApi.getPlots(0, 100);
      const items = res.items || [];
      setPlots(items);

      if (items.length > 0) {
        // If current selected plot not in list, pick first
        setSelectedPlotId((prev) => {
          if (prev && items.some(p => p.plotId === prev)) return prev;
          return items[0].plotId;
        });
      } else {
        setSelectedPlotId(null);
        setSelectedSeasonId(null);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách ruộng');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshPlots();
  }, [refreshPlots]);

  // When selectedPlotId changes, load/reset season
  useEffect(() => {
    if (!selectedPlotId) {
      setSelectedSeasonId(null);
      return;
    }
    const seasons = seasonsByPlot[selectedPlotId] || [];
    if (seasons.length > 0) {
      // Pick IN_PROGRESS or first
      const current = seasons.find(s => s.status === 'IN_PROGRESS') || seasons[0];
      setSelectedSeasonId(current.cropSeasonId);
    } else {
      setSelectedSeasonId(null);
    }
  }, [selectedPlotId, seasonsByPlot]);

  // Register or update seasons of a plot
  const registerSeason = (plotId, season) => {
    setSeasonsByPlot(prev => {
      const existing = prev[plotId] || [];
      const updated = existing.filter(s => s.cropSeasonId !== season.cropSeasonId);
      return {
        ...prev,
        [plotId]: [...updated, season]
      };
    });
    setSelectedSeasonId(season.cropSeasonId);
  };

  const currentPlot = plots.find(p => p.plotId === selectedPlotId) || null;
  const currentPlotSeasons = (selectedPlotId && seasonsByPlot[selectedPlotId]) || [];
  const currentSeason = currentPlotSeasons.find(s => s.cropSeasonId === selectedSeasonId) || null;

  return (
    <FarmingContext.Provider
      value={{
        plots,
        selectedPlotId,
        setSelectedPlotId,
        selectedSeasonId,
        setSelectedSeasonId,
        currentPlot,
        currentSeason,
        currentPlotSeasons,
        refreshPlots,
        registerSeason,
        loading,
        error
      }}
    >
      {children}
    </FarmingContext.Provider>
  );
}

export function useFarming() {
  return useContext(FarmingContext);
}
