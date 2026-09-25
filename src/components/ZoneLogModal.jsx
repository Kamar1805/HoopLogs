// src/components/ZoneLogModal.jsx
import React, { useState } from 'react';
import {
  LuX,
  LuPlus,
  LuMinus,
  LuTrendingUp,
  LuTrendingDown,
  LuFlame,
  LuCheck,
  LuRotateCcw
} from 'react-icons/lu';
import { IoBasketball } from 'react-icons/io5';
import './ZoneLogModal.css';

const PRESETS = [
  { label: '5 Shots', makes: 3, misses: 2 },
  { label: '10 Shots', makes: 7, misses: 3 },
  { label: '20 Shots', makes: 14, misses: 6 },
  { label: 'Perfect 5', makes: 5, misses: 0 },
  { label: 'Perfect 10', makes: 10, misses: 0 },
];

const ZoneLogModal = ({
  zone,
  currentStats = { attempted: 0, made: 0 },
  pastBenchmark = null, // { accuracy: 50, attempted: 100, made: 50 }
  onSaveSet,
  onResetZone,
  onClose,
}) => {
  const [makes, setMakes] = useState(7);
  const [misses, setMisses] = useState(3);

  if (!zone) return null;

  const totalShots = Math.max(0, Number(makes) || 0) + Math.max(0, Number(misses) || 0);
  const currentSetPct = totalShots > 0 ? Math.round((makes / totalShots) * 100) : 0;

  // Comparison with historical benchmark for this zone
  const benchmarkPct = pastBenchmark?.attempted > 0 ? pastBenchmark.accuracy : null;
  const diffPct = benchmarkPct !== null ? currentSetPct - benchmarkPct : null;

  const handleApplyPreset = (preset) => {
    setMakes(preset.makes);
    setMisses(preset.misses);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (totalShots === 0) return;
    onSaveSet(Number(makes), Number(misses), totalShots);
    onClose();
  };

  return (
    <div className="zone-modal-backdrop" onClick={onClose}>
      <div className="zone-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="zone-modal-header">
          <div className="zone-title-group">
            <span className="zone-color-dot" style={{ background: zone.color }} />
            <div>
              <div className="zone-modal-badge">{zone.points} POINT ZONE</div>
              <h2 className="zone-modal-title">{zone.label}</h2>
            </div>
          </div>
          <button type="button" className="zone-modal-close" onClick={onClose}>
            <LuX size={16} />
          </button>
        </div>

        {/* Trend & Historical Comparison */}
        <div className="zone-trend-strip">
          <div className="trend-stat-cell">
            <span className="trend-cell-sub">Historical Avg</span>
            <span className="trend-cell-val">
              {benchmarkPct !== null ? `${benchmarkPct}%` : 'New Zone'}
            </span>
          </div>

          <div className="trend-stat-cell">
            <span className="trend-cell-sub">This Set</span>
            <span className="trend-cell-val highlight" style={{ color: zone.color }}>
              {totalShots > 0 ? `${currentSetPct}%` : '—'}
            </span>
          </div>

          <div className="trend-stat-cell">
            <span className="trend-cell-sub">Shot Trend</span>
            <div className="trend-badge-wrap">
              {diffPct !== null && totalShots > 0 ? (
                diffPct > 0 ? (
                  <span className="trend-badge positive">
                    <LuTrendingUp size={12} /> +{diffPct}% Up
                  </span>
                ) : diffPct < 0 ? (
                  <span className="trend-badge negative">
                    <LuTrendingDown size={12} /> {diffPct}% Down
                  </span>
                ) : (
                  <span className="trend-badge steady">Steady</span>
                )
              ) : (
                <span className="trend-badge neutral">Baseline</span>
              )}
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="zone-input-form">
          <div className="inputs-dual-grid">
            {/* MAKES INPUT */}
            <div className="rep-input-card make">
              <span className="rep-card-label">MAKES (BUCKETS)</span>
              <div className="rep-stepper-row">
                <button
                  type="button"
                  className="rep-stepper-btn"
                  onClick={() => setMakes((m) => Math.max(0, m - 1))}
                >
                  <LuMinus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={makes}
                  onChange={(e) => setMakes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="rep-number-input"
                />
                <button
                  type="button"
                  className="rep-stepper-btn"
                  onClick={() => setMakes((m) => m + 1)}
                >
                  <LuPlus size={14} />
                </button>
              </div>
            </div>

            {/* MISSES INPUT */}
            <div className="rep-input-card miss">
              <span className="rep-card-label">MISSES (OFF TARGET)</span>
              <div className="rep-stepper-row">
                <button
                  type="button"
                  className="rep-stepper-btn"
                  onClick={() => setMisses((m) => Math.max(0, m - 1))}
                >
                  <LuMinus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={misses}
                  onChange={(e) => setMisses(Math.max(0, parseInt(e.target.value) || 0))}
                  className="rep-number-input"
                />
                <button
                  type="button"
                  className="rep-stepper-btn"
                  onClick={() => setMisses((m) => m + 1)}
                >
                  <LuPlus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Rep Presets */}
          <div className="zone-presets-bar">
            <span className="presets-label">QUICK SETS:</span>
            <div className="presets-chips">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => handleApplyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Set Summary */}
          <div className="zone-summary-banner">
            <div className="summary-left">
              <span className="summary-label">SET VOLUME:</span>
              <span className="summary-value">
                {makes} Makes • {misses} Misses ({totalShots} Total)
              </span>
            </div>
            <div className="summary-right">
              <span className="summary-pct" style={{ color: zone.color }}>
                {currentSetPct}%
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="zone-modal-actions">
            <button
              type="submit"
              className="zone-btn-save"
              disabled={totalShots === 0}
            >
              <IoBasketball size={16} />
              <span>RECORD {totalShots} SHOTS TO {zone.shortLabel.toUpperCase()}</span>
            </button>

            {currentStats.attempted > 0 && (
              <button
                type="button"
                className="zone-btn-reset"
                onClick={() => {
                  if (window.confirm(`Reset all logged reps for ${zone.shortLabel}?`)) {
                    onResetZone(zone.id);
                    onClose();
                  }
                }}
              >
                <LuRotateCcw size={13} />
                <span>Reset Zone ({currentStats.made}/{currentStats.attempted})</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZoneLogModal;
