import React from 'react'

export default function Topbar({onRun,onOpen,onExport,dirty}){
  return (
    <header className="topbar">
      <div className="brand">QuickRedBlazer</div>
      <div className="actions">
        <button className={`btn ${dirty? 'dirty':''}`} onClick={onRun} title="Run (apply code to preview)">▶ Run</button>
        <button className="btn" onClick={onOpen} title="Open preview in new tab">⤴ Open</button>
        <button className="btn" onClick={onExport} title="Download preview HTML">⬇ Export</button>
      </div>
    </header>
  )
}
