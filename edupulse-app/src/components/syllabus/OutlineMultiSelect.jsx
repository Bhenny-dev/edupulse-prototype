import {useLayoutEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {ChevronDown,X} from 'lucide-react'

export default function OutlineMultiSelect({categories,selected=[],onChange,placeholder='Select items...',fieldPath,fieldLabel}) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[position,setPosition]=useState(null)
  const trigger=useRef(null),panel=useRef(null),search=useRef(null),id=useId()
  const label=fieldLabel||placeholder
  const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus({preventScroll:true})}
  useLayoutEffect(()=>{
    if(!open)return
    const place=()=>{
      const rect=trigger.current?.getBoundingClientRect();if(!rect)return
      const viewport=window.visualViewport,height=viewport?.height||innerHeight,width=viewport?.width||innerWidth,offset=viewport?.offsetTop||0
      const roomBelow=height+offset-rect.bottom-12,roomAbove=rect.top-offset-12,below=roomBelow>=Math.min(360,roomAbove)
      const maxHeight=Math.min(440,height-24,Math.max(240,below?roomBelow:roomAbove)),panelWidth=Math.min(360,width-24)
      setPosition({left:Math.max(12,Math.min(rect.left,width-panelWidth-12)),top:Math.max(offset+12,Math.min(below?rect.bottom+8:rect.top-maxHeight-8,offset+height-maxHeight-12)),width:panelWidth,height:maxHeight})
    }
    const outside=event=>{if(!panel.current?.contains(event.target)&&!trigger.current?.contains(event.target))setOpen(false)}
    const scroll=event=>{if(!panel.current?.contains(event.target))place()}
    place()
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',scroll,true);window.visualViewport?.addEventListener('resize',place)
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',scroll,true);window.visualViewport?.removeEventListener('resize',place)}
  },[open])
  const toggle=item=>onChange(selected.includes(item)?selected.filter(value=>value!==item):[...selected,item])
  const groups=categories.map(group=>({...group,items:group.items.filter(item=>`${group.layer} ${item}`.toLowerCase().includes(query.trim().toLowerCase()))})).filter(group=>group.items.length)
  const escape=event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true)}}
  return <div onKeyDownCapture={escape}>
    <button ref={trigger} type="button" className="outline-multi-select" data-pulse-field={fieldPath} aria-label={label} aria-haspopup="dialog" aria-controls={open?id:undefined} aria-expanded={open} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setQuery('');setOpen(true)}}} onClick={()=>{setQuery('');setPosition(null);setOpen(value=>!value)}}><span>{selected.length?`${selected.length} selected`:placeholder}</span><ChevronDown size={16} aria-hidden="true"/></button>
    <div className="outline-selected-items">{selected.map(item=><span className="outline-selected-item" key={item}><span>{item}</span><button type="button" aria-label={`Remove ${item} from ${label}`} onClick={()=>onChange(selected.filter(value=>value!==item))}><X size={14} aria-hidden="true"/></button></span>)}</div>
    {open&&position&&createPortal(<section ref={panel} id={id} role="dialog" aria-label={label} data-pulse-ui="outline-selector" className="outline-options" style={position||{visibility:'hidden'}} onKeyDownCapture={escape} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==trigger.current)close()}}>
      <header><strong>{label}</strong><button type="button" className="btn btn-ghost btn-sm" onClick={()=>close(true)}>Done</button></header>
      <input autoFocus ref={search} className="form-input" type="search" aria-label={`Search ${label}`} placeholder="Search options..." value={query} onChange={event=>setQuery(event.target.value)}/>
      <div className="outline-options-list">{groups.length?groups.map(group=><fieldset key={group.layer}><legend>{group.layer}</legend>{group.items.map(item=><label key={item}><input type="checkbox" checked={selected.includes(item)} onChange={()=>toggle(item)}/><span>{item}</span></label>)}</fieldset>):<p className="text-sm text-muted" role="status">No matching options.</p>}</div>
      <footer><span>{selected.length} selected</span><button type="button" className="btn btn-ghost btn-sm" disabled={!selected.length} onClick={()=>onChange([])}>Clear selections</button></footer>
    </section>,document.body)}
  </div>
}
