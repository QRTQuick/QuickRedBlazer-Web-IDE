import React, {useState} from 'react'

export default function FilesPanel({files,onCreate,onOpen,onDelete,onClose,currentFile}){
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('html')

  function submitNew(e){
    e.preventDefault()
    if(!newName) return
    const ok = onCreate(newName, newType)
    if(ok){ setNewName('') }
    else alert('File exists or invalid name')
  }

  return (
    <div className="panel-overlay">
      <div className="panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>Files</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <form onSubmit={submitNew} style={{display:'flex',gap:8,marginTop:12}}>
          <input placeholder="filename.ext" value={newName} onChange={e=>setNewName(e.target.value)} />
          <select value={newType} onChange={e=>setNewType(e.target.value)}>
            <option value="html">.html</option>
            <option value="css">.css</option>
            <option value="js">.js</option>
          </select>
          <button type="submit">Create</button>
        </form>

        <div style={{marginTop:12}}>
          {files.length===0 && <div className="muted">No files yet</div>}
          <ul style={{listStyle:'none',padding:0,margin:0}}>
            {files.map(f=> (
              <li key={f.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
                <div>
                  <strong style={{marginRight:8}}>{f.name}</strong>
                  <span style={{color:'var(--muted)',marginLeft:6}}>{f.type}</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>onOpen(f.name)} className="btn">Open</button>
                  <button onClick={()=>onDelete(f.name)} className="btn">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
