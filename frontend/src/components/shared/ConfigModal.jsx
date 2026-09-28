import React, { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../../supabaseClient';
import { KeyRound, X, ExternalLink, Info, Check } from 'lucide-react';

export default function ConfigModal({ isOpen, onClose, onConfigSaved }) {
  if (!isOpen) return null;
  return <ConfigModalInner isOpen={isOpen} onClose={onClose} onConfigSaved={onConfigSaved} />;
}

function ConfigModalInner({ isOpen, onClose, onConfigSaved }) {

  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.supabaseUrl || '');
  const [anonKey, setAnonKey] = useState(currentConfig.supabaseAnonKey || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onConfigSaved();
      onClose();
    }, 800);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    onConfigSaved();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <KeyRound size={22} color="#818cf8" />
            <h3 className="modal-title">Supabase & Google Auth Setup</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Supabase Project URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supabase Anon Key (Public API Key)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              required
            />
          </div>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', 
            padding: '0.85rem', 
            fontSize: '0.78rem',
            color: '#94a3b8',
            marginBottom: '1.5rem',
            lineHeight: 1.5
          }}>
            <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.3rem' }}>
              <Info size={14} color="#6366f1" /> Quick Google OAuth Checklist:
            </strong>
            1. In Google Cloud Console: create OAuth 2.0 Web Client credentials.<br />
            2. Set Authorized Redirect URI in Google Console to: <code style={{ color: '#a5b4fc' }}>https://&lt;your-project&gt;.supabase.co/auth/v1/callback</code><br />
            3. In Supabase Dashboard → Authentication → Providers → Google: Enable it, paste Client ID and Secret.<br />
            4. Done! Our app automatically passes <code style={{ color: '#a5b4fc' }}>hd: bitsathy.ac.in</code> to restrict accounts.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              style={{ color: '#fb7185' }}
            >
              Reset Keys
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saved}>
                {saved ? <><Check size={16} /> Saved!</> : 'Save & Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
