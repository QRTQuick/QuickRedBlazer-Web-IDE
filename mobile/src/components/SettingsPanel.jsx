import React from 'react'

export default function SettingsPanel({settings, onChange, onClose}){
  const {theme, autoRun, fontSize} = settings

  return (
    <div className="panel-overlay">
      <div className="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>Settings</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div style={{marginTop:12,display:'grid',gap:12}}>
          <div>
            <label style={{display:'block',fontWeight:600}}>Theme</label>
            <label style={{marginRight:8}}><input type="radio" name="theme" checked={theme==='dark'} onChange={()=>onChange({...settings, theme:'dark'})} /> Dark</label>
            <label><input type="radio" name="theme" checked={theme==='light'} onChange={()=>onChange({...settings, theme:'light'})} /> Light</label>
          </div>

          <div>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={autoRun} onChange={e=>onChange({...settings, autoRun: e.target.checked})} />
              <span>Auto-run preview on edit</span>
            </label>
          </div>

          <div>
            <label style={{display:'block',fontWeight:600}}>Editor font size: <small>{fontSize}px</small></label>
            <input type="range" min="12" max="20" value={fontSize} onChange={e=>onChange({...settings, fontSize: Number(e.target.value)})} />
          </div>

          <div style={{color:'var(--muted)',fontSize:13}}>
            <p style={{margin:0}}>These settings are saved locally in your browser.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
