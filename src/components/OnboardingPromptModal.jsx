// src/components/OnboardingPromptModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { saveUserWhatsApp } from '../services/basketballCommunityService';
import { LuCamera, LuUpload, LuCheck, LuArrowRight, LuX } from 'react-icons/lu';
import { IoLogoWhatsapp, IoBasketball } from 'react-icons/io5';
import './OnboardingPromptModal.css';

export default function OnboardingPromptModal({ isOpen, onClose }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1); // 1 = Photo, 2 = Phone
  const [photoPreview, setPhotoPreview] = useState(profile?.avatar_url || '');
  const [phone, setPhone] = useState(profile?.whatsapp || '');
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Compress photo to lightweight Base64 (<45KB)
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 260;
        const MAX_HEIGHT = 260;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setPhotoPreview(compressedDataUrl);
        setCompressing(false);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoAndNext = async () => {
    if (photoPreview && user?.id) {
      setSaving(true);
      try {
        await supabase
          .from('profiles')
          .update({ avatar_url: photoPreview, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Error saving photo:', err);
      } finally {
        setSaving(false);
      }
    }
    setStep(2);
  };

  const handleSkipPhoto = () => {
    setStep(2);
  };

  const handleSavePhoneAndFinish = async () => {
    setSaving(true);
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    if (cleanNumber && user?.id) {
      try {
        await saveUserWhatsApp(user.id, cleanNumber);
        await supabase
          .from('profiles')
          .update({ phone_number: cleanNumber, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        await supabase.auth.updateUser({
          data: { phone_number: cleanNumber, whatsapp: cleanNumber }
        });
      } catch (err) {
        console.warn('Error saving phone number:', err);
      }
    }

    try {
      if (user?.id) {
        localStorage.setItem(`hooplogs_onboarded_${user.id}`, 'true');
      }
      localStorage.removeItem('hooplogs_needs_onboarding_prompt');
    } catch (e) {}

    setSaving(false);
    onClose();
  };

  const handleSkipPhoneAndFinish = () => {
    try {
      if (user?.id) {
        localStorage.setItem(`hooplogs_onboarded_${user.id}`, 'true');
      }
      localStorage.removeItem('hooplogs_needs_onboarding_prompt');
    } catch (e) {}
    onClose();
  };

  return (
    <div className="onboard-modal-backdrop" role="dialog" aria-modal="true">
      <div className="onboard-modal-card">
        {/* Step indicator */}
        <div className="onboard-steps-pills">
          <span className={`onboard-step-pill ${step >= 1 ? 'active' : ''}`}>1. Photo</span>
          <span className="onboard-step-line" />
          <span className={`onboard-step-pill ${step >= 2 ? 'active' : ''}`}>2. Connect</span>
        </div>

        {/* STEP 1: ADD PROFILE PHOTO */}
        {step === 1 && (
          <div className="onboard-step-content">
            <div className="onboard-icon-bubble">
              <LuCamera size={26} color="var(--brand-primary, #ff5500)" />
            </div>
            <h2 className="onboard-title">ADD YOUR PROFILE PHOTO</h2>
            <p className="onboard-sub">
              Make your athlete identity recognizable on court leaderboards and team rosters.
            </p>

            <div className="onboard-avatar-preview-wrap">
              <div className="onboard-avatar-circle">
                {photoPreview ? (
                  <img src={photoPreview} alt="Avatar preview" className="onboard-avatar-img" />
                ) : (
                  <IoBasketball size={54} color="var(--brand-primary, #ff5500)" />
                )}
              </div>

              <label className="btn-select-photo">
                <LuUpload size={14} />
                <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                  disabled={compressing}
                />
              </label>
              {compressing && <span className="photo-optimizing-tag">Optimizing image…</span>}
            </div>

            <div className="onboard-actions-row">
              <button
                type="button"
                className="btn-onboard-primary"
                onClick={handleSavePhotoAndNext}
                disabled={compressing || saving}
              >
                {saving ? 'SAVING…' : photoPreview ? 'SAVE & NEXT' : 'NEXT'} <LuArrowRight size={14} />
              </button>
              <button
                type="button"
                className="btn-onboard-skip"
                onClick={handleSkipPhoto}
                disabled={saving}
              >
                Skip For Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADD PHONE NUMBER (OPTIONAL) */}
        {step === 2 && (
          <div className="onboard-step-content">
            <div className="onboard-icon-bubble green">
              <IoLogoWhatsapp size={26} color="#22c55e" />
            </div>
            <h2 className="onboard-title">ADD YOUR PHONE NUMBER</h2>
            <p className="onboard-sub">
              <strong>Optional:</strong> Add your number so teammates and league coaches can reach out to you directly on WhatsApp.
            </p>

            <div className="onboard-input-wrap">
              <label className="onboard-input-label">WhatsApp Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. +1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="onboard-phone-input"
              />
              <span className="onboard-input-hint">
                🔒 You can update or remove this anytime from your profile settings.
              </span>
            </div>

            <div className="onboard-actions-row">
              <button
                type="button"
                className="btn-onboard-primary"
                onClick={handleSavePhoneAndFinish}
                disabled={saving}
              >
                {saving ? 'SAVING…' : phone.trim() ? 'SAVE & ENTER ARENA' : 'ENTER ARENA'} <LuCheck size={14} />
              </button>
              <button
                type="button"
                className="btn-onboard-skip"
                onClick={handleSkipPhoneAndFinish}
                disabled={saving}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
