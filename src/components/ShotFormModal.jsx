// src/components/ShotFormModal.jsx
import React, { useState } from 'react';
import './ShotFormModal.css';

const ShotFormModal = ({ zone, onClose, onSave }) => {
  const [attempts, setAttempts] = useState('');
  const [made, setMade] = useState('');

  const isAttemptsSelected = attempts !== '' && !isNaN(attempts);

  const handleSave = () => {
    if (!isAttemptsSelected || made === '' || isNaN(made)) {
      alert('Please enter valid attempts and shots made.');
      return;
    }

    if (Number(made) > Number(attempts)) {
      alert('Shots made cannot exceed attempts.');
      return;
    }

    onSave({
      zoneId: zone.id,
      zoneLabel: zone.label,
      attempts: Number(attempts),
      made: Number(made),
      timestamp: Date.now()
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Log Shots from <span>{zone.label}</span></h3>

        {/* Attempts Dropdown */}
        <label htmlFor="attempts">Attempts</label>
        <select
          id="attempts"
          value={attempts}
          onChange={(e) => setAttempts(e.target.value)}
        >
          <option value="">Select Attempts</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="custom">Custom</option>
        </select>

        {/* Custom attempts input */}
        {attempts === "custom" && (
          <div style={{ marginTop: '0.5rem' }}>
            <label htmlFor="customAttempts">Enter custom attempts</label>
            <input
              type="number"
              id="customAttempts"
              min={1}
              value={typeof attempts === 'number' ? attempts : ''}
              onChange={(e) => setAttempts(Number(e.target.value))}
              className="border rounded p-2 w-full mt-1"
            />
          </div>
        )}

        {/* Shots Made (only shown after attempts is selected) */}
        {isAttemptsSelected && (
          <>
            <label>Shots Made</label>
            <input
              type="number"
              value={made}
              onChange={(e) => setMade(e.target.value)}
              placeholder={`Out of ${attempts}`}
              max={attempts}
              min={0}
            />
          </>
        )}

        {/* Modal buttons */}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={!isAttemptsSelected}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShotFormModal;
