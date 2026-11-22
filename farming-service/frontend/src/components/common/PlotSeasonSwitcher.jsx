import React from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { formatNumber } from '../../utils/formatters';

export function PlotSeasonSwitcher({ withPlot = true }) {
  const {
    plots,
    selectedPlotId,
    setSelectedPlotId,
    selectedSeasonId,
    setSelectedSeasonId,
    currentPlotSeasons
  } = useFarming();

  const activePlots = plots.filter(p => p.isVisible);

  return (
    <div className="switch-context" aria-label="Chọn ruộng và mùa vụ">
      {withPlot && (
        <label className="switch-field">
          <span>Ruộng đang chọn</span>
          <select
            className="v5-plot-select"
            value={selectedPlotId || ''}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            aria-label="Chuyển ruộng"
          >
            {activePlots.length === 0 ? (
              <option value="">Chưa có ruộng</option>
            ) : (
              activePlots.map((p) => (
                <option key={p.plotId} value={p.plotId}>
                  {p.name} · {formatNumber(p.area)} m²
                </option>
              ))
            )}
          </select>
        </label>
      )}

      <label className="switch-field">
        <span>Mùa vụ</span>
        <select
          className="v5-season-select"
          value={selectedSeasonId || ''}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          disabled={currentPlotSeasons.length === 0}
          aria-label="Chuyển mùa vụ"
        >
          {currentPlotSeasons.length === 0 ? (
            <option value="">Chưa có mùa vụ</option>
          ) : (
            currentPlotSeasons.map((s) => (
              <option key={s.cropSeasonId} value={s.cropSeasonId}>
                {s.seasonName} ({s.cropType})
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}

export default PlotSeasonSwitcher;
