import React from 'react'

export default function Sidebar({onOpenFiles,onOpenSettings,activePanel}){
  return (
    <aside className="sidebar">
      <div className="logo">QRB</div>
      <nav>
        <button className={`side-btn ${activePanel==='files'?'active':''}`} onClick={onOpenFiles} aria-pressed={activePanel==='files'}>Files</button>
        <button className={`side-btn ${activePanel==='settings'?'active':''}`} onClick={onOpenSettings} aria-pressed={activePanel==='settings'}>Settings</button>
      </nav>
    </aside>
  )
}
