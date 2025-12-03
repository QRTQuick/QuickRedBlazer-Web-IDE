import React from 'react'

export default function Editor({code, onChange, filename, onSave, fontSize=14}){
  return (
    <div className="editor">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{fontSize:14}}><strong>{filename||'untitled'}</strong></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>onSave && onSave(code)}>Save</button>
        </div>
      </div>
      <textarea value={code} onChange={e=>onChange(e.target.value)} style={{fontSize:`${fontSize}px`}} />
    </div>
  )
}
