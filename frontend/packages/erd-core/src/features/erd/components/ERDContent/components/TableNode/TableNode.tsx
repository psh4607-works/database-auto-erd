import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@liam-hq/ui'
import { Handle, type NodeProps, Position } from '@xyflow/react'
import clsx from 'clsx'
import type { FC } from 'react'
import { useUserEditingOrThrow } from '../../../../../../stores'
import type { TableNodeType } from '../../../../types'
import { TableColumnList } from './TableColumnList'
import { TableHeader } from './TableHeader'
import styles from './TableNode.module.css'

type Props = NodeProps<TableNodeType>

export const TableNode: FC<Props> = ({ data }) => {
  const { showMode: _showMode } = useUserEditingOrThrow()
  const showMode = data.showMode ?? _showMode
  const name = data?.table?.name

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <div
            style={
              data.annotation
                ? { borderColor: data.annotation.color }
                : undefined
            }
            className={clsx(
              styles.wrapper,
              data.isHighlighted && styles.wrapperHighlighted,
              data.isActiveHighlighted && styles.wrapperActive,
            )}
            data-erd={
              (data.isHighlighted || data.isActiveHighlighted) &&
              'table-node-highlighted'
            }
          >
            <TableHeader data={data} />
            {data.persistent && (
              <>
                <Handle
                  type="source"
                  id="logical-source"
                  position={Position.Right}
                />
                <Handle
                  type="target"
                  id="logical-target"
                  position={Position.Left}
                />
              </>
            )}
            {(data.annotation?.group || data.annotation?.note) && (
              <div className={styles.annotation}>
                {data.annotation.group && (
                  <strong>{data.annotation.group}</strong>
                )}
                {data.annotation.note && <p>{data.annotation.note}</p>}
              </div>
            )}
            {showMode === 'ALL_FIELDS' && <TableColumnList data={data} />}
            {showMode === 'KEY_ONLY' && (
              <TableColumnList data={data} filter="KEY_ONLY" />
            )}
          </div>
        </TooltipTrigger>

        <TooltipPortal>
          <TooltipContent
            side={'top'}
            sideOffset={4}
            hidden={!data.isTooltipVisible}
          >
            {name}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  )
}
