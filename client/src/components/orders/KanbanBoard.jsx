import { useMemo, useState } from 'react';
import KanbanColumn from './KanbanColumn';

const STAGES = [
  { key: 'new',       label: 'New Orders' },
  { key: 'accepted',  label: 'Accepted'   },
  { key: 'picked',    label: 'Picked Up'  },
  { key: 'delivered', label: 'Delivered'  },
];

export default function KanbanBoard({ orders, onAdvance, onView }) {
  const [mobileStage, setMobileStage] = useState('new');
  const buckets = { new: [], accepted: [], picked: [], delivered: [] };
  orders.forEach(o => {
    const stage = STAGES.some(s => s.key === o.status) ? o.status : 'new';
    buckets[stage].push(o);
  });

  const selectedLabel = useMemo(
    () => STAGES.find(s => s.key === mobileStage)?.label || 'New Orders',
    [mobileStage]
  );

  return (
    <>
      <div className="kanban-mobile-filter" aria-label="Choose order stage for mobile view">
        <label htmlFor="kanbanStageSelect">View Stage</label>
        <select
          id="kanbanStageSelect"
          value={mobileStage}
          onChange={event => setMobileStage(event.target.value)}
        >
          {STAGES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label} ({buckets[key].length})
            </option>
          ))}
        </select>
      </div>

      <p className="kanban-scroll-hint">Showing: {selectedLabel}</p>
      <div className="kanban-board">
        {STAGES.map(({ key, label }) => (
          <KanbanColumn
            key={key}
            stage={key}
            label={label}
            orders={buckets[key]}
            onAdvance={onAdvance}
            onView={onView}
            mobileVisible={mobileStage === key}
          />
        ))}
      </div>
    </>
  );
}
