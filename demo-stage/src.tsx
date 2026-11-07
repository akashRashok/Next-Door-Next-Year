import React from 'react';
import { createRoot } from 'react-dom/client';
import { Stage, Window, type Act } from './kit';
import './style.css';

type Scene = { phase: number };
const initial: Scene = { phase: 0 };
const poster: Scene = { phase: 5 };

async function story(a: Act<Scene>) {
  a.mark('listing');
  await a.wait(2300);
  await a.move('read');
  await a.click();
  await a.set({phase: 1});
  a.mark('checking');
  await a.wait(1700);
  await a.set({phase: 2});
  a.mark('unit');
  await a.wait(2300);
  await a.set({phase: 3});
  a.mark('site');
  await a.wait(2600);
  await a.set({phase: 4});
  a.mark('stages');
  await a.wait(2600);
  await a.set({phase: 5});
  a.mark('question');
  await a.move('official');
  await a.wait(3800);
}

const captions = [
  <>A bright Waterloo listing. What is planned nearby?</>,
  <>One click reads the address and checks live records.</>,
  <>The exact unit is verified before showing a bedroom fact.</>,
  <>903–921 Bourke Street is 158 metres northwest.</>,
  <>Existing consent and a new proposal have different stages.</>,
  <>Open the official record. Ask about shadows at inspection.</>,
];

function Demo() {
  return <Stage width={1280} height={720} initial={initial} poster={poster} script={story} play="once" cursor={{at:{x:1175,y:620},style:'large'}} className="nd-stage" accent="#d9edb0" fidelity="realistic">
    {({phase}) => <>
      <Window className="nd-browser" url="realestate.com.au/property-apartment-nsw-waterloo-151767176" urlShape="pill" tabs={[<>102/2 Sam Sing Street, Waterloo</>]} nav lights="color">
        <div className="nd-content">
          <div className="nd-listing">
            <div className="nd-sitehead"><span className="nd-house">⌂</span><strong>realestate.com.au</strong><span className="nd-siteaux">Sign in&nbsp;&nbsp;&nbsp; Join</span></div>
            <div className="nd-crumb">Buy &nbsp;›&nbsp; NSW &nbsp;›&nbsp; Waterloo &nbsp;›&nbsp; Apartment</div>
            <div className="nd-property">
              <div className="nd-property-info">
                <div className="nd-address">102/2 Sam Sing Street,<br/>Waterloo, NSW 2017</div>
                <div className="nd-spec">1 bed&nbsp; · &nbsp;1 bath&nbsp; · &nbsp;Apartment</div>
                <div className="nd-price">$630,000 – $650,000</div>
                <div className="nd-listing-quote">“Desirable east-facing aspect with abundant natural light”</div>
              </div>
              <div className="nd-photo" role="img" aria-label="Waterloo apartment living room" />
            </div>
          </div>
          <div className="nd-panel">
            <div className="nd-panel-top">NEXT DOOR <span>/</span> NEXT YEAR <small>SYDNEY</small></div>
            <div className="nd-panel-body">
              {phase <= 1 && <div className="nd-intro"><div className="nd-eyebrow">BEFORE YOU INSPECT</div><div className="nd-intro-title">See what’s<br/><em>proposed nearby.</em></div><p>See the planning records around a home, then ask a better question at inspection.</p></div>}
              {phase <= 1 && <>
                <div className="nd-check"><span className="nd-step">01</span><strong>Check an address</strong></div>
                <div className="nd-field">{phase === 0 ? 'Apartment or building address' : '102/2 Sam Sing Street, Waterloo, NSW 2017'}</div>
                <div className="nd-button">Check nearby plans <span>↗</span></div>
                <div className="nd-read" data-target="read" data-cursor="hand">Use listing address</div>
                {phase === 1 && <div className="nd-loading">Checking this address and nearby records…</div>}
              </>}
              {phase >= 2 && <div className="nd-results">
                <div className="nd-section-head"><span className="nd-step">02</span><strong>Address match</strong></div>
                <div className="nd-unit">UNIT 102/2 Sam Sing Street, Waterloo (NSW)</div>
                <div className="nd-verified"><span className="nd-dot"/> Verified unit</div>
                <div className="nd-bedroom"><b>1</b> bedroom</div>
                {phase >= 3 && <>
                  <div className="nd-section-head nd-plans-head"><span className="nd-step">03</span><strong>Nearby planning</strong><small>3 sites</small></div>
                  <div className="nd-distance-note">Within 300 m · straight-line distance</div>
                  <div className="nd-project">
                    <div className="nd-tag">MANUALLY VERIFIED</div>
                    <div className="nd-project-title">903–921 Bourke Street redevelopment</div>
                    <div className="nd-distance"><b>158</b> m NW</div>
                    {phase >= 4 && <>
                      <div className="nd-record"><strong>Existing consent · D/2021/1415</strong><span>Six mixed-use buildings · 376 apartments</span></div>
                      <div className="nd-record proposal"><strong>Assessment · SSD-95997711</strong><span>Proposal seeks about 250 more apartments</span></div>
                    </>}
                    {phase >= 5 && <div className="nd-question"><b>ASK AT INSPECTION</b><span>Do the official documents assess shadows at this building?</span><div data-target="official" data-cursor="hand">Open NSW Planning Portal ↗</div></div>}
                  </div>
                </>}
              </div>}
            </div>
          </div>
        </div>
      </Window>
      <div className="nd-caption"><span className="nd-caption-rule"/><div className="nd-caption-text" key={phase}>{captions[phase]}</div><div className="nd-caption-index">{String(phase+1).padStart(2,'0')} / 06</div></div>
    </>}
  </Stage>;
}

createRoot(document.getElementById('root')!).render(<Demo/>);
