import { useState, useEffect } from 'react';
import { GripVertical, Save, Trash2, X } from 'lucide-react';
import type { City } from '@manyou/shared';

type RouteCityId = Exclude<import('@manyou/shared').CityId, 'shandong'>;

interface RouteEditorDialogProps {
  cities: (City & { id: RouteCityId })[];
  value: RouteCityId[];
  isOpen: boolean;
  onSave: (next: RouteCityId[]) => void;
  onClose: () => void;
}

export function RouteEditorDialog({ cities, value, isOpen, onSave, onClose }: RouteEditorDialogProps) {
  const [draft, setDraft] = useState<RouteCityId[]>([...value]);

  useEffect(() => {
    if (isOpen) setDraft([...value]);
  }, [isOpen, value]);

  const cityById = new Map(cities.map((c) => [c.id, c]));

  function moveUp(index: number) {
    if (index <= 0) return;
    setDraft((prev) => {
      const next = [...prev];
      const tmp = next[index - 1]!;
      next[index - 1] = next[index]!;
      next[index] = tmp;
      return next;
    });
  }

  function moveDown(index: number) {
    if (index >= draft.length - 1) return;
    setDraft((prev) => {
      const next = [...prev];
      const tmp = next[index + 1]!;
      next[index + 1] = next[index]!;
      next[index] = tmp;
      return next;
    });
  }

  function removeCity(id: RouteCityId) {
    setDraft((prev) => prev.filter((cid) => cid !== id));
  }

  function addCity(id: RouteCityId) {
    setDraft((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }

  function handleSave() {
    if (draft.length === 0) return;
    onSave(draft);
    onClose();
  }

  if (!isOpen) return null;

  const availableCities = cities.filter((c) => !draft.includes(c.id));

  return (
    <div className="edit-dialog-overlay" onClick={onClose}>
      <div className="edit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="edit-dialog-header">
          <h3>编辑旅行路线</h3>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="edit-dialog-content">
          <p style={{ margin: '0 0 16px', color: '#66767d', fontSize: '13px', lineHeight: 1.7 }}>
            拖拽调整城市顺序，或从下方添加新城市。至少保留一个城市。
          </p>

          {/* Current route */}
          <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
            {draft.map((cityId, index) => {
              const city = cityById.get(cityId);
              if (!city) return null;
              return (
                <div
                  key={cityId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto auto',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: '#fff',
                  }}
                >
                  <GripVertical size={16} style={{ color: '#aab5bb' }} />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>
                    <span style={{ color: 'var(--city-accent)', marginRight: '8px' }}>{index + 1}</span>
                    {city.name}
                    <small style={{ display: 'block', color: '#718087', fontSize: '11px', marginTop: '1px' }}>
                      {city.dates}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{
                      width: '30px', height: '30px', display: 'grid', placeItems: 'center',
                      border: '1px solid var(--border)', borderRadius: '5px', background: '#fff',
                      cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.35 : 1,
                    }}
                    aria-label={`将${city.name}上移`}
                    title="上移"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === draft.length - 1}
                    style={{
                      width: '30px', height: '30px', display: 'grid', placeItems: 'center',
                      border: '1px solid var(--border)', borderRadius: '5px', background: '#fff',
                      cursor: index === draft.length - 1 ? 'default' : 'pointer',
                      opacity: index === draft.length - 1 ? 0.35 : 1,
                    }}
                    aria-label={`将${city.name}下移`}
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCity(cityId)}
                    style={{
                      width: '30px', height: '30px', display: 'grid', placeItems: 'center',
                      border: '1px solid rgba(200,90,74,.3)', borderRadius: '5px', background: '#fff',
                      cursor: 'pointer', color: '#c85a4a',
                    }}
                    aria-label={`移除${city.name}`}
                    title="移除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add city */}
          {availableCities.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', color: '#718087', fontSize: '12px', fontWeight: 700 }}>添加城市</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {availableCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => addCity(city.id)}
                    style={{
                      padding: '7px 11px', border: '1px solid var(--border)', borderRadius: '5px',
                      background: '#fff', cursor: 'pointer', fontSize: '12px',
                    }}
                  >
                    + {city.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="edit-dialog-footer">
          <span />
          <div className="action-buttons">
            <button className="btn-cancel" onClick={onClose}>取消</button>
            <button className="btn-save" onClick={handleSave} disabled={draft.length === 0}>
              <Save size={16} />
              保存路线
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
