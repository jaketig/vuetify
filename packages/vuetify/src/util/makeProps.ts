// Composables
import { useDefaults } from '@/composables/defaults'

// Utilities
import { getCurrentInstance } from 'vue'
import { wrapInArray } from './helpers'
import { consoleWarn } from './console'

// Types
import type { Prop } from 'vue'

export function makeProps<P extends Record<string, Prop<any> & { source?: string }>> (props: P) {
  for (const key in props) {
    const originalProp = props[key]
    const isOptions = !(originalProp == null || Array.isArray(originalProp) || typeof originalProp === 'function')

    const propDefinition = (isOptions ? originalProp : { type: originalProp }) as any
    const originalDefault = propDefinition.hasOwnProperty('default')
      ? propDefinition.default
      : propDefinition.type === Boolean || (Array.isArray(propDefinition.type) && propDefinition.type.includes(Boolean))
        ? false
        : undefined

    const wrappedDefault = generateDefault(key, originalDefault, propDefinition.type)

    props[key] = {
      ...propDefinition,
      default: wrappedDefault,
    }
  }

  return props
}

function generateDefault (propName: string, localDefault: any, type: any) {
  return (props: Record<string, unknown>) => {
    const vm = getCurrentInstance()

    if (!vm) {
      consoleWarn('Unable to get current component instance when generating default prop value')

      return localDefault
    }

    if (!vm.type.name) {
      consoleWarn('The component is missing an explicit name, unable to generate default prop value')

      return localDefault
    }

    const defaults = useDefaults()
    const globalDefault = defaults.value.global?.[propName]
    const componentDefault = defaults.value[vm.type.name]?.[propName]
    const actualDefault = typeof componentDefault !== 'undefined'
      ? componentDefault
      : typeof globalDefault !== 'undefined'
        ? globalDefault
        : localDefault

    return isFactory(actualDefault, type) ? actualDefault(props) : actualDefault
  }
}

// Would be nice to have PropOptions here
function isFactory (val: any, type: any) {
  return typeof val === 'function' && !wrapInArray(type).includes(Function)
}
