import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Stage, Window, Badge, Icon } from '../../kit'
import './pitch.css'

declare global { interface Window { setPitchTime: (time: number) => void } }

const starts = [0, 9.5, 16.5, 24.5, 34.5, 44.32]
const beats = [
  { eyebrow: 'THE PLANNING GAP', title: <>Approved for <em>376.</em><br/>Asking for <em>about 250</em> more.</>, body: 'One Waterloo site. Two very different planning stages.' },
  { eyebrow: 'THE BUYER', title: <>Bright today.<br/><em>What about next year?</em></>, body: 'The listing shows the apartment today. Nearby plans shape the questions for inspection.' },
  { eyebrow: 'THE PRODUCT', title: <>One address.<br/><em>One clear comparison.</em></>, body: 'The side panel resolves the exact unit and puts the nearby site beside the listing.' },
  { eyebrow: 'THE EVIDENCE', title: <>Ask the<br/><em>useful question.</em></>, body: 'Open the official project record to check what the shadow evidence actually says.' },
  { eyebrow: 'THE TRUST RULE', title: <>Status and source<br/><em>stay visible.</em></>, body: 'Consent and proposal keep their own reference, stage and official link.' },
]
const clamp = (v:number) => Math.max(0,Math.min(1,v))
const smooth = (v:number) => { const x=clamp(v); return x*x*(3-2*x) }
const show = (t:number, start:number, end:number) => (start===0 ? 1 : smooth((t-(start-0.25))/0.55)) * (1-smooth((t-(end-0.25))/0.55))
const entrance = (t:number, start:number) => start===0 ? 1 : smooth((t-(start-0.25))/0.7)

function Listing() {
 return <Window url="realestate.com.au/property-apartment-nsw-waterloo" nav className="listing-window" lights="grey">
   <div className="listing-sitebar"><span className="listing-logo">realestate.com.au</span><span>Buy</span><span>Rent</span><span>Sold</span><span className="listing-search">Search properties</span></div>
   <img className="listing-photo" src="/listing.webp" alt="Sunlit Waterloo apartment living room" />
   <div className="listing-detail"><span className="listing-kind">Apartment · Waterloo NSW 2017</span><div className="listing-address">102/2 Sam Sing Street</div><div className="listing-meta">1 bed <span>·</span> 1 bath <span>·</span> East facing living</div></div>
 </Window>
}

function Panel({t}:{t:number}) {
 const panelIn = smooth((t-16.6)/0.85)
 const questionIn = smooth((t-25.2)/0.7)
 const recordsIn = smooth((t-35.1)/0.7)
 const scroll = smooth((t-25.0)/0.8)*110 + smooth((t-35.0)/0.8)*43
 return <div className="product-panel" style={{transform:`translateX(${(1-panelIn)*390}px)`, opacity:panelIn}}>
   <div className="panel-brand">NEXT DOOR <b>/</b> NEXT YEAR <span>SYDNEY</span></div>
   <div className="panel-hero"><small>BEFORE YOU INSPECT</small><div>See what’s<br/><em>proposed nearby.</em></div><p>Planning records around a home, in context.</p></div>
   <div className="panel-scroll"><div className="panel-body" style={{transform:`translateY(-${scroll}px)`}}>
     <div className="panel-kicker"><span className="step">01</span> ADDRESS CHECK</div>
     <div className="address-field">102/2 Sam Sing Street, Waterloo <Icon name="check" size={16}/></div>
     <div className="match-row"><span className="match-dot"/>Exact unit match <span className="match-sub">1 bedroom</span></div>
     <div className="panel-kicker panel-kicker-plan"><span className="step">02</span> NEARBY PLANNING</div>
     <div className="site-card"><div className="site-top"><Badge>MANUALLY VERIFIED</Badge><strong>NORTHWEST</strong></div><div className="site-title">903–921 Bourke Street</div><div className="site-sub">Waterloo · nearby development site</div>
       <div className="record-row"><span className="record-line"/><div><strong>Existing consent</strong><small>City of Sydney · D/2021/1415</small></div><span className="record-tag approved">CONSENT</span></div>
       <div className="record-row"><span className="record-line second"/><div><strong>State proposal</strong><small>NSW Planning · SSD-95997711</small></div><span className="record-tag assessment">ASSESSMENT</span></div>
     </div>
     <div className="question-card" style={{opacity:questionIn, transform:`translateY(${(1-questionIn)*18}px)`}}><small>ASK AT INSPECTION</small><div>Do the official planning documents assess shadows at this building?</div><div className="record-link">Open the project record <span>↗</span></div></div>
     <div className="source-note" style={{opacity:recordsIn}}>Verified records have separate stages and official links. Unverified candidates stay labelled.</div>
   </div></div>
 </div>
}

function Pitch() {
 const [t,setT] = useState(0)
 useEffect(()=>{ window.setPitchTime=(time:number)=>setT(time); const q=new URLSearchParams(location.search).get('t'); if(q) setT(Number(q)) },[])
 const active = starts.findIndex((v,i)=>i<5 && t>=v && t<starts[i+1]); const beat=Math.max(0,active)
 const panelIn = smooth((t-16.6)/0.85)
 const compareIn = smooth((t-1.2)/0.8) * (1-smooth((t-9.2)/0.45))
 const addressIn = smooth((t-10.3)/0.8) * (1-smooth((t-16.4)/0.5))
 return <div className="video-frame">
   <Stage width={1280} height={720} initial={{}} className="pitch-stage" theme="light" accent="#2e765a" fidelity="realistic">
    {()=> <>
      <div className="scene-ground"/>
      <div className="topline"><span>ND / NY</span><span>WATERLOO, SYDNEY</span><span>01 — 05</span></div>
      <div className="hero-copy">{beats.map((b,i)=><div key={i} className="copy-beat" style={{opacity:show(t,starts[i],starts[i+1]), transform:`translateY(${(1-entrance(t,starts[i]))*20}px)`}}><div className="eyebrow">{b.eyebrow}</div><div className="headline">{b.title}</div><div className="deck">{b.body}</div></div>)}</div>
      <div className="product-shot">
        <Listing/>
        <div className="compare-card" style={{opacity:compareIn, transform:`translateY(${(1-compareIn)*20}px)`}}><div className="compare-eyebrow">SAME SITE · DIFFERENT STAGE</div><div className="compare-grid"><div><strong>376</strong><span>apartments in<br/>existing consent</span></div><div className="plus">+</div><div><strong>~250</strong><span>more sought in<br/>state proposal</span></div></div><div className="compare-bottom"><span>CONSENT</span><span>ASSESSMENT</span></div></div>
        <div className="address-callout" style={{opacity:addressIn,transform:`translateY(${(1-addressIn)*18}px)`}}><span className="callout-dot"/><div><small>THE LISTING</small><strong>102/2 Sam Sing Street</strong><span>Natural light today. Check the plans nearby.</span></div></div>
        <Panel t={t}/>
      </div>
      <div className="bottomline"><span>Next Door / Next Year</span><span>Source backed planning evidence for apartment buyers</span><span>{String(beat+1).padStart(2,'0')} / 05</span></div>
    </>}
   </Stage>
 </div>
}
createRoot(document.getElementById('root')!).render(<Pitch/>)
