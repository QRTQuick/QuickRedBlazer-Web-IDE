import React from 'react'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import Preview from './components/Preview'
import FilesPanel from './components/FilesPanel'
import SettingsPanel from './components/SettingsPanel'

export default function App(){
  const [code, setCode] = React.useState('<!doctype html>\n<html><body><h1>Hello from QuickRedBlazer Mobile</h1></body></html>')
  const [previewHtml, setPreviewHtml] = React.useState(code)
  const [activePanel, setActivePanel] = React.useState(null) // 'files' | 'settings' | null

  // Files persisted in localStorage under 'mobile-files'
  const [files, setFiles] = React.useState(()=>{
    try{
      const raw = localStorage.getItem('mobile-files')
      if(raw) return JSON.parse(raw)
    }catch(e){/* ignore */}
    return [
      {name:'index.html', content: code, type:'html'},
      {name:'styles.css', content: 'body{font-family:Inter, system-ui;}', type:'css'},
      {name:'script.js', content: "console.log('hello')", type:'js'}
    ]
  })
  const [currentFile, setCurrentFile] = React.useState(files[0].name)

  React.useEffect(()=>{
    try{ localStorage.setItem('mobile-files', JSON.stringify(files)) }catch(e){}
  },[files])

  // settings persisted in localStorage
  const [settings, setSettings] = React.useState(()=>{
    try{
      const raw = localStorage.getItem('mobile-settings')
      if(raw) return JSON.parse(raw)
    }catch(e){}
    return {theme:'dark', autoRun:false, fontSize:14}
  })

  React.useEffect(()=>{
    try{ localStorage.setItem('mobile-settings', JSON.stringify(settings)) }catch(e){}
    if(typeof document !== 'undefined'){
      document.documentElement.classList.toggle('theme-light', settings.theme==='light')
      document.documentElement.classList.toggle('theme-dark', settings.theme==='dark')
    }
  },[settings])

  const dirty = code !== previewHtml

  function handleRun(){
    setPreviewHtml(code)
  }

  function handleOpen(){
    try{
      const blob = new Blob([previewHtml], {type: 'text/html'})
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // revoke after a short delay so target can load
      setTimeout(()=>URL.revokeObjectURL(url), 5000)
    }catch(e){
      console.error('Open failed', e)
      alert('Unable to open preview in new tab')
    }
  }

  function handleExport(){
    try{
      const blob = new Blob([previewHtml], {type: 'text/html'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'preview.html'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(url), 2000)
    }catch(e){
      console.error('Export failed', e)
      alert('Unable to export preview')
    }
  }

  function openPanel(name){
    setActivePanel(prev=> prev===name? null : name)
  }

  // File operations
  function createFile(name, type){
    if(!name) return false
    if(files.find(f=>f.name===name)) return false
    const f = {name, content: type==='html'? '<!doctype html>\n<html>\n  <body>\n  </body>\n</html>': '', type}
    setFiles(prev=>[f,...prev])
    setCurrentFile(name)
    return true
  }

  function saveFile(name, content){
    setFiles(prev=> prev.map(f=> f.name===name? {...f, content}: f))
  }

  function deleteFile(name){
    setFiles(prev=> prev.filter(f=>f.name!==name))
    if(currentFile===name && files.length>1){
      const next = files.find(f=>f.name!==name)
      if(next) setCurrentFile(next.name)
    }
  }

  function openFile(name){
    const f = files.find(x=>x.name===name)
    if(f){
      setCurrentFile(f.name)
      setCode(f.content)
    }
  }

  return (
    <div className="app-root">
      <Topbar onRun={handleRun} onOpen={handleOpen} onExport={handleExport} dirty={dirty} />
      <div className="app-body">
        <Sidebar onOpenFiles={()=>openPanel('files')} onOpenSettings={()=>openPanel('settings')} activePanel={activePanel} />
        <Editor code={code} filename={currentFile} onChange={setCode} onSave={(text)=>saveFile(currentFile, text)} fontSize={settings.fontSize} />
        <Preview html={previewHtml} />
      </div>

      {activePanel==='files' && (
        <FilesPanel files={files} onCreate={createFile} onOpen={(name)=>{openFile(name); setActivePanel(null)}} onDelete={deleteFile} onClose={()=>setActivePanel(null)} currentFile={currentFile} />
      )}

      {activePanel==='settings' && (
        <SettingsPanel settings={settings} onChange={s=>setSettings(s)} onClose={()=>setActivePanel(null)} />
      )}
    </div>
  )
}
