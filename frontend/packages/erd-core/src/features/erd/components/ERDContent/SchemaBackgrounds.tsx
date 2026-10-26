import { useNodes, ViewportPortal } from '@xyflow/react'
import { getSchemaGroups } from '../../utils/schemaGroups'
import styles from './SchemaBackgrounds.module.css'

export const SchemaBackgrounds = () => {
  const nodes = useNodes()
  const groups = getSchemaGroups(
    nodes.filter((node) => node.data['persistent']),
  )
  return (
    <ViewportPortal>
      {groups.map((group) => (
        <section
          key={group.schema}
          aria-label={`Schema ${group.schema || 'Default schema'}`}
          className={styles.group}
          style={{
            left: group.x,
            top: group.y,
            width: group.width,
            height: group.height,
          }}
        >
          <div className={styles.heading}>
            <strong>{group.schema || 'Default schema'}</strong>
            <span>
              {group.count} {group.count === 1 ? 'table' : 'tables'}
            </span>
          </div>
        </section>
      ))}
    </ViewportPortal>
  )
}
