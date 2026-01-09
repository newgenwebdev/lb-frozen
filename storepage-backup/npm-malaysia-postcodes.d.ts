declare module 'npm-malaysia-postcodes' {
  export interface StateData {
    name: string
    city: string[]
  }

  export interface AllData {
    state: StateData[]
  }

  export function getAll(): AllData
  export function getCitiesByState(state: string): string[]
  export function getPostcodesByCity(state: string, city: string): string[]
}
