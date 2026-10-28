import type { Design } from './design'
import { costs, mission, thermal } from './assumptions'
const ftToM = 0.3048
export const cToF = (c: number) => c * 9 / 5 + 32
export function calculate(d: Design) {
  const footprint = d.width * d.depth
  const gross = footprint * d.floors
  const usable = gross * 0.8
  const cost = gross * (costs.basePerGrossSf + costs.memberPerGrossSf[d.member] + costs.insulationPerGrossSf[d.insulation]) + costs.foundation[d.foundation] + (d.lateral === 'braced' ? d.braces.length : 0) * costs.bracePerSide + d.ac * costs.acEach + d.heating * costs.heatPerKW + costs.door
  const floorM2 = gross * ftToM ** 2
  const roofM2 = footprint * ftToM ** 2
  const wallM2 = 2 * (d.width + d.depth) * d.story * d.floors * ftToM ** 2
  const conductance = wallM2 * thermal.wallU[d.insulation] + roofM2 * thermal.roofU
  const solarW = roofM2 * thermal.solarWPerRoofM2
  const internalW = floorM2 * thermal.internalWPerFloorM2[d.use]
  const capacityKW = d.ac * thermal.acKW
  const demandKW = (conductance * (thermal.outdoorC - thermal.thermostatC) + solarW + internalW) / 1000
  const heatDemandKW = Math.max(0,(conductance * (thermal.heatThermostatC - thermal.coldOutdoorC) - roofM2 * thermal.coldSolarWPerRoofM2 - internalW) / 1000)
  let temperature = thermal.initialC, energyKWh = 0
  let coldTemperature = thermal.coldInitialC, heatingEnergyKWh = 0
  const points: {hour:number; tempF:number}[] = [{hour: 0, tempF: cToF(temperature)}]
  const coldPoints: {hour:number; tempF:number}[] = [{hour: 0, tempF: cToF(coldTemperature)}]
  const dtSeconds = thermal.stepHours * 3600
  const heatCapacityJPerK = floorM2 * thermal.thermalMassKJPerM2K * 1000
  for (let i = 1; i <= thermal.durationHours / thermal.stepHours; i++) {
    const gainW = conductance * (thermal.outdoorC - temperature) + solarW + internalW
    const freeTemp = temperature + gainW * dtSeconds / heatCapacityJPerK
    const requiredCoolingJ = Math.max(0, (freeTemp - thermal.thermostatC) * heatCapacityJPerK)
    const coolingJ = Math.min(capacityKW * 1000 * dtSeconds, requiredCoolingJ)
    temperature = freeTemp - coolingJ / heatCapacityJPerK
    energyKWh += coolingJ / 3600000 / thermal.cop
    const coldGainW = conductance * (thermal.coldOutdoorC - coldTemperature) + roofM2 * thermal.coldSolarWPerRoofM2 + internalW
    const coldFree = coldTemperature + coldGainW * dtSeconds / heatCapacityJPerK
    const requiredHeatingJ = Math.max(0, (thermal.heatThermostatC - coldFree) * heatCapacityJPerK)
    const heatingJ = Math.min(d.heating * 1000 * dtSeconds, requiredHeatingJ)
    coldTemperature = coldFree + heatingJ / heatCapacityJPerK
    heatingEnergyKWh += heatingJ / 3600000 / thermal.heatingCOP
    if (i % 12 === 0) { points.push({hour: i / 12, tempF: cToF(temperature)}); coldPoints.push({hour: i / 12, tempF: cToF(coldTemperature)}) }
  }
  return { footprint, gross, usable, cost, remaining: mission.budget - cost, demandKW, capacityKW, endF: cToF(temperature), energyKWh, points, heatDemandKW, heatingCapacityKW:d.heating, coldEndF:cToF(coldTemperature), heatingEnergyKWh, coldPoints }
}
