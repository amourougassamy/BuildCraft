import { mission } from './assumptions'
import type { Design } from './design'
import { calculate } from './engineering'
export type Status = 'Meets this check' | 'Does not meet this check' | 'Needs information' | 'Not evaluated'
export type Review = { category: string; status: Status; title: string; detail: string; why: string; remedy: string; location: string }
export function review(d: Design): Review[] {
 const r = calculate(d)
 return [
  {category:'Mission / budget', status:r.usable >= mission.usableTarget ? 'Meets this check':'Does not meet this check', title:'Usable area', detail:`${Math.round(r.usable).toLocaleString('en-US')} sf provided / ${mission.usableTarget.toLocaleString('en-US')} sf target. Usable area is assumed to be 80% of gross floor area.`, why:'The hub needs enough room for its mission.', remedy:'Investigate increasing footprint or stories.', location:'floor'},
  {category:'Mission / budget', status:r.remaining >= 0 ? 'Meets this check':'Does not meet this check', title:'Construction budget', detail:`$${Math.round(r.cost).toLocaleString('en-US')} of $${mission.budget.toLocaleString('en-US')} game budget. Costs are illustrative, not market prices.`, why:'The design must fit its construction budget.', remedy:'Explore a smaller footprint or fewer upgrades.', location:'building'},
  {category:'Comfort / operating', status:r.endF <= mission.comfortF ? 'Meets this check':'Does not meet this check', title:'Hot-day comfort target', detail:`${r.endF.toFixed(1)} °F after 12 hours / ${mission.comfortF} °F maximum game target; thermostat 75.2 °F. One-zone heat balance, 95 °F outdoors.`, why:'Inadequate cooling leaves spaces uncomfortable.', remedy:'Investigate additional AC or better insulation.', location:'ac'},
  {category:'Engineering performance', status:'Not evaluated', title:'Structural strength and lateral response', detail:'Member and brace settings are visual and affect game cost only. Gravity, wind, capacity, and drift are not calculated.', why:'A visible frame or brace does not demonstrate structural safety.', remedy:'Have an engineer develop and review structural models.', location:'frame'},
  {category:'Engineering performance', status:'Not evaluated', title:'Foundation and settlement', detail:'Soil and footing settings are illustrative. Bearing, total settlement, and differential settlement are not calculated.', why:'Foundation and ground behavior require a supported geotechnical model.', remedy:'Review soil and foundation assumptions with an engineer.', location:'foundation'},
  {category:'Code requirements', status:'Needs information', title:'Code edition and jurisdiction', detail:'No edition, jurisdiction, occupancy classification, or amendments have been confirmed.', why:'Code provisions depend on the adopted code and applicable conditions.', remedy:'Confirm the edition and whether local amendments apply.', location:'building'},
  {category:'Code requirements', status:'Not evaluated', title:'Egress, occupancy and live load', detail:'No IBC rules are implemented. A door is not automatically a qualifying exit; walking routes, occupant load and design live load are not evaluated.', why:'Room and story egress and structural loading are distinct checks.', remedy:'Supply a verified code scope for a future rules library.', location:'door'}
 ]
}
