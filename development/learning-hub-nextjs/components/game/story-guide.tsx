'use client'
import type { Design } from '@/lib/game/design'
export type DesignTab = 'shape' | 'gravity' | 'lateral' | 'foundation' | 'comfort'
const labels: Record<DesignTab,string> = {shape:'Shape',gravity:'Gravity',lateral:'Lateral',foundation:'Foundation',comfort:'Comfort'}
export const tabs: DesignTab[] = ['shape','gravity','lateral','foundation','comfort']
export function StoryGuide({tab, phase, design, onTab, onTest, scenario, randomScenario, recent}: {tab:DesignTab; phase:number; design:Design; onTab:(tab:DesignTab)=>void; onTest:()=>void; scenario:string; randomScenario:()=>void; recent:string}) {
 const prompts:Record<DesignTab,string> = {
  shape:`Our neighbors in fictional Breezy Bay need a learning hub! Choose the building’s size and ${design.story}-ft story height.`,
  gravity:`Gravity pulls the building down. Choose a frame material, column spacing and member size. Strength is not evaluated yet.`,
  lateral:`Wind pushes sideways. Pick a lateral system${design.lateral==='braced'?', brace size and locations':''}. Its suitability and height limits are not evaluated.`,
  foundation:`What sits underneath? Pick a foundation type and soil. These are illustrations, not a soil or settlement analysis.`,
  comfort:`Help our neighbors feel comfortable! Choose insulation, heating and cooling, then explore how the shell changes heat loss.`
 }
 const index=tabs.indexOf(tab)
 const text=phase===2?`A ${scenario} is on its way! Choose a test or let me surprise you, then watch what happens.`:phase===3?'Let’s look at the outcome together. Revise your design and try another scenario!':recent||prompts[tab]
 return <div className="story-guide"><div className="guide-avatar" aria-hidden="true"><span className="guide-hair"/><span className="guide-face"><i/><i/><b/></span><span className="guide-shirt"/></div><div className="guide-copy"><span className="guide-label">MEET NOVA · YOUR BUILDING BUDDY</span><p aria-live="polite">{text}</p><small>{phase===1?`STORY STEP ${index+1} OF ${tabs.length} · ${labels[tab].toUpperCase()}`:'YOUR STORY CONTINUES'}</small></div><div className="guide-actions">{phase===1?<><button onClick={()=>onTab(tabs[Math.max(0,index-1)])} disabled={index===0}>Back</button><button className="guide-next" onClick={()=>index<tabs.length-1?onTab(tabs[index+1]):onTest()}>{index<tabs.length-1?'Next step':'Try a test'} →</button></>:phase===2?<button className="guide-next" onClick={randomScenario}>Surprise me! ✦</button>:<button className="guide-next" onClick={()=>onTab('shape')}>Revise design →</button>}</div></div>
}
export const tabLabels = labels
