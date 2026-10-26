'use client'

import { ERDRenderer, VersionProvider } from '@liam-hq/erd-core'
import { ErdRendererProvider } from '@liam-hq/erd-core/nextjs'
import type { Schema } from '@liam-hq/schema'
import { useReactFlow } from '@xyflow/react'
import { useEffect } from 'react'
import { captureVisibility } from './captureVisibility'
import type { Diagram } from './model'

export type CaptureView = () => Pick<Diagram, 'positions' | 'hidden'>
type Props = {
  schema: Schema
  baseline: Schema | null
  diagram: Diagram
  showDiff: boolean
  registerCapture: (capture: CaptureView) => void
}

const CaptureBridge = ({
  diagram,
  registerCapture,
}: Pick<Props, 'diagram' | 'registerCapture'>) => {
  const { getNodes } = useReactFlow()
  useEffect(() => {
    registerCapture(() => ({
      positions: {
        ...diagram.positions,
        ...Object.fromEntries(
          getNodes()
            .filter((node) => node.type === 'table')
            .map((node) => [node.id, node.position]),
        ),
      },
      hidden: captureVisibility(
        diagram.hidden,
        getNodes().map((node) => node.id),
        getNodes()
          .filter((node) => node.hidden)
          .map((node) => node.id),
      ),
    }))
  }, [diagram.positions, diagram.hidden, getNodes, registerCapture])
  return null
}

export const WorkspaceCanvas = ({
  schema,
  baseline,
  diagram,
  showDiff,
  registerCapture,
}: Props) => (
  <VersionProvider
    version={{
      version: '0.1.0',
      gitHash: 'local',
      envName: 'local',
      date: '2026-10-26',
      displayedOn: 'web',
    }}
  >
    <ErdRendererProvider
      schema={{ current: schema, ...(baseline ? { baseline } : {}) }}
      defaultShowMode="ALL_FIELDS"
      showDiff={showDiff}
    >
      <ERDRenderer
        defaultSidebarOpen
        diagram={diagram}
        customToolbarActions={
          <CaptureBridge diagram={diagram} registerCapture={registerCapture} />
        }
      />
    </ErdRendererProvider>
  </VersionProvider>
)
