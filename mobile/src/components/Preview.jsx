import React, {useEffect, useRef} from 'react'

export default function Preview({html}){
  const iframeRef = useRef(null)

  useEffect(()=>{
    const iframe = iframeRef.current
    if(!iframe) return
    try{
      iframe.srcdoc = html
    }catch(e){
      const blob = new Blob([html], {type: 'text/html'})
      const url = URL.createObjectURL(blob)
      iframe.src = url
      setTimeout(()=>URL.revokeObjectURL(url), 2000)
    }
  },[html])

  return (
    <div className="preview">
      <iframe ref={iframeRef} title="preview" sandbox="allow-scripts allow-forms" />
    </div>
  )
}
